"use client";
import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { get } from '@/lib/api';
import { useToast } from '../../../providers';

interface AuditItem {
	id: string;
	appId: string;
	action: string; // e.g., role.add
	actor?: { id?: string; email?: string } | null;
	meta?: any;
	createdAt: string;
}

interface AuditResponse {
	items: AuditItem[];
	total: number;
	page: number;
	limit: number;
}

const ACTION_OPTIONS = [
	{ value: '', label: 'All actions' },
	{ value: 'role.add', label: 'Role Added' },
	{ value: 'role.remove', label: 'Role Removed' },
	{ value: 'reset.password', label: 'Password Reset' },
	{ value: 'user.create', label: 'User Created' },
];

export default function AuditPage() {
	const { id: appId } = useParams<{ id: string }>();
	const { notify } = useToast();
	const [page, setPage] = useState(1);
	const [limit, setLimit] = useState(20);
	const [action, setAction] = useState('');
	const [from, setFrom] = useState<string>('');
	const [to, setTo] = useState<string>('');

	const queryKey = ['audit', appId, { page, limit, action }];

	const { data, isLoading, isError, error, refetch, isFetching } = useQuery<AuditResponse>({
		queryKey,
		queryFn: () => get<AuditResponse>('/v1/audit', { params: { appId, page, limit, action: action || undefined } }),
		enabled: !!appId,
		placeholderData: (prev) => prev,
	});

	// Client-side date filtering
	const filteredItems = useMemo(() => {
		const items = (data?.items || []);
		const fromDate = from ? new Date(from) : null;
		const toDate = to ? new Date(to) : null;
		return items.filter(it => {
			const created = new Date(it.createdAt);
			if (fromDate && created < fromDate) return false;
			if (toDate && created > toDate) return false;
			return true;
		});
	}, [data, from, to]);

	const total = data?.total || 0;
	const totalPages = Math.max(1, Math.ceil(total / limit));

	function relativeTime(iso: string) {
		const now = Date.now();
		const then = new Date(iso).getTime();
		const diff = Math.floor((now - then) / 1000);
		if (diff < 60) return `${diff}s ago`;
		const m = Math.floor(diff / 60);
		if (m < 60) return `${m}m ago`;
		const h = Math.floor(m / 60);
		if (h < 24) return `${h}h ago`;
		const d = Math.floor(h / 24);
		if (d < 7) return `${d}d ago`;
		const w = Math.floor(d / 7);
		if (w < 4) return `${w}w ago`;
		const mo = Math.floor(d / 30);
		if (mo < 12) return `${mo}mo ago`;
		const y = Math.floor(d / 365);
		return `${y}y ago`;
	}

	function toggleMeta(id: string) {
		setOpenMeta(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
	}
	const [openMeta, setOpenMeta] = useState<string[]>([]);

	useEffect(() => { setPage(1); }, [action]);

	return (
		<div className="space-y-6">
			<div className="flex flex-wrap gap-4 items-end justify-between">
				<div className="flex flex-wrap gap-4 items-end">
					<div className="space-y-1">
						<label className="text-[10px] uppercase tracking-wide font-medium text-neutral-500">Action</label>
						<select
							value={action}
							onChange={e => setAction(e.target.value)}
							className="h-8 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 text-xs"
						>
							{ACTION_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
						</select>
					</div>
					<div className="space-y-1">
						<label className="text-[10px] uppercase tracking-wide font-medium text-neutral-500">From</label>
						<input type="date" value={from} onChange={e => setFrom(e.target.value)} className="h-8 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 text-xs" />
					</div>
						<div className="space-y-1">
						<label className="text-[10px] uppercase tracking-wide font-medium text-neutral-500">To</label>
						<input type="date" value={to} onChange={e => setTo(e.target.value)} className="h-8 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 text-xs" />
					</div>
					<div className="space-y-1">
						<label className="text-[10px] font-medium uppercase tracking-wide text-neutral-500">Page Size</label>
						<select value={limit} onChange={e => { setLimit(Number(e.target.value)); setPage(1); }} className="h-8 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 text-xs">
							{[10,20,50].map(n => <option key={n} value={n}>{n}</option>)}
						</select>
					</div>
				</div>
				<div className="text-[11px] text-neutral-500 dark:text-neutral-400">{isFetching ? 'Refreshing…' : `${total} events`}</div>
			</div>

			<div className="relative pl-4 border-l border-neutral-200 dark:border-neutral-800 space-y-6">
				{isLoading && (
					<div className="text-xs text-neutral-500">Loading audit events…</div>
				)}
				{!isLoading && filteredItems.length === 0 && (
					<div className="text-xs text-neutral-500">No audit events.</div>
				)}
				{!isLoading && filteredItems.map(item => {
					const metaOpen = openMeta.includes(item.id);
					return (
						<div key={item.id} className="relative">
							<span className="absolute -left-4 top-1.5 w-2 h-2 rounded-full bg-neutral-400 dark:bg-neutral-600" />
							<div className="flex flex-col gap-1">
								<div className="flex flex-wrap items-center gap-2 text-xs">
									<span className="font-medium">{item.action}</span>
									<span className="text-neutral-500">{item.actor?.email || 'system'}</span>
									<span className="text-neutral-400">{relativeTime(item.createdAt)}</span>
								</div>
								{item.meta && (
									<div className="text-[11px]">
										<button
											onClick={() => toggleMeta(item.id)}
											className="underline text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
										>
											{metaOpen ? 'Hide meta' : 'Show meta'}
										</button>
										{metaOpen && (
											<pre className="mt-2 max-h-72 overflow-auto rounded bg-neutral-900 text-neutral-100 p-3 text-[10px] whitespace-pre-wrap">{JSON.stringify(item.meta, null, 2)}</pre>
										)}
									</div>
								)}
							</div>
						</div>
					);
				})}
			</div>

			<div className="flex items-center justify-between text-xs pt-2">
				<div>Page {page} of {totalPages}</div>
				<div className="flex gap-2">
					<button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p-1))} className="px-2 py-1 rounded border border-neutral-300 dark:border-neutral-700 disabled:opacity-40">Prev</button>
					<button disabled={page >= totalPages} onClick={() => setPage(p => p+1)} className="px-2 py-1 rounded border border-neutral-300 dark:border-neutral-700 disabled:opacity-40">Next</button>
				</div>
			</div>

			{isError && (
				<div className="text-xs text-red-600 dark:text-red-400">Error: {(error as any)?.message || 'Unknown error'} <button onClick={() => refetch()} className="underline ml-2">Retry</button></div>
			)}
		</div>
	);
}
