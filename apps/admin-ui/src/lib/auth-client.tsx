"use client";
import React from 'react';
import { useAuth } from './keycloak-client';

// Basic role check helper
export function hasClientRole(resourceAccess: any, clientId: string, role: string): boolean {
  if (!resourceAccess || !clientId || !role) return false;
  const roles: unknown = resourceAccess?.[clientId]?.roles;
  return Array.isArray(roles) ? roles.includes(role) : false;
}

// Forbidden page inline component
const Forbidden: React.FC<{ missing?: string[] }> = ({ missing }) => (
  <div className="p-8 max-w-lg mx-auto text-center">
    <h1 className="text-2xl font-semibold mb-2">403 – Forbidden</h1>
    <p className="text-sm text-neutral-600 dark:text-neutral-300">
      You don't have the required permissions to view this content.
      {missing && missing.length > 0 && (
        <><br />Missing roles: <code>{missing.join(', ')}</code></>
      )}
    </p>
  </div>
);

function evaluateRoles(profile: any, required: string[], clientId: string) {
  const resourceAccess = profile?.resource_access || {};
  const tokenRoles: string[] = Array.isArray(resourceAccess?.[clientId]?.roles) ? resourceAccess[clientId].roles : [];
  const missing = required.filter(r => !tokenRoles.includes(r));
  return { allowed: missing.length === 0, missing };
}

// Higher-order component to enforce roles
export function requireRoles(requiredRoles: string[], appClientId?: string) {
  const clientId = appClientId || process.env.NEXT_PUBLIC_KC_CLIENT_ID || '';
  return function <P extends object>(Component: React.ComponentType<P>) {
    const Wrapped: React.FC<P> = (props) => {
      const { profile, isAuthenticated } = useAuth();
      if (!isAuthenticated) return <Forbidden missing={requiredRoles} />;
      const { allowed, missing } = evaluateRoles(profile, requiredRoles, clientId);
      if (!allowed) return <Forbidden missing={missing} />;
      return <Component {...props} />;
    };
    Wrapped.displayName = `RequireRoles(${Component.displayName || Component.name || 'Component'})`;
    return Wrapped;
  };
}

// Guarded component for inline conditional rendering
export const Guarded: React.FC<{ roles: string[]; appClientId?: string; children: React.ReactNode }> = ({ roles, appClientId, children }) => {
  const { profile, isAuthenticated } = useAuth();
  const clientId = appClientId || process.env.NEXT_PUBLIC_KC_CLIENT_ID || '';
  if (!isAuthenticated) return <Forbidden missing={roles} />;
  const { allowed, missing } = evaluateRoles(profile, roles, clientId);
  if (!allowed) return <Forbidden missing={missing} />;
  return <>{children}</>;
};

export default { hasClientRole, requireRoles, Guarded };
