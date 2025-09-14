"use client";
import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { get } from '@/lib/api';
import { DataTable, DataTableColumn } from '@/components/DataTable';
import { useToast } from '../../../providers';
import { useAuth } from '@/lib/keycloak-client';
import { hasClientRole } from '@/lib/auth';
import { get as apiGet } from '@/lib/api';

interface AppUser {
	id: string;
	email: string;
	firstName?: string;
	lastName?: string;
	roles?: string[];
}

interface UsersResponse {
	items: AppUser[];
	total: number;
	page: number;
	limit: number;
}

const ROLE_OPTIONS = [
	{ value: '', label: 'All roles' },
	{ value: 'super-admin', label: 'Super Admin' },
	{ value: 'admin', label: 'Admin' },
	{ value: 'read-write', label: 'Read / Write' },
	{ value: 'read-only', label: 'Read Only' },
];

interface AppMeta { id: string; name: string; clientId: string; roles?: string[] }

export default function AppUsersPage() {
	const { id: appId } = useParams<{ id: string }>();
	const queryClient = useQueryClient();
	const { notify, info, error: toastError } = useToast();
	const { profile } = useAuth();

	// Fetch app metadata to obtain its Keycloak clientId
	const { data: appMeta } = useQuery<AppMeta | undefined>({
		queryKey: ['app-meta', appId],
		queryFn: () => apiGet<AppMeta>(`/v1/apps/${appId}`),
		enabled: !!appId,
		staleTime: 30_000,
	});
	const appClientId = appMeta?.clientId;
	const resourceAccess = (profile?.resource_access as any) || {};

	// Define required roles for actions (can adjust as needed)
	const CAN_ASSIGN = appClientId && hasClientRole(resourceAccess, appClientId, 'admin');
	const CAN_RESET = appClientId && (hasClientRole(resourceAccess, appClientId, 'admin') || hasClientRole(resourceAccess, appClientId, 'super-admin'));
	const CAN_CREATE = CAN_ASSIGN; // reuse admin requirement

	// Filters & state
	const [q, setQ] = useState('');
	const [debouncedQ, setDebouncedQ] = useState('');
	const [role, setRole] = useState('');
	const [page, setPage] = useState(1);
	const [limit, setLimit] = useState(10);

	// Debounce search query
	useEffect(() => {
		const handle = setTimeout(() => setDebouncedQ(q.trim()), 400);
		return () => clearTimeout(handle);
	}, [q]);

	const queryKey = ['app-users', appId, { q: debouncedQ, role, page, limit }];

		const { data, isLoading, isError, error, refetch, isFetching } = useQuery<UsersResponse>({
			queryKey,
			queryFn: () => get<UsersResponse>(`/v1/apps/${appId}/users`, { params: { q: debouncedQ || undefined, role: role || undefined, page, limit } }),
			enabled: !!appId,
			placeholderData: (prev) => prev, // preserve previous while fetching
		});

	// Invalidate when core filter state changes (React Query handles via key but ensure background refetch) 
	useEffect(() => {
		queryClient.invalidateQueries({ queryKey: ['app-users', appId] });
	}, [appId, debouncedQ, role, page, limit, queryClient]);

		const columns: DataTableColumn<AppUser>[] = useMemo(() => [
			{ header: 'Email', accessorKey: 'email', sortable: true },
			{ header: 'First Name', accessorKey: 'firstName', cell: r => r.firstName || '—', sortable: true },
			{ header: 'Last Name', accessorKey: 'lastName', cell: r => r.lastName || '—', sortable: true },
			{ header: 'Roles', accessorKey: 'roles', cell: r => (
				<div className="flex flex-wrap gap-1 max-w-[220px]">{(r.roles || []).map(role => <span key={role} className="px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-[10px] font-medium">{role}</span>)}</div>
			) },
			{ header: 'Actions', accessorKey: 'id', cell: r => (
				<div className="flex gap-2">
					{CAN_ASSIGN && <button className="text-[10px] px-2 py-1 rounded border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800" onClick={() => notify({ title: 'Assign Role', description: r.email })}>Assign Role</button>}
					{CAN_ASSIGN && <button className="text-[10px] px-2 py-1 rounded border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800" onClick={() => notify({ title: 'Remove Role', description: r.email })}>Remove Role</button>}
					{CAN_RESET && <button className="text-[10px] px-2 py-1 rounded border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800" onClick={() => notify({ title: 'Reset Password', description: r.email })}>Reset Password</button>}
				</div>
			) }
		], [notify, CAN_ASSIGN, CAN_RESET]);

	function exportCsv() {
		const rows: AppUser[] = (data as UsersResponse | undefined)?.items || [];
		if (!rows.length) {
			notify({ title: 'Nothing to export', variant: 'warning' });
			return;
		}
		const headers = ['Email', 'FirstName', 'LastName', 'Roles'];
		const lines = [headers.join(',')];
		rows.forEach((r: AppUser) => {
			const line = [r.email, r.firstName || '', r.lastName || '', (r.roles || []).join('|')]
				.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',');
			lines.push(line);
		});
		const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `app-${appId}-users.csv`;
		a.click();
		URL.revokeObjectURL(url);
		notify({ title: 'Export started' });
	}

		const total = (data as UsersResponse | undefined)?.total || 0;
	const totalPages = Math.max(1, Math.ceil(total / limit));

	return (
		<div className="space-y-6">
			<div className="flex flex-wrap gap-3 items-end justify-between">
				<div className="flex flex-wrap gap-3 items-end">
					<div className="space-y-1">
						<label className="text-[10px] font-medium uppercase tracking-wide text-neutral-500">Search</label>
						<input
							value={q}
							onChange={(e) => { setQ(e.target.value); setPage(1); }}
							placeholder="Search users…"
							className="h-8 w-48 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 text-xs focus:outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-600"
						/>
					</div>
					<div className="space-y-1">
						<label className="text-[10px] font-medium uppercase tracking-wide text-neutral-500">Role</label>
						<select
							value={role}
							onChange={(e) => { setRole(e.target.value); setPage(1); }}
							className="h-8 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 text-xs"
						>
							{ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
						</select>
					</div>
					<div className="space-y-1">
						<label className="text-[10px] font-medium uppercase tracking-wide text-neutral-500">Page Size</label>
						<select
							value={limit}
							onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
							className="h-8 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 text-xs"
						>
							{[10,20,50,100].map(n => <option key={n} value={n}>{n}</option>)}
						</select>
					</div>
					<div className="space-y-1">
						<label className="text-[10px] font-medium uppercase tracking-wide text-neutral-500 invisible">Export</label>
						<button onClick={exportCsv} className="h-8 px-3 text-xs rounded border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800">Export CSV</button>
					</div>
					{CAN_CREATE && (
						<div className="space-y-1">
							<label className="text-[10px] font-medium uppercase tracking-wide text-neutral-500 invisible">Create User</label>
							<a href={`/apps/${appId}/users/new`} className="h-8 px-3 inline-flex items-center text-xs rounded bg-neutral-900 text-white dark:bg-neutral-200 dark:text-neutral-900 font-medium hover:opacity-90">Create User</a>
						</div>
					)}
				</div>
				<div className="text-[11px] text-neutral-500 dark:text-neutral-400">
					{isFetching ? 'Refreshing…' : total ? `${total} users` : '—'}
				</div>
			</div>

					<DataTable<AppUser>
						columns={columns}
						data={(data as UsersResponse | undefined)?.items || []}
						page={page}
						pageCount={totalPages}
						onPageChange={(p) => setPage(Math.min(Math.max(1, p), totalPages))}
						onSortChange={() => { /* optionally map to backend sort in future */ }}
						isLoading={isLoading}
						emptyMessage="No users"
						getRowId={(r) => r.id}
					/>

			{isError && (
				<div className="text-xs text-red-600 dark:text-red-400">Error: {(error as any)?.message || 'Unknown error'} <button onClick={() => refetch()} className="underline ml-2">Retry</button></div>
			)}
		</div>
	);
}
