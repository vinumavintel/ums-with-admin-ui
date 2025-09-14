"use client";
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { get } from '@/lib/api';
import { useAuth } from '@/lib/keycloak-client';

interface MeResponse {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  createdAt?: string;
  roles?: string[];
  [key: string]: any;
}

export default function MePage() {
  const { profile, token, isAuthenticated, ready } = useAuth();
  const { data, isLoading, isError, error } = useQuery<MeResponse>({
    queryKey: ['me'],
    queryFn: () => get<MeResponse>('/v1/me'),
    enabled: ready && isAuthenticated && !!token,
  });

  const resourceAccess = (profile?.resource_access as Record<string, { roles?: string[] }> | undefined) || {};

  return (
    <div className="space-y-8 max-w-4xl">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">My Account</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-300">Decoded token claims and whoami API response for quick debugging.</p>
      </header>

      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500">/v1/me</h2>
        {isLoading && <div className="text-xs text-neutral-500">Loading…</div>}
        {isError && <div className="text-xs text-red-600 dark:text-red-400">Failed: {(error as any)?.message || 'Unknown error'}</div>}
        {data && (
          <pre className="rounded bg-neutral-900 text-neutral-100 p-4 text-xs overflow-auto max-h-96">{JSON.stringify(data, null, 2)}</pre>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500">Decoded JWT Claims</h2>
        {!profile && <div className="text-xs text-neutral-500">No profile loaded.</div>}
        {profile && (
          <pre className="rounded bg-neutral-900 text-neutral-100 p-4 text-xs overflow-auto max-h-96">{JSON.stringify(profile, null, 2)}</pre>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500">Resource Access Roles</h2>
        {Object.keys(resourceAccess).length === 0 && (
          <div className="text-xs text-neutral-500">No resource_access entries.</div>
        )}
        {Object.entries(resourceAccess).map(([clientId, value]) => (
          <div key={clientId} className="rounded border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-medium">{clientId}</span>
              <span className="text-[10px] text-neutral-500">{(value.roles || []).length} role(s)</span>
            </div>
            {(value.roles || []).length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {value.roles!.map(r => (
                  <span key={r} className="px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-[10px] font-medium">{r}</span>
                ))}
              </div>
            ) : (
              <div className="text-[10px] text-neutral-500">No roles</div>
            )}
          </div>
        ))}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500">Token (truncated)</h2>
        {token ? (
          <div className="text-xs break-all font-mono p-3 rounded bg-neutral-100 dark:bg-neutral-800">
            {token.slice(0, 60)}… ({token.length} chars)
          </div>
        ) : <div className="text-xs text-neutral-500">No token</div>}
      </section>
    </div>
  );
}
