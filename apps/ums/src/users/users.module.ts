import { Module } from '@nestjs/common';
import { UsersController, MeController } from './users.controller.js';
import { UsersService } from './users.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { KeycloakService } from '../keycloak/keycloak.service.js';
import { AuditService } from '../audit/audit.service.js';
import { AppsModule } from '../apps/apps.module.js';

@Module({
	imports: [PrismaModule, AppsModule],
	controllers: [UsersController, MeController],
	providers: [UsersService, KeycloakService, AuditService],
	exports: [UsersService],
})
export class UsersModule {}
