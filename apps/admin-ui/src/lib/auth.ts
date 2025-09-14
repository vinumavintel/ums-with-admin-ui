// Re-export client-side role utilities & components (JSX defined in auth-client.tsx)
export * from './auth-client';

/**
 * Authentication helper functions for role-based access control
 */

interface ResourceAccess {
  [clientId: string]: {
    roles?: string[];
  };
}

/**
 * Check if the user has a specific role for a given Keycloak client
 */
export function hasClientRole(
  resourceAccess: ResourceAccess,
  clientId: string,
  role: string
): boolean {
  if (!resourceAccess || !clientId || !role) {
    return false;
  }
  
  const clientRoles = resourceAccess[clientId]?.roles || [];
  return clientRoles.includes(role);
}

/**
 * Check if the user has any of the specified roles for a given client
 */
export function hasAnyClientRole(
  resourceAccess: ResourceAccess,
  clientId: string,
  roles: string[]
): boolean {
  if (!resourceAccess || !roles?.length) {
    return false;
  }
  
  const clientRoles = resourceAccess[clientId]?.roles || [];
  return roles.some(role => clientRoles.includes(role));
}

/**
 * Get all roles for a specific client
 */
export function getClientRoles(
  resourceAccess: ResourceAccess,
  clientId: string
): string[] {
  if (!resourceAccess || !clientId) {
    return [];
  }
  
  return resourceAccess[clientId]?.roles || [];
}

/**
 * Check if user is a platform admin (realm-level role)
 */
export function isPlatformAdmin(realmAccess?: { roles?: string[] }): boolean {
  return realmAccess?.roles?.includes('platform-admin') || false;
}