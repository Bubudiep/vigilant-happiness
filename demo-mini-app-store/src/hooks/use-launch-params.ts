import { getRouteParams } from "zmp-sdk";

/**
 * Đọc tham số khởi động của Mini App:
 *   ?mode=Template&templateID=thoi_trang_01   → mở mẫu giao diện (dữ liệu minh hoạ)
 *   ?store=<slug>                             → mở Mini App của gian hàng (đúng thiết kế & dữ liệu của shop)
 * Không phân biệt hoa thường cho cả tên tham số lẫn giá trị `mode`.
 * Chỉ đọc MỘT lần lúc app khởi động (trước khi router đổi URL).
 */
export interface LaunchParams {
  mode?: string;
  templateId?: string;
  /** slug gian hàng */
  store?: string;
}

function readParams(): LaunchParams {
  const raw: Record<string, string> = {};

  try {
    Object.assign(raw, getRouteParams() ?? {});
  } catch {
    // getRouteParams không có khi chạy ngoài Zalo
  }
  new URLSearchParams(window.location.search).forEach((value, key) => {
    raw[key] = value;
  });

  const lower: Record<string, string> = {};
  Object.entries(raw).forEach(([k, v]) => {
    lower[k.toLowerCase()] = String(v);
  });

  return {
    mode: lower["mode"]?.toLowerCase(),
    templateId: lower["templateid"]?.trim().toLowerCase(),
    store: lower["store"]?.trim().toLowerCase() || undefined,
  };
}

export const launchParams: LaunchParams = readParams();

let consumed = false;

/**
 * Trả về templateId cần mở lúc khởi động (chỉ một lần duy nhất).
 * Lần gọi sau trả về undefined để nút "Xem mẫu khác" quay về trang chủ bình thường.
 */
export function consumeLaunchTemplateId(): string | undefined {
  if (consumed) return undefined;
  consumed = true;
  if (launchParams.store) return undefined;
  if (launchParams.mode === "template" && launchParams.templateId) {
    return launchParams.templateId;
  }
  return undefined;
}

export function hasPendingLaunchTemplate(): boolean {
  return !consumed && ((launchParams.mode === "template" && !!launchParams.templateId) || !!launchParams.store);
}

let storeConsumed = false;

/** slug gian hàng cần mở lúc khởi động (một lần). */
export function consumeLaunchStore(): string | undefined {
  if (storeConsumed) return undefined;
  storeConsumed = true;
  return launchParams.store;
}

export function templateShareQuery(templateId: string): string {
  return `mode=Template&templateID=${encodeURIComponent(templateId)}`;
}
