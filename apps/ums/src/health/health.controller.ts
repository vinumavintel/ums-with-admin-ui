import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOkResponse } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service.js';
import { KeycloakService } from '../keycloak/keycloak.service.js';
import { Public } from '../auth/public.decorator.js';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private prisma: PrismaService, private keycloak: KeycloakService) {}

  @Get()
  @Public()
  @ApiOkResponse({ description: 'Health status' })
  async check() {
    let db = false, keycloak = false;
    try { await this.prisma.$queryRaw`SELECT 1`; db = true; } catch {}
    keycloak = await this.keycloak.authPing();
    const ok = db && keycloak;
    return { status: ok ? 'ok' : 'degraded', db, keycloak, ts: new Date().toISOString() };
  }
}
