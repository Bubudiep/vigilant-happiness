import type { BuilderSchema } from "../miniapp-builder";
import type { StoreBankAccount } from "./vietqr";
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

export type ProductKind = "product" | "service" | "material";

/** Định mức nguyên liệu: dùng `quantity` (đơn vị của nguyên liệu) cho 1 đơn vị thành phẩm */
export interface BomLine {
  productId: string;
  quantity: number;
}
/** Phân loại (size…) / bán kèm (topping…) */
export interface OptionChoice {
  id: string;
  name: string;
  price: number;
  bom?: BomLine[];
}
export interface OptionGroup {
  id: string;
  name: string;
  /** false = chọn 1 (size, phân loại); true = chọn nhiều (topping) */
  multiple: boolean;
  required: boolean;
  max?: number | null;
  choices: OptionChoice[];
}

/** Combo = nhiều món đang bán gộp thành 1 sản phẩm, có giảm giá */
export interface ComboConfig {
  /** selections: size / topping cố định của món trong combo */
  items: { productId: string; quantity: number; selections?: { groupId: string; choiceIds: string[] }[] }[];
  discountType: "amount" | "percent";
  discountValue: number;
}

export interface StoreProductItem {
  id: string;
  /** product = hàng hoá (có tồn kho) | service = dịch vụ (không quản lý kho). Thiếu = product */
  kind?: ProductKind;
  name: string;
  category: string;
  price: number;
  salePrice?: number | null;
  unit?: string;
  tag?: string;
  sku?: string;
  stock?: number;
  /** Thời lượng dịch vụ (phút) */
  durationMin?: number | null;
  /** Liệu trình mặc định của dịch vụ: số buổi & số ngày giữa 2 buổi */
  treatmentSessions?: number | null;
  treatmentIntervalDays?: number | null;
  /** Giá vốn (đ / đơn vị) — món có BOM thì tính từ nguyên liệu */
  costPrice?: number;
  bom?: BomLine[] | null;
  options?: OptionGroup[] | null;
  /** Combo: các món bên trong + giảm giá (giá = tổng món − giảm) */
  combo?: ComboConfig | null;
  imageUrl?: string;
  description?: string;
  active: boolean;
}

export const isService = (p: Pick<StoreProductItem, "kind">) => p.kind === "service";
export const isMaterial = (p: Pick<StoreProductItem, "kind">) => p.kind === "material";
/** Ngưỡng "sắp hết hàng" của sản phẩm */
export const LOW_STOCK = 10;

export type StaffStatus = "active" | "leave" | "quit";
export type EmploymentType = "full_time" | "part_time" | "probation" | "freelance";

/** Nhân sự của gian hàng */
export interface StoreStaffItem {
  id: string;
  code?: string | null;
  /** Mã nhân viên trên máy chấm công */
  attendanceCode?: string | null;
  name: string;
  phone?: string | null;
  email?: string | null;
  position?: string | null;
  department?: string | null;
  avatarUrl?: string | null;
  status: StaffStatus;
  employmentType: EmploymentType;
  /** YYYY-MM-DD */
  startDate?: string | null;
  birthday?: string | null;
  baseSalary?: number | null;
  commissionPercent?: number | null;
  /** 0 = CN, 1..6 = T2..T7 */
  workDays: number[];
  shiftStart?: string | null;
  shiftEnd?: string | null;
  services: string[];
  note?: string | null;
  /** Email Google để đăng nhập web quản trị (trống = không có tài khoản web) */
  loginEmail?: string | null;
  /** Mục được xem trên web quản trị (khoá menu) */
  adminSections?: string[] | null;
  sortOrder?: number;
  createdAt?: string;
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
  source?: "miniapp" | "admin" | "pos" | "booking" | "treatment";
  paymentMethod?: PaymentMethod;
  /** Đã thu — nhỏ hơn total (đơn hoàn thành) = khách còn nợ */
  paid?: number;
  /** Đơn thu tiền của lịch hẹn / đơn gói liệu trình */
  bookingId?: string;
  treatmentId?: string;
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
  /** Liệu trình: các buổi cùng treatmentId; buổi thứ treatmentSeq / treatmentTotal */
  treatmentId?: string;
  treatmentName?: string;
  treatmentSeq?: number;
  treatmentTotal?: number;
  /** Kết quả / ghi chú của buổi (nhập khi hoàn thành) */
  result?: string;
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
  /** Thẻ tích tem: số tem hiện có / số lần đã đổi quà */
  stamps?: number;
  stampRewards?: number;
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
  staff?: StoreStaffItem[];
  stampProgram?: StampProgram | null;
  /** Tài khoản nhận chuyển khoản (mã VietQR khi thu tiền) */
  bankAccount?: StoreBankAccount | null;
  /** Đã lưu Secret Token Tingee → tự xác nhận tiền chuyển khoản về */
  hasTingee?: boolean;
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
  /** Tài khoản nhân viên: các mục được xem (null / trống = chủ shop, toàn quyền) */
  access?: string[] | null;
};

/** Backend lưu thiết kế ở `builderSchema`; giao diện dùng `builder`. */
function fromApi(raw: StoreWithOwner & { builderSchema?: BuilderSchema | null }): StoreWithOwner {
  const { builderSchema, ...rest } = raw;
  return {
    ...rest,
    products: rest.products ?? [],
    customers: rest.customers ?? [],
    sliders: rest.sliders ?? [],
    builder: fixStockUrls(rest.builder ?? builderSchema ?? undefined),
  };
}

/** Thiết kế cũ lưu ảnh mẫu dạng "/src/assets/templates/…" (URL lúc dev) → "/stock/…" (public/stock). */
function fixStockUrls<T>(v: T): T {
  if (!v) return v;
  const s = JSON.stringify(v);
  return s.includes("/src/assets/templates/") ? (JSON.parse(s.split("/src/assets/templates/").join("/stock/")) as T) : v;
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
      ...(store.bankAccount !== undefined ? { bankAccount: store.bankAccount } : {}),
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
  /** options: size / topping đã chọn [{ groupId, choiceIds }] */
  items: { productId?: string | null; productName?: string; unitPrice?: number; quantity: number; options?: { groupId: string; choiceIds: string[] }[] }[];
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

/** Gói đang dùng + hạn mức của gian hàng (trang Tổng quan) */
export interface StorePlanInfo {
  subscription: {
    status: string;
    billingCycle: string;
    startedAt: string;
    expiresAt: string;
    autoRenew: boolean;
    daysLeft: number | null;
    plan: {
      code: string;
      name: string;
      priceMonthly: number;
      priceYearly: number;
      maxProducts: number;
      maxStaff: number;
      storageQuotaMb: number | null;
      features: string[];
    };
  } | null;
  usage: { products: number; staff: number; usedBytes: number; quotaBytes: number | null };
}
export const fetchStorePlan = (storeId: string) => api<StorePlanInfo>(`/stores/${storeId}/plan`);

/** Thẻ tích tem của gian hàng */
export interface StampProgram {
  enabled: boolean;
  required: number;
  /** Rỗng = mọi sản phẩm & dịch vụ */
  productIds: string[];
  countBy: "item" | "order";
  reward: string;
  icon: string;
}
export const saveStampProgram = (storeId: string, data: StampProgram) =>
  api<StampProgram>(`/stores/${storeId}/data/stamp-program`, { method: "POST", body: JSON.stringify(data) });
export const adjustCustomerStamps = (storeId: string, customerId: string, body: { action: "redeem" } | { action: "adjust"; delta: number }) =>
  api<{ id: string; stamps: number; stampRewards: number }>(`/stores/${storeId}/data/customers/${customerId}/stamps`, { method: "POST", body: JSON.stringify(body) });

// ───────────── Kho: giá vốn, nhập kho ─────────────

export interface InventorySummary {
  /** Giá trị tồn kho theo giá vốn */
  stockValue: number;
  /** Giá trị tồn theo giá bán (chỉ hàng hoá) */
  saleValue: number;
  items: { id: string; unitCost: number; makeable: number | null }[];
}
export interface StockReceiptItem {
  productId: string;
  name: string;
  quantity: number;
  unitCost: number;
}
export interface StockReceipt {
  id: string;
  code: string;
  supplier: string | null;
  note: string | null;
  receivedAt: string;
  items: StockReceiptItem[];
  total: number;
  status: "active" | "cancelled";
  cancelledAt: string | null;
}
type StockAfter = { id: string; stock: number; costPrice: number }[];
export const fetchInventory = (storeId: string) => api<InventorySummary>(`/stores/${storeId}/inventory`);
export const fetchStockReceipts = (storeId: string) => api<StockReceipt[]>(`/stores/${storeId}/stock-receipts`);
export const createStockReceipt = (storeId: string, data: { supplier?: string; note?: string; receivedAt?: string; items: { productId: string; quantity: number; unitCost: number }[] }) =>
  api<{ receipt: StockReceipt; products: StockAfter }>(`/stores/${storeId}/stock-receipts`, { method: "POST", body: JSON.stringify(data) });
export const cancelStockReceipt = (storeId: string, id: string) =>
  api<{ receipt: StockReceipt; products: StockAfter }>(`/stores/${storeId}/stock-receipts/${id}/cancel`, { method: "POST" });
