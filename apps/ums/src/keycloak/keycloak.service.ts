import { Injectable, Logger } from '@nestjs/common';
import { wrapKc } from './kc-errors.js';
import KcAdminClient from '@keycloak/keycloak-admin-client';

interface CreateUserInput { email: string; firstName?: string; lastName?: string; tempPassword?: string }

@Injectable()
export class KeycloakService {
  private readonly kc: KcAdminClient;
  private readonly logger = new Logger(KeycloakService.name);

  constructor() {
    this.kc = new KcAdminClient({
      baseUrl: process.env.KC_BASE_URL!,
      realmName: process.env.KC_REALM!,
    });
  }

  // ---- Auth helper ----
  private async auth() {
    try {
      await this.kc.auth({
        grantType: 'client_credentials',
        clientId: process.env.KC_ADMIN_CLIENT_ID!,
        clientSecret: process.env.KC_ADMIN_CLIENT_SECRET!,
      });
    } catch (e: any) {
      this.logger.error('Keycloak auth failed', e?.response?.data || e?.message);
      throw e; // will be mapped by wrapKc caller
    }
  }

  // ---- Public API ----
  async createClientWithRoles(appClientId: string) {
    await this.auth();
    return wrapKc(async () => {
      const client = await this.kc.clients.create({
        clientId: appClientId,
        name: appClientId,
        publicClient: false,
        serviceAccountsEnabled: true,
        standardFlowEnabled: true,
        directAccessGrantsEnabled: true,
      });
      const roleNames = ['super-admin', 'admin', 'read-write', 'read-only'];
      for (const name of roleNames) {
        try { await this.kc.clients.createRole({ id: client.id!, name }); }
        catch (roleErr: any) {
          if (roleErr?.response?.status === 409) this.logger.warn(`Role ${name} already exists on client ${appClientId}`);
          else throw roleErr;
        }
      }
      return client;
    }, `Failed creating client ${appClientId}`);
  }

  async findClientByClientId(clientId: string) {
    await this.auth();
    return wrapKc(async () => {
      const list = await this.kc.clients.find({ clientId });
      return list?.[0] ?? null;
    }, `Failed finding client ${clientId}`);
  }

  async createUser(input: CreateUserInput): Promise<string> {
    await this.auth();
    return wrapKc(async () => {
      const res = await this.kc.users.create({
        username: input.email,
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        enabled: true,
        credentials: input.tempPassword ? [{ type: 'password', value: input.tempPassword, temporary: true }] : undefined,
      });
      return res.id!;
    }, `Failed creating user ${input.email}`);
  }

  async assignClientRole(userId: string, appClientId: string, roleName: 'super-admin'|'admin'|'read-write'|'read-only') {
    await this.auth();
    return wrapKc(async () => {
      const [client] = await this.kc.clients.find({ clientId: appClientId });
      if (!client) throw { response: { status: 404 }, message: `Client ${appClientId} not found` };
      const role = await this.kc.clients.findRole({ id: client.id!, roleName });
      if (!role) throw { response: { status: 404 }, message: `Role ${roleName} not found on client ${appClientId}` };
      await this.kc.users.addClientRoleMappings({ id: userId, clientUniqueId: client.id!, roles: [{ id: role.id!, name: role.name! }] });
    }, `Failed assigning role ${roleName} to user ${userId}`);
  }

  async removeClientRole(userId: string, appClientId: string, roleName: string) {
    await this.auth();
    return wrapKc(async () => {
      const [client] = await this.kc.clients.find({ clientId: appClientId });
      if (!client) throw { response: { status: 404 }, message: `Client ${appClientId} not found` };
      const role = await this.kc.clients.findRole({ id: client.id!, roleName });
      if (!role) throw { response: { status: 404 }, message: `Role ${roleName} not found on client ${appClientId}` };
      await this.kc.users.delClientRoleMappings({ id: userId, clientUniqueId: client.id!, roles: [{ id: role.id!, name: role.name! }] });
    }, `Failed removing role ${roleName} from user ${userId}`);
  }

  async sendPasswordReset(userId: string, brandingClientId?: string) {
    await this.auth();
    return wrapKc(async () => {
      await this.kc.users.executeActionsEmail({ id: userId, clientId: brandingClientId, actions: ['UPDATE_PASSWORD'], lifespan: 3600 });
    }, `Failed initiating password reset for user ${userId}`);
  }

  async findUserByEmail(email: string, exact = true) {
    await this.auth();
    return wrapKc(async () => {
      const users = await this.kc.users.find({ email, exact });
      return users?.[0] ?? null;
    }, `Failed finding user by email ${email}`);
  }

  async authPing(): Promise<boolean> {
  try {
    await this.auth();
    return true;
  } catch {
    return false;
  }
}

}
