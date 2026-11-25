import { Badge, Button, Spin, Tabs } from "antd";
import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import {
  LuBookOpen,
  LuGauge,
  LuHardDrive,
  LuKanban,
  LuKeyRound,
  LuMessagesSquare,
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
import { AdminShell, type ShellNavItem } from "./ui/AdminShell";

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

type NavItem = ShellNavItem<PlatformNavKey>;

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
    const [summary, setSummary] = useState<InboxSummary | null>(null);

  const refreshSummary = useCallback(() => {
    fetchInboxSummary()
      .then((d) => setSummary((cur) => (JSON.stringify(cur) === JSON.stringify(d) ? cur : d)))
      .catch(() => undefined);
  }, []);
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
        { key: "inbox", label: "Tin nhắn", icon: <LuMessagesSquare size={17} />, badge: (summary?.unread ?? 0) + (summary?.careDue ?? 0) || undefined, alert: true },
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

  const activeItem = groups.flatMap((g) => g.items.map((i) => ({ ...i, group: g.title }))).find((i) => i.key === active);

  return (
    <AdminShell
      logo={
        <>
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-900 text-white">
            <LuGauge size={15} />
          </span>
          <span className="hidden text-sm font-semibold text-slate-900 sm:inline">reMini</span>
          <span className="hidden rounded bg-amber-100 px-1.5 py-0.5 text-2xs font-semibold text-amber-800 sm:inline">Trang điều hành</span>
        </>
      }
      groups={groups}
      active={active}
      onSelect={(k) => navigate(`/controller/${k}`)}
      collapsed={collapsed}
      onToggleCollapsed={() => setCollapsed((c) => !c)}
      topRight={
        <>
          <Button size="small" icon={<LuStore size={14} />} onClick={() => navigate("/admin/overview")}>
            <span className="hidden sm:inline">Quản trị cửa hàng</span>
          </Button>
          <UserMenu user={user} onLogout={onLogout} />
        </>
      }
      breadcrumb={["Trang điều hành", activeItem?.group, activeItem?.label]}
    >
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
                {/* Cùng kiểu tab gạch chân với trang Gói dịch vụ */}
                <Tabs
                  activeKey={inboxTab}
                  onChange={(k) => setSearchParams(k === "care" ? { tab: "care" } : {}, { replace: true })}
                  className="[&_.ant-tabs-nav]:!mb-0"
                  items={([
                    ["chat", "Hội thoại", summary?.unread],
                    ["care", "Chăm sóc", summary?.careDue],
                  ] as const).map(([k, label, n]) => ({
                    key: k,
                    label: (
                      <span className="inline-flex items-center gap-1.5">
                        {label}
                        {!!n && <Badge count={n} size="small" />}
                      </span>
                    ),
                  }))}
                />
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
    </AdminShell>
  );
}
