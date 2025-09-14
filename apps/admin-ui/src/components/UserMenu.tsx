"use client";
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth, logout } from '@/lib/keycloak-client';

export const UserMenu: React.FC = () => {
  const { profile } = useAuth();
  const email = profile?.email || profile?.preferred_username || 'user';
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) close();
    }
    if (open) document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open, close]);

  async function handleLogout() {
    try {
      await logout();
    } catch (e) {
      // ignore
    } finally {
      window.location.reload();
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="h-8 px-3 rounded border border-neutral-300 dark:border-neutral-700 bg-white/60 dark:bg-neutral-800/60 backdrop-blur text-xs font-medium flex items-center gap-2 hover:bg-neutral-100 dark:hover:bg-neutral-700"
      >
        <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-neutral-900 text-white dark:bg-neutral-200 dark:text-neutral-900 text-[10px] font-semibold">
          {email.slice(0,1).toUpperCase()}
        </span>
        <span className="max-w-[140px] truncate text-neutral-700 dark:text-neutral-200">{email}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" className={`transition-transform ${open ? 'rotate-180' : ''}`}><path fill="currentColor" d="M7 10l5 5 5-5z"/></svg>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-48 rounded border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-lg py-1 text-sm z-50 animate-in fade-in">
          <div className="px-3 py-2 text-[11px] text-neutral-500 dark:text-neutral-400 border-b border-neutral-100 dark:border-neutral-800 truncate" title={email}>{email}</div>
          <button
            onClick={handleLogout}
            className="w-full text-left px-3 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs flex items-center gap-2"
          >
            <span>Logout</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default UserMenu;
