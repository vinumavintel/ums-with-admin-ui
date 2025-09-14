import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

export interface ListAuditQuery { appId?: string; userId?: string; action?: string; page?: number; limit?: number }

@Injectable()
export class AuditService {
	constructor(private prisma: PrismaService) {}

	async log(actorUserId: string | null, targetUserId: string | null, action: string, meta?: any) {
		await this.prisma.auditLog.create({
			data: {
				actorUserId: actorUserId || undefined,
				targetUserId: targetUserId || undefined,
				action,
				meta: meta ? meta : undefined,
			},
		});
	}

	// Backward compatible alias
	record(event: any) {
		return this.log(event.actorUserId ?? null, event.targetUserId ?? null, event.action, event.meta);
	}

	async list(query: ListAuditQuery) {
		const page = query.page && query.page > 0 ? query.page : 1;
		const limit = query.limit && query.limit > 0 ? Math.min(query.limit, 100) : 20;
		const skip = (page - 1) * limit;

		// Build where clause
		const where: any = {};
		if (query.userId) {
			// Filter either actor or target matches (simple OR)
			where.OR = [
				{ actorUserId: query.userId },
				{ targetUserId: query.userId },
			];
		}
		if (query.action) where.action = query.action;

		// If filtering by appId, we need to restrict to logs where meta.appId matches
		// Prisma JSON filter
		if (query.appId) {
			where.meta = { path: ['appId'], equals: query.appId };
		}

		const [rows, total] = await Promise.all([
			this.prisma.auditLog.findMany({
				where,
				skip,
				take: limit,
				orderBy: { createdAt: 'desc' },
				include: { actorUser: true },
			}),
			this.prisma.auditLog.count({ where }),
		]);

		// Resolve target user emails separately (batch fetch unique target ids not already loaded)
		const targetIds = Array.from(new Set(rows.filter(r => r.targetUserId).map(r => r.targetUserId!)));
		const actorIdsLoaded = new Set(rows.filter(r => r.actorUserId).map(r => r.actorUserId!));
		const needTarget = targetIds.filter(id => !actorIdsLoaded.has(id));
		const targetUsers = needTarget.length > 0 ? await this.prisma.user.findMany({ where: { id: { in: needTarget } } }) : [];
		const targetMap = new Map<string, any>();
		for (const t of targetUsers) targetMap.set(t.id, t);

		const data = rows.map(r => ({
			id: r.id,
			action: r.action,
			actorUserId: r.actorUserId,
			actorEmail: r.actorUser?.email,
			targetUserId: r.targetUserId,
			targetEmail: r.targetUserId ? (r.actorUserId === r.targetUserId ? r.actorUser?.email : targetMap.get(r.targetUserId)?.email) : undefined,
			meta: r.meta,
			createdAt: r.createdAt,
		}));

		return { data, total, page, limit };
	}
}
