"use client";
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import Keycloak, { KeycloakInitOptions } from 'keycloak-js';
import { Env } from '@/env';

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

if (process.env.NODE_ENV === 'development') {
  console.log('[auth] ENV', {
    KC_BASE_URL: Env.KC_BASE_URL,
    KC_REALM: Env.KC_REALM,
    KC_CLIENT_ID: Env.KC_CLIENT_ID,
  });
}

if (process.env.NODE_ENV === 'development') {
  (keycloak as any)._instanceDebugId = (keycloak as any)._instanceDebugId || Math.random().toString(36).slice(2,8);
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
    return initPromise;
  }
  const options: KeycloakInitOptions = {
    onLoad: 'login-required',
    pkceMethod: 'S256',
    checkLoginIframe: false,
    silentCheckSsoRedirectUri: undefined,
  };
  initPromise = keycloak
    .init(options)
  .then((authenticated) => {
      if (authenticated) {
        if (refreshIntervalHandle) clearInterval(refreshIntervalHandle);
        refreshIntervalHandle = setInterval(async () => {
          try {
            const refreshed = await keycloak.updateToken(30);
            if (refreshed) {
            }
          } catch (e) {
            try { keycloak.login(); } catch (_) {}
          }
        }, 20_000);
        keycloak.onTokenExpired = () => {
          keycloak.updateToken(30).catch(() => {
            try { keycloak.login(); } catch (_) {}
          });
        };
      }
      if (authenticated && typeof window !== 'undefined') {
        setTimeout(() => {
          try { window.dispatchEvent(new Event('kc-auth-ready')); } catch (_) {}
        }, 0);
        notifyTokenWaiters(keycloak.token);
      }
      return authenticated;
    })
    .catch((err) => {
      return false;
    });
  return initPromise;
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return keycloak.token ?? null;
}

export function logout(): void {
  try { keycloak.logout(); } catch (e) { }
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
    (async () => {
      try {
        const authResult = await initAuth();
        if (!active) return;
        const t = getToken();
        setToken(t);
        setIsAuthenticated(authResult);
        setReady(true);
        notifyTokenWaiters(t);
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
        setReady(true);
      }
    })();
    mounted.current = true;
    return () => { active = false; };
  }, []);
  
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
