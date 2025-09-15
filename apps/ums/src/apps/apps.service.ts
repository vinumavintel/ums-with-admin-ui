import { ConflictException, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { KeycloakService } from '../keycloak/keycloak.service.js';
import { CreateAppDto } from './dto/create-app.dto.js';
import { AppResponse } from './dto/app-response.dto.js';

export interface PaginatedResult<T> { items: T[]; total: number; page: number; limit: number; }

@Injectable()
export class AppsService {
	constructor(private prisma: PrismaService, private keycloak: KeycloakService) {}

	private normalizeNameToClientId(name: string) {
		return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 63);
	}

	async create(dto: CreateAppDto): Promise<AppResponse> {
		if (!dto.name) throw new BadRequestException('Name required');
		const clientId = this.normalizeNameToClientId(dto.name);

		const existing = await this.prisma.application.findUnique({ where: { name: dto.name } });
		if (existing) throw new ConflictException('Application name already exists');

		let kcClient: { id: string; clientId: string };
		try {
			kcClient = await this.keycloak.createClientWithRoles(clientId);
		} catch (e: any) {
			const status = e?.response?.status;
			if (status === 409) {
			// Already exists in KC → continue by fetching
			const found = await this.keycloak.findClientByClientId(clientId);
			if (!found?.id) throw new ConflictException('Keycloak client already exists');
			kcClient = { id: found.id!, clientId };
			} else {
			throw e;
			}
		}

		try {
			const app = await this.prisma.application.create({
			data: {
				name: dto.name,
				description: dto.description,
				keycloakClientId: kcClient.clientId,
			},
			});
			return app as AppResponse;
		} catch (e: any) {
			if (e.code === 'P2002') throw new ConflictException('Application already exists');
			throw e;
		}
	}


	async findAll(page = 1, limit = 20, q?: string): Promise<PaginatedResult<AppResponse>> {
		const skip = (page - 1) * limit;
		const where = q ? { name: { contains: q, mode: 'insensitive' as const } } : {};
		const [data, total] = await Promise.all([
			this.prisma.application.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
			this.prisma.application.count({ where }),
		]);
		return { items: data as AppResponse[], total, page, limit };
	}

	async findOne(id: string): Promise<AppResponse> {
		const app = await this.prisma.application.findUnique({ where: { id } });
		if (!app) throw new NotFoundException('Application not found');
		return app as AppResponse;
	}

	async remove(id: string): Promise<void> {
		const app = await this.prisma.application.findUnique({ where: { id }, include: { users: true } });
		if (!app) throw new NotFoundException('Application not found');
		if (app.users.length > 0) throw new ConflictException('Application has associated users');
		await this.prisma.application.delete({ where: { id } });
	}
}
