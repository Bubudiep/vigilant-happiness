import type { BuilderSchema } from "../miniapp-builder";
import { api } from "./platform-api";

export interface StoreThemeConfig {
  primary: string;
  accent: string;
  bg: string;
  headerVariant: "pastel" | "solid" | "clean";
  bannerVariant: "editorial" | "poster" | "split";
  productCardVariant: "editorial" | "poster" | "horizontal";
  memberCardVariant: "minimal" | "stamp" | "vip";
}

export interface StoreSliderItem {
  id: string;
  eyebrow?: string;
  title: string;
  subtitle: string;
  from: string;
  to: string;
  cta?: string;
}

export interface StoreProductItem {
  id: string;
  name: string;
  category: string;
  price: number;
  salePrice?: number | null;
  unit?: string;
  tag?: string;
  sku?: string;
  stock?: number;
  imageUrl?: string;
  active: boolean;
}

export interface StoreEventItem {
  id: string;
  title: string;
  type: "promotion" | "flash_sale" | "checkin" | "workshop";
  startDate: string;
  endDate: string;
  status: "upcoming" | "running" | "ended";
  participants: number;
  description?: string;
}

export interface StoreOrderItem {
  id: string;
  code: string;
  customerName: string;
  phone: string;
  itemsSummary: string;
  total: number;
  customerId?: string | null;
  address?: string;
  note?: string;
  status: "pending" | "confirmed" | "shipping" | "completed" | "cancelled";
  createdAt: string;
  items?: StoreOrderLine[];
  subtotal?: number;
  shippingFee?: number;
  discountAmount?: number;
  voucherCode?: string;
  /** miniapp = khách đặt trong Mini App, admin = tạo tại quầy */
  source?: "miniapp" | "admin";
  paymentMethod?: PaymentMethod;
}

export type PaymentMethod = "cod" | "cash" | "bank_transfer" | "card" | "ewallet";

export interface StoreOrderLine {
  productId: string | null;
  productName: string;
  unitPrice: number;
  quantity: number;
  imageUrl?: string | null;
}

export interface StoreBookingItem {
  id: string;
  code: string;
  customerId?: string | null;
  customerName: string;
  phone: string;
  serviceName: string;
  date: string;
  timeSlot: string;
  staffName?: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  note?: string;
  createdAt: string;
}

export interface StoreMemberTierItem {
  id: string;
  code: string;
  name: string;
  minSpent: number;
  minPoints: number;
  discountPercent: number;
  pointMultiplier: number;
  color: string;
  benefits?: string;
}

export interface StoreVoucherItem {
  id: string;
  code: string;
  title: string;
  discountType: "percent" | "fixed" | "freeship";
  discountValue: number;
  minOrderValue: number;
  maxDiscount?: number;
  tierCode?: string;
  quantity: number;
  usedCount: number;
  startDate: string;
  endDate: string;
  active: boolean;
  /** Số mã thẻ (dùng 1 lần) đã sinh / đã dùng */
  codeCount?: number;
  codeUsed?: number;
}

export interface StoreDocumentItem {
  id: string;
  slug: string;
  title: string;
  category: "warranty" | "return" | "payment" | "terms" | "privacy" | "notice" | "guide";
  content: string;
  published: boolean;
  updatedAt: string;
}

export interface StoreSupportTicket {
  id: string;
  subject: string;
  category: "technical" | "zalo_review" | "billing" | "feature";
  priority: "low" | "normal" | "high";
  status: "open" | "in_progress" | "resolved";
  createdAt: string;
  message: string;
}

export interface StoreCustomerItem {
  id: string;
  name: string;
  phone: string;
  tier: string;
  points: number;
  totalOrders: number;
  totalSpent: number;
  note?: string;
  createdAt: string;
  /** Có giá trị khi khách đã đăng nhập Zalo trong Mini App của store (tài khoản khách) */
  zaloUserId?: string | null;
  avatarUrl?: string | null;
  address?: string | null;
  lastLoginAt?: string | null;
}

export interface StoreConfig {
  id: string;
  slug: string;
  name: string;
  subtitle?: string;
  templateId: string;
  zaloAppId?: string;
  zaloOaId?: string;
  phone?: string;
  address?: string;
  active: boolean;
  theme: StoreThemeConfig;
  sliders: StoreSliderItem[];
  products: StoreProductItem[];
  customers: StoreCustomerItem[];
  events?: StoreEventItem[];
  orders?: StoreOrderItem[];
  bookings?: StoreBookingItem[];
  documents?: StoreDocumentItem[];
  memberTiers?: StoreMemberTierItem[];
  vouchers?: StoreVoucherItem[];
  tickets?: StoreSupportTicket[];
  builder?: BuilderSchema;
  /** Đã lưu App Secret Mini App riêng của store (không đọc lại được) */
  hasZaloAppSecret?: boolean;
  /** Chỉ dùng khi gửi lên: App Secret mới (chuỗi rỗng = xoá) */
  zaloAppSecret?: string;
}

export interface StoreOwnerLite {
  id: string;
  name: string;
  companyName?: string | null;
}

/** Store kèm thông tin khách sở hữu (backend trả về trong danh sách / chi tiết). */
export type StoreWithOwner = StoreConfig & {
  customer?: StoreOwnerLite | null;
  /** true khi đã tải chi tiết (sản phẩm, khách, lịch hẹn, thiết kế…); danh sách chỉ có thông tin tóm tắt */
  loaded?: boolean;
};

/** Backend lưu thiết kế ở `builderSchema`; giao diện dùng `builder`. */
function fromApi(raw: StoreWithOwner & { builderSchema?: BuilderSchema | null }): StoreWithOwner {
  const { builderSchema, ...rest } = raw;
  return {
    ...rest,
    products: rest.products ?? [],
    customers: rest.customers ?? [],
    sliders: rest.sliders ?? [],
    builder: rest.builder ?? builderSchema ?? undefined,
  };
}

/**
 * Danh sách store của tài khoản đang đăng nhập (chủ shop chỉ nhận store của mình,
 * quản trị viên nhận tất cả). Không còn dữ liệu demo / bản lưu trình duyệt.
 */
export async function fetchStoreDetail(id: string): Promise<StoreWithOwner> {
  return { ...fromApi(await api<StoreWithOwner>(`/stores/${id}`)), loaded: true };
}

/**
 * Danh sách store (tóm tắt, không kèm sản phẩm / lịch hẹn / thiết kế) — chi tiết tải riêng khi chọn store
 * bằng fetchStoreDetail, tránh tải dữ liệu của mọi store lúc mở trang.
 */
export async function fetchStores(): Promise<StoreWithOwner[]> {
  const list = await api<StoreWithOwner[]>("/stores");
  return list.map((s) => ({ ...fromApi(s), loaded: false }));
}

/** Lưu thông tin, theme và thiết kế (builderSchema) lên máy chủ — Mini App đọc qua /stores/public/:slug. */
export async function saveStoreConfig(store: StoreConfig): Promise<void> {
  await api(`/stores/${store.id}/config`, {
    method: "PATCH",
    body: JSON.stringify({
      name: store.name,
      subtitle: store.subtitle,
      templateId: store.templateId,
      zaloAppId: store.zaloAppId,
      zaloOaId: store.zaloOaId,
      phone: store.phone,
      address: store.address,
      active: store.active,
      theme: store.theme,
      sliders: store.sliders,
      ...(store.builder ? { builderSchema: store.builder } : {}),
      ...(store.zaloAppSecret?.trim() ? { zaloAppSecret: store.zaloAppSecret.trim() } : {}),
    }),
  });
}

export interface CreateStoreInput {
  name: string;
  slug: string;
  subtitle?: string;
  templateId: string;
  phone?: string;
  address?: string;
  zaloAppId?: string;
  theme: StoreThemeConfig;
  sliders: StoreSliderItem[];
}

/** Tạo store trên máy chủ (gắn vào tài khoản người bán đang đăng nhập). Lỗi ném ApiError. */
export async function createStore(input: CreateStoreInput): Promise<StoreWithOwner> {
  const created = await api<StoreWithOwner>("/stores", { method: "POST", body: JSON.stringify(input) });
  return { ...fromApi(created), loaded: false };
}

type ProductInput = Omit<StoreProductItem, "id">;
type CustomerInput = Omit<StoreCustomerItem, "id" | "createdAt">;

export const addStoreProduct = (storeId: string, data: ProductInput) =>
  api<StoreProductItem>(`/stores/${storeId}/products`, { method: "POST", body: JSON.stringify(data) });
export const updateStoreProduct = (storeId: string, id: string, data: Partial<ProductInput>) =>
  api<StoreProductItem>(`/stores/${storeId}/products/${id}`, { method: "PATCH", body: JSON.stringify(data) });
export const deleteStoreProduct = (storeId: string, id: string) =>
  api(`/stores/${storeId}/products/${id}`, { method: "DELETE" });

export const addStoreCustomer = (storeId: string, data: CustomerInput) =>
  api<StoreCustomerItem>(`/stores/${storeId}/customers`, { method: "POST", body: JSON.stringify(data) });
export const updateStoreCustomer = (storeId: string, id: string, data: Partial<CustomerInput>) =>
  api<StoreCustomerItem>(`/stores/${storeId}/customers/${id}`, { method: "PATCH", body: JSON.stringify(data) });
export const deleteStoreCustomer = (storeId: string, id: string) =>
  api(`/stores/${storeId}/customers/${id}`, { method: "DELETE" });

// ───────────── Đơn hàng tạo tại quầy ─────────────

export interface CreateOrderInput {
  customerId?: string;
  customerName: string;
  phone?: string;
  address?: string;
  note?: string;
  status: StoreOrderItem["status"];
  paymentMethod: PaymentMethod;
  saveCustomer?: boolean;
  voucherCode?: string;
  shippingFee?: number;
  extraDiscount?: number;
  items: { productId?: string | null; productName?: string; unitPrice?: number; quantity: number }[];
}

export const createStoreOrder = (storeId: string, data: CreateOrderInput) =>
  api<StoreOrderItem & { customer: StoreCustomerItem | null; customerCreated: boolean }>(`/stores/${storeId}/data/orders`, {
    method: "POST",
    body: JSON.stringify(data),
  });

export const previewVoucher = (storeId: string, data: { code: string; subtotal: number; shippingFee: number; customerId?: string }) =>
  api<{ voucherId: string; code: string; title: string; discount: number; singleUse: boolean }>(`/stores/${storeId}/data/orders/preview-voucher`, {
    method: "POST",
    body: JSON.stringify(data),
  });

// ───────────── Mã voucher in thẻ ─────────────

export interface VoucherCodeItem {
  id: string;
  code: string;
  usedAt: string | null;
  orderCode: string | null;
  createdAt: string;
}

export const fetchVoucherCodes = (storeId: string, voucherId: string) =>
  api<VoucherCodeItem[]>(`/stores/${storeId}/data/vouchers/${voucherId}/codes`);

export const generateVoucherCodes = (storeId: string, voucherId: string, data: { count: number; prefix?: string; length?: number }) =>
  api<{ created: number; total: number; quantity: number }>(`/stores/${storeId}/data/vouchers/${voucherId}/codes`, {
    method: "POST",
    body: JSON.stringify(data),
  });

export const deleteVoucherCodes = (storeId: string, voucherId: string, ids?: string[]) =>
  api<{ deleted: number }>(`/stores/${storeId}/data/vouchers/${voucherId}/codes/delete`, {
    method: "POST",
    body: JSON.stringify({ ids }),
  });
