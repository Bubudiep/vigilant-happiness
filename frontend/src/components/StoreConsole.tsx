import {
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  QRCode,
  Result,
  Select,
  Spin,
  Switch,
  Tooltip,
  App as AntApp,
} from "antd";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  LuBookOpen,
  LuCalendarCheck,
  LuCalendarDays,
  LuCrown,
  LuLayoutDashboard,
  LuLifeBuoy,
  LuGauge,
  LuLogOut,
  LuPackage,
  LuPlus,
  LuCheck,
  LuShoppingBag,
  LuSparkles,
  LuSmartphone,
  LuStore,
  LuUsers,
  LuFolderOpen,
  LuImages,
  LuIdCard,
  LuLayoutGrid,
  LuChartColumn,
  LuMessagesSquare,
  LuRepeat,
  LuSettings,
} from "react-icons/lu";
import type { AccountInfo, AuthUser } from "../data/auth";
import { ApiError } from "../data/platform-api";
import { getZaloStoreUrl } from "../data/site";
import {
  addStoreCustomer,
  deleteStoreCustomer,
  fetchStoreDetail,
  fetchStores,
  saveStoreConfig,
  StoreConfig,
  LOW_STOCK,
  StoreCustomerItem,
  StoreWithOwner,
  updateStoreCustomer,
} from "../data/store-api";
import { LAST_STORE_KEY } from "../data/store-delete";
import { autosaveDecision, configKey, syncStoreChanges } from "../data/store-sync";
import { fetchStoreUnread } from "../data/album-api";
import CreateStoreWizard from "./CreateStoreWizard";
import StoreSwitcher from "./StoreSwitcher";
import { AdminShell, type ShellNavGroup } from "./ui/AdminShell";
import { SectionTabs } from "./ui/SectionTabs";
import UserMenu from "./UserMenu";
import { LEGACY_PLATFORM_SECTIONS } from "./PlatformConsole";

// Các mục nặng / ít dùng tải riêng khi mở tới (giảm dung lượng tải trang quản trị lần đầu)
const named = <K extends string, M extends Record<K, React.ComponentType<never>>>(p: Promise<M>, k: K) =>
  p.then((m) => ({ default: m[k] as M[K] }));
const MiniAppStudio = lazy(() => import("./MiniAppStudio"));
const InboxSection = lazy(() => named(import("./InboxViews"), "InboxSection"));
const BuildRequestPanel = lazy(() => named(import("./StoreSettingsViews"), "BuildRequestPanel"));
const StoreSettingsSection = lazy(() => named(import("./StoreSettingsViews"), "StoreSettingsSection"));
const AlbumsSection = lazy(() => named(import("./AlbumViews"), "AlbumsSection"));
const MediaLibrarySection = lazy(() => named(import("./MediaLibraryViews"), "MediaLibrarySection"));
const CustomersSection = lazy(() => named(import("./StoreCustomerViews"), "CustomersSection"));
const OrdersSection = lazy(() => named(import("./StoreOrderViews"), "OrdersSection"));
const ProductsSection = lazy(() => named(import("./StoreProductViews"), "ProductsSection"));
const PosSection = lazy(() => named(import("./StorePosViews"), "PosSection"));
const ReportsSection = lazy(() => named(import("./StoreReportViews"), "ReportsSection"));
const StaffSection = lazy(() => named(import("./StoreStaffViews"), "StaffSection"));

const SectionLoading = () => (
  <div className="flex min-h-[40vh] items-center justify-center">
    <Spin />
  </div>
);
import { LoyaltySection } from "./StoreLoyaltyViews";
import {
  BookingsSection,
  DocumentsSection,
  EventsSection,
  OverviewSection,
  StoreNavKey,
  SupportSection,
} from "./StoreOperationsViews";
import { TreatmentsSection } from "./StoreTreatmentViews";

const VALID_NAV_KEYS: StoreNavKey[] = [
  "overview",
  "bookings",
  "events",
  "products",
  "customers",
  "albums",
  "media",
  "loyalty",
  "orders",
  "miniapp",
  "staff",
  "pos",
  "reports",
  "documents",
  "support",
  "oainbox",
  "treatments",
  "settings",
];

/**
 * Mục gộp trên menu trái: một mục cha, các trang con chuyển bằng tab ngay đầu nội dung.
 * Đường dẫn cũ (/admin/events, /admin/media…) vẫn dùng được — chỉ menu gọn lại.
 */
const NAV_TABS: Partial<Record<StoreNavKey, { label: string; tabs: StoreNavKey[] }>> = {
  bookings: { label: "Lịch hẹn & Sự kiện", tabs: ["bookings", "events"] },
  customers: { label: "Khách hàng", tabs: ["customers", "treatments", "oainbox"] },
  albums: { label: "Thư viện", tabs: ["albums", "media", "documents"] },
  settings: { label: "Thiết lập & Hỗ trợ", tabs: ["settings", "support"] },
};
const NAV_PARENT = Object.fromEntries(
  Object.entries(NAV_TABS).flatMap(([parent, g]) => g!.tabs.map((k) => [k, parent])),
) as Partial<Record<StoreNavKey, StoreNavKey>>;


/** Trạng thái tự lưu trên thanh trên cùng (thay cho nút "Lưu cấu hình"). */
function SaveIndicator({ state, onRetry }: { state: "idle" | "pending" | "saving" | "saved" | "error"; onRetry: () => void }) {
  if (state === "error")
    return (
      <Button size="small" danger onClick={onRetry}>
        Chưa lưu được · Thử lại
      </Button>
    );
  if (state === "idle") return null;
  const busy = state === "pending" || state === "saving";
  return (
    <span className="hidden items-center gap-1.5 text-xs font-semibold text-slate-400 sm:flex">
      {busy ? <Spin size="small" /> : <LuCheck size={14} className="text-emerald-500" />}
      {busy ? "Đang lưu…" : "Đã lưu"}
    </span>
  );
}

const errMsg = (e: unknown, fb = "Thao tác thất bại") => (e instanceof ApiError ? e.message : fb);

export default function StoreConsole({
  user,
  account,
  onLogout,
}: {
  user: AuthUser;
  account: AccountInfo;
  onLogout: () => void;
}) {
  const navigate = useNavigate();
  const isAdmin = account.isAdmin;
  const { section } = useParams<{ section?: string }>();
  const activeNav: StoreNavKey = VALID_NAV_KEYS.includes(section as StoreNavKey) ? (section as StoreNavKey) : "overview";
  const setActiveNav = (key: StoreNavKey) => navigate(`/admin/${key}`);

  const [searchParams] = useSearchParams();
  useEffect(() => {
    // Các mục điều hành nền tảng đã chuyển sang /controller (đường dẫn cũ /admin/inbox, /admin/customers?tab=care…)
    const tab = searchParams.get("tab");
    const legacy = LEGACY_PLATFORM_SECTIONS[section === "customers" && tab ? tab : (section ?? "")];
    if (legacy) navigate(isAdmin ? `/controller/${legacy}` : "/admin/overview", { replace: true });
    else if (section === "inventory") navigate("/admin/products", { replace: true }); // trang Kho đã gộp vào Sản phẩm
    else if (section && !VALID_NAV_KEYS.includes(section as StoreNavKey)) navigate("/admin/overview", { replace: true });
  }, [section, searchParams, isAdmin, navigate]);

  const { message } = AntApp.useApp();
  const [stores, setStores] = useState<StoreWithOwner[]>([]);
  const [selectedId, setSelectedIdState] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);

  const setSelectedId = (id: string) => {
    setSelectedIdState(id);
    try {
      localStorage.setItem(LAST_STORE_KEY, id);
    } catch {
      // bỏ qua
    }
  };
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Modals
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [customerModal, setCustomerModal] = useState<{ open: boolean; item?: StoreCustomerItem }>({ open: false });

  const [customerForm] = Form.useForm();

  const loadStores = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const list = await fetchStores();
      setStores(list);
      let last = "";
      try {
        last = localStorage.getItem(LAST_STORE_KEY) ?? "";
      } catch {
        // bỏ qua
      }
      setSelectedIdState(list.some((s) => s.id === last) ? last : (list[0]?.id ?? ""));
    } catch (e) {
      setLoadError(errMsg(e, "Không tải được danh sách store"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStores();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const store = stores.find((s) => s.id === selectedId) ?? stores[0];
  // Tài khoản nhân viên: chỉ các mục chủ shop cấp (null = toàn quyền)
  const access = store?.access?.length ? store.access : null;
  // Liệu trình = lịch hẹn → ai có quyền Lịch hẹn thì xem được
  const allowed = (k: StoreNavKey) => !access || access.includes(k) || (k === "treatments" && access.includes("bookings"));
  /** Mở mục; mục gộp mà trang đầu không được cấp → mở trang con đầu tiên được cấp */
  const openNav = (key: StoreNavKey) => {
    const to = allowed(key) ? key : NAV_TABS[key]?.tabs.find(allowed);
    if (to) setActiveNav(to);
  };
  useEffect(() => {
    if (access && !access.includes(activeNav)) navigate(`/admin/${access[0]}`, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [access?.join(), activeNav]);

  // Bản mới nhất của danh sách store — các thao tác bất đồng bộ đọc từ đây (tránh dùng bản cũ trong closure)
  const storesRef = useRef(stores);
  storesRef.current = stores;

  /** Ghi một store theo id (an toàn khi người dùng đã chuyển sang store khác trong lúc chờ máy chủ). */
  const patchStore = (id: string, updater: (s: StoreWithOwner) => Partial<StoreWithOwner>) => {
    setStores((list) => {
      const next = list.map((s) => (s.id === id ? { ...s, ...updater(s) } : s));
      storesRef.current = next;
      return next;
    });
  };

  /** Chỉ cập nhật giao diện của store đang chọn (dữ liệu đã được lưu lên máy chủ ở nơi gọi). */
  const applyLocal = (updater: (s: StoreConfig) => StoreConfig) => {
    if (store) patchStore(store.id, updater);
  };

  // Chi tiết store (sản phẩm, khách, lịch hẹn, thiết kế…) chỉ tải khi chọn tới store đó
  const [detailError, setDetailError] = useState<string | null>(null);
  const loadDetail = async (id: string) => {
    setDetailError(null);
    try {
      const detail = await fetchStoreDetail(id);
      savedKeys.current[id] = configKey(detail); // mốc so sánh cho tự lưu = bản trên máy chủ
      setStores((list) => {
        const next = list.map((s) => (s.id === id ? detail : s));
        storesRef.current = next;
        return next;
      });
    } catch (e) {
      setDetailError(errMsg(e, "Không tải được dữ liệu store"));
    }
  };
  const needDetail = store && !store.loaded ? store.id : null;
  useEffect(() => {
    if (needDetail) loadDetail(needDetail);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needDetail]);

  /**
   * Cập nhật giao diện ngay, rồi đẩy thay đổi của Lịch hẹn / Sự kiện / Tài liệu / Hạng / Voucher /
   * Đơn hàng / Nhân sự lên máy chủ. Thông tin store & thiết kế tự lưu (xem configKey).
   * Các lần đồng bộ chạy lần lượt (hàng đợi) để bản ghi vừa tạo được sửa đúng id thật.
   * Lỗi thì báo và tải lại dữ liệu thật của store.
   */
  const syncQueue = useRef<Promise<unknown>>(Promise.resolve());
  const tempIds = useRef<Record<string, string>>({});
  const updateCurrentStore = (updater: (s: StoreConfig) => StoreConfig) => {
    if (!store) return;
    const id = store.id;
    const prev = storesRef.current.find((s) => s.id === id);
    if (!prev?.loaded) return;
    const next = { ...prev, ...updater(prev) };
    patchStore(id, () => next);
    syncQueue.current = syncQueue.current
      .then(() => syncStoreChanges(prev, next, tempIds.current))
      .then((created) => {
        if (!created.length) return;
        patchStore(id, (s) => {
          const patched = {} as Record<string, unknown>;
          for (const { key, tempId, item } of created) {
            patched[key] = (((patched[key] ?? s[key]) as { id: string }[] | undefined) ?? []).map((x) =>
              x.id === tempId ? item : x,
            );
          }
          return patched as Partial<StoreWithOwner>;
        });
      })
      .catch(async (e) => {
        message.error(errMsg(e, "Không lưu được thay đổi lên máy chủ"));
        await loadDetail(id);
      });
  };

  // ── Tự lưu thông tin store & thiết kế (không cần nút "Lưu cấu hình") ──
  // Đổi tên, theme, thiết kế Mini App… → chờ 1,2 giây không sửa nữa thì lưu lên máy chủ.
  const savedKeys = useRef<Record<string, string>>({});
  const pendingSave = useRef<{ store: StoreConfig; timer: number } | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "pending" | "saving" | "saved" | "error">("idle");

  // Lưu lần lượt: bản lưu chậm không ghi đè bản mới hơn
  const saveChain = useRef<Promise<unknown>>(Promise.resolve());
  const doSave = (s: StoreConfig) => {
    setSaveState("saving");
    saveChain.current = saveChain.current.then(async () => {
      try {
        await saveStoreConfig({ ...s, zaloAppSecret: undefined });
        savedKeys.current[s.id] = configKey(s);
        setSaveState(pendingSave.current ? "pending" : "saved");
      } catch (e) {
        setSaveState("error");
        message.error(errMsg(e, "Chưa lưu được thay đổi"));
      }
    });
    return saveChain.current;
  };
  const doSaveRef = useRef(doSave);
  doSaveRef.current = doSave;

  const flushSave = () => {
    const p = pendingSave.current;
    if (!p) return;
    clearTimeout(p.timer);
    pendingSave.current = null;
    void doSaveRef.current(p.store);
  };

  const currentKey = store ? configKey(store) : "";
  useEffect(() => {
    if (!store) return;
    const decision = autosaveDecision(store.loaded, savedKeys.current[store.id], currentKey);
    if (decision === "baseline") savedKeys.current[store.id] = currentKey; // bản vừa tải từ máy chủ
    if (decision !== "save") return;
    if (pendingSave.current && pendingSave.current.store.id !== store.id) flushSave();
    if (pendingSave.current) clearTimeout(pendingSave.current.timer);
    pendingSave.current = { store, timer: window.setTimeout(flushSave, 1200) };
    setSaveState("pending");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store?.id, store?.loaded, currentKey]);

  useEffect(() => {
    // Đóng tab khi còn thay đổi chưa lưu → hỏi lại; rời trang quản trị → lưu ngay
    const warn = (e: BeforeUnloadEvent) => {
      if (pendingSave.current) {
        flushSave();
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => {
      window.removeEventListener("beforeunload", warn);
      flushSave();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** App Secret chỉ lưu khi rời ô nhập (không tự lưu từng ký tự). */
  const saveZaloSecret = async () => {
    if (!store?.zaloAppSecret?.trim()) return;
    const sid = store.id;
    try {
      await saveStoreConfig(store);
      patchStore(sid, (s) => ({ ...s, zaloAppSecret: undefined, hasZaloAppSecret: true }));
      message.success("Đã lưu App Secret (mã hoá)");
    } catch (e) {
      message.error(errMsg(e, "Lưu App Secret thất bại"));
    }
  };

  const handleStoreCreated = (created: StoreWithOwner) => {
    setStores((list) => [created, ...list]);
    setSelectedId(created.id);
    setWizardOpen(false);
    navigate("/admin/miniapp");
  };

  // --- CRUD Khách hàng (lưu thẳng lên máy chủ) ---
  const openCustomerModal = (item?: StoreCustomerItem) => {
    setCustomerModal({ open: true, item });
    customerForm.setFieldsValue(
      item ?? { name: "", phone: "", tier: "Thành viên", points: 0, totalOrders: 0, totalSpent: 0, note: "" },
    );
  };

  const saveCustomer = async (values: Omit<StoreCustomerItem, "id" | "createdAt">) => {
    if (!store) return;
    const sid = store.id;
    try {
      if (customerModal.item) {
        const saved = await updateStoreCustomer(store.id, customerModal.item.id, values);
        patchStore(sid, (s) => ({ ...s, customers: s.customers.map((c) => (c.id === saved.id ? saved : c)) }));
      } else {
        const saved = await addStoreCustomer(store.id, values);
        patchStore(sid, (s) => ({ ...s, customers: [saved, ...s.customers] }));
      }
      setCustomerModal({ open: false });
      message.success(customerModal.item ? "Đã cập nhật khách hàng" : "Đã thêm khách hàng mới");
    } catch (e) {
      message.error(errMsg(e));
    }
  };

  const deleteCustomer = async (id: string) => {
    if (!store) return false;
    const sid = store.id;
    try {
      await deleteStoreCustomer(store.id, id);
      patchStore(sid, (s) => ({ ...s, customers: s.customers.filter((c) => c.id !== id) }));
      message.success("Đã xoá khách hàng");
      return true;
    } catch (e) {
      message.error(errMsg(e));
      return false;
    }
  };

  // Tin khách gửi cửa hàng (qua Mini App của quán) chưa đọc, theo từng khách
  const [unreadMap, setUnreadMap] = useState<Record<string, number>>({});
  const storeUnread = Object.values(unreadMap).reduce((a, b) => a + b, 0);
  const storeIdForUnread = store?.id;
  useEffect(() => setUnreadMap({}), [storeIdForUnread]);
  const loadUnread = () => {
    if (storeIdForUnread) fetchStoreUnread(storeIdForUnread).then(setUnreadMap).catch(() => undefined);
  };
  useEffect(() => {
    if (!storeIdForUnread) return;
    loadUnread();
    // Tab ẩn thì không hỏi máy chủ (đỡ tải); quay lại tab thì cập nhật ngay
    const t = setInterval(() => !document.hidden && loadUnread(), 30000);
    const onVisible = () => !document.hidden && loadUnread();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeIdForUnread, activeNav]);

  if (!store) {
    return (
      <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-50 via-white to-brand-50">
        <header className="flex h-14 items-center justify-between px-4 sm:px-8">
          <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-600 text-white">
              <LuStore size={16} />
            </span>
            Quản trị Store & Mini App
          </div>
          <Button type="text" icon={<LuLogOut size={15} />} onClick={onLogout}>
            Đăng xuất
          </Button>
        </header>
        <main className="flex flex-1 items-center justify-center px-4 py-10">
          {loading ? (
            <Spin size="large" />
          ) : loadError ? (
            <Result
              status="warning"
              title="Không tải được danh sách store"
              subTitle={loadError}
              extra={<Button type="primary" onClick={loadStores}>Thử lại</Button>}
            />
          ) : (
            <div className="w-full max-w-xl text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-brand-600 text-white shadow-lg shadow-brand-600/30">
                <LuSparkles size={34} />
              </div>
              <h1 className="mt-6 text-2xl font-extrabold text-slate-900 sm:text-3xl">
                Chào {account.customer?.companyName || user.name}, tạo store đầu tiên nhé!
              </h1>
              <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-500">
                Chọn mẫu giao diện theo ngành, điền tên cửa hàng — vài phút là có Mini App trên Zalo để bán hàng,
                nhận đặt lịch và chăm sóc khách.
              </p>
              <div className="mx-auto mt-6 grid max-w-md grid-cols-3 gap-2 text-xs font-semibold text-slate-600">
                {["Chọn mẫu theo ngành", "Thiết kế kéo-thả", "Xuất bản lên Zalo"].map((t, i) => (
                  <div key={t} className="rounded-2xl border border-slate-200 bg-white px-2 py-3">
                    <div className="mb-1 text-base font-black text-brand-600">{i + 1}</div>
                    {t}
                  </div>
                ))}
              </div>
              <Button type="primary" size="large" icon={<LuPlus size={17} />} className="mt-7 h-12 px-8 font-bold" onClick={() => setWizardOpen(true)}>
                Tạo store
              </Button>
            </div>
          )}
        </main>
        <CreateStoreWizard open={wizardOpen} onClose={() => setWizardOpen(false)} onCreated={handleStoreCreated} />
      </div>
    );
  }

  // QR mở Mini App của đúng gian hàng này (thiết kế + sản phẩm của shop), không phải mẫu minh hoạ
  const zaloPreviewUrl = getZaloStoreUrl(store.slug);

  // Số sản phẩm (không tính dịch vụ) sắp hết / hết hàng — hiện ở menu "Sản phẩm & Dịch vụ"
  const lowStock = store.products.filter((p) => p.kind !== "service" && p.kind !== "material" && !p.bom?.length && !p.combo && (p.stock ?? 0) <= LOW_STOCK).length;
  const navItems: { key: StoreNavKey; label: string; icon: React.ReactNode; badge?: number; alert?: boolean }[] = [
    { key: "overview", label: "Tổng quan", icon: <LuLayoutDashboard size={17} /> },
    { key: "pos", label: "Bán hàng", icon: <LuLayoutGrid size={17} /> },
    { key: "bookings", label: "Lịch hẹn", icon: <LuCalendarCheck size={17} />, badge: store.bookings?.length },
    { key: "events", label: "Sự kiện", icon: <LuCalendarDays size={17} /> },
    { key: "products", label: "Sản phẩm & Dịch vụ", icon: <LuPackage size={17} />, badge: lowStock || undefined },
    { key: "staff", label: "Nhân sự", icon: <LuIdCard size={17} /> },
    {
      key: "customers",
      label: "Khách hàng",
      icon: <LuUsers size={17} />,
      badge: storeUnread || store.customers.length,
      alert: storeUnread > 0,
    },
    { key: "albums", label: "Album ảnh", icon: <LuImages size={17} /> },
    { key: "media", label: "Kho ảnh", icon: <LuFolderOpen size={17} /> },
    { key: "loyalty", label: "Hạng & Voucher", icon: <LuCrown size={17} />, badge: store.vouchers?.length },
    { key: "orders", label: "Đơn hàng", icon: <LuShoppingBag size={17} /> },
    { key: "reports", label: "Báo cáo", icon: <LuChartColumn size={17} /> },
    { key: "miniapp", label: "Miniapp", icon: <LuSmartphone size={17} /> },
    { key: "documents", label: "Tài liệu", icon: <LuBookOpen size={17} />, badge: store.documents?.length },
    { key: "treatments", label: "Liệu trình", icon: <LuRepeat size={17} /> },
    { key: "oainbox", label: "Tin nhắn OA", icon: <LuMessagesSquare size={17} /> },
    { key: "settings", label: "Thiết lập", icon: <LuSettings size={17} /> },
    { key: "support", label: "Hỗ trợ", icon: <LuLifeBuoy size={17} /> },
  ];

  if (!store.loaded) for (const i of navItems) i.badge = i.alert ? i.badge : undefined;

  // Nhóm menu trái (kiểu Jira): mỗi nhóm một tiêu đề nhỏ; mục gộp (NAV_TABS) lấy nhãn cha, badge của trang con đầu
  const itemOf = (k: StoreNavKey) => navItems.find((i) => i.key === k)!;
  const navOf = (...keys: StoreNavKey[]) =>
    keys.flatMap((k) => {
      const g = NAV_TABS[k];
      if (!g) return allowed(k) ? [itemOf(k)] : [];
      const tabs = g.tabs.filter(allowed);
      if (!tabs.length) return [];
      // Chỉ còn 1 trang con được cấp → hiện như mục thường (nhãn & biểu tượng của trang đó)
      if (tabs.length === 1) return [{ ...itemOf(tabs[0]), key: k }];
      return [{ ...itemOf(k), label: g.label, children: tabs.map(itemOf) }];
    });
  const navGroups: ShellNavGroup<StoreNavKey>[] = [
    { title: "Vận hành", items: navOf("overview", "pos", "orders", "bookings") },
    { title: "Hàng hoá & nhân sự", items: navOf("products", "staff") },
    { title: "Khách hàng", items: navOf("customers", "loyalty") },
    { title: "Mini App", items: navOf("miniapp", "albums") },
    { title: "Hệ thống", items: navOf("reports", "settings") },
  ].filter((g) => g.items.length);
  const tabsOf = (k: StoreNavKey) => (NAV_TABS[k]?.tabs ?? []).filter(allowed);
  const navParent = NAV_PARENT[activeNav] ?? activeNav;
  const navTabs = NAV_TABS[navParent] && tabsOf(navParent).length > 1 ? { ...NAV_TABS[navParent]!, tabs: tabsOf(navParent) } : undefined;
  const activeLabel = itemOf(activeNav)?.label;

  const switcher = (variant: "top" | "sidebar", mini = false) => (
    <StoreSwitcher
      stores={stores}
      current={store}
      showOwner={isAdmin}
      onSelect={setSelectedId}
      onCreate={() => setWizardOpen(true)}
      variant={variant}
      mini={mini}
    />
  );

  return (
    <>
    <AdminShell
      logo={
        <>
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-600 text-white">
            <LuStore size={15} />
          </span>
          <span className="hidden text-sm font-semibold text-slate-900 sm:inline">reMini</span>
          <span className="hidden rounded bg-slate-100 px-1.5 py-0.5 text-2xs font-semibold text-slate-600 xl:inline">Quản trị cửa hàng</span>
        </>
      }
      groups={navGroups}
      active={navParent}
      onSelect={openNav}
      collapsed={sidebarCollapsed}
      onToggleCollapsed={() => setSidebarCollapsed((c) => !c)}
      sidebarHeader={(mini) => switcher("sidebar", mini)}
      sidebarFooter={(mini) =>
        mini ? (
          <Tooltip title={store.active ? "Mini App đang hoạt động" : "Mini App tạm tắt"} placement="right">
            <div className="flex justify-center py-1">
              <span className={`h-2 w-2 rounded-full ${store.active ? "bg-emerald-500" : "bg-slate-300"}`} />
            </div>
          </Tooltip>
        ) : (
          <div className="flex items-center justify-between gap-2 px-1">
            <div className="min-w-0 leading-tight">
              <div className="text-3xs font-medium text-slate-400">Mini App</div>
              <div className="mt-px text-xs font-medium text-slate-700">{store.active ? "Đang hoạt động" : "Tạm tắt"}</div>
            </div>
            <Switch
              size="small"
              checked={store.active}
              disabled={!allowed("miniapp") && !allowed("settings")}
              onChange={(v) => updateCurrentStore((s) => ({ ...s, active: v }))}
            />
          </div>
        )
      }
      mobileTop={switcher("top")}
      topRight={
        <>
          {/* Trạng thái tự lưu nằm bên trái nút tài khoản */}
          <SaveIndicator state={saveState} onRetry={() => store && void doSave(store)} />
          <UserMenu
            user={user}
            onLogout={onLogout}
            extraItems={
              isAdmin
                ? [{ key: "controller", icon: <LuGauge size={14} />, label: "Trang điều hành", onClick: () => navigate("/controller") }]
                : []
            }
          />
        </>
      }
      breadcrumb={navTabs ? [store.name, navTabs.label, activeLabel] : [store.name, activeLabel]}
    >
          {navTabs && (
            <SectionTabs active={activeNav} onChange={(k) => setActiveNav(k as StoreNavKey)} items={navTabs.tabs.map(itemOf)} />
          )}

          {!store.loaded ? (
            <div className="flex min-h-[50vh] items-center justify-center rounded-2xl border border-slate-200 bg-white">
              {detailError ? (
                <Result status="warning" title="Không tải được dữ liệu store" subTitle={detailError} extra={<Button type="primary" onClick={() => loadDetail(store.id)}>Thử lại</Button>} />
              ) : (
                <Spin size="large" />
              )}
            </div>
          ) : (
          <Suspense fallback={<SectionLoading />}>
          {activeNav === "overview" && (
            <OverviewSection store={store} onNavigate={openNav} updateCurrentStore={updateCurrentStore} />
          )}

          {activeNav === "bookings" && (
            <BookingsSection store={store} updateCurrentStore={updateCurrentStore} />
          )}

          {activeNav === "events" && (
            <EventsSection store={store} updateCurrentStore={updateCurrentStore} />
          )}

          {activeNav === "loyalty" && (
            <LoyaltySection store={store} updateCurrentStore={updateCurrentStore} applyLocal={applyLocal} />
          )}

          {activeNav === "orders" && (
            <OrdersSection store={store} updateCurrentStore={updateCurrentStore} applyLocal={applyLocal} />
          )}

          {activeNav === "pos" && <PosSection key={store.id} store={store} onCheckout={() => loadDetail(store.id)} onLocal={applyLocal} />}
          {activeNav === "reports" && <ReportsSection key={store.id} store={store} />}
          {activeNav === "staff" && <StaffSection key={store.id} store={store} updateCurrentStore={updateCurrentStore} applyLocal={applyLocal} />}

          {activeNav === "documents" && (
            <DocumentsSection store={store} updateCurrentStore={updateCurrentStore} />
          )}

          {activeNav === "support" && (
            <SupportSection store={store} updateCurrentStore={updateCurrentStore} />
          )}

          {activeNav === "products" && <ProductsSection key={store.id} store={store} onLocal={applyLocal} />}

          {activeNav === "customers" && (
            <CustomersSection
              key={store.id}
              store={store}
              unreadMap={unreadMap}
              onUnreadChange={loadUnread}
              onAdd={() => openCustomerModal()}
              onEdit={(c) => openCustomerModal(c)}
              onDelete={deleteCustomer}
              onCreateBooking={(b) => updateCurrentStore((s) => ({ ...s, bookings: [b, ...(s.bookings ?? [])] }))}
            />
          )}


          {activeNav === "treatments" && <TreatmentsSection store={store} updateCurrentStore={updateCurrentStore} />}
          {activeNav === "oainbox" && <InboxSection key={store.id} storeId={store.id} />}

          {activeNav === "settings" && (
            <StoreSettingsSection
              key={store.id}
              store={store}
              onPatch={(patch) => updateCurrentStore((s) => ({ ...s, ...patch }))}
              onSecretInput={(v) => applyLocal((s) => ({ ...s, zaloAppSecret: v }))}
              onSecretSave={saveZaloSecret}
            />
          )}

          {activeNav === "albums" && (
            <AlbumsSection key={store.id} store={store} initialCustomerId={searchParams.get("customer") ?? undefined} />
          )}

          {activeNav === "media" && <MediaLibrarySection key={store.id} store={store} />}

          {activeNav === "miniapp" && (
            <MiniAppStudio
              key={store.id}
              store={store}
              previewUrl={zaloPreviewUrl}
              onPublish={() => setPublishModalOpen(true)}
              onChange={(nextSchema) =>
                updateCurrentStore((s) => ({
                  ...s,
                  builder: nextSchema,
                  theme: {
                    ...s.theme,
                    primary: nextSchema.theme.primary,
                    accent: nextSchema.theme.accent,
                    bg: nextSchema.theme.bg,
                  },
                }))
              }
            />
          )}
          </Suspense>
          )}
    </AdminShell>

      {/* Modal Xuất bản · Thông tin & Zalo ID */}
      <Modal
        title="Xuất bản Mini App · Thông tin & Zalo ID"
        open={publishModalOpen}
        onCancel={() => setPublishModalOpen(false)}
        width={760}
        footer={[
          <Button key="close" onClick={() => setPublishModalOpen(false)}>
            Đóng
          </Button>,
          <Button
            key="save"
            type="primary"
            onClick={() => {
              flushSave();
              setPublishModalOpen(false);
            }}
          >
            Xong
          </Button>,
        ]}
      >
        <div className="grid gap-5 pt-2 md:grid-cols-12">
          <div className="md:col-span-8">
            <Form layout="vertical" className="grid gap-x-4 sm:grid-cols-2">
              <Form.Item label="Tên thương hiệu Store">
                <Input
                  value={store.name}
                  onChange={(e) => updateCurrentStore((s) => ({ ...s, name: e.target.value }))}
                />
              </Form.Item>
              <Form.Item label="Slogan / Mô tả ngắn">
                <Input
                  value={store.subtitle}
                  onChange={(e) => updateCurrentStore((s) => ({ ...s, subtitle: e.target.value }))}
                />
              </Form.Item>
              <Form.Item label="Zalo Mini App ID">
                <Input
                  value={store.zaloAppId}
                  onChange={(e) => updateCurrentStore((s) => ({ ...s, zaloAppId: e.target.value }))}
                />
              </Form.Item>
              <Form.Item label="Zalo OA ID">
                <Input
                  value={store.zaloOaId}
                  onChange={(e) => updateCurrentStore((s) => ({ ...s, zaloOaId: e.target.value }))}
                />
              </Form.Item>
              <Form.Item
                label="App Secret của Mini App"
                className="sm:col-span-2"
                extra="Để lấy số điện thoại khi khách đăng nhập Zalo trong Mini App của store. Lưu mã hoá, không hiển thị lại."
              >
                <Input.Password
                  autoComplete="new-password"
                  placeholder={store.hasZaloAppSecret ? "•••••••• (đã lưu — nhập để thay)" : "mini.zalo.me → Cài đặt → App Secret"}
                  value={store.zaloAppSecret ?? ""}
                  onChange={(e) => applyLocal((s) => ({ ...s, zaloAppSecret: e.target.value }))}
                  onBlur={saveZaloSecret}
                  onPressEnter={saveZaloSecret}
                />
              </Form.Item>
              <Form.Item label="Hotline">
                <Input
                  value={store.phone}
                  onChange={(e) => updateCurrentStore((s) => ({ ...s, phone: e.target.value }))}
                />
              </Form.Item>
              <Form.Item label="Địa chỉ">
                <Input
                  value={store.address}
                  onChange={(e) => updateCurrentStore((s) => ({ ...s, address: e.target.value }))}
                />
              </Form.Item>
            </Form>
          </div>
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-100 bg-slate-50 p-4 text-center md:col-span-4">
            <QRCode value={zaloPreviewUrl} size={136} bordered={false} />
            <div className="mt-2.5 text-xs font-bold text-slate-900">Quét bằng Zalo để xem trước</div>
            <div className="mt-0.5 text-xs text-slate-500">Mini App của shop · /{store.slug}</div>
          </div>
        </div>
        <div className="mt-4 border-t border-slate-100 pt-4">
          <Suspense fallback={<Spin />}>
            <BuildRequestPanel key={store.id} store={store} />
          </Suspense>
        </div>
      </Modal>


      <CreateStoreWizard open={wizardOpen} onClose={() => setWizardOpen(false)} onCreated={handleStoreCreated} />

      {/* Modal thêm / sửa Khách hàng */}
      <Modal
        title={customerModal.item ? "Cập nhật khách hàng" : "Thêm khách hàng mới"}
        open={customerModal.open}
        onCancel={() => setCustomerModal({ open: false })}
        footer={null}
      >
        <Form form={customerForm} layout="vertical" onFinish={saveCustomer}>
          <div className="grid gap-x-4 sm:grid-cols-2">
            <Form.Item label="Họ tên" name="name" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item label="Số điện thoại" name="phone" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          </div>
          <div className="grid gap-x-4 sm:grid-cols-3">
            <Form.Item label="Hạng" name="tier">
              <Select
                options={[
                  { value: "Thành viên", label: "Thành viên" },
                  { value: "Bạc", label: "Bạc" },
                  { value: "Vàng", label: "Vàng" },
                  { value: "Kim Cương", label: "Kim Cương" },
                ]}
              />
            </Form.Item>
            <Form.Item label="Điểm tích luỹ" name="points">
              <InputNumber className="w-full" min={0} />
            </Form.Item>
            <Form.Item label="Số đơn" name="totalOrders">
              <InputNumber className="w-full" min={0} />
            </Form.Item>
          </div>
          <Form.Item label="Tổng chi tiêu (đ)" name="totalSpent">
            <InputNumber className="w-full" min={0} step={10000} />
          </Form.Item>
          <Form.Item label="Ghi chú" name="note">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Button type="primary" htmlType="submit" block className="font-bold">
            Lưu khách hàng
          </Button>
        </Form>
      </Modal>
    </>
  );
}
