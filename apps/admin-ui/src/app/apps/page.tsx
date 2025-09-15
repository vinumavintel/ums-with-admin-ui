"use client";
import React, { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post } from '@/lib/api';
import { useToast } from '../providers';
import { useAuth } from '@/lib/keycloak-client';

interface AppItem {
  id: string;
  name: string;
  description?: string;
  keycloakClientId: string;
  usersCount?: number;
  createdAt: string;
}

interface AppsResponse {
  items: AppItem[];
  total?: number;
}

export default function AppsPage() {
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const { isAuthenticated, ready } = useAuth();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  // Memoize the enabled condition to prevent unnecessary re-renders
  const isQueryEnabled = React.useMemo(() => {
    const enabled = ready && isAuthenticated;
    console.log('[apps] Query enabled check:', { ready, isAuthenticated, enabled });
    return enabled;
  }, [ready, isAuthenticated]);

  const { data, isLoading, isError, error } = useQuery<AppsResponse>({
    queryKey: ['apps'],
    queryFn: () => {
      console.log('[apps] Executing query function');
      return get<AppsResponse>('/v1/apps');
    },
    enabled: isQueryEnabled,
    staleTime: Infinity,        // Never consider data stale
    gcTime: 10 * 60_000,        // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    refetchInterval: false,     // Disable automatic refetching
    refetchIntervalInBackground: false,
    retry: 1,
  });

  // Debug current user permissions
  React.useEffect(() => {
    if (ready && isAuthenticated) {
      get('/v1/me').then(user => {
        console.log('[apps] Current user info:', user);
        console.log('[apps] Realm roles:', user?.realm_access?.roles);
        console.log('[apps] Resource access:', user?.resource_access);
      }).catch(err => {
        console.error('[apps] Failed to get user info:', err);
      });
    }
  }, [ready, isAuthenticated]);

  const createMutation = useMutation({
    mutationFn: (vars: { name: string; description?: string }) => post<AppItem, { name: string; description?: string }>("/v1/apps", vars),
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: ['apps'] });
      const previous = queryClient.getQueryData<AppsResponse>(['apps']);
      const optimistic: AppItem = {
        id: 'temp-' + Date.now(),
        name: vars.name,
        description: vars.description,
        keycloakClientId: 'pending',
        usersCount: 0,
        createdAt: new Date().toISOString(),
      };
      if (previous) {
        queryClient.setQueryData<AppsResponse>(['apps'], {
          ...previous,
          items: [optimistic, ...previous.items],
          total: (previous.total ?? previous.items.length) + 1,
        });
      } else {
        queryClient.setQueryData<AppsResponse>(['apps'], { items: [optimistic], total: 1 });
      }
      return { previous };
    },
    onSuccess: () => {
      notify({ title: 'App created' });
      setOpen(false);
      setName("");
      setDescription("");
    },
    onError: (err: any, _vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(['apps'], ctx.previous);
      } else {
        queryClient.removeQueries({ queryKey: ['apps'] });
      }
      notify({ title: 'Create failed', description: err?.message || 'Unknown error', variant: 'error' });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['apps'] });
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Applications</h1>
        <button onClick={() => setOpen(true)} className="text-xs font-medium rounded bg-neutral-900 text-white dark:bg-neutral-200 dark:text-neutral-900 px-3 py-2 hover:opacity-90 transition">
          Create App
        </button>
      </div>
      <div className="rounded border border-neutral-200 dark:border-neutral-800 overflow-hidden bg-white dark:bg-neutral-900">
        {isLoading && (
          <div className="p-8 text-center text-sm text-neutral-500">Loading apps…</div>
        )}
        {isError && !isLoading && (
          <div className="p-8 text-center text-sm text-red-600 dark:text-red-400">Error loading apps: {(error as any)?.message || 'Unknown error'}</div>
        )}
    {!isLoading && !isError && data && (data as AppsResponse).items.length === 0 && (
          <div className="p-8 text-center text-sm text-neutral-500">No applications yet.</div>
        )}
    {!isLoading && !isError && data && (data as AppsResponse).items.length > 0 && (
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 dark:bg-neutral-800/60 text-neutral-600 dark:text-neutral-300">
              <tr>
                <th className="text-left font-medium px-4 py-2">Name</th>
                <th className="text-left font-medium px-4 py-2">Client ID</th>
                <th className="text-left font-medium px-4 py-2">Users</th>
                <th className="text-left font-medium px-4 py-2">Created</th>
              </tr>
            </thead>
            <tbody>
      {(data as AppsResponse).items.map((app: AppItem) => (
                <tr key={app.id} className="border-t border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40">
                  <td className="px-4 py-2 font-medium">{app.name}</td>
                  <td className="px-4 py-2 text-xs font-mono">{app.keycloakClientId}</td>
                  <td className="px-4 py-2">{app.usersCount ?? '—'}</td>
                  <td className="px-4 py-2 text-xs">{new Date(app.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !createMutation.isPending && setOpen(false)} />
          <div className="relative w-full max-w-md rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-6 shadow-lg space-y-4">
            <h2 className="text-lg font-semibold">Create Application</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const trimmed = name.trim();
                if (!trimmed) return;
                createMutation.mutate({ name: trimmed, description: description.trim() || undefined });
              }}
              className="space-y-3"
            >
              <div className="space-y-1">
                <label className="text-xs font-medium uppercase tracking-wide text-neutral-500">Name</label>
                <input
                  className="w-full rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-600"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Billing Service"
                  disabled={createMutation.isPending}
                  maxLength={80}
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium uppercase tracking-wide text-neutral-500">Description <span className="text-neutral-400">(optional)</span></label>
                <textarea
                  className="w-full rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-600 resize-none h-24"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Short description"
                  disabled={createMutation.isPending}
                  maxLength={300}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={createMutation.isPending}
                  className="px-3 py-2 text-xs rounded border border-neutral-300 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-50"
                >Cancel</button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || !name.trim()}
                  className="px-3 py-2 text-xs rounded bg-neutral-900 text-white dark:bg-neutral-200 dark:text-neutral-900 font-medium hover:opacity-90 disabled:opacity-50"
                >{createMutation.isPending ? 'Creating…' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}