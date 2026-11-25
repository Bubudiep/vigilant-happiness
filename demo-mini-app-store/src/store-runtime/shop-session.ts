import { authorize, getAccessToken, getPhoneNumber, nativeStorage } from "zmp-sdk";

import { appConfig } from "@/config";

/**
 * Đăng nhập khách của một gian hàng: lấy token Zalo → POST /shop/:slug/auth/zalo → token riêng của store
 * (lưu theo slug; nativeStorage, lỗi thì localStorage). 401 → thử đăng nhập lại 1 lần rồi báo ShopAuthError.
 */

export interface ShopCustomer {
  id?: string;
  name?: string;
  avatarUrl?: string | null;
  phone?: string | null;
  [k: string]: unknown;
}

export interface ShopSession {
  token: string;
  /** epoch ms */
  expiresAt: number;
  customer?: ShopCustomer;
}

export type ShopLoginFail = "denied" | "outside_zalo" | "no_api" | "error";

/** Chưa đăng nhập / token hết hạn và không đăng nhập lại được. */
export class ShopAuthError extends Error {
  constructor(
    message: string,
    readonly reason: ShopLoginFail | "expired" = "expired",
  ) {
    super(message);
  }
}

export class ShopApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

const key = (slug: string) => `remini_shop_${slug}_v1`;

function readRaw(k: string): string | null {
  try {
    const v = nativeStorage.getItem(k);
    if (v) return String(v);
  } catch {
    // dùng localStorage bên dưới
  }
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
}

function writeRaw(k: string, v: string | null) {
  try {
    if (v) nativeStorage.setItem(k, v);
    else nativeStorage.removeItem(k);
    return;
  } catch {
    // thử localStorage
  }
  try {
    if (v) localStorage.setItem(k, v);
    else localStorage.removeItem(k);
  } catch {
    // bỏ qua
  }
}

export function getShopSession(slug: string): ShopSession | null {
  const raw = readRaw(key(slug));
  if (!raw) return null;
  try {
    const s = JSON.parse(raw) as ShopSession;
    return s?.token && s.expiresAt > Date.now() + 30_000 ? s : null;
  } catch {
    return null;
  }
}

export function clearShopSession(slug: string) {
  writeRaw(key(slug), null);
}

function isDenied(e: unknown): boolean {
  const code = (e as { code?: number })?.code;
  const msg = String((e as { message?: string })?.message ?? "").toLowerCase();
  return code === -201 || msg.includes("denied") || msg.includes("reject") || msg.includes("từ chối");
}

const LOGIN_MESSAGES: Record<ShopLoginFail, string> = {
  denied: "Bạn chưa đồng ý chia sẻ thông tin Zalo",
  outside_zalo: "Đăng nhập chỉ hoạt động khi mở trong ứng dụng Zalo",
  no_api: "Mini App chưa cấu hình máy chủ (VITE_API_URL)",
  error: "Đăng nhập không thành công, vui lòng thử lại",
};

/** Đăng nhập Zalo vào gian hàng `slug`. Ném ShopAuthError (có `reason`) nếu không được. */
export async function shopLogin(slug: string): Promise<ShopSession> {
  if (!appConfig.apiUrl) throw new ShopAuthError(LOGIN_MESSAGES.no_api, "no_api");
  try {
    await authorize({ scopes: ["scope.userInfo", "scope.userPhonenumber"] });
  } catch (e) {
    if (isDenied(e)) throw new ShopAuthError(LOGIN_MESSAGES.denied, "denied");
    if (!/zalo/i.test(navigator.userAgent)) throw new ShopAuthError(LOGIN_MESSAGES.outside_zalo, "outside_zalo");
    // một số bản Zalo báo lỗi dù đã cấp quyền → vẫn thử tiếp
  }
  try {
    const accessToken = await getAccessToken();
    let phoneToken: string | undefined;
    try {
      phoneToken = (await getPhoneNumber()).token;
    } catch {
      // không cho SĐT vẫn đăng nhập được
    }
    const res = await fetch(`${appConfig.apiUrl}/shop/${encodeURIComponent(slug)}/auth/zalo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken, ...(phoneToken ? { phoneToken } : {}) }),
    });
    const data = (await res.json().catch(() => null)) as { access_token?: string; expires_in?: number; customer?: ShopCustomer; message?: string | string[] } | null;
    if (!res.ok || !data?.access_token) {
      const m = Array.isArray(data?.message) ? data?.message[0] : data?.message;
      throw new ShopAuthError(m || LOGIN_MESSAGES.error, "error");
    }
    const session: ShopSession = { token: data.access_token, expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000, customer: data.customer };
    writeRaw(key(slug), JSON.stringify(session));
    return session;
  } catch (e) {
    if (e instanceof ShopAuthError) throw e;
    if (isDenied(e)) throw new ShopAuthError(LOGIN_MESSAGES.denied, "denied");
    console.warn("shopLogin", e);
    throw new ShopAuthError(LOGIN_MESSAGES.error, "error");
  }
}

/** Gọi API của khách: tự gắn token; 401 → xoá token, đăng nhập lại 1 lần rồi gọi lại. */
export async function shopFetch<T>(slug: string, path: string, init: RequestInit = {}, retried = false): Promise<T> {
  if (!appConfig.apiUrl) throw new ShopAuthError(LOGIN_MESSAGES.no_api, "no_api");
  const session = getShopSession(slug);
  if (!session) throw new ShopAuthError("Chưa đăng nhập", "expired");
  let res: Response;
  try {
    res = await fetch(`${appConfig.apiUrl}/shop/${encodeURIComponent(slug)}${path}`, {
      ...init,
      headers: {
        ...(typeof init.body === "string" ? { "Content-Type": "application/json" } : {}),
        Authorization: `Bearer ${session.token}`,
        ...(init.headers ?? {}),
      },
    });
  } catch {
    throw new ShopApiError("Không kết nối được máy chủ", 0);
  }
  if (res.status === 401) {
    clearShopSession(slug);
    if (retried) throw new ShopAuthError("Phiên đăng nhập đã hết hạn", "expired");
    await shopLogin(slug); // lỗi → ShopAuthError cho UI hiện nút đăng nhập
    return shopFetch<T>(slug, path, init, true);
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const m = Array.isArray(body?.message) ? body.message[0] : body?.message;
    throw new ShopApiError(m || `Lỗi ${res.status}`, res.status);
  }
  return body as T;
}
