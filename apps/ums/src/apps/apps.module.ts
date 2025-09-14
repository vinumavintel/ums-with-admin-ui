import { Module } from '@nestjs/common';
import { AppsController } from './apps.controller.js';
import { AppsService } from './apps.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { KeycloakModule } from '../keycloak/keycloak.module.js';

@Module({
	imports: [PrismaModule, KeycloakModule],
	controllers: [AppsController],
	providers: [AppsService],
	exports: [AppsService],
})
export class AppsModule {}
