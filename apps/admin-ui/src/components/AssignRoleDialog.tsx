"use client";
import React, { useEffect, useMemo, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { post } from '@/lib/api';
import { useToast } from '@/app/providers';

/**
 * AssignRoleDialog
 * Props: { appId, userId, initialRoles, onUpdated }
 * Renders a modal dialog allowing selecting roles and submitting add/remove
 * operations. Parent component should conditionally render/unmount to close.
 */
interface AssignRoleDialogProps {
	appId: string;
	userId: string;
	initialRoles: string[];
	onUpdated: () => void; // also used to close by parent
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

const ALL_ROLES = ['super-admin','admin','read-write','read-only'];

export function AssignRoleDialog({ appId, userId, initialRoles, onUpdated, open, onOpenChange }: AssignRoleDialogProps) {
	const { notify } = useToast();
	const [selected, setSelected] = useState<string[]>([...initialRoles]);
	const [submitting, setSubmitting] = useState(false);
	const [errorMsg, setErrorMsg] = useState<string | null>(null);

	// Keep selected in sync if initialRoles prop changes while open
	useEffect(() => { setSelected([...initialRoles]); }, [initialRoles]);

	function toggle(role: string) {
		setSelected(prev => prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]);
	}

	const { added, removed, hasChanges } = useMemo(() => {
		const setInitial = new Set(initialRoles);
		const setSelected = new Set(selected);
		const addedArr = [...setSelected].filter(r => !setInitial.has(r));
		const removedArr = [...setInitial].filter(r => !setSelected.has(r));
		return { added: addedArr, removed: removedArr, hasChanges: addedArr.length > 0 || removedArr.length > 0 };
	}, [initialRoles, selected]);

	async function handleSubmit() {
		if (!hasChanges || submitting) return;
		setSubmitting(true);
		setErrorMsg(null);
		try {
			const ops: Promise<any>[] = [];
			for (const role of added) {
				ops.push(post(`/v1/apps/${appId}/users/${userId}/roles`, { role, op: 'add' }));
			}
			for (const role of removed) {
				ops.push(post(`/v1/apps/${appId}/users/${userId}/roles`, { role, op: 'remove' }));
			}
			await Promise.all(ops);
			notify({ title: 'Roles updated', description: 'Changes applied successfully.' });
			onUpdated(); // parent likely refetches
			onOpenChange(false);
		} catch (e: any) {
			const desc = e?.message || 'Unknown error';
			setErrorMsg(desc);
			notify({ title: 'Update failed', description: desc, variant: 'error' });
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<Dialog.Root open={open} onOpenChange={onOpenChange}>
			<Dialog.Portal>
				<Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out" />
				<Dialog.Content className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-6 shadow-lg flex flex-col gap-5 focus:outline-none" aria-describedby="assign-roles-desc">
					<div className="flex items-start justify-between gap-4">
						<div className="space-y-1">
							<Dialog.Title className="text-lg font-semibold">Assign Roles</Dialog.Title>
							<Dialog.Description id="assign-roles-desc" className="text-xs text-neutral-500 dark:text-neutral-400">Modify role assignments for this user.</Dialog.Description>
						</div>
						<Dialog.Close asChild>
							<button aria-label="Close" className="h-6 w-6 inline-flex items-center justify-center rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500" disabled={submitting}>
								✕
							</button>
						</Dialog.Close>
					</div>
					{errorMsg && <div role="alert" className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950 rounded px-2 py-1">{errorMsg}</div>}
					<div className="space-y-2 max-h-64 overflow-auto pr-1" aria-label="Available roles">
						{ALL_ROLES.map(role => {
							const checked = selected.includes(role);
							return (
								<label key={role} className="flex items-center gap-3 text-sm cursor-pointer select-none px-2 py-1 rounded hover:bg-neutral-50 dark:hover:bg-neutral-800">
									<input
										aria-label={`Toggle role ${role}`}
										type="checkbox"
										className="accent-neutral-900 dark:accent-neutral-200"
										checked={checked}
										disabled={submitting}
										onChange={() => toggle(role)}
									/>
									<span className="font-medium">{role}</span>
								</label>
							);
						})}
					</div>
					<div className="text-[11px] text-neutral-500 dark:text-neutral-400 flex flex-wrap gap-3" aria-live="polite">
						<span>Added: {added.length}</span>
						<span>Removed: {removed.length}</span>
						{!hasChanges && <span>No changes</span>}
					</div>
					<footer className="flex justify-end gap-2 pt-2">
						<Dialog.Close asChild>
							<button
								type="button"
								disabled={submitting}
								className="px-3 py-2 text-xs rounded border border-neutral-300 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-50"
							>Close</button>
						</Dialog.Close>
						<button
							type="button"
							onClick={handleSubmit}
							disabled={!hasChanges || submitting}
							className="px-3 py-2 text-xs rounded bg-neutral-900 text-white dark:bg-neutral-200 dark:text-neutral-900 font-medium hover:opacity-90 disabled:opacity-50"
						>{submitting ? 'Saving…' : 'Save Changes'}</button>
					</footer>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}

export default AssignRoleDialog;
