import type { Operator } from "./types";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "/api";
export const AUTH_STORAGE_KEY = "resq-operator";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: {
      ...(init?.body && !(init.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      ...init?.headers,
    },
    ...init,
  });

  if (res.status === 204) return undefined as T;

  const data = res.status === 204 ? null : await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      (data && (data.detail || data.message)) || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data as T;
}

export const api = {
  base: API_BASE,
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  postForm: <T>(path: string, form: FormData) =>
    request<T>(path, { method: "POST", body: form }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

export async function loginOperator(email: string, password: string): Promise<Operator> {
  const data = await api.post<{ operator: Operator }>("/auth/login/", { email, password });
  return data.operator;
}

export async function fetchOperator(): Promise<Operator> {
  const data = await api.get<{ operator: Operator }>("/auth/me/");
  return data.operator;
}

export function logoutOperator(): Promise<void> {
  return api.post<void>("/auth/logout/").catch(() => undefined);
}

export function readStoredOperator(): Operator | null {
  try {
    const saved = localStorage.getItem(AUTH_STORAGE_KEY);
    return saved ? (JSON.parse(saved) as Operator) : null;
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}
