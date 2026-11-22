import {
  Button,
  Drawer,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  QRCode,
  Result,
  Select,
  Spin,
  Switch,
  Table,
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
  LuMenu,
  LuPackage,
  LuPanelLeftClose,
  LuPanelLeftOpen,
  LuPlus,
  LuCheck,
  LuShoppingBag,
  LuSparkles,
  LuSmartphone,
  LuStore,
  LuTrash2,
  LuUsers,
  LuImages,
  LuWarehouse,
} from "react-icons/lu";
import type { AccountInfo, AuthUser } from "../data/auth";
import { ApiError } from "../data/platform-api";
import { getZaloTemplateUrl } from "../data/site";
import {
  addStoreCustomer,
  addStoreProduct,
  deleteStoreCustomer,
  deleteStoreProduct,
  fetchStoreDetail,
  fetchStores,
  saveStoreConfig,
  StoreConfig,
  StoreCustomerItem,
  StoreProductItem,
  StoreWithOwner,
  updateStoreCustomer,
  updateStoreProduct,
} from "../data/store-api";
import { syncStoreChanges } from "../data/store-sync";
import { fetchStoreUnread } from "../data/album-api";
import CreateStoreWizard from "./CreateStoreWizard";
import StoreSwitcher from "./StoreSwitcher";
import UserMenu from "./UserMenu";
import { LEGACY_PLATFORM_SECTIONS } from "./PlatformConsole";

// Các mục nặng / ít dùng tải riêng khi mở tới (giảm dung lượng tải trang quản trị lần đầu)
const named = <K extends string, M extends Record<K, React.ComponentType<never>>>(p: Promise<M>, k: K) =>
  p.then((m) => ({ default: m[k] as M[K] }));
const MiniAppStudio = lazy(() => import("./MiniAppStudio"));
const AlbumsSection = lazy(() => named(import("./AlbumViews"), "AlbumsSection"));
const CustomersSection = lazy(() => named(import("./StoreCustomerViews"), "CustomersSection"));
const OrdersSection = lazy(() => named(import("./StoreOrderViews"), "OrdersSection"));

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
  InventorySection,
  OverviewSection,
  StoreNavKey,
  SupportSection,
} from "./StoreOperationsViews";

const VALID_NAV_KEYS: StoreNavKey[] = [
  "overview",
  "bookings",
  "events",
  "products",
  "customers",
  "albums",
  "loyalty",
  "orders",
  "miniapp",
  "inventory",
  "documents",
  "support",
];


/** Các trường thông tin / thiết kế store được tự lưu (PATCH /stores/:id/config) khi thay đổi. */
const configKey = (s: StoreConfig) =>
  JSON.stringify([s.name, s.subtitle, s.templateId, s.zaloAppId, s.zaloOaId, s.phone, s.address, s.active, s.theme, s.sliders, s.builder ?? null]);

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

const LAST_STORE_KEY = "recloud_last_store_v1";
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
    else if (section && !VALID_NAV_KEYS.includes(section as StoreNavKey)) navigate("/admin/overview", { replace: true });
  }, [section, searchParams, isAdmin, navigate]);

  const { message } = AntApp.useApp();
  const [stores, setStores] = useState<StoreWithOwner[]>([]);
  const [selectedId, setSelectedIdState] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const setSelectedId = (id: string) => {
    setSelectedIdState(id);
    try {
      localStorage.setItem(LAST_STORE_KEY, id);
    } catch {
      // bỏ qua
    }
  };
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => activeNav === "miniapp");

  useEffect(() => {
    setSidebarCollapsed(activeNav === "miniapp");
  }, [activeNav]);

  // Modals
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [productModal, setProductModal] = useState<{ open: boolean; item?: StoreProductItem }>({ open: false });
  const [customerModal, setCustomerModal] = useState<{ open: boolean; item?: StoreCustomerItem }>({ open: false });

  const [productForm] = Form.useForm();
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
   * Đơn hàng / Kho lên máy chủ. Thông tin store & thiết kế tự lưu (xem configKey).
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
    if (!store?.loaded) return; // chưa có chi tiết thì chưa so sánh được
    if (savedKeys.current[store.id] === undefined) {
      savedKeys.current[store.id] = currentKey; // bản vừa tải từ máy chủ
      return;
    }
    if (currentKey === savedKeys.current[store.id]) return;
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

  // --- CRUD Sản phẩm (lưu thẳng lên máy chủ) ---
  const openProductModal = (item?: StoreProductItem) => {
    setProductModal({ open: true, item });
    productForm.setFieldsValue(
      item ?? { name: "", category: "Chung", price: 0, salePrice: undefined, unit: "", tag: "", active: true },
    );
  };

  const saveProduct = async (values: Omit<StoreProductItem, "id">) => {
    if (!store) return;
    const sid = store.id;
    try {
      if (productModal.item) {
        const saved = await updateStoreProduct(store.id, productModal.item.id, values);
        patchStore(sid, (s) => ({ ...s, products: s.products.map((p) => (p.id === saved.id ? saved : p)) }));
      } else {
        const saved = await addStoreProduct(store.id, values);
        patchStore(sid, (s) => ({ ...s, products: [saved, ...s.products] }));
      }
      setProductModal({ open: false });
      message.success(productModal.item ? "Đã cập nhật sản phẩm" : "Đã thêm sản phẩm mới");
    } catch (e) {
      message.error(errMsg(e));
    }
  };

  const toggleProduct = async (id: string, active: boolean) => {
    if (!store) return;
    const sid = store.id;
    try {
      const saved = await updateStoreProduct(store.id, id, { active });
      patchStore(sid, (s) => ({ ...s, products: s.products.map((p) => (p.id === id ? saved : p)) }));
    } catch (e) {
      message.error(errMsg(e));
    }
  };

  const deleteProduct = async (id: string) => {
    if (!store) return;
    const sid = store.id;
    try {
      await deleteStoreProduct(store.id, id);
      patchStore(sid, (s) => ({ ...s, products: s.products.filter((p) => p.id !== id) }));
      message.success("Đã xoá sản phẩm");
    } catch (e) {
      message.error(errMsg(e));
    }
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

  const zaloPreviewUrl = getZaloTemplateUrl(store.templateId);

  const navItems: { key: StoreNavKey; label: string; icon: React.ReactNode; badge?: number; alert?: boolean }[] = [
    { key: "overview", label: "Tổng quan", icon: <LuLayoutDashboard size={17} /> },
    { key: "bookings", label: "Lịch hẹn", icon: <LuCalendarCheck size={17} />, badge: store.bookings?.length },
    { key: "events", label: "Sự kiện", icon: <LuCalendarDays size={17} /> },
    { key: "products", label: "Sản phẩm", icon: <LuPackage size={17} />, badge: store.products.length },
    {
      key: "customers",
      label: "Khách hàng",
      icon: <LuUsers size={17} />,
      badge: storeUnread || store.customers.length,
      alert: storeUnread > 0,
    },
    { key: "albums", label: "Album ảnh", icon: <LuImages size={17} /> },
    { key: "loyalty", label: "Hạng & Voucher", icon: <LuCrown size={17} />, badge: store.vouchers?.length },
    { key: "orders", label: "Đơn hàng", icon: <LuShoppingBag size={17} /> },
    { key: "miniapp", label: "Miniapp", icon: <LuSmartphone size={17} /> },
    { key: "inventory", label: "Kho", icon: <LuWarehouse size={17} /> },
    { key: "documents", label: "Thư viện & Tài liệu", icon: <LuBookOpen size={17} />, badge: store.documents?.length },
    { key: "support", label: "Hỗ trợ", icon: <LuLifeBuoy size={17} /> },
  ];

  if (!store.loaded) for (const i of navItems) i.badge = i.alert ? i.badge : undefined;

  const navGroups = [{ title: "Cửa hàng", items: navItems }];

  const renderSidebarMenu = (onSelect?: () => void, collapsed = false) => (
    <div className="space-y-1">
      {navGroups.map((group, gi) => (
        <div key={group.title} className={gi > 0 ? "mt-3 border-t border-slate-100 pt-3" : ""}>
          {!collapsed && (
            <div className="px-3 pb-2 pt-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {group.title}
            </div>
          )}
          <div className="space-y-1">
      {group.items.map((item) => {
        const active = activeNav === item.key;
        const btn = (
          <button
            key={item.key}
            type="button"
            onClick={() => {
              setActiveNav(item.key);
              onSelect?.();
            }}
            className={`flex w-full items-center rounded-xl text-left text-sm font-semibold transition ${
              collapsed ? "justify-center px-0 py-2.5" : "justify-between px-3 py-2"
            } ${
              active
                ? "bg-brand-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <span className="flex items-center gap-2.5">
              {item.icon}
              {!collapsed && <span className="truncate">{item.label}</span>}
            </span>
            {!collapsed && typeof item.badge === "number" && (
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                  active ? "bg-white/20 text-white" : item.alert ? "bg-rose-500 text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                {item.badge}
              </span>
            )}
          </button>
        );
        return collapsed ? (
          <Tooltip key={item.key} title={item.label} placement="right">
            {btn}
          </Tooltip>
        ) : (
          btn
        );
      })}
          </div>
        </div>
      ))}
    </div>
  );

  const isStudioView = activeNav === "miniapp";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
        <div className={`mx-auto flex h-14 items-center justify-between gap-2 px-3 sm:px-4 ${isStudioView ? "max-w-none" : "max-w-[1440px]"}`}>
          <div className="flex items-center gap-2">
            <Button
              type="text"
              icon={<LuMenu size={18} />}
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden"
            />
            <Tooltip title={sidebarCollapsed ? "Mở rộng menu trái" : "Thu gọn menu trái"}>
              <Button
                type="text"
                icon={sidebarCollapsed ? <LuPanelLeftOpen size={18} /> : <LuPanelLeftClose size={18} />}
                onClick={() => setSidebarCollapsed((c) => !c)}
                className="hidden lg:inline-flex"
              />
            </Tooltip>
            <div className="flex items-center gap-2">
              <LuStore size={18} className="text-brand-600" />
              <span className="hidden text-sm font-extrabold text-slate-900 sm:inline sm:text-base">Quản trị Store & Mini App</span>

            </div>
          </div>

          <div className="flex items-center gap-2">
            <StoreSwitcher
              stores={stores}
              current={store}
              showOwner={isAdmin}
              onSelect={setSelectedId}
              onCreate={() => setWizardOpen(true)}
            />
            <SaveIndicator state={saveState} onRetry={() => store && void doSave(store)} />
            {isAdmin && (
              <Tooltip title="Trang điều hành nền tảng">
                <Button icon={<LuGauge size={15} />} onClick={() => navigate("/controller")}>
                  <span className="hidden lg:inline">Điều hành</span>
                </Button>
              </Tooltip>
            )}
            <UserMenu user={user} onLogout={onLogout} />
          </div>
        </div>
      </header>

      <Drawer
        title="Quản trị Store"
        placement="left"
        size={250}
        open={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
      >
        {renderSidebarMenu(() => setMobileSidebarOpen(false))}
      </Drawer>

      <div className={`mx-auto flex ${isStudioView ? "max-w-none gap-3 px-3 py-3" : "max-w-[1440px] gap-5 px-4 py-5"}`}>
        {/* Sidebar Desktop */}
        <aside className={`hidden shrink-0 transition-all lg:block ${sidebarCollapsed ? "w-[62px]" : "w-56"}`}>
          <div className={`sticky top-[68px] rounded-2xl border border-slate-200/80 bg-white shadow-sm ${sidebarCollapsed ? "p-2" : "p-3"}`}>
            {renderSidebarMenu(undefined, sidebarCollapsed)}
            {!sidebarCollapsed && (
              <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3">
                <div className="text-[11px] font-bold text-slate-500">Trạng thái Mini App</div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    {store.active ? "Đang hoạt động" : "Tạm tắt"}
                  </span>
                  <Switch
                    size="small"
                    checked={store.active}
                    onChange={(v) => updateCurrentStore((s) => ({ ...s, active: v }))}
                  />
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Nội dung chính theo Sidebar */}
        <main className="min-w-0 flex-1">
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
            <OverviewSection store={store} onNavigate={setActiveNav} updateCurrentStore={updateCurrentStore} />
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

          {activeNav === "inventory" && (
            <InventorySection store={store} updateCurrentStore={updateCurrentStore} />
          )}

          {activeNav === "documents" && (
            <DocumentsSection store={store} updateCurrentStore={updateCurrentStore} />
          )}

          {activeNav === "support" && (
            <SupportSection store={store} updateCurrentStore={updateCurrentStore} />
          )}

          {activeNav === "products" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Sản phẩm / Dịch vụ ({store.products.length})
                  </h3>
                  <p className="text-xs text-slate-500">Quản lý danh mục, giá bán và trạng thái hiển thị trên Mini App.</p>
                </div>
                <Button type="primary" icon={<LuPlus size={15} />} onClick={() => openProductModal()}>
                  Thêm sản phẩm
                </Button>
              </div>
              <Table
                rowKey="id"
                size="small"
                pagination={{ pageSize: 8 }}
                dataSource={store.products}
                columns={[
                  {
                    title: "Tên sản phẩm / Dịch vụ",
                    dataIndex: "name",
                    render: (v, rec) => (
                      <div>
                        <div className="font-semibold text-slate-900">{v}</div>
                        <div className="text-[11px] text-slate-400">
                          {rec.category} {rec.unit ? `· ${rec.unit}` : ""}
                        </div>
                      </div>
                    ),
                  },
                  {
                    title: "Giá bán",
                    dataIndex: "price",
                    render: (price, rec) => (
                      <div>
                        <div className="font-bold text-brand-600">
                          {(rec.salePrice ?? price).toLocaleString("vi-VN")}đ
                        </div>
                        {rec.salePrice ? (
                          <div className="text-[11px] text-slate-400 line-through">
                            {price.toLocaleString("vi-VN")}đ
                          </div>
                        ) : null}
                      </div>
                    ),
                  },
                  {
                    title: "Tồn kho",
                    dataIndex: "stock",
                    render: (stock) => <span className="text-xs font-semibold">{stock ?? "—"}</span>,
                  },
                  {
                    title: "Hiển thị",
                    dataIndex: "active",
                    render: (v, rec) => (
                      <Switch
                        size="small"
                        checked={v}
                        onChange={(checked) => toggleProduct(rec.id, checked)}
                      />
                    ),
                  },
                  {
                    title: "",
                    align: "right",
                    render: (_, rec) => (
                      <div className="flex justify-end gap-1">
                        <Button size="small" onClick={() => openProductModal(rec)}>
                          Sửa
                        </Button>
                        <Popconfirm title="Xoá sản phẩm?" onConfirm={() => deleteProduct(rec.id)}>
                          <Button size="small" danger icon={<LuTrash2 size={13} />} />
                        </Popconfirm>
                      </div>
                    ),
                  },
                ]}
              />
            </div>
          )}

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


          {activeNav === "albums" && (
            <AlbumsSection key={store.id} store={store} initialCustomerId={searchParams.get("customer") ?? undefined} />
          )}

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
        </main>
      </div>

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
            <Form layout="vertical" className="grid gap-x-3 sm:grid-cols-2">
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
            <div className="mt-2.5 text-xs font-bold text-slate-900">Mã QR truy cập Store</div>
            <div className="mt-0.5 text-[11px] text-slate-500">Slug: /{store.slug}</div>
          </div>
        </div>
      </Modal>


      <CreateStoreWizard open={wizardOpen} onClose={() => setWizardOpen(false)} onCreated={handleStoreCreated} />

      {/* Modal thêm / sửa Sản phẩm */}
      <Modal
        title={productModal.item ? "Sửa sản phẩm / dịch vụ" : "Thêm sản phẩm / dịch vụ"}
        open={productModal.open}
        onCancel={() => setProductModal({ open: false })}
        footer={null}
      >
        <Form form={productForm} layout="vertical" onFinish={saveProduct}>
          <Form.Item label="Tên sản phẩm / dịch vụ" name="name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <div className="grid grid-cols-2 gap-3">
            <Form.Item label="Danh mục" name="category">
              <Input placeholder="Áo, Cà phê, Gói khám..." />
            </Form.Item>
            <Form.Item label="Đơn vị / Size" name="unit">
              <Input placeholder="Hộp 500g, Size M/L..." />
            </Form.Item>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Form.Item label="Giá gốc (đ)" name="price" rules={[{ required: true }]}>
              <InputNumber className="w-full" min={0} step={1000} />
            </Form.Item>
            <Form.Item label="Giá khuyến mãi (đ)" name="salePrice">
              <InputNumber className="w-full" min={0} step={1000} />
            </Form.Item>
          </div>
          <Form.Item label="Hiển thị trên app" name="active" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Button type="primary" htmlType="submit" block className="font-bold">
            Lưu sản phẩm
          </Button>
        </Form>
      </Modal>

      {/* Modal thêm / sửa Khách hàng */}
      <Modal
        title={customerModal.item ? "Cập nhật khách hàng" : "Thêm khách hàng mới"}
        open={customerModal.open}
        onCancel={() => setCustomerModal({ open: false })}
        footer={null}
      >
        <Form form={customerForm} layout="vertical" onFinish={saveCustomer}>
          <div className="grid grid-cols-2 gap-3">
            <Form.Item label="Họ tên" name="name" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item label="Số điện thoại" name="phone" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          </div>
          <div className="grid grid-cols-3 gap-3">
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
    </div>
  );
}
