"use client";
import React, { useMemo, useState } from 'react';

// Column definition: either accessorKey for direct property or accessorFn for custom extraction
export interface DataTableColumn<T> {
	header: string;
	accessorKey?: string; // property name
	accessorFn?: (row: T) => any; // alternative accessor
	cell?: (row: T) => React.ReactNode; // custom cell renderer
	className?: string;
	sortable?: boolean;
}

export interface DataTableProps<T> {
	columns: DataTableColumn<T>[];
	data: T[];
	page: number;
	pageCount: number;
	onPageChange?: (page: number) => void;
	onSortChange?: (sort: { key: string; direction: 'asc' | 'desc' } | null) => void;
	isLoading?: boolean;
	emptyMessage?: string;
	getRowId?: (row: T, index: number) => string | number;
	className?: string;
	initialSort?: { key: string; direction: 'asc' | 'desc' } | null;
}

export function DataTable<T>({
	columns,
	data,
	page,
	pageCount,
	onPageChange,
	onSortChange,
	isLoading,
	emptyMessage = 'No data',
	getRowId,
	className = '',
	initialSort = null,
}: DataTableProps<T>) {
	const [sort, setSort] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(initialSort);

	function toggleSort(col: DataTableColumn<T>) {
		if (!(col.sortable && (col.accessorKey || col.accessorFn))) return;
		const key = col.accessorKey || col.header;
			setSort(prev => {
				if (!prev || prev.key !== key) {
					const next: { key: string; direction: 'asc' | 'desc' } = { key, direction: 'asc' };
					onSortChange?.(next);
					return next;
				}
				const nextDir: 'asc' | 'desc' = prev.direction === 'asc' ? 'desc' : 'asc';
				const next: { key: string; direction: 'asc' | 'desc' } = { key, direction: nextDir };
				onSortChange?.(next);
				return next;
			});
	}

	const sortedData = useMemo(() => {
		if (!sort) return data;
		const col = columns.find(c => (c.accessorKey || c.header) === sort.key);
		if (!col) return data;
		const accessor = col.accessorFn || ((row: any) => (col.accessorKey ? row[col.accessorKey] : undefined));
		return [...data].sort((a, b) => {
			const av = accessor(a);
			const bv = accessor(b);
			if (av == null && bv == null) return 0;
			if (av == null) return 1;
			if (bv == null) return -1;
			if (av > bv) return sort.direction === 'asc' ? 1 : -1;
			if (av < bv) return sort.direction === 'asc' ? -1 : 1;
			return 0;
		});
	}, [data, sort, columns]);

	return (
		<div className={`overflow-x-auto rounded border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 ${className}`}>
			<table className="w-full text-sm">
				<thead className="bg-neutral-50 dark:bg-neutral-800/60 text-neutral-600 dark:text-neutral-300 select-none">
					<tr>
						{columns.map(col => {
							const key = col.accessorKey || col.header;
							const isSorted = sort?.key === key;
							return (
								<th
									key={key}
									onClick={() => toggleSort(col)}
									className={`text-left font-medium px-4 py-2 whitespace-nowrap ${col.sortable ? 'cursor-pointer hover:text-neutral-800 dark:hover:text-neutral-200' : ''}`}
								>
									<span className="inline-flex items-center gap-1">
										{col.header}
										{col.sortable && (
											<span className="text-[10px] opacity-70">
												{isSorted ? (sort!.direction === 'asc' ? '▲' : '▼') : '↕'}
											</span>
										)}
									</span>
								</th>
							);
						})}
					</tr>
				</thead>
				<tbody>
					{isLoading && (
						<tr><td colSpan={columns.length} className="px-4 py-6 text-center text-xs text-neutral-500">Loading…</td></tr>
					)}
					{!isLoading && sortedData.length === 0 && (
						<tr><td colSpan={columns.length} className="px-4 py-6 text-center text-xs text-neutral-500">{emptyMessage}</td></tr>
					)}
					{!isLoading && sortedData.map((row, idx) => {
						const id = getRowId ? getRowId(row, idx) : (row as any).id ?? idx;
						return (
							<tr key={id} className="border-t border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40">
								{columns.map(col => {
									const content = col.cell
										? col.cell(row)
										: col.accessorFn
											? col.accessorFn(row)
											: col.accessorKey
												? (row as any)[col.accessorKey]
												: undefined;
									return (
										<td key={(col.accessorKey || col.header) + '-' + id} className={`px-4 py-2 align-top ${col.className || ''}`}>{content ?? '—'}</td>
									);
								})}
							</tr>
						);
					})}
				</tbody>
			</table>
			<div className="flex items-center justify-between px-4 py-2 border-t border-neutral-200 dark:border-neutral-800 text-xs bg-neutral-50/60 dark:bg-neutral-900/40">
				<div>Page {page} of {pageCount || 1}</div>
				<div className="flex gap-2">
					<button
						className="px-2 py-1 rounded border border-neutral-300 dark:border-neutral-700 disabled:opacity-40"
						onClick={() => onPageChange && onPageChange(Math.max(1, page - 1))}
						disabled={page <= 1}
					>Prev</button>
					<button
						className="px-2 py-1 rounded border border-neutral-300 dark:border-neutral-700 disabled:opacity-40"
						onClick={() => onPageChange && onPageChange(page + 1)}
						disabled={page >= pageCount}
					>Next</button>
				</div>
			</div>
		</div>
	);
}

export default DataTable;
