import { appConfig } from "@/config";

import type { BuilderSchema } from "./builder/types";

/** Cấu hình công khai của một gian hàng — GET /stores/public/:slug */
export interface PublicStore {
  id: string;
  slug: string;
  name: string;
  subtitle?: string | null;
  logoUrl?: string | null;
  coverUrl?: string | null;
  templateId: string;
  phone?: string | null;
  address?: string | null;
  builderSchema?: BuilderSchema | null;
  assetBase?: string;
  updatedAt: string;
  /** Thẻ tích tem của quán (null = chưa bật) */
  stampProgram?: { enabled: boolean; required: number; reward: string; icon: string } | null;
  products: PublicProduct[];
  vouchers?: {
    id: string;
    code: string;
    title: string;
    discountType: "percent" | "fixed" | "freeship";
    discountValue: number;
    minOrderValue: number;
  }[];
  documents?: { id: string; title: string; category: string; content: string }[];
}

/** Nhóm tuỳ chọn của món: size (chọn 1) / topping (chọn nhiều, tối đa max) */
export interface ProductOptionGroup {
  id: string;
  name: string;
  multiple: boolean;
  required: boolean;
  max?: number | null;
  choices: { id: string; name: string; price: number }[];
}

export interface PublicProduct {
  id: string;
  kind?: string;
  name: string;
  category: string;
  description?: string | null;
  price: number;
  salePrice?: number | null;
  tag?: string | null;
  imageUrl?: string | null;
  options?: ProductOptionGroup[] | null;
}

export class StoreLoadError extends Error {
  constructor(
    message: string,
    readonly notFound = false,
  ) {
    super(message);
  }
}

export async function fetchPublicStore(slug: string): Promise<PublicStore> {
  if (!appConfig.apiUrl) throw new StoreLoadError("Mini App chưa cấu hình VITE_API_URL");
  let res: Response;
  try {
    res = await fetch(`${appConfig.apiUrl}/stores/public/${encodeURIComponent(slug)}`);
  } catch {
    throw new StoreLoadError("Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.");
  }
  if (res.status === 404) throw new StoreLoadError("Không tìm thấy cửa hàng hoặc cửa hàng đã tạm ngưng.", true);
  if (!res.ok) throw new StoreLoadError(`Máy chủ lỗi (${res.status}). Thử lại sau.`);
  return res.json();
}
