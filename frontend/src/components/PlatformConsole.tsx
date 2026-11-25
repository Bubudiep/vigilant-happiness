import { Button, Spin } from "antd";
import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import {
  LuBookOpen,
  LuGauge,
  LuHeartHandshake,
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
import { AdminShell, type ShellNavGroup, type ShellNavItem } from "./ui/AdminShell";
import { SectionTabs } from "./ui/SectionTabs";

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
  const [searchParams] = useSearchParams();
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

  // Từng trang (đích của đường dẫn /controller/<key>); Tin nhắn tách 2 trang con theo ?tab=care
  type PageKey = PlatformNavKey | "care";
  const pages: Record<PageKey, NavItem & { key: PlatformNavKey }> = {
    customers: { key: "customers", label: "Khách hàng reMini", icon: <LuUsers size={17} /> },
    inbox: { key: "inbox", label: "Hội thoại", icon: <LuMessagesSquare size={17} />, badge: summary?.unread, alert: true },
    care: { key: "inbox", label: "Chăm sóc", icon: <LuHeartHandshake size={17} />, badge: summary?.careDue, alert: true },
    callbacks: { key: "callbacks", label: "Lịch gọi lại", icon: <LuPhoneCall size={17} /> },
    apps: { key: "apps", label: "Cấu hình app", icon: <LuSmartphone size={17} /> },
    builds: { key: "builds", label: "Yêu cầu build", icon: <LuRocket size={17} /> },
    projects: { key: "projects", label: "Dự án & Ticket", icon: <LuKanban size={17} /> },
    plans: { key: "plans", label: "Gói dịch vụ", icon: <LuPackage size={17} /> },
    vouchers: { key: "vouchers", label: "Voucher gói", icon: <LuTicketPercent size={17} /> },
    debts: { key: "debts", label: "Khách nợ tiền", icon: <LuWallet size={17} /> },
    accounts: { key: "accounts", label: "Tài khoản quản trị", icon: <LuShieldCheck size={17} /> },
    antispam: { key: "antispam", label: "Chống spam", icon: <LuShieldAlert size={17} /> },
    audit: { key: "audit", label: "Nhật ký thao tác", icon: <LuBookOpen size={17} /> },
    api: { key: "api", label: "Kết nối API", icon: <LuKeyRound size={17} /> },
    storage: { key: "storage", label: "Dung lượng", icon: <LuHardDrive size={17} /> },
  };
  /** Mục gộp trên menu: một mục cha, trang con chuyển bằng tab đầu trang (đường dẫn cũ giữ nguyên) */
  const merged: { key: PlatformNavKey; label: string; tabs: PageKey[] }[] = [
    { key: "inbox", label: "Tin nhắn & Chăm sóc", tabs: ["inbox", "care", "callbacks"] },
    { key: "apps", label: "App khách hàng", tabs: ["apps", "builds"] },
    { key: "plans", label: "Gói & Voucher", tabs: ["plans", "vouchers"] },
    { key: "antispam", label: "Bảo mật", tabs: ["antispam", "audit"] },
    { key: "api", label: "Hạ tầng", tabs: ["api", "storage"] },
  ];
  const navItem = (k: PlatformNavKey): NavItem => {
    const m = merged.find((g) => g.key === k);
    if (!m) return pages[k];
    const badge = m.tabs.reduce((s, t) => s + (pages[t].alert ? pages[t].badge ?? 0 : 0), 0);
    // Ctrl K liệt kê từng trang con (Chăm sóc đi cùng Hội thoại nên bỏ)
    const children = m.tabs.filter((t) => t !== "care").map((t) => pages[t]);
    return { ...pages[k], label: m.label, badge: badge || undefined, alert: badge > 0, children };
  };
  const groups: ShellNavGroup<PlatformNavKey>[] = [
    { title: "Khách hàng", items: (["customers", "inbox"] as const).map(navItem) },
    { title: "Vận hành", items: (["apps", "projects"] as const).map(navItem) },
    { title: "Kinh doanh", items: (["plans", "debts"] as const).map(navItem) },
    { title: "Hệ thống", items: (["accounts", "antispam", "api"] as const).map(navItem) },
  ];

  const allKeys = Object.keys(pages).filter((k) => k !== "care") as PlatformNavKey[];
  const active: PlatformNavKey = allKeys.includes(section as PlatformNavKey) ? (section as PlatformNavKey) : "customers";
  if (section !== active) return <Navigate to={`/controller/${active}`} replace />;

  const page: PageKey = active === "inbox" && inboxTab === "care" ? "care" : active;
  const group = merged.find((m) => m.tabs.includes(page));
  const parent = group?.key ?? active;
  const groupTitle = groups.find((g) => g.items.some((i) => i.key === parent))?.title;
  const goPage = (k: PageKey) => navigate(k === "care" ? "/controller/inbox?tab=care" : `/controller/${k}`);

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
      active={parent}
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
      breadcrumb={["Trang điều hành", groupTitle, ...(group ? [group.label] : []), pages[page].label]}
    >
          {group && <SectionTabs active={page} onChange={(k) => goPage(k as PageKey)} items={group.tabs.map((t) => ({ ...pages[t], key: t }))} />}
          <Suspense
            fallback={
              <div className="flex min-h-[40vh] items-center justify-center">
                <Spin />
              </div>
            }
          >
            {active === "customers" && <CustomersPlatformSection />}
            {page === "inbox" && <InboxSection onUnreadChange={refreshSummary} />}
            {page === "care" && <CareSection onChanged={refreshSummary} />}
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
