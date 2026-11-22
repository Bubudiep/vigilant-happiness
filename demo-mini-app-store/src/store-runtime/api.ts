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
  products: {
    id: string;
    name: string;
    category: string;
    price: number;
    salePrice?: number | null;
    tag?: string | null;
    imageUrl?: string | null;
  }[];
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
