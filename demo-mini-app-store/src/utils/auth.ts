import { atom, getDefaultStore } from "jotai";
import { authorize, getAccessToken, getPhoneNumber, getUserInfo, nativeStorage } from "zmp-sdk";

import { appConfig } from "@/config";

/**
 * Đăng nhập bằng Zalo trong Mini App.
 *
 *   1. authorize(scope.userInfo, scope.userPhonenumber)   → người dùng đồng ý chia sẻ
 *   2. getAccessToken() + getPhoneNumber() → { token }     → token SĐT hết hạn sau ~2 phút
 *   3. POST /api/oauth/token  grant_type=zalo_mini_app     → backend đổi token SĐT lấy số thật
 *                                                              (cần App Secret, chỉ backend có)
 *   4. Nhận access_token + refresh_token của reMini, tự làm mới khi hết hạn.
 *
 * Chưa cấu hình backend (VITE_API_URL) thì vẫn lấy được tên/ảnh từ getUserInfo(),
 * nhưng không có số điện thoại (Zalo không còn trả số trực tiếp xuống Mini App).
 */

export interface ZaloSession {
  user: { id?: string; name: string; avatarUrl?: string | null; phone?: string | null; phoneVerified: boolean };
  accessToken?: string;
  refreshToken?: string;
  /** epoch ms */
  expiresAt?: number;
}

export type LoginResult =
  | { ok: true; session: ZaloSession; warning?: string }
  | { ok: false; reason: "denied" | "outside_zalo" | "error"; message: string };

const STORAGE_KEY = "remini_session_v1";

function readStored(): ZaloSession | null {
  try {
    const raw = nativeStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ZaloSession) : null;
  } catch {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as ZaloSession) : null;
    } catch {
      return null;
    }
  }
}

function writeStored(s: ZaloSession | null) {
  const raw = s ? JSON.stringify(s) : "";
  try {
    if (s) nativeStorage.setItem(STORAGE_KEY, raw);
    else nativeStorage.removeItem(STORAGE_KEY);
  } catch {
    try {
      if (s) localStorage.setItem(STORAGE_KEY, raw);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      // bỏ qua
    }
  }
}

/** Phiên đăng nhập hiện tại (null = chưa đăng nhập). Component đọc bằng useAtomValue(sessionAtom). */
export const sessionAtom = atom<ZaloSession | null>(readStored());

function setSession(s: ZaloSession | null) {
  writeStored(s);
  getDefaultStore().set(sessionAtom, s);
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  user?: ZaloSession["user"];
  error?: string;
  error_description?: string;
}

async function tokenRequest(body: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch(`${appConfig.apiUrl}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: appConfig.oauthClientId, ...body }).toString(),
  });
  const data = (await res.json().catch(() => ({}))) as TokenResponse;
  if (!res.ok) throw new Error(data.error_description || data.error || `HTTP ${res.status}`);
  return data;
}

function isDenied(e: unknown): boolean {
  const code = (e as { code?: number })?.code;
  const msg = String((e as { message?: string })?.message ?? "").toLowerCase();
  // -201: người dùng từ chối cấp quyền
  return code === -201 || msg.includes("denied") || msg.includes("reject") || msg.includes("từ chối");
}

export async function loginWithZalo(): Promise<LoginResult> {
  try {
    await authorize({ scopes: ["scope.userInfo", "scope.userPhonenumber"] });
  } catch (e) {
    if (isDenied(e)) return { ok: false, reason: "denied", message: "Bạn chưa đồng ý chia sẻ thông tin Zalo" };
    if (!/zalo/i.test(navigator.userAgent)) {
      return { ok: false, reason: "outside_zalo", message: "Đăng nhập Zalo chỉ hoạt động khi mở trong ứng dụng Zalo" };
    }
    // Một số phiên bản Zalo báo lỗi dù đã cấp quyền trước đó → vẫn thử tiếp
  }

  try {
    const [{ userInfo }, accessToken] = await Promise.all([
      getUserInfo({ avatarType: "normal" }),
      getAccessToken(),
    ]);
    let phoneToken: string | undefined;
    try {
      phoneToken = (await getPhoneNumber()).token;
    } catch {
      // người dùng không cho SĐT – vẫn đăng nhập được
    }

    // Không có backend: chỉ dùng tên/ảnh lấy trực tiếp
    if (!appConfig.apiUrl) {
      const session: ZaloSession = {
        user: { id: userInfo.id, name: userInfo.name, avatarUrl: userInfo.avatar, phone: null, phoneVerified: false },
      };
      setSession(session);
      return { ok: true, session, warning: "Chưa kết nối máy chủ nên chưa lấy được số điện thoại, bạn nhập giúp nhé" };
    }

    const tokens = await tokenRequest({
      grant_type: "zalo_mini_app",
      zalo_access_token: accessToken,
      ...(phoneToken ? { phone_token: phoneToken } : {}),
    });
    const session: ZaloSession = {
      user: tokens.user ?? { name: userInfo.name, avatarUrl: userInfo.avatar, phone: null, phoneVerified: false },
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: Date.now() + tokens.expires_in * 1000,
    };
    setSession(session);
    return {
      ok: true,
      session,
      warning: session.user.phone ? undefined : "Chưa lấy được số điện thoại, bạn nhập giúp nhé",
    };
  } catch (e) {
    if (isDenied(e)) return { ok: false, reason: "denied", message: "Bạn chưa đồng ý chia sẻ thông tin Zalo" };
    console.warn("loginWithZalo", e);
    return { ok: false, reason: "error", message: "Đăng nhập Zalo không thành công, vui lòng thử lại" };
  }
}

let refreshing: Promise<ZaloSession | null> | null = null;

/** Access token còn hạn (tự refresh nếu sắp hết). null nếu chưa đăng nhập với backend. */
export async function getValidAccessToken(): Promise<string | null> {
  const s = getDefaultStore().get(sessionAtom);
  if (!s?.accessToken) return null;
  if (s.expiresAt && s.expiresAt - Date.now() > 60_000) return s.accessToken;
  if (!s.refreshToken || !appConfig.apiUrl) return null;

  // Gộp các lần gọi đồng thời thành 1 request refresh (refresh token chỉ dùng được 1 lần)
  refreshing ??= tokenRequest({ grant_type: "refresh_token", refresh_token: s.refreshToken })
    .then((t) => {
      const next: ZaloSession = {
        ...s,
        accessToken: t.access_token,
        refreshToken: t.refresh_token ?? s.refreshToken,
        expiresAt: Date.now() + t.expires_in * 1000,
      };
      setSession(next);
      return next;
    })
    .catch(() => {
      // refresh hỏng (hết hạn / bị thu hồi) → giữ thông tin hiển thị, bỏ token
      setSession({ user: s.user });
      return null;
    })
    .finally(() => {
      refreshing = null;
    });
  return (await refreshing)?.accessToken ?? null;
}

export async function logout() {
  const s = getDefaultStore().get(sessionAtom);
  setSession(null);
  if (s?.refreshToken && appConfig.apiUrl) {
    fetch(`${appConfig.apiUrl}/oauth/revoke`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: appConfig.oauthClientId, token: s.refreshToken, token_type_hint: "refresh_token" }).toString(),
    }).catch(() => undefined);
  }
}
