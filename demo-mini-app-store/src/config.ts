/**
 * Cấu hình chạy app, đọc từ biến môi trường Vite (file `.env`, tiền tố `VITE_`).
 *
 *   VITE_API_URL      URL backend, VD https://api.ipays.vn/api  (để trống = không gửi về máy chủ)
 *   VITE_ZALO_APP_ID  App ID Mini App, dùng khi chạy ngoài Zalo (trong Zalo lấy từ window.APP_ID)
 *   VITE_OAUTH_CLIENT_ID  client_id (public) của kênh Mini App trên backend, mặc định remini-zalo-miniapp
 */
export const appConfig = {
  apiUrl: ((import.meta.env.VITE_API_URL as string | undefined) ?? "").replace(/\/+$/, ""),
  zaloAppId: (import.meta.env.VITE_ZALO_APP_ID as string | undefined) ?? "",
  oauthClientId: (import.meta.env.VITE_OAUTH_CLIENT_ID as string | undefined) || "remini-zalo-miniapp",
};

/** App ID hiện tại: Zalo gắn sẵn `window.APP_ID` khi chạy trong Mini App. */
export function currentAppId(): string {
  const fromZalo = (window as unknown as { APP_ID?: string }).APP_ID;
  return fromZalo && fromZalo !== "undefined" ? fromZalo : appConfig.zaloAppId;
}
