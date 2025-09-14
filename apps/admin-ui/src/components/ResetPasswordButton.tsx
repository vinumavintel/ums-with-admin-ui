"use client";
import React, { useState } from 'react';
import { post } from '@/lib/api';
import { useToast } from '@/app/providers';

interface ResetPasswordButtonProps {
  appId: string;
  userId: string;
  className?: string;
  label?: string;
}

export function ResetPasswordButton({ appId, userId, className = '', label = 'Reset Password' }: ResetPasswordButtonProps) {
  const { notify } = useToast();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleConfirm() {
    setPending(true);
    try {
      await post(`/v1/apps/${appId}/users/${userId}/reset-password`, {});
      notify({ title: 'Reset email sent' });
      setOpen(false);
    } catch (e: any) {
      notify({ title: 'Reset failed', description: e?.message || 'Unknown error', variant: 'error' });
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={() => setOpen(true)}
        className={`text-[10px] px-2 py-1 rounded border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-50 inline-flex items-center gap-1 ${className}`}
      >
        {pending && <Spinner size={12} />} {label}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !pending && setOpen(false)} />
          <div className="relative w-full max-w-sm rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-6 shadow-lg space-y-4">
            <h2 className="text-lg font-semibold">Confirm</h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">Send password reset email to this user?</p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => setOpen(false)}
                className="px-3 py-2 text-xs rounded border border-neutral-300 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-50"
              >Cancel</button>
              <button
                type="button"
                disabled={pending}
                onClick={handleConfirm}
                className="px-3 py-2 text-xs rounded bg-neutral-900 text-white dark:bg-neutral-200 dark:text-neutral-900 font-medium hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-1"
              >{pending && <Spinner size={12} />}Send</button>
            </div>
          </div>
        </div>
      )}
    </>
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

export default ResetPasswordButton;
