const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
const API_BASE = `${API_URL}/api`;

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.text();
    let message = body || res.statusText;
    try {
      const parsed = JSON.parse(body);
      message = parsed.message || message;
    } catch {}
    throw new ApiError(message, res.status);
  }
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text);
}

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem("access_token");
  return token && isTokenExpired(token) ? null : token;
}

function getRefreshToken(): string | null {
  return typeof window !== "undefined" ? localStorage.getItem("refresh_token") : null;
}

function setTokens(access: string, refresh: string) {
  localStorage.setItem("access_token", access);
  localStorage.setItem("refresh_token", refresh);
}

function clearTokens() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
}

async function tryRefreshToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) {
      clearTokens();
      return false;
    }
    const data = await res.json();
    setTokens(data.access_token, data.refresh_token);
    return true;
  } catch {
    clearTokens();
    return false;
  }
}

async function authenticatedFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  let accessToken = getAccessToken();
  const refreshToken = getRefreshToken();

  if (!accessToken && refreshToken) {
    if (!isRefreshing) {
      isRefreshing = true;
      refreshPromise = tryRefreshToken().finally(() => {
        isRefreshing = false;
        refreshPromise = null;
      });
    }
    const refreshed = await refreshPromise;
    if (refreshed) accessToken = getAccessToken();
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  let res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401 && getRefreshToken()) {
    if (!isRefreshing) {
      isRefreshing = true;
      refreshPromise = tryRefreshToken().finally(() => {
        isRefreshing = false;
        refreshPromise = null;
      });
    }

    const refreshed = await refreshPromise;
    if (refreshed) {
      const newToken = getAccessToken();
      headers["Authorization"] = `Bearer ${newToken}`;
      res = await fetch(`${API_BASE}${path}`, { ...options, headers });
    }
  }

  return handleResponse<T>(res);
}

export const api = {
  async get<T>(path: string): Promise<T> {
    return authenticatedFetch<T>(path, { method: "GET" });
  },

  async post<T>(path: string, body?: unknown): Promise<T> {
    return authenticatedFetch<T>(path, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  async patch<T>(path: string, body: unknown): Promise<T> {
    return authenticatedFetch<T>(path, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },

  async delete(path: string): Promise<void> {
    await authenticatedFetch(path, { method: "DELETE" });
  },
};

export {
  setTokens,
  clearTokens,
  getAccessToken,
  getRefreshToken,
  tryRefreshToken,
  isTokenExpired,
  API_BASE,
  API_URL,
};
