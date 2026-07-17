// Thin client for the Foodlog server (same API the website uses). All requests
// go to the production origin so the phone and the website share one account,
// one synced state, and the same AI scan/parse endpoints.

import { FoodlogState } from './types';

export const API_BASE = 'https://foodlog.xyz';

/** URL of the browser-based Google sign-in bridge (returns foodlog://auth#token=…). */
export const GOOGLE_BRIDGE_URL = `${API_BASE}/mobile-signin.html`;
/** Deep-link the bridge redirects back to after a successful Google sign-in. */
export const AUTH_REDIRECT = 'foodlog://auth';

export interface ApiUser {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

export interface AuthResult {
  token: string;
  user: ApiUser;
}

async function req<T>(path: string, opts: { method?: string; token?: string; body?: any } = {}): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: opts.method || 'GET',
      headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    throw new Error('Network error — check your connection and try again.');
  }
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON */
  }
  if (!res.ok) {
    throw new Error((data && data.error) || `Request failed (${res.status}).`);
  }
  return data as T;
}

export const api = {
  register: (name: string, email: string, password: string) =>
    req<AuthResult>('/api/auth/register', { method: 'POST', body: { name, email, password } }),

  login: (email: string, password: string) =>
    req<AuthResult>('/api/auth/login', { method: 'POST', body: { email, password } }),

  me: (token: string) => req<{ user: ApiUser | null }>('/api/auth/me', { token }),

  logout: (token: string) => req<{ ok: boolean }>('/api/auth/logout', { method: 'POST', token }),

  getState: (token: string) => req<{ state: FoodlogState | null }>('/api/sync', { token }),

  putState: (token: string, state: FoodlogState) =>
    req<{ ok: boolean }>('/api/sync', { method: 'POST', token, body: { state } }),

  scan: (token: string, image: string) =>
    req<{ items: ScanItem[]; summary: string }>('/api/scan', { method: 'POST', token, body: { image } }),

  parse: (token: string, text: string) =>
    req<{ items: ParseItem[]; summary: string }>('/api/parse', { method: 'POST', token, body: { text } }),
};

export interface ScanItem {
  name: string;
  serving: string;
  category: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  confidence?: number;
  note?: string;
}

export interface ParseItem extends ScanItem {
  quantity?: number;
  emoji?: string;
}
