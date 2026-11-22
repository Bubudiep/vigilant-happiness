import {
  Button,
  Drawer,
  Dropdown,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  QRCode,
  Select,
  Switch,
  Table,
  Tag,
  Tooltip,
  App as AntApp,
} from "antd";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  LuBookOpen,
  LuCalendarCheck,
  LuCalendarDays,
  LuCrown,
  LuLayoutDashboard,
  LuLifeBuoy,
  LuLogOut,
  LuMenu,
  LuKeyRound,
  LuKanban,
  LuShieldAlert,
  LuPackage,
  LuPhoneCall,
  LuPanelLeftClose,
  LuPanelLeftOpen,
  LuPlus,
  LuSave,
  LuSearch,
  LuShoppingBag,
  LuSmartphone,
  LuStore,
  LuTrash2,
  LuUsers,
  LuWallet,
  LuMessagesSquare,
  LuImages,
  LuHeartHandshake,
  LuWarehouse,
} from "react-icons/lu";
import type { AuthUser } from "../data/auth";
import { demoTemplates, getZaloTemplateUrl } from "../data/site";
import {
  fetchStores,
  saveAllLocalStores,
  createStoreRemote,
  saveStoreConfig,
  StoreConfig,
  StoreCustomerItem,
  StoreProductItem,
} from "../data/store-api";
import {
  BuilderSchema,
  createSchemaFromPreset,
  guessPresetId,
  MiniAppBuilder,
} from "../miniapp-builder";
import { ApiChannelsSection, CallbacksSection } from "./PlatformViews";
import { AuditSection, CustomersPlatformSection } from "./CustomersAuditViews";
import { DebtsSection } from "./DebtViews";
import { CareSection, CustomerFilesSection, InboxSection } from "./InboxViews";
import { fetchInboxSummary, InboxSummary } from "../data/inbox-api";
import { AntiSpamSection, PortalSection } from "./PortalAdminViews";
import { LoyaltySection } from "./StoreLoyaltyViews";
import {
  BookingsSection,
  DocumentsSection,
  EventsSection,
  InventorySection,
  OrdersSection,
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
  "loyalty",
  "orders",
  "miniapp",
  "inventory",
  "documents",
  "support",
  "callbacks",
  "portal",
  "platformCustomers",
  "debts",
  "inbox",
  "files",
  "care",
  "audit",
  "antispam",
  "api",
];

export default function StoreConsole({
  user,
  onLogout,
}: {
  user: AuthUser;
  onLogout: () => void;
}) {
  const navigate = useNavigate();
  const { section } = useParams<{ section?: string }>();
  const activeNav: StoreNavKey = VALID_NAV_KEYS.includes(section as StoreNavKey)
    ? (section as StoreNavKey)
    : "overview";
  const setActiveNav = (key: StoreNavKey) => navigate(`/admin/${key}`);

  const { message } = AntApp.useApp();
  const [stores, setStores] = useState<StoreConfig[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [dataSource, setDataSource] = useState<"api" | "local">("local");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => activeNav === "miniapp");

  useEffect(() => {
    setSidebarCollapsed(activeNav === "miniapp");
  }, [activeNav]);

  // Modals
  const [newStoreOpen, setNewStoreOpen] = useState(false);
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [productModal, setProductModal] = useState<{ open: boolean; item?: StoreProductItem }>({ open: false });
  const [customerModal, setCustomerModal] = useState<{ open: boolean; item?: StoreCustomerItem }>({ open: false });
  const [customerKeyword, setCustomerKeyword] = useState("");

  const [newStoreForm] = Form.useForm();
  const [productForm] = Form.useForm();
  const [customerForm] = Form.useForm();

  useEffect(() => {
    fetchStores().then(({ stores: list, source }) => {
      setStores(list);
      setDataSource(source);
      if (list.length > 0) setSelectedId(list[0].id);
    });
  }, []);

  const store = stores.find((s) => s.id === selectedId) ?? stores[0];

  const updateCurrentStore = (updater: (s: StoreConfig) => StoreConfig) => {
    if (!store) return;
    const updated = updater(store);
    const nextList = stores.map((s) => (s.id === store.id ? updated : s));
    setStores(nextList);
    saveAllLocalStores(nextList);
  };

  const handlePersistStore = async () => {
    if (!store) return;
    const target = await saveStoreConfig(store);
    if (target === "api") {
      message.success(`Đã lưu cấu hình & thiết kế "${store.name}" lên máy chủ — Mini App sẽ dùng bản này.`);
    } else {
      message.warning(`Đã lưu "${store.name}" trên trình duyệt này. Chưa đồng bộ được máy chủ (chưa đăng nhập Google hoặc backend chưa chạy).`);
    }
  };

  const handleCreateStore = async (values: { name: string; slug: string; templateId: string; subtitle?: string }) => {
    const tpl = demoTemplates.find((t) => t.id === values.templateId) ?? demoTemplates[0];
    const created: StoreConfig = {
      id: `store_${Date.now()}`,
      slug: values.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-"),
      name: values.name.trim(),
      subtitle: values.subtitle?.trim() || tpl.description.slice(0, 60),
      templateId: tpl.id,
      zaloAppId: "3546317553033780315",
      active: true,
      theme: {
        primary: tpl.color,
        accent: "#f59e0b",
        bg: "#f5f6f8",
        headerVariant: "pastel",
        bannerVariant: "editorial",
        productCardVariant: "editorial",
        memberCardVariant: "minimal",
      },
      sliders: [
        {
          id: `sl_${Date.now()}`,
          eyebrow: "KHUYẾN MÃI MỚI",
          title: `Chào mừng đến với ${values.name}`,
          subtitle: "Ưu đãi dành riêng cho khách đặt qua Zalo Mini App",
          from: tpl.color,
          to: "#3b82f6",
          cta: "Khám phá",
        },
      ],
      products: [],
      customers: [],
    };
    const remote = await createStoreRemote(created);
    const finalStore = remote ?? created;
    const next = [finalStore, ...stores];
    setStores(next);
    saveAllLocalStores(next);
    setSelectedId(finalStore.id);
    setNewStoreOpen(false);
    newStoreForm.resetFields();
    if (remote) message.success(`Đã tạo Store "${finalStore.name}" trên máy chủ!`);
    else message.warning(`Đã tạo Store "${finalStore.name}" trên trình duyệt (chưa đồng bộ máy chủ).`);
  };

  // --- CRUD Sản phẩm ---
  const openProductModal = (item?: StoreProductItem) => {
    setProductModal({ open: true, item });
    productForm.setFieldsValue(
      item ?? { name: "", category: "Chung", price: 199000, salePrice: undefined, unit: "", tag: "", active: true },
    );
  };

  const saveProduct = (values: Omit<StoreProductItem, "id">) => {
    updateCurrentStore((s) => {
      if (productModal.item) {
        return {
          ...s,
          products: s.products.map((p) => (p.id === productModal.item!.id ? { ...p, ...values } : p)),
        };
      }
      return {
        ...s,
        products: [{ id: `sp_${Date.now()}`, ...values }, ...s.products],
      };
    });
    setProductModal({ open: false });
    message.success(productModal.item ? "Đã cập nhật sản phẩm" : "Đã thêm sản phẩm mới");
  };

  const deleteProduct = (id: string) => {
    updateCurrentStore((s) => ({ ...s, products: s.products.filter((p) => p.id !== id) }));
    message.success("Đã xoá sản phẩm");
  };

  // --- CRUD Khách hàng ---
  const openCustomerModal = (item?: StoreCustomerItem) => {
    setCustomerModal({ open: true, item });
    customerForm.setFieldsValue(
      item ?? { name: "", phone: "", tier: "Thành viên", points: 0, totalOrders: 0, totalSpent: 0, note: "" },
    );
  };

  const saveCustomer = (values: Omit<StoreCustomerItem, "id" | "createdAt">) => {
    updateCurrentStore((s) => {
      if (customerModal.item) {
        return {
          ...s,
          customers: s.customers.map((c) => (c.id === customerModal.item!.id ? { ...c, ...values } : c)),
        };
      }
      return {
        ...s,
        customers: [
          { id: `kh_${Date.now()}`, createdAt: new Date().toISOString(), ...values },
          ...s.customers,
        ],
      };
    });
    setCustomerModal({ open: false });
    message.success(customerModal.item ? "Đã cập nhật khách hàng" : "Đã thêm khách hàng mới");
  };

  const deleteCustomer = (id: string) => {
    updateCurrentStore((s) => ({ ...s, customers: s.customers.filter((c) => c.id !== id) }));
    message.success("Đã xoá khách hàng");
  };

  if (!store) return null;

  const builderSchema: BuilderSchema =
    store.builder ??
    createSchemaFromPreset(guessPresetId(store.templateId), store.name, {
      primary: store.theme.primary,
      accent: store.theme.accent,
      bg: store.theme.bg,
    });

  const filteredCustomers = store.customers.filter((c) => {
    const kw = customerKeyword.trim().toLowerCase();
    return !kw || `${c.name} ${c.phone} ${c.tier} ${c.note ?? ""}`.toLowerCase().includes(kw);
  });

  const zaloPreviewUrl = getZaloTemplateUrl(store.templateId);

  const [inboxSummary, setInboxSummary] = useState<InboxSummary | null>(null);
  const refreshInbox = () => fetchInboxSummary().then(setInboxSummary).catch(() => undefined);
  useEffect(() => {
    refreshInbox();
    const t = setInterval(refreshInbox, 30000);
    return () => clearInterval(t);
  }, []);

  const navItems: { key: StoreNavKey; label: string; icon: React.ReactNode; badge?: number }[] = [
    { key: "overview", label: "Tổng quan", icon: <LuLayoutDashboard size={17} /> },
    { key: "bookings", label: "Lịch hẹn", icon: <LuCalendarCheck size={17} />, badge: store.bookings?.length },
    { key: "events", label: "Sự kiện", icon: <LuCalendarDays size={17} /> },
    { key: "products", label: "Sản phẩm", icon: <LuPackage size={17} />, badge: store.products.length },
    { key: "customers", label: "Khách hàng", icon: <LuUsers size={17} />, badge: store.customers.length },
    { key: "loyalty", label: "Hạng & Voucher", icon: <LuCrown size={17} />, badge: store.vouchers?.length },
    { key: "orders", label: "Đơn hàng", icon: <LuShoppingBag size={17} /> },
    { key: "miniapp", label: "Miniapp", icon: <LuSmartphone size={17} /> },
    { key: "inventory", label: "Kho", icon: <LuWarehouse size={17} /> },
    { key: "documents", label: "Thư viện & Tài liệu", icon: <LuBookOpen size={17} />, badge: store.documents?.length },
    { key: "support", label: "Hỗ trợ", icon: <LuLifeBuoy size={17} /> },
    { key: "callbacks", label: "Lịch gọi lại", icon: <LuPhoneCall size={17} /> },
    { key: "portal", label: "Dự án & Ticket", icon: <LuKanban size={17} /> },
    { key: "platformCustomers", label: "Khách hàng reMini", icon: <LuUsers size={17} /> },
    { key: "debts", label: "Khách nợ tiền", icon: <LuWallet size={17} /> },
    { key: "inbox", label: "Hộp thư khách", icon: <LuMessagesSquare size={17} />, badge: inboxSummary?.unread || undefined },
    { key: "files", label: "Ảnh khách hàng", icon: <LuImages size={17} /> },
    { key: "care", label: "Chăm sóc khách", icon: <LuHeartHandshake size={17} />, badge: inboxSummary?.careDue || undefined },
    { key: "antispam", label: "Chống spam", icon: <LuShieldAlert size={17} /> },
    { key: "audit", label: "Nhật ký thao tác", icon: <LuBookOpen size={17} /> },
    { key: "api", label: "Kết nối API", icon: <LuKeyRound size={17} /> },
  ];

  const renderSidebarMenu = (onSelect?: () => void, collapsed = false) => (
    <div className="space-y-1">
      {!collapsed && (
        <div className="px-3 pb-2 pt-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Điều hướng cửa hàng
        </div>
      )}
      {navItems.map((item) => {
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
                  active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
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
              <span className="text-sm font-extrabold text-slate-900 sm:text-base">Quản trị Store & Mini App</span>
              <Tag color={dataSource === "api" ? "green" : "blue"} className="m-0 hidden text-[10px] sm:inline-flex">
                {dataSource === "api" ? "PostgreSQL Live" : "Local Studio"}
              </Tag>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Select
              value={store.id}
              onChange={setSelectedId}
              className="w-40 sm:w-56"
              options={stores.map((s) => ({
                value: s.id,
                label: `${s.name} (${s.templateId})`,
              }))}
            />
            <Button icon={<LuPlus size={15} />} onClick={() => setNewStoreOpen(true)}>
              <span className="hidden sm:inline">Tạo Store</span>
            </Button>
            <Button type="primary" icon={<LuSave size={15} />} onClick={handlePersistStore}>
              <span className="hidden sm:inline">Lưu cấu hình</span>
            </Button>
            <Dropdown
              trigger={["click"]}
              menu={{
                items: [
                  {
                    key: "info",
                    disabled: true,
                    label: (
                      <div className="text-xs">
                        <div className="font-bold text-slate-900">{user.name}</div>
                        <div className="text-[11px] text-slate-500">
                          {user.provider === "zalo" ? "Tài khoản Zalo" : "Tài khoản Google"}
                          {user.phone ? ` · ${user.phone}` : user.email ? ` · ${user.email}` : ""}
                        </div>
                      </div>
                    ),
                  },
                  { type: "divider" },
                  {
                    key: "logout",
                    danger: true,
                    icon: <LuLogOut size={14} />,
                    label: "Đăng xuất",
                    onClick: onLogout,
                  },
                ],
              }}
            >
              <button
                type="button"
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2 py-1 text-left transition hover:bg-slate-100"
              >
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.name}
                    referrerPolicy="no-referrer"
                    className="h-7 w-7 rounded-lg object-cover"
                  />
                ) : (
                  <span
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-black text-white"
                    style={{ background: user.provider === "zalo" ? "#0068FF" : "#1657f3" }}
                  >
                    {user.avatarText}
                  </span>
                )}
                <div className="hidden leading-tight xl:block">
                  <div className="max-w-[110px] truncate text-xs font-bold text-slate-900">{user.name}</div>
                  <div className="text-[10px] font-semibold text-slate-500">
                    {user.provider === "zalo" ? "Zalo" : "Google"}
                  </div>
                </div>
              </button>
            </Dropdown>
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
            <LoyaltySection store={store} updateCurrentStore={updateCurrentStore} />
          )}

          {activeNav === "orders" && (
            <OrdersSection store={store} updateCurrentStore={updateCurrentStore} />
          )}

          {activeNav === "inventory" && (
            <InventorySection store={store} updateCurrentStore={updateCurrentStore} />
          )}

          {activeNav === "documents" && (
            <DocumentsSection store={store} updateCurrentStore={updateCurrentStore} />
          )}

          {activeNav === "callbacks" && <CallbacksSection />}

          {activeNav === "portal" && <PortalSection />}

          {activeNav === "antispam" && <AntiSpamSection />}

          {activeNav === "platformCustomers" && <CustomersPlatformSection />}

          {activeNav === "debts" && <DebtsSection />}

          {activeNav === "inbox" && <InboxSection onUnreadChange={refreshInbox} />}

          {activeNav === "files" && <CustomerFilesSection />}

          {activeNav === "care" && <CareSection onChanged={refreshInbox} />}

          {activeNav === "audit" && <AuditSection />}

          {activeNav === "api" && <ApiChannelsSection />}

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
                    render: (stock) => <span className="text-xs font-semibold">{stock ?? 25}</span>,
                  },
                  {
                    title: "Hiển thị",
                    dataIndex: "active",
                    render: (v, rec) => (
                      <Switch
                        size="small"
                        checked={v}
                        onChange={(checked) =>
                          updateCurrentStore((s) => ({
                            ...s,
                            products: s.products.map((p) =>
                              p.id === rec.id ? { ...p, active: checked } : p,
                            ),
                          }))
                        }
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
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Tệp khách hàng ({store.customers.length})
                  </h3>
                  <p className="text-xs text-slate-500">Quản lý thông tin, hạng thành viên, điểm tích lũy và chi tiêu.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    allowClear
                    value={customerKeyword}
                    onChange={(e) => setCustomerKeyword(e.target.value)}
                    prefix={<LuSearch size={14} className="text-slate-400" />}
                    placeholder="Tìm tên, SĐT, hạng..."
                    className="w-60"
                  />
                  <Button type="primary" icon={<LuPlus size={15} />} onClick={() => openCustomerModal()}>
                    Thêm khách hàng
                  </Button>
                </div>
              </div>
              <Table
                rowKey="id"
                size="small"
                pagination={{ pageSize: 8 }}
                dataSource={filteredCustomers}
                columns={[
                  {
                    title: "Khách hàng",
                    dataIndex: "name",
                    render: (v, rec) => (
                      <div>
                        <div className="font-semibold text-slate-900">{v}</div>
                        <div className="text-[11px] text-slate-500">{rec.phone}</div>
                      </div>
                    ),
                  },
                  {
                    title: "Hạng / Điểm",
                    dataIndex: "tier",
                    render: (tier, rec) => (
                      <div>
                        <Tag color="gold" className="m-0 font-semibold">
                          {tier}
                        </Tag>
                        <div className="mt-0.5 text-[11px] text-slate-500">{rec.points} điểm</div>
                      </div>
                    ),
                  },
                  {
                    title: "Chi tiêu / Đơn",
                    dataIndex: "totalSpent",
                    render: (spent, rec) => (
                      <div className="text-xs">
                        <div className="font-bold text-slate-800">{spent.toLocaleString("vi-VN")}đ</div>
                        <div className="text-[11px] text-slate-400">
                          {rec.totalOrders} đơn · {dayjs(rec.createdAt).format("DD/MM/YY")}
                        </div>
                      </div>
                    ),
                  },
                  {
                    title: "",
                    align: "right",
                    render: (_, rec) => (
                      <div className="flex justify-end gap-1">
                        <Button size="small" onClick={() => openCustomerModal(rec)}>
                          Sửa
                        </Button>
                        <Popconfirm title="Xoá khách hàng?" onConfirm={() => deleteCustomer(rec.id)}>
                          <Button size="small" danger icon={<LuTrash2 size={13} />} />
                        </Popconfirm>
                      </div>
                    ),
                  },
                ]}
              />
            </div>
          )}

          {activeNav === "miniapp" && (
            <MiniAppBuilder
              key={store.id}
              brand={store.name}
              initialSchema={builderSchema}
              products={store.products}
              documents={store.documents}
              vouchers={store.vouchers}
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
            icon={<LuSave size={14} />}
            onClick={async () => {
              await handlePersistStore();
              setPublishModalOpen(false);
            }}
          >
            Lưu &amp; Xuất bản
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

      {/* Modal tạo Store mới */}
      <Modal
        title="Tạo Store Mini App mới"
        open={newStoreOpen}
        onCancel={() => setNewStoreOpen(false)}
        footer={null}
      >
        <Form form={newStoreForm} layout="vertical" onFinish={handleCreateStore}>
          <Form.Item
            label="Tên Store / Thương hiệu"
            name="name"
            rules={[{ required: true, message: "Nhập tên Store" }]}
          >
            <Input placeholder="VD: Cà phê Nhà Gỗ" />
          </Form.Item>
          <Form.Item
            label="Đường dẫn định danh (Slug)"
            name="slug"
            rules={[{ required: true, message: "Nhập slug (không dấu)" }]}
          >
            <Input placeholder="VD: ca-phe-nha-go" />
          </Form.Item>
          <Form.Item
            label="Chọn mẫu giao diện nền"
            name="templateId"
            rules={[{ required: true, message: "Chọn mẫu giao diện" }]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              options={demoTemplates.map((t) => ({
                value: t.id,
                label: `[${t.code}] ${t.name}`,
              }))}
            />
          </Form.Item>
          <Form.Item label="Slogan ngắn" name="subtitle">
            <Input placeholder="VD: Cà phê rang xay nguyên chất" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block className="font-bold">
            Khởi tạo Store
          </Button>
        </Form>
      </Modal>

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
