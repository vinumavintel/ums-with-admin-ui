import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { KeycloakModule } from '../keycloak/keycloak.module';

@Module({
  imports: [PrismaModule, KeycloakModule],
  controllers: [HealthController],
})
export class HealthModule {}
