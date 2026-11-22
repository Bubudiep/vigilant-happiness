import { siteConfig } from "./site";

export type AuthProvider = "zalo" | "google";

export interface AuthUser {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  provider: AuthProvider;
  avatarText: string;
  loggedInAt: string;
}

const AUTH_STORAGE_KEY = "recloud_auth_user_v1";
const AUTH_TOKEN_KEY = "recloud_auth_token_v1";
const LAST_LOGIN_KEY = "recloud_last_login_v1";

export interface LastLoginHint {
  name: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  avatarText: string;
  provider: AuthProvider;
}

export const oauthConfig = {
  zaloOAuthUrl: (import.meta.env.VITE_ZALO_OAUTH_URL as string | undefined) || "",
  googleOAuthUrl: (import.meta.env.VITE_GOOGLE_OAUTH_URL as string | undefined) || "",
};

export function getGoogleLoginUrl(redirectPath = "/admin/overview", loginHint?: string): string {
  if (oauthConfig.googleOAuthUrl) {
    return oauthConfig.googleOAuthUrl;
  }
  const params = new URLSearchParams({ redirect: redirectPath });
  if (loginHint?.trim()) {
    params.set("login_hint", loginHint.trim());
  }
  return `${siteConfig.apiUrl}/auth/google?${params.toString()}`;
}

export function getLastLoginHint(): LastLoginHint | null {
  try {
    const raw = localStorage.getItem(LAST_LOGIN_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as LastLoginHint;
  } catch {
    return null;
  }
}

export function clearLastLoginHint() {
  localStorage.removeItem(LAST_LOGIN_KEY);
}

export function getStoredAuthUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function getStoredAuthToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function saveAuthUser(user: AuthUser, token?: string) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
  if (token) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  }
  const hint: LastLoginHint = {
    name: user.name,
    email: user.email,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    avatarText: user.avatarText,
    provider: user.provider,
  };
  localStorage.setItem(LAST_LOGIN_KEY, JSON.stringify(hint));
}

export function clearAuthUser() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

export async function fetchGoogleClientId(): Promise<string | null> {
  const envId = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) || "";
  if (envId) return envId;
  try {
    const res = await fetch(`${siteConfig.apiUrl}/auth/google/config`);
    if (!res.ok) return null;
    const data = (await res.json()) as { clientId?: string | null };
    return data.clientId || null;
  } catch {
    return null;
  }
}

export async function loginWithGoogleOneTap(credential: string): Promise<{ token: string; user: AuthUser }> {
  const res = await fetch(`${siteConfig.apiUrl}/auth/google/one-tap`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credential }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message || "Đăng nhập Google One Tap thất bại");
  }
  const data = (await res.json()) as {
    token: string;
    user: {
      id: string;
      name: string;
      email?: string | null;
      phone?: string | null;
      avatarUrl?: string | null;
      provider: AuthProvider;
      lastLoginAt?: string;
    };
  };
  const user: AuthUser = {
    id: data.user.id,
    name: data.user.name,
    email: data.user.email ?? undefined,
    phone: data.user.phone ?? undefined,
    avatarUrl: data.user.avatarUrl ?? undefined,
    provider: "google",
    avatarText: data.user.name.trim().slice(0, 1).toUpperCase(),
    loggedInAt: data.user.lastLoginAt || new Date().toISOString(),
  };
  return { token: data.token, user };
}

export async function fetchMeFromBackend(token: string): Promise<AuthUser> {
  const res = await fetch(`${siteConfig.apiUrl}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error("Không thể xác thực phiên đăng nhập từ máy chủ");
  }
  const data = (await res.json()) as {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    avatarUrl?: string | null;
    provider: AuthProvider;
    lastLoginAt?: string;
  };
  return {
    id: data.id,
    name: data.name,
    email: data.email ?? undefined,
    phone: data.phone ?? undefined,
    avatarUrl: data.avatarUrl ?? undefined,
    provider: data.provider === "zalo" ? "zalo" : "google",
    avatarText: data.name.trim().slice(0, 1).toUpperCase(),
    loggedInAt: data.lastLoginAt || new Date().toISOString(),
  };
}

/**
 * Trước đây hàm này tạo phiên đăng nhập từ query `?auth_provider=...&auth_name=...`
 * — ai gõ URL cũng vào được trang quản trị. Đăng nhập thật đi qua `?token=` (xử lý trong
 * AdminLogin, có xác minh với backend /auth/me), nên ở đây chỉ dọn các tham số cũ.
 */
export function consumeOAuthCallbackFromUrl(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  if (params.has("auth_provider") || params.has("auth_name")) {
    window.history.replaceState({}, document.title, window.location.pathname);
  }
  return null;
}
