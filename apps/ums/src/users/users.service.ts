import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { KeycloakService } from '../keycloak/keycloak.service.js';
import { AuditService } from '../audit/audit.service.js';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersQuery } from './dto/list-users.query';
import { AssignRoleDto } from './dto/assign-role.dto';
import { AppRole } from '@prisma/client';

export interface PaginatedResult<T> { items: T[]; total: number; page: number; limit: number }

@Injectable()
export class UsersService {
	constructor(
		private prisma: PrismaService,
		private keycloak: KeycloakService,
		private audit: AuditService,
	) {}

	// Helper to map string role to enum
	private toAppRole(role: string): AppRole {
		const map: Record<string, AppRole> = {
			'super-admin': AppRole.SUPER_ADMIN,
			'admin': AppRole.ADMIN,
			'read-write': AppRole.READ_WRITE,
			'read-only': AppRole.READ_ONLY,
		};
		if (!map[role]) throw new BadRequestException('Invalid role');
		return map[role];
	}

	private fromAppRole(role: AppRole): 'super-admin'|'admin'|'read-write'|'read-only' {
		switch (role) {
			case AppRole.SUPER_ADMIN: return 'super-admin';
			case AppRole.ADMIN: return 'admin';
			case AppRole.READ_WRITE: return 'read-write';
			case AppRole.READ_ONLY: return 'read-only';
			default:
				throw new Error('Unknown role enum');
		}
	}

	private async resolveActorInternalId(actorKeycloakUserId?: string): Promise<string | undefined> {
		if (!actorKeycloakUserId) return undefined;
		const actor = await this.prisma.user.findUnique({ where: { keycloakUserId: actorKeycloakUserId } });
		return actor?.id;
	}

	async listUsers(appId: string, query: ListUsersQuery) {
		const page = query.page && query.page > 0 ? query.page : 1;
		const limit = query.limit && query.limit > 0 ? Math.min(query.limit, 100) : 20;
		const skip = (page - 1) * limit;
		const roleFilter = query.role ? this.toAppRole(query.role) : undefined;
		const whereUser = query.q ? {
			OR: [
				{ email: { contains: query.q, mode: 'insensitive' as const } },
				{ firstName: { contains: query.q, mode: 'insensitive' as const } },
				{ lastName: { contains: query.q, mode: 'insensitive' as const } },
			],
		} : {};

		const baseWhere: any = {
			applicationId: appId,
			...(roleFilter ? { role: roleFilter } : {}),
			user: whereUser,
		};

		// Fetch distinct userIds first for accurate pagination
		const distinctUserIdsRows = await this.prisma.userAppRole.findMany({
			where: baseWhere,
			select: { userId: true },
			distinct: ['userId'],
		});
		const total = distinctUserIdsRows.length;
		const pageUserIds = distinctUserIdsRows.slice(skip, skip + limit).map(r => r.userId);
		if (pageUserIds.length === 0) return { items: [], total, page, limit };

		const roleRows = await this.prisma.userAppRole.findMany({
			where: { applicationId: appId, userId: { in: pageUserIds }, ...(roleFilter ? { role: roleFilter } : {}), user: whereUser },
			include: { user: true },
		});

		// Aggregate roles per user
		const byUser: Record<string, { id: string; email: string; firstName?: string | null; lastName?: string | null; roles: Set<AppRole> }> = {};
		for (const row of roleRows) {
			if (!byUser[row.userId]) {
				byUser[row.userId] = { id: row.user.id, email: row.user.email, firstName: row.user.firstName, lastName: row.user.lastName, roles: new Set() };
			}
			byUser[row.userId].roles.add(row.role);
		}
		const data = Object.values(byUser).map(u => ({
			id: u.id,
			email: u.email,
			firstName: u.firstName,
			lastName: u.lastName,
			roles: Array.from(u.roles).map(r => this.fromAppRole(r)),
		}));

		// Preserve original order of pageUserIds
		data.sort((a, b) => pageUserIds.indexOf(a.id) - pageUserIds.indexOf(b.id));

		return { items: data, total, page, limit } as PaginatedResult<any>;
	}

	async createUser(appId: string, dto: CreateUserDto, actorUserId?: string) {
		if (!dto.email) throw new BadRequestException('Email required');
		const roleEnum = this.toAppRole(dto.role);
		// Ensure application exists
		const app = await this.prisma.application.findUnique({ where: { id: appId } });
		if (!app) throw new NotFoundException('Application not found');
		const actorInternalId = await this.resolveActorInternalId(actorUserId);

		// Find or create user
		let user = await this.prisma.user.findUnique({ where: { email: dto.email } });
		if (!user) {
			// create in keycloak first
			let kcId: string;
			try {
				kcId = await this.keycloak.createUser({
					email: dto.email,
					firstName: dto.firstName,
					lastName: dto.lastName,
					tempPassword: dto.tempPassword,
				});
			} catch (e: any) {
				if ((e as any).code === 'CONFLICT') throw new ConflictException('User already exists in Keycloak');
				throw e;
			}
			user = await this.prisma.user.create({
				data: {
					keycloakUserId: kcId,
					email: dto.email,
					firstName: dto.firstName,
					lastName: dto.lastName,
				},
			});
		}

		// Assign role in Keycloak
		await this.keycloak.assignClientRole(user.keycloakUserId, app.keycloakClientId, dto.role as any);

		// Upsert mapping (unique on userId, applicationId, role)
		await this.prisma.userAppRole.upsert({
			where: {
				userId_applicationId_role: { userId: user.id, applicationId: appId, role: roleEnum },
			},
			create: { userId: user.id, applicationId: appId, role: roleEnum, grantedBy: actorUserId },
			update: {},
		});

		this.audit.record({ action: 'user.create', actorUserId: actorInternalId, targetUserId: user.id, meta: { appId, role: dto.role, email: user.email } });

		const roles = await this.prisma.userAppRole.findMany({ where: { userId: user.id, applicationId: appId } });
		return { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, roles: roles.map(r => this.fromAppRole(r.role)) };
	}

	async assignRole(appId: string, userId: string, dto: AssignRoleDto, actorUserId?: string) {
		const app = await this.prisma.application.findUnique({ where: { id: appId } });
		if (!app) throw new NotFoundException('Application not found');
		const user = await this.prisma.user.findUnique({ where: { id: userId } });
		if (!user) throw new NotFoundException('User not found');
		const roleEnum = this.toAppRole(dto.role);
		const actorInternalId = await this.resolveActorInternalId(actorUserId);

		if (dto.op === 'add') {
			await this.keycloak.assignClientRole(user.keycloakUserId, app.keycloakClientId, dto.role as any);
			try {
				await this.prisma.userAppRole.create({ data: { userId: user.id, applicationId: appId, role: roleEnum, grantedBy: actorUserId } });
			} catch (e: any) {
				if (e.code === 'P2002') {
					// already exists ignore
				} else throw e;
			}
			this.audit.record({ action: 'role.add', actorUserId: actorInternalId, targetUserId: user.id, meta: { appId, role: dto.role } });
		} else if (dto.op === 'remove') {
			await this.keycloak.removeClientRole(user.keycloakUserId, app.keycloakClientId, dto.role);
			await this.prisma.userAppRole.deleteMany({ where: { userId: user.id, applicationId: appId, role: roleEnum } });
			this.audit.record({ action: 'role.remove', actorUserId: actorInternalId, targetUserId: user.id, meta: { appId, role: dto.role } });
		} else {
			throw new BadRequestException('Invalid op');
		}

		const roles = await this.prisma.userAppRole.findMany({ where: { userId: user.id, applicationId: appId } });
		return { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, roles: roles.map(r => this.fromAppRole(r.role)) };
	}

	async resetPassword(appId: string, userId: string, actorUserId?: string) {
		const app = await this.prisma.application.findUnique({ where: { id: appId } });
		if (!app) throw new NotFoundException('Application not found');
		const user = await this.prisma.user.findUnique({ where: { id: userId } });
		if (!user) throw new NotFoundException('User not found');
		const actorInternalId = await this.resolveActorInternalId(actorUserId);

		await this.keycloak.sendPasswordReset(user.keycloakUserId, app.keycloakClientId);
		this.audit.record({ action: 'reset.password', actorUserId: actorInternalId, targetUserId: user.id, meta: { appId } });
		return { status: 'accepted' };
	}
}
