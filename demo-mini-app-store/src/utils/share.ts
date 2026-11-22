import { openShareSheet } from "zmp-sdk";

import shareCover from "@/assets/share-cover.jpg";
import { templateThumbnails } from "@/assets/thumbs";
import { currentAppId } from "@/config";
import { company } from "@/data/company";
import { templateShareQuery } from "@/hooks/use-launch-params";

/** Thông tin tối thiểu để chia sẻ một mẫu (không phụ thuộc registry, tránh import vòng). */
export interface ShareableTemplate {
  id: string;
  name: string;
  code?: string;
  brand?: string;
  description?: string;
}

export type ShareResult = { ok: true } | { ok: false; reason: "outside_zalo" | "cancelled" | "error" };

/**
 * openShareSheet bắt buộc `thumbnail` là URL tuyệt đối.
 * Ảnh trong bundle là đường dẫn tương đối, chạy trong Zalo sẽ thành https://h5.zdn.vn/zapps/<appId>/...
 */
export function absoluteAssetUrl(src: string | undefined): string {
  if (!src) return "";
  try {
    return new URL(src, document.baseURI).href;
  } catch {
    return src;
  }
}

export function templateThumbnail(id: string): string {
  return absoluteAssetUrl(templateThumbnails[id] ?? shareCover);
}

export function appShareThumbnail(): string {
  return company.shareThumbnail || absoluteAssetUrl(shareCover);
}

/** Path trong Mini App (dùng cho zmp_deep_link). */
export function templateDeepLinkPath(id: string): string {
  return `/?${templateShareQuery(id)}`;
}

/** Link web mở Mini App (dán vào chat, Facebook, in QR...). Bản chính thức (production). */
export function templateWebLink(id?: string): string {
  const appId = currentAppId();
  if (!appId) return "";
  return id ? `https://zalo.me/s/${appId}/?${templateShareQuery(id)}` : `https://zalo.me/s/${appId}/`;
}

async function share(title: string, description: string, thumbnail: string, path: string): Promise<ShareResult> {
  try {
    await openShareSheet({ type: "zmp_deep_link", data: { title, description, thumbnail, path } });
    return { ok: true };
  } catch (e) {
    const msg = String((e as { message?: string })?.message ?? e).toLowerCase();
    if (msg.includes("cancel")) return { ok: false, reason: "cancelled" };
    // Ngoài Zalo (trình duyệt, zmp start) API này không tồn tại
    if (!/zalo/i.test(navigator.userAgent)) return { ok: false, reason: "outside_zalo" };
    console.warn("openShareSheet failed", e);
    return { ok: false, reason: "error" };
  }
}

/** Chia sẻ thẻ Mini App mở thẳng vào một mẫu demo. */
export function shareTemplate(t: ShareableTemplate): Promise<ShareResult> {
  const title = t.brand ? `${t.brand} · Mẫu Mini App ${t.name}` : `Mẫu Mini App ${t.name}`;
  const description = t.description
    ? t.description.slice(0, 120)
    : `Xem thử Mini App ${t.name} do ${company.name} thiết kế — bấm để trải nghiệm ngay trên Zalo.`;
  return share(title, description, templateThumbnail(t.id), templateDeepLinkPath(t.id));
}

/** Chia sẻ thẻ giới thiệu bạn bè từ bên trong một mẫu (module "Mời bạn bè"). */
export function shareReferral(t: ShareableTemplate, offer: string): Promise<ShareResult> {
  const brand = t.brand || t.name;
  return share(
    `${brand} tặng bạn ${offer}`,
    `Mở Mini App ${brand} trên Zalo để nhận ưu đãi dành cho bạn mới.`,
    templateThumbnail(t.id),
    templateDeepLinkPath(t.id),
  );
}

/** Chia sẻ trang giới thiệu reMini (danh sách tất cả mẫu). */
export function shareApp(): Promise<ShareResult> {
  return share(
    `${company.name} · ${company.slogan}`,
    "Xem 20+ mẫu Zalo Mini App theo ngành: bán hàng, đặt lịch, tích điểm…",
    appShareThumbnail(),
    "/",
  );
}

/** Sao chép văn bản. Zalo WebView không luôn có navigator.clipboard nên có phương án dự phòng. */
export async function copyText(text: string): Promise<boolean> {
  if (!text) return false;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // thử cách cũ bên dưới
  }
  try {
    const el = document.createElement("textarea");
    el.value = text;
    el.setAttribute("readonly", "");
    el.style.position = "fixed";
    el.style.opacity = "0";
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}

export function shareResultMessage(r: ShareResult): string | null {
  if (r.ok || r.reason === "cancelled") return null;
  return r.reason === "outside_zalo"
    ? "Chia sẻ chỉ hoạt động trong ứng dụng Zalo. Bạn có thể sao chép link bên dưới."
    : "Không mở được bảng chia sẻ, vui lòng thử lại.";
}
