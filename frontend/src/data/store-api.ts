import type { BuilderSchema } from "../miniapp-builder";
import { FREEPIK_STOCK, resolveLocalStockUrl } from "../miniapp-builder/stock-images";
import { getStoredAuthToken } from "./auth";
import { siteConfig } from "./site";

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
  status: "pending" | "confirmed" | "shipping" | "completed" | "cancelled";
  createdAt: string;
}

export interface StoreBookingItem {
  id: string;
  code: string;
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
}

const STORAGE_KEY = "recloud_stores_v1";

const initialStores: StoreConfig[] = [
  {
    id: "store_lumi",
    slug: "lumi-studio",
    name: "LUMI Studio",
    subtitle: "Thời trang thiết kế · Giao nhanh nội thành",
    templateId: "thoi_trang_01",
    zaloAppId: "3546317553033780315",
    zaloOaId: "oa_lumi_studio",
    phone: "0901234567",
    address: "45 Lê Lợi, Quận 1, TP.HCM",
    active: true,
    theme: {
      primary: "#1f1f1f",
      accent: "#c8a27a",
      bg: "#f7f5f2",
      headerVariant: "pastel",
      bannerVariant: "poster",
      productCardVariant: "editorial",
      memberCardVariant: "minimal",
    },
    sliders: [
      {
        id: "sl_1",
        eyebrow: "NEW COLLECTION",
        title: "BST Thu Đông 2026",
        subtitle: "Giảm đến 30% cho thành viên mới trên Zalo",
        from: "#1f1f1f",
        to: "#7a5c45",
        cta: "Mua ngay",
      },
      {
        id: "sl_2",
        eyebrow: "MEMBER DAY",
        title: "Tặng Voucher 50K",
        subtitle: "Áp dụng cho đơn từ 399.000đ",
        from: "#4f46e5",
        to: "#06b6d4",
        cta: "Nhận mã",
      },
    ],
    products: [
      { id: "sp_1", name: "Áo sơ mi linen tay dài", category: "Áo", price: 459000, salePrice: 359000, unit: "S / M / L", tag: "Bán chạy", imageUrl: FREEPIK_STOCK.retail.products[0], active: true },
      { id: "sp_2", name: "Đầm midi hoa nhí lụa", category: "Váy đầm", price: 659000, salePrice: 499000, unit: "S / M / L", tag: "Mới", imageUrl: FREEPIK_STOCK.retail.products[1], active: true },
      { id: "sp_3", name: "Quần âu ống suông", category: "Quần", price: 529000, salePrice: 429000, unit: "26 - 30", imageUrl: FREEPIK_STOCK.retail.products[2], active: true },
    ],
    customers: [
      { id: "kh_1", name: "Nguyễn Lan Anh", phone: "0909123456", tier: "Vàng", points: 2450, totalOrders: 8, totalSpent: 4850000, note: "Thích size M, màu trung tính", createdAt: "2026-11-10T08:30:00Z" },
      { id: "kh_2", name: "Trần Minh Thư", phone: "0912345678", tier: "Bạc", points: 1120, totalOrders: 4, totalSpent: 2150000, note: "Khách từ Zalo OA", createdAt: "2026-11-15T14:20:00Z" },
      { id: "kh_3", name: "Lê Hoàng Nam", phone: "0987654321", tier: "Thành viên", points: 350, totalOrders: 1, totalSpent: 459000, createdAt: "2026-11-18T09:15:00Z" },
    ],
  },
  {
    id: "store_kcn",
    slug: "vinatech-kcn",
    name: "VinaTech Industrial",
    subtitle: "Cổng nhân sự nội bộ · KCN VSIP",
    templateId: "kcn_doanh_nghiep_01",
    zaloAppId: "3546317553033780315",
    phone: "0900888999",
    address: "Lô B2, KCN VSIP, Bình Dương",
    active: true,
    theme: {
      primary: "#0f766e",
      accent: "#0284c7",
      bg: "#f4f6f8",
      headerVariant: "solid",
      bannerVariant: "split",
      productCardVariant: "horizontal",
      memberCardVariant: "vip",
    },
    sliders: [
      {
        id: "sl_k1",
        eyebrow: "THÔNG BÁO NHÂN SỰ",
        title: "Chốt công kỳ tháng 11",
        subtitle: "Hoàn thành giải trình công trước ngày 25/11",
        from: "#0f766e",
        to: "#0284c7",
        cta: "Xem bảng công",
      },
    ],
    products: [
      { id: "dv_1", name: "Đăng ký suất ăn ca tăng cường", category: "Phúc lợi", price: 0, unit: "Theo ngày", tag: "Nội bộ", active: true },
      { id: "dv_2", name: "Đăng ký tuyến xe đưa đón số 04", category: "Xe tuyến", price: 0, unit: "Tháng", active: true },
    ],
    customers: [
      { id: "nv_1", name: "Nguyễn Văn Hùng", phone: "0933112233", tier: "Chính thức", points: 22, totalOrders: 14, totalSpent: 0, note: "Mã NV: VN-2048 · Chuyền A3", createdAt: "2026-11-01T07:00:00Z" },
      { id: "nv_2", name: "Phạm Thị Hoa", phone: "0944556677", tier: "Tổ trưởng", points: 26, totalOrders: 18, totalSpent: 0, note: "Mã NV: VN-1092 · Xưởng 2", createdAt: "2026-11-02T07:00:00Z" },
    ],
  },
];

function migrateStoreMediaToLocal(stores: StoreConfig[]): StoreConfig[] {
  return stores.map((store) => ({
    ...store,
    products: store.products.map((p, i) => ({
      ...p,
      imageUrl: p.imageUrl
        ? resolveLocalStockUrl(p.imageUrl)
        : FREEPIK_STOCK.retail.products[i % FREEPIK_STOCK.retail.products.length],
    })),
    builder: store.builder
      ? {
          ...store.builder,
          pages: store.builder.pages.map((pg) => ({
            ...pg,
            blocks: pg.blocks.map((b) => ({
              ...b,
              props: {
                ...b.props,
                items: b.props.items?.map((it) => ({
                  ...it,
                  image: resolveLocalStockUrl(it.image),
                })),
              },
            })),
          })),
        }
      : store.builder,
  }));
}

function readLocalStores(): StoreConfig[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as StoreConfig[];
      const migrated = migrateStoreMediaToLocal(parsed);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      return migrated;
    }
  } catch {
    // ignore
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(initialStores));
  return initialStores;
}

function writeLocalStores(stores: StoreConfig[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stores));
}

/** Gắn JWT (nếu đã đăng nhập Google) để backend biết store nào thuộc tài khoản này. */
function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = getStoredAuthToken();
  return token ? { ...extra, Authorization: `Bearer ${token}` } : extra;
}

/** Backend lưu thiết kế ở `builderSchema`; giao diện dùng `builder`. */
function fromApi(raw: StoreConfig & { builderSchema?: BuilderSchema | null }): StoreConfig {
  const { builderSchema, ...rest } = raw;
  return {
    ...rest,
    products: rest.products ?? [],
    customers: rest.customers ?? [],
    sliders: rest.sliders ?? [],
    builder: rest.builder ?? builderSchema ?? undefined,
  };
}

export async function fetchStores(): Promise<{ stores: StoreConfig[]; source: "api" | "local" }> {
  try {
    const res = await fetch(`${siteConfig.apiUrl}/stores`, { headers: authHeaders() });
    if (res.ok) {
      const list = (await res.json()) as StoreConfig[];
      if (Array.isArray(list) && list.length > 0) {
        const detailed = await Promise.all(
          list.map(async (s) => {
            const detailRes = await fetch(`${siteConfig.apiUrl}/stores/${s.id}`, { headers: authHeaders() });
            return fromApi(detailRes.ok ? ((await detailRes.json()) as StoreConfig) : s);
          }),
        );
        return { stores: detailed, source: "api" };
      }
    }
  } catch {
    // fallback to localStorage when backend isn't started yet
  }
  return { stores: readLocalStores(), source: "local" };
}

/**
 * Lưu cấu hình. Luôn lưu bản nháp localStorage; nếu backend có store này thì đồng bộ
 * cả thiết kế (builderSchema) để Mini App đọc được qua /stores/public/:slug.
 * Trả về "api" khi backend đã nhận, "local" khi chỉ lưu trên trình duyệt.
 */
export async function saveStoreConfig(store: StoreConfig): Promise<"api" | "local"> {
  const local = readLocalStores();
  const next = local.some((s) => s.id === store.id)
    ? local.map((s) => (s.id === store.id ? store : s))
    : [store, ...local];
  writeLocalStores(next);
  try {
    const res = await fetch(`${siteConfig.apiUrl}/stores/${store.id}/config`, {
      method: "PATCH",
      headers: authHeaders({ "Content-Type": "application/json" }),
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
      }),
    });
    return res.ok ? "api" : "local";
  } catch {
    return "local";
  }
}

/**
 * Tạo store trên backend (nếu đã đăng nhập & backend đang chạy). Thành công thì trả về
 * store với id thật của DB, để các lần lưu sau PATCH đúng bản ghi; lỗi thì trả về null.
 */
export async function createStoreRemote(store: StoreConfig): Promise<StoreConfig | null> {
  try {
    const res = await fetch(`${siteConfig.apiUrl}/stores`, {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        name: store.name,
        slug: store.slug,
        subtitle: store.subtitle,
        templateId: store.templateId,
        zaloAppId: store.zaloAppId,
        phone: store.phone,
        address: store.address,
        theme: store.theme,
        sliders: store.sliders,
      }),
    });
    if (!res.ok) return null;
    const created = fromApi((await res.json()) as StoreConfig);
    return { ...store, id: created.id };
  } catch {
    return null;
  }
}

export function saveAllLocalStores(stores: StoreConfig[]) {
  writeLocalStores(stores);
}
