"use client";
import React from 'react';
import { useParams, usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { get } from '@/lib/api';
import Link from 'next/link';
import { CopyToClipboard } from '@/components/CopyToClipboard';

interface AppDetail {
	id: string;
	name: string;
	description?: string;
	keycloakClientId: string;
	usersCount?: number;
	roles?: { name: string; count?: number }[];
	createdAt: string;
	updatedAt: string;
}

export default function AppDetailPage() {
	const { id } = useParams<{ id: string }>();
	const pathname = usePathname();
	const { data, isLoading, isError, error } = useQuery<AppDetail>({
		queryKey: ['app', id],
		queryFn: () => get<AppDetail>(`/v1/apps/${id}`),
		enabled: !!id,
	});

	const currentTab = (() => {
		if (pathname.endsWith('/users')) return 'users';
		if (pathname.endsWith('/audit')) return 'audit';
		return 'overview';
	})();

	return (
		<div className="space-y-6">
			{isLoading && (
				<div className="p-8 text-center text-sm text-neutral-500">Loading application…</div>
			)}
			{isError && (
				<div className="p-8 text-center text-sm text-red-600 dark:text-red-400">Failed to load: {(error as any)?.message || 'Unknown error'}</div>
			)}
			{!isLoading && !isError && !data && (
				<div className="p-8 text-center text-sm text-neutral-500">Not found.</div>
			)}
			{data && (
				<>
					<div className="flex flex-wrap items-start gap-4 justify-between">
						<div className="space-y-1">
							<h1 className="text-2xl font-semibold tracking-tight">{data.name}</h1>
							{data.description && <p className="text-sm text-neutral-600 dark:text-neutral-300 max-w-prose">{data.description}</p>}
							<div className="flex items-center gap-2 text-xs text-neutral-500">
								<span className="font-mono bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded">{data.keycloakClientId}</span>
								<CopyToClipboard value={data.keycloakClientId} label="Copy Client ID" />
							</div>
							<div className="text-[11px] text-neutral-500 dark:text-neutral-400 flex gap-3 pt-1">
								<span>Created {new Date(data.createdAt).toLocaleString()}</span>
								<span>Updated {new Date(data.updatedAt).toLocaleString()}</span>
							</div>
						</div>
					</div>

					<div className="grid gap-4 md:grid-cols-3">
						<StatCard label="Users" value={data.usersCount ?? 0} />
						<StatCard label="Roles" value={data.roles?.length ?? 0} />
						<StatCard label="Total Role Assignments" value={(data.roles?.reduce((acc, r) => acc + (r.count || 0), 0)) ?? 0} />
					</div>

						<Tabs current={currentTab} base={`/apps/${data.id}`} />

					{currentTab === 'overview' && (
						<div className="space-y-6">
							<section>
								<h2 className="text-sm font-medium mb-2">Role Distribution</h2>
								{(!data.roles || data.roles.length === 0) && (
									<div className="text-xs text-neutral-500">No roles defined.</div>
								)}
								{data.roles && data.roles.length > 0 && (
									<ul className="space-y-1 text-xs">
										{data.roles.map(r => (
											<li key={r.name} className="flex justify-between rounded border border-neutral-200 dark:border-neutral-800 px-3 py-1">
												<span>{r.name}</span>
												<span className="font-mono">{r.count ?? 0}</span>
											</li>
										))}
									</ul>
								)}
							</section>
						</div>
					)}
					{currentTab === 'users' && (
						<div className="text-sm text-neutral-500">Users list coming soon…</div>
					)}
					{currentTab === 'audit' && (
						<div className="text-sm text-neutral-500">Audit trail coming soon…</div>
					)}
				</>
			)}
		</div>
	);
}

function StatCard({ label, value }: { label: string; value: number }) {
	return (
		<div className="rounded border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 flex flex-col gap-1">
			<span className="text-[11px] uppercase tracking-wide text-neutral-500">{label}</span>
			<span className="text-lg font-semibold tabular-nums">{value}</span>
		</div>
	);
}

function Tabs({ current, base }: { current: string; base: string }) {
	const tabs = [
		{ id: 'overview', label: 'Overview' },
		{ id: 'users', label: 'Users' },
		{ id: 'audit', label: 'Audit' },
	];
	return (
		<div className="border-b border-neutral-200 dark:border-neutral-800 flex gap-4 text-sm mt-4">
			{tabs.map(t => (
				<Link
					key={t.id}
					href={`${base}${t.id === 'overview' ? '' : `/${t.id}`}`}
					className={`pb-2 -mb-px border-b-2 ${current === t.id ? 'border-neutral-900 dark:border-neutral-100 font-medium' : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'}`}
				>
					{t.label}
				</Link>
			))}
		</div>
	);
}
