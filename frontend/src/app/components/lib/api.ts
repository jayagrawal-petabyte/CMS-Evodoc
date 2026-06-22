// Thin fetch wrapper that talks to the CareDesk backend.
// Attaches the JWT access token, and transparently refreshes it on a 401.

const API_URL = (import.meta as any).env?.VITE_API_URL ?? "http://localhost:4000";

const TOKEN_KEY = "cms_access_token";

let accessToken: string | null = null;
try {
  accessToken = localStorage.getItem(TOKEN_KEY);
} catch {
  /* ignore */
}

export function setAccessToken(token: string | null) {
  accessToken = token;
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export function getAccessToken() {
  return accessToken;
}

export function getApiUrl() {
  return API_URL;
}

let refreshing: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshing) {
    refreshing = fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    })
      .then(async (r) => {
        if (!r.ok) return null;
        const data = await r.json();
        const t = data.accessToken ?? null;
        setAccessToken(t);
        return t;
      })
      .catch(() => null)
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

export interface ApiOptions extends Omit<RequestInit, "body"> {
  body?: any;
  /** Skip the auto-refresh-on-401 retry (used internally). */
  _retry?: boolean;
}

export async function api<T = any>(path: string, options: ApiOptions = {}): Promise<T> {
  const { body, headers, _retry, ...rest } = options;

  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    credentials: "include",
    headers: {
      ...(isForm ? {} : body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(headers as Record<string, string>),
    },
    body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
  });

  // Try one transparent refresh + retry on 401.
  if (res.status === 401 && !_retry) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      return api<T>(path, { ...options, _retry: true });
    }
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const err = await res.json();
      message = err.error ?? err.message ?? message;
    } catch {
      /* non-json */
    }
    const e = new Error(message) as Error & { status?: number };
    e.status = res.status;
    throw e;
  }

  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

// Convenience helpers
export const apiGet = <T = any>(path: string) => api<T>(path, { method: "GET" });
export const apiPost = <T = any>(path: string, body?: any) => api<T>(path, { method: "POST", body });
export const apiPut = <T = any>(path: string, body?: any) => api<T>(path, { method: "PUT", body });
export const apiPatch = <T = any>(path: string, body?: any) => api<T>(path, { method: "PATCH", body });
export const apiDelete = <T = any>(path: string) => api<T>(path, { method: "DELETE" });
