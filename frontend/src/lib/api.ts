const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

// ─── Token Management ───────────────────────────────────────────────
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("auth_token");
}

export function setToken(token: string): void {
  localStorage.setItem("auth_token", token);
}

export function removeToken(): void {
  localStorage.removeItem("auth_token");
}

// ─── API Fetch Helper ───────────────────────────────────────────────
interface FetchOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  isFormData?: boolean;
}

export async function apiFetch<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { method = "GET", body, headers = {}, isFormData = false } = options;

  const token = getToken();
  const fetchHeaders: Record<string, string> = {
    ...headers,
  };

  if (token) {
    fetchHeaders["Authorization"] = `Bearer ${token}`;
  }

  if (!isFormData && body) {
    fetchHeaders["Content-Type"] = "application/json";
  }

  const config: RequestInit = {
    method,
    headers: fetchHeaders,
  };

  if (body) {
    config.body = isFormData ? (body as FormData) : JSON.stringify(body);
  }

  const res = await fetch(`${API_BASE}${endpoint}`, config);

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(errorData.error || `HTTP ${res.status}`);
  }

  return res.json();
}

// ─── Auth API ───────────────────────────────────────────────────────
import type { AuthResponse, User } from "./types";

export async function login(email: string, password: string): Promise<AuthResponse> {
  const data = await apiFetch<AuthResponse>("/auth/login", {
    method: "POST",
    body: { email, password },
  });
  setToken(data.token);
  return data;
}

export async function register(
  email: string,
  password: string,
  fullName: string,
  phone: string
): Promise<AuthResponse> {
  const data = await apiFetch<AuthResponse>("/auth/register", {
    method: "POST",
    body: { email, password, full_name: fullName, phone },
  });
  setToken(data.token);
  return data;
}

export async function getMe(): Promise<User> {
  return apiFetch<User>("/auth/me");
}

export function logout(): void {
  removeToken();
  window.location.href = "/login";
}

// ─── Image URL Helper ───────────────────────────────────────────────
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";

export function getImageUrl(path: string): string {
  if (path.startsWith("http")) return path;
  return `${BACKEND_URL}${path}`;
}
