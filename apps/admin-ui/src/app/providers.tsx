"use client";
import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/lib/keycloak-client';

export interface ToastMessage {
  id: string;
  title?: string;
  description?: string;
  variant?: 'default' | 'success' | 'error' | 'warning' | 'info';
  duration?: number; // ms
}

interface ToastContextValue {
  push: (msg: Omit<ToastMessage, 'id'>) => string;
  dismiss: (id: string) => void;
  clear: () => void;
  messages: ToastMessage[];
}

const MAX_TOASTS = 5;
const DEFAULT_DURATION = 4000;

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

function ToastProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<ToastMessage[]>([]);
  // Keep timeout refs to allow manual dismissal
  const timers = useRef<Record<string, NodeJS.Timeout>>({});

  const dismiss = useCallback((id: string) => {
    setMessages(curr => curr.filter(m => m.id !== id));
    if (timers.current[id]) {
      clearTimeout(timers.current[id]);
      delete timers.current[id];
    }
  }, []);

  const scheduleRemoval = useCallback((toast: ToastMessage) => {
    const duration = toast.duration ?? DEFAULT_DURATION;
    if (duration <= 0) return; // persistent toast
    timers.current[toast.id] = setTimeout(() => dismiss(toast.id), duration);
  }, [dismiss]);

  const push = useCallback((msg: Omit<ToastMessage, 'id'>) => {
    const id = Math.random().toString(36).slice(2, 10);
    const toast: ToastMessage = { id, ...msg };
    setMessages(curr => {
      const next = [...curr, toast];
      // enforce queue max (drop oldest)
      if (next.length > MAX_TOASTS) next.shift();
      return next;
    });
    scheduleRemoval(toast);
    return id;
  }, [scheduleRemoval]);

  const clear = useCallback(() => {
    Object.values(timers.current).forEach(t => clearTimeout(t));
    timers.current = {};
    setMessages([]);
  }, []);

  // Cleanup timers on unmount
  useEffect(() => () => clear(), [clear]);

  const value: ToastContextValue = { push, dismiss, clear, messages };
  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
}

function variantClasses(variant?: ToastMessage['variant']) {
  switch (variant) {
    case 'success': return 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950';
    case 'error': return 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950';
    case 'warning': return 'border-amber-300 dark:border-amber-600 bg-amber-50 dark:bg-amber-950';
    case 'info': return 'border-sky-300 dark:border-sky-700 bg-sky-50 dark:bg-sky-950';
    default: return 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900';
  }
}

function ToastContainer() {
  const ctx = useContext(ToastContext);
  if (!ctx) return null;
  return (
    <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50">
      {ctx.messages.map(m => (
        <div key={m.id} className={`group rounded border shadow px-4 py-3 text-sm flex items-start gap-3 w-80 overflow-hidden animate-in fade-in slide-in-from-bottom-2 ${variantClasses(m.variant)}`} role="status">
          <div className="flex-1 min-w-0">
            {m.title && <p className="font-medium mb-0.5 text-sm leading-snug truncate" title={m.title}>{m.title}</p>}
            {m.description && <p className="text-neutral-700 dark:text-neutral-300 text-xs leading-snug whitespace-pre-wrap break-words">{m.description}</p>}
          </div>
          <button onClick={() => ctx.dismiss(m.id)} className="opacity-40 hover:opacity-80 text-xs transition-colors">✕</button>
        </div>
      ))}
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  const success = useCallback((title: string, description?: string) => ctx.push({ title, description, variant: 'success' }), [ctx]);
  const error = useCallback((title: string, description?: string) => ctx.push({ title, description, variant: 'error' }), [ctx]);
  const info = useCallback((title: string, description?: string) => ctx.push({ title, description, variant: 'info' }), [ctx]);
  const warning = useCallback((title: string, description?: string) => ctx.push({ title, description, variant: 'warning' }), [ctx]);
  // Backwards compatibility: legacy notify API (accepts object)
  const notify = useCallback((msg: Omit<ToastMessage, 'id'>) => ctx.push(msg), [ctx]);
  return { ...ctx, success, error, info, warning, notify };
}

// React Query setup
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      // Increased to 60s to reduce duplicate network requests during rapid dev remounts
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      // Prevent refetch on remount if data is still fresh within staleTime
      refetchOnMount: false,
      // Add refetch interval to prevent continuous polling
      refetchInterval: false,
      refetchIntervalInBackground: false,
    },
    mutations: {
      retry: 1,
    }
  }
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          {children}
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
