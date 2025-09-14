"use client";
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { getToken, keycloak, waitForToken } from './keycloak';
import { Env } from '@/env';

// Basic API URL validation - runs once at module load
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  if (!Env.UMS_API) {
    console.warn('[api] NEXT_PUBLIC_UMS_API is empty; API calls will be relative and likely 404.');
  }
}

// Axios instance
export const api = axios.create({
  baseURL: Env.UMS_API,
});

// Removed manual queue; instead we await waitForToken when a request needs auth and token not yet there.

// Request interceptor
api.interceptors.request.use(async (config) => {
  const token = getToken();
  if (!token) {
    try {
      const awaited = await waitForToken(8000);
      config.headers = config.headers ?? {};
      (config.headers as any).Authorization = `Bearer ${awaited}`;
      return config;
    } catch (e) {
      // Proceed without token if wait fails
      return config;
    }
  } else {
    config.headers = config.headers ?? {};
    (config.headers as any).Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: trigger re-auth on 401/403
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error) => {
    const status = error?.response?.status;
    if (status === 401 || status === 403) {
      // Only attempt re-login if we actually had a token (avoid loops when not yet authenticated)
      const hadToken = !!getToken();
      if (hadToken) {
        try { keycloak.login(); } catch (_) { /* noop */ }
      }
    }
    return Promise.reject(error);
  }
);

export async function get<T = any>(url: string, config?: AxiosRequestConfig) {
  const res = await api.get<T>(url, config);
  return res.data;
}

export async function post<T = any, B = any>(url: string, body?: B, config?: AxiosRequestConfig) {
  const res = await api.post<T>(url, body, config);
  return res.data;
}

export async function patch<T = any, B = any>(url: string, body?: B, config?: AxiosRequestConfig) {
  const res = await api.patch<T>(url, body, config);
  return res.data;
}

export async function del<T = any>(url: string, config?: AxiosRequestConfig) {
  const res = await api.delete<T>(url, config);
  return res.data;
}

export default api;