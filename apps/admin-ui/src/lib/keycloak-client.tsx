"use client";
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import Keycloak, { KeycloakInitOptions } from 'keycloak-js';
import { Env } from '@/env';

// Ensure a single Keycloak instance across any duplicate module graphs (Turbopack/Next).
// We stash it on globalThis with a symbol key.
const KC_SINGLETON = Symbol.for('@@mavintel/keycloak');
declare global {
  // eslint-disable-next-line no-var
  var __kcSingleton: Keycloak | undefined;
}
const existing = globalThis.__kcSingleton as Keycloak | undefined;
export const keycloak: Keycloak = existing || (globalThis.__kcSingleton = new Keycloak({
  url: Env.KC_BASE_URL!,
  realm: Env.KC_REALM!,
  clientId: Env.KC_CLIENT_ID!,
}));

// after creating keycloak instance (dev only)
if (process.env.NODE_ENV === 'development') {
  console.log('[auth] ENV', {
    KC_BASE_URL: Env.KC_BASE_URL,
    KC_REALM: Env.KC_REALM,
    KC_CLIENT_ID: Env.KC_CLIENT_ID,
  });
}

if (process.env.NODE_ENV === 'development') {
  (keycloak as any)._instanceDebugId = (keycloak as any)._instanceDebugId || Math.random().toString(36).slice(2,8);
  console.log('[auth] Keycloak singleton id:', (keycloak as any)._instanceDebugId);
}

let initPromise: Promise<boolean> | null = null;
let refreshIntervalHandle: ReturnType<typeof setInterval> | null = null;

// Waiters for first real token availability
let tokenReady = false;
const tokenWaiters: ((token: string) => void)[] = [];
function notifyTokenWaiters(token: string | undefined | null) {
  if (!token || tokenReady) return;
  tokenReady = true;
  while (tokenWaiters.length) {
    const fn = tokenWaiters.shift();
    try { fn && token && fn(token); } catch {}
  }
}

export function waitForToken(timeoutMs = 7000): Promise<string> {
  const existing = keycloak.token;
  if (existing) return Promise.resolve(existing);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('waitForToken timeout')), timeoutMs);
    tokenWaiters.push((t) => { clearTimeout(timer); resolve(t); });
  });
}

function decodeJwt(token: string | undefined | null): any | null {
  if (!token) return null;
  try {
    const [, payload] = token.split('.');
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decodeURIComponent(escape(json)));
  } catch (e) {
    return null;
  }
}

export async function initAuth(): Promise<boolean> {
  if (initPromise) {
    console.log('[auth] initAuth already in progress, returning existing promise');
    return initPromise;
  }
  console.log('[auth] Starting Keycloak initialization...');
  const options: KeycloakInitOptions = {
    onLoad: 'login-required',
    pkceMethod: 'S256',
    checkLoginIframe: false,
    silentCheckSsoRedirectUri: undefined,
  };
  initPromise = keycloak
    .init(options)
  .then((authenticated) => {
      console.log('[auth] Keycloak init successful, authenticated:', authenticated);
      if (authenticated) {
        console.log('[auth] Setting up token refresh...');
        if (refreshIntervalHandle) clearInterval(refreshIntervalHandle);
        refreshIntervalHandle = setInterval(async () => {
          try {
            const refreshed = await keycloak.updateToken(30);
            if (refreshed) {
              console.log('[auth] Token refreshed');
            }
          } catch (e) {
            console.error('[auth] Token refresh failed:', e);
            try { keycloak.login(); } catch (_) {}
          }
        }, 20_000);
        keycloak.onTokenExpired = () => {
          console.log('[auth] Token expired, refreshing...');
          keycloak.updateToken(30).catch(() => {
            console.error('[auth] Token refresh on expiry failed');
            try { keycloak.login(); } catch (_) {}
          });
        };
      }
      // Fire a custom event so late subscribers (e.g. API layer) can react once we really have a token
      if (authenticated && typeof window !== 'undefined') {
        setTimeout(() => {
          try { window.dispatchEvent(new Event('kc-auth-ready')); } catch (_) {}
        }, 0);
        notifyTokenWaiters(keycloak.token);
      }
      return authenticated;
    })
    .catch((err) => {
      console.error('[auth] Keycloak init failed:', err);
      return false;
    });
  return initPromise;
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null; // avoid SSR noise
  return keycloak.token ?? null;
}

export function logout(): void {
  try { keycloak.logout(); } catch (e) { console.error('Logout error', e); }
}

interface AuthContextValue {
  isAuthenticated: boolean;
  token: string | null;
  profile: any | null;
  logout: () => void;
  ready: boolean;
}
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(getToken());
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!token);
  const [ready, setReady] = useState<boolean>(false);
  const mounted = useRef(false);
  useEffect(() => {
    let active = true;
    console.log('[auth] AuthProvider useEffect starting...');
    (async () => {
      try {
        console.log('[auth] About to call initAuth...');
        const authResult = await initAuth();
        console.log('[auth] initAuth completed with result:', authResult);
        if (!active) return;
        const t = getToken();
        console.log('[auth] Setting state - token present:', !!t, 'authResult:', authResult);
        setToken(t);
        setIsAuthenticated(authResult);
        setReady(true);
        notifyTokenWaiters(t);
        // Attach Keycloak lifecycle event handlers (only once after init)
        keycloak.onAuthSuccess = () => {
          const nt = getToken();
          setToken(nt);
          setIsAuthenticated(!!nt);
        };
        keycloak.onAuthRefreshSuccess = () => {
          const nt = getToken();
          setToken(nt);
          setIsAuthenticated(!!nt);
        };
        keycloak.onAuthLogout = () => {
          setToken(null);
          setIsAuthenticated(false);
        };
      } catch (error) {
        console.error('[auth] AuthProvider initialization failed:', error);
        setReady(true); // Set ready even on error to prevent infinite loading
      }
    })();
    mounted.current = true;
    return () => { active = false; };
  }, []);
  
  console.log('[auth] AuthProvider render - state:', { ready, isAuthenticated, hasToken: !!token });
  const profile = decodeJwt(token);
  const value: AuthContextValue = { isAuthenticated, token, profile, logout, ready };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

const exported = { keycloak, initAuth, getToken, logout, waitForToken };
export default exported;
