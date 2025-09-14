import { Controller, Get, Query, ForbiddenException } from '@nestjs/common';
import { AuditService } from './audit.service.js';
import { Roles } from '../auth/roles.decorator.js';
import { ApiTags, ApiOkResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service.js';

class ListAuditQueryDto {
	appId?: string;
	userId?: string;
	action?: string;
	page?: number;
	limit?: number;
}

@ApiTags('audit')
@ApiBearerAuth()
@Controller('audit')
export class AuditController {
	constructor(private readonly audit: AuditService, private prisma: PrismaService) {}

		@Get()
		@ApiQuery({ name: 'appId', required: false })
		@ApiQuery({ name: 'userId', required: false })
		@ApiQuery({ name: 'action', required: false })
		@ApiQuery({ name: 'page', required: false })
		@ApiQuery({ name: 'limit', required: false })
	@Roles('platform-admin', 'app-admin')
	@ApiOkResponse({ description: 'Paginated audit log entries' })
	async list(@Query() query: ListAuditQueryDto, /* req injected for guard */) {
		// Additional runtime check: if only app-admin (not platform-admin), ensure they filter by appId
		if (query.appId) {
			// validate app exists
			const app = await this.prisma.application.findUnique({ where: { id: query.appId } });
			if (!app) throw new ForbiddenException('Application not found');
		}
		return this.audit.list(query);
	}
}
