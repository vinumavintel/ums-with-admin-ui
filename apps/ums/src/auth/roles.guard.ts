import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, Roles } from './roles.decorator.js';
import { IS_PUBLIC_KEY } from './public.decorator.js';
import { AppsService } from '../apps/apps.service.js';

interface KeycloakUser {
  realm_access?: { roles?: string[] };
  resource_access?: Record<string, { roles?: string[] }>;
  // allow any other props
  [key: string]: any;
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector, private appsService: AppsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no specific roles required just allow (already authenticated by JwtAuthGuard earlier)
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user: KeycloakUser | undefined = request.user;

    if (!user) return false; // JwtAuthGuard should have handled but safety

    const realmRoles = user.realm_access?.roles || [];
    const resourceAccess = user.resource_access || {};

    // Helper to check resource roles
    const hasResourceRole = (clientId: string, role: string) => {
      return resourceAccess[clientId]?.roles?.includes(role) ?? false;
    };

    // platform-admin requirement
    if (requiredRoles.includes('platform-admin')) {
      const hasPlatform = realmRoles.includes('platform-admin') || hasResourceRole('ums-api', 'platform-admin') || hasResourceRole('ums-api', 'admin');
      if (!hasPlatform) throw new ForbiddenException('Platform admin role required');
      // If platform-admin alone then allow immediately, else continue to evaluate other requested roles
      if (requiredRoles.length === 1) return true;
    }

    // Application scoped roles: app-admin / app-super-admin
    const needsAppAdmin = requiredRoles.some(r => r === 'app-admin' || r === 'app-super-admin');
    if (needsAppAdmin) {
      // derive application id from route params (appId or id)
      const params = request.params || {};
      const query = request.query || {};
      const appId = params.appId || params.id || query.appId;
      if (!appId) throw new ForbiddenException('Application id not provided for app admin role');

      // Fetch application to derive its keycloak client id
      let clientId: string;
      try {
        const app = await this.appsService.findOne(appId);
        clientId = app.keycloakClientId || app.id; // prefer explicit keycloak client id
      } catch {
        throw new ForbiddenException('Application not found');
      }

      if (requiredRoles.includes('app-admin')) {
        const ok = hasResourceRole(clientId, 'admin');
        if (!ok) throw new ForbiddenException('App admin role required');
      }
      if (requiredRoles.includes('app-super-admin')) {
        const ok = hasResourceRole(clientId, 'super-admin');
        if (!ok) throw new ForbiddenException('App super admin role required');
      }
    }

    // If we reached here all requirements satisfied
    return true;
  }
}

export { Roles };
