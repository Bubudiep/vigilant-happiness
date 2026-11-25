import { Button, Drawer, Spin, Tooltip } from "antd";
import { lazy, Suspense, useEffect, useState } from "react";
import {
  LuBookOpen,
  LuGauge,
  LuHardDrive,
  LuKanban,
  LuKeyRound,
  LuMenu,
  LuMessagesSquare,
  LuPanelLeftClose,
  LuPanelLeftOpen,
  LuPhoneCall,
  LuShieldAlert,
  LuShieldCheck,
  LuStore,
  LuUsers,
  LuWallet,
  LuSmartphone,
  LuPackage,
  LuTicketPercent,
  LuRocket,
} from "react-icons/lu";
import { Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import type { AccountInfo, AuthUser } from "../data/auth";
import { fetchInboxSummary, InboxSummary } from "../data/inbox-api";
import UserMenu from "./UserMenu";

// Mỗi mục tải riêng khi mở tới
const named = <K extends string, M extends Record<K, React.ComponentType<never>>>(p: Promise<M>, k: K) =>
  p.then((m) => ({ default: m[k] as M[K] }));
const CustomersPlatformSection = lazy(() => named(import("./CustomersAuditViews"), "CustomersPlatformSection"));
const AccountsSection = lazy(() => named(import("./CustomersAuditViews"), "AccountsSection"));
const AuditSection = lazy(() => named(import("./CustomersAuditViews"), "AuditSection"));
const InboxSection = lazy(() => named(import("./InboxViews"), "InboxSection"));
const CareSection = lazy(() => named(import("./InboxViews"), "CareSection"));
const CallbacksSection = lazy(() => named(import("./PlatformViews"), "CallbacksSection"));
const ApiChannelsSection = lazy(() => named(import("./PlatformViews"), "ApiChannelsSection"));
const PortalSection = lazy(() => named(import("./PortalAdminViews"), "PortalSection"));
const AntiSpamSection = lazy(() => named(import("./PortalAdminViews"), "AntiSpamSection"));
const DebtsSection = lazy(() => named(import("./DebtViews"), "DebtsSection"));
const CustomerAppsSection = lazy(() => named(import("./CustomerAppsViews"), "CustomerAppsSection"));
const PlansSection = lazy(() => named(import("./PlatformBillingViews"), "PlansSection"));
const PlatformVouchersSection = lazy(() => named(import("./PlatformBillingViews"), "PlatformVouchersSection"));
const StorageSection = lazy(() => named(import("./StorageViews"), "StorageSection"));
const BuildRequestsSection = lazy(() => named(import("./StoreSettingsViews"), "BuildRequestsSection"));

export type PlatformNavKey =
  | "customers"
  | "inbox"
  | "callbacks"
  | "projects"
  | "debts"
  | "builds"
  | "apps"
  | "plans"
  | "vouchers"
  | "antispam"
  | "accounts"
  | "audit"
  | "storage"
  | "api";

type NavItem = { key: PlatformNavKey; label: string; icon: React.ReactNode; badge?: number };

/** Đường dẫn cũ trong /admin/... của các mục điều hành → mục tương ứng ở /controller */
export const LEGACY_PLATFORM_SECTIONS: Record<string, PlatformNavKey> = {
  platformCustomers: "customers",
  inbox: "inbox",
  files: "inbox", // Album ảnh khách đã bỏ
  care: "inbox", // Chăm sóc gộp vào Tin nhắn
  callbacks: "callbacks",
  portal: "projects",
  debts: "debts",
  builds: "builds",
  apps: "apps",
  plans: "plans",
  vouchers: "vouchers",
  antispam: "antispam",
  accounts: "accounts",
  audit: "audit",
  api: "api",
};

/**
 * Trang điều hành nền tảng (/controller) — chỉ quản trị viên nền tảng.
 * Tách riêng với trang quản trị shop (/admin) của chủ cửa hàng.
 */
export default function PlatformConsole({
  user,
  account,
  onLogout,
}: {
  user: AuthUser;
  account: AccountInfo;
  onLogout: () => void;
}) {
  const navigate = useNavigate();
  const { section } = useParams<{ section?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const inboxTab = searchParams.get("tab") === "care" ? "care" : "chat";
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [summary, setSummary] = useState<InboxSummary | null>(null);

  const refreshSummary = () => {
    fetchInboxSummary().then(setSummary).catch(() => undefined);
  };
  useEffect(() => {
    refreshSummary();
    const t = setInterval(() => !document.hidden && refreshSummary(), 30000);
    return () => clearInterval(t);
  }, []);

  if (!account.isAdmin) return <Navigate to="/admin/overview" replace />;

  const groups: { title: string; items: NavItem[] }[] = [
    {
      title: "Khách hàng",
      items: [
        { key: "customers", label: "Khách hàng reMini", icon: <LuUsers size={17} /> },
        { key: "inbox", label: "Tin nhắn", icon: <LuMessagesSquare size={17} />, badge: (summary?.unread ?? 0) + (summary?.careDue ?? 0) || undefined },
        { key: "callbacks", label: "Lịch gọi lại", icon: <LuPhoneCall size={17} /> },
      ],
    },
    {
      title: "Vận hành",
      items: [
        { key: "apps", label: "Cấu hình app khách", icon: <LuSmartphone size={17} /> },
        { key: "projects", label: "Dự án & Ticket", icon: <LuKanban size={17} /> },
        { key: "builds", label: "Yêu cầu build app", icon: <LuRocket size={17} /> },
      ],
    },
    {
      title: "Kinh doanh",
      items: [
        { key: "plans", label: "Gói dịch vụ", icon: <LuPackage size={17} /> },
        { key: "vouchers", label: "Voucher gói", icon: <LuTicketPercent size={17} /> },
        { key: "debts", label: "Khách nợ tiền", icon: <LuWallet size={17} /> },
      ],
    },
    {
      title: "Hệ thống",
      items: [
        { key: "accounts", label: "Tài khoản quản trị", icon: <LuShieldCheck size={17} /> },
        { key: "antispam", label: "Chống spam", icon: <LuShieldAlert size={17} /> },
        { key: "api", label: "Kết nối API", icon: <LuKeyRound size={17} /> },
        { key: "storage", label: "Dung lượng", icon: <LuHardDrive size={17} /> },
        { key: "audit", label: "Nhật ký thao tác", icon: <LuBookOpen size={17} /> },
      ],
    },
  ];
  const allKeys = groups.flatMap((g) => g.items.map((i) => i.key));
  const active: PlatformNavKey = allKeys.includes(section as PlatformNavKey) ? (section as PlatformNavKey) : "customers";
  if (section !== active) return <Navigate to={`/controller/${active}`} replace />;

  const menu = (onSelect?: () => void, mini = false) => (
    <div className="space-y-1">
      {groups.map((g, gi) => (
        <div key={g.title} className={gi > 0 ? "mt-3 border-t border-white/10 pt-3" : ""}>
          {!mini && <div className="px-3 pb-2 pt-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">{g.title}</div>}
          <div className="space-y-1">
            {g.items.map((item) => {
              const on = active === item.key;
              const btn = (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    navigate(`/controller/${item.key}`);
                    onSelect?.();
                  }}
                  className={`flex w-full items-center h-9 rounded-lg text-left text-sm font-medium transition ${
                    mini ? "justify-center px-0" : "justify-between px-3"
                  } ${on ? "bg-white text-slate-900 shadow-sm" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}
                >
                  <span className="flex items-center gap-2.5">
                    {item.icon}
                    {!mini && <span className="truncate">{item.label}</span>}
                  </span>
                  {!mini && !!item.badge && (
                    <span className="rounded-full bg-rose-500 px-2 py-0.5 text-xs font-bold text-white">{item.badge}</span>
                  )}
                </button>
              );
              return mini ? (
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

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-900 text-white">
        <div className="flex h-14 w-full items-center justify-between gap-2 px-3 sm:px-4 lg:px-6">
          <div className="flex items-center gap-2">
            <Button type="text" icon={<LuMenu size={18} className="text-white" />} onClick={() => setMobileOpen(true)} className="lg:hidden" />
            <Button
              type="text"
              icon={collapsed ? <LuPanelLeftOpen size={18} className="text-white" /> : <LuPanelLeftClose size={18} className="text-white" />}
              onClick={() => setCollapsed((c) => !c)}
              className="hidden lg:inline-flex"
            />
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-slate-900">
              <LuGauge size={17} />
            </span>
            <span className="text-sm font-extrabold sm:text-base">Trang điều hành</span>
            <span className="hidden rounded-full bg-white/10 px-2 py-0.5 text-xs font-semibold text-slate-300 md:inline">reMini</span>
          </div>
          <div className="flex items-center gap-2">
            <Button icon={<LuStore size={15} />} onClick={() => navigate("/admin/overview")}>
              <span className="hidden sm:inline">Quản trị cửa hàng</span>
            </Button>
            <UserMenu user={user} onLogout={onLogout} />
          </div>
        </div>
      </header>

      <Drawer title="Trang điều hành" placement="left" size={260} open={mobileOpen} onClose={() => setMobileOpen(false)} styles={{ body: { background: "#0f172a" } }}>
        {menu(() => setMobileOpen(false))}
      </Drawer>

      <div className="flex w-full gap-5 px-3 py-4 sm:px-4 lg:px-6 lg:py-5">
        <aside className={`hidden shrink-0 transition-all lg:block ${collapsed ? "w-[62px]" : "w-60"}`}>
          <div className={`sticky top-[72px] rounded-2xl bg-slate-900 shadow-sm ${collapsed ? "p-2" : "p-3"}`}>{menu(undefined, collapsed)}</div>
        </aside>

        <main className="min-w-0 flex-1">
          <Suspense
            fallback={
              <div className="flex min-h-[40vh] items-center justify-center">
                <Spin />
              </div>
            }
          >
            {active === "customers" && <CustomersPlatformSection />}
            {active === "inbox" && (
              <div className="space-y-3">
                <div className="flex gap-1 rounded-xl bg-white p-1 shadow-sm ring-1 ring-slate-200 sm:w-fit">
                  {([
                    ["chat", "Hội thoại", summary?.unread],
                    ["care", "Chăm sóc", summary?.careDue],
                  ] as const).map(([k, label, n]) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setSearchParams(k === "care" ? { tab: "care" } : {}, { replace: true })}
                      className={`flex items-center gap-2 rounded-lg px-4 py-1.5 text-sm font-semibold transition ${
                        inboxTab === k ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {label}
                      {!!n && <span className={`rounded-full px-1.5 text-xs ${inboxTab === k ? "bg-white/25" : "bg-rose-500 text-white"}`}>{n}</span>}
                    </button>
                  ))}
                </div>
                {inboxTab === "care" ? <CareSection onChanged={refreshSummary} /> : <InboxSection onUnreadChange={refreshSummary} />}
              </div>
            )}
            {active === "storage" && <StorageSection />}
            {active === "callbacks" && <CallbacksSection />}
            {active === "projects" && <PortalSection />}
            {active === "builds" && <BuildRequestsSection />}
            {active === "apps" && <CustomerAppsSection />}
            {active === "plans" && <PlansSection />}
            {active === "vouchers" && <PlatformVouchersSection />}
            {active === "debts" && <DebtsSection />}
            {active === "accounts" && <AccountsSection currentUserId={account.id} />}
            {active === "antispam" && <AntiSpamSection />}
            {active === "api" && <ApiChannelsSection />}
            {active === "audit" && <AuditSection />}
          </Suspense>
        </main>
      </div>
    </div>
  );
}
