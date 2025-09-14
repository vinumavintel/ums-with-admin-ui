"use client";
import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { post } from '@/lib/api';
import { useToast } from '../../../../providers'; // relative to /src/app/apps/[id]/users/new -> /src/app/providers

const ROLE_OPTIONS = [
  { value: '', label: 'Select role (optional)' },
  { value: 'super-admin', label: 'Super Admin' },
  { value: 'admin', label: 'Admin' },
  { value: 'read-write', label: 'Read / Write' },
  { value: 'read-only', label: 'Read Only' },
];

export default function NewUserPage() {
  const { id: appId } = useParams<{ id: string }>();
  const router = useRouter();
  const { notify } = useToast();

  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState('');
  const [tempPassword, setTempPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const canSubmit = emailValid && !pending;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setPending(true);
    setError(null);
    try {
      const body: Record<string, any> = {
        email: email.trim(),
      };
      if (firstName.trim()) body.firstName = firstName.trim();
      if (lastName.trim()) body.lastName = lastName.trim();
      if (role) body.role = role;
      if (tempPassword.trim()) body.tempPassword = tempPassword.trim();

      await post(`/v1/apps/${appId}/users`, body);
      notify({ title: 'User created' });
      router.push(`/apps/${appId}/users`);
    } catch (e: any) {
      setError(e?.message || 'Failed to create user');
      notify({ title: 'Creation failed', description: e?.message || 'Unknown error', variant: 'error' });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="max-w-xl space-y-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight mb-1">Create User</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-300">Add a new user to this application.</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1">
          <label className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">Email *</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="w-full h-9 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-600"
            placeholder="user@example.com"
            disabled={pending}
          />
          {!emailValid && email.length > 3 && (
            <p className="text-[11px] text-red-600 dark:text-red-400">Enter a valid email.</p>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1">
            <label className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">First Name</label>
            <input
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              className="w-full h-9 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-600"
              placeholder="Jane"
              disabled={pending}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">Last Name</label>
            <input
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              className="w-full h-9 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-600"
              placeholder="Doe"
              disabled={pending}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1">
            <label className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">Role</label>
            <select
              value={role}
              onChange={e => setRole(e.target.value)}
              className="w-full h-9 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 text-sm focus:outline-none"
              disabled={pending}
            >
              {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">Temp Password (optional)</label>
            <input
              value={tempPassword}
              onChange={e => setTempPassword(e.target.value)}
              className="w-full h-9 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-600"
              placeholder="Generate or enter temporary password"
              disabled={pending}
            />
          </div>
        </div>
        {error && (
          <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 rounded px-3 py-2">{error}</div>
        )}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={!canSubmit}
            className="px-4 h-9 rounded bg-neutral-900 text-white dark:bg-neutral-200 dark:text-neutral-900 text-sm font-medium hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-2"
          >
            {pending && <Spinner size={14} />}Create User
          </button>
          <button
            type="button"
            onClick={() => router.push(`/apps/${appId}/users`)}
            disabled={pending}
            className="px-4 h-9 rounded border border-neutral-300 dark:border-neutral-600 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-50"
          >Cancel</button>
        </div>
      </form>
    </div>
  );
}

function Spinner({ size = 16 }: { size?: number }) {
  return (
    <svg
      className="animate-spin text-neutral-400"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}
