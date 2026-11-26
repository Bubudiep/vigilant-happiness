import { Button, Drawer, Modal, Tooltip } from "antd";
import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { LuChevronRight, LuCornerDownLeft, LuMenu, LuPanelLeftClose, LuPanelLeftOpen, LuSearch } from "react-icons/lu";

export interface ShellNavItem<K extends string = string> {
  key: K;
  label: string;
  icon: ReactNode;
  badge?: number;
  /** Badge đỏ (VD tin nhắn chưa đọc) */
  alert?: boolean;
  /** Trang con của mục gộp — Ctrl K liệt kê từng trang con (nhóm hiển thị "Nhóm › Mục cha") */
  children?: ShellNavItem<K>[];
}
export interface ShellNavGroup<K extends string = string> {
  title: string;
  items: ShellNavItem<K>[];
}

/**
 * Khung trang quản trị kiểu Jira / Figma:
 *   thanh trên 48px (logo · tìm nhanh Ctrl+K · phần phải) — menu trái cố định, nhóm mục, mục đang chọn nền xanh nhạt + vạch trái —
 *   vùng nội dung có breadcrumb.
 * Dùng chung cho /admin (StoreConsole) và /controller (PlatformConsole).
 */
export function AdminShell<K extends string>({
  logo,
  groups,
  active,
  onSelect,
  collapsed,
  onToggleCollapsed,
  sidebarHeader,
  sidebarFooter,
  mobileTop,
  topRight,
  breadcrumb,
  children,
}: {
  logo: ReactNode;
  groups: ShellNavGroup<K>[];
  active: K;
  onSelect: (key: K) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  /** Đầu menu trái (VD chọn cửa hàng) — nhận cờ thu gọn */
  sidebarHeader?: (collapsed: boolean) => ReactNode;
  sidebarFooter?: (collapsed: boolean) => ReactNode;
  /** Hiện trên thanh trên ở màn hình nhỏ (menu trái ẩn) */
  mobileTop?: ReactNode;
  topRight?: ReactNode;
  breadcrumb?: ReactNode[];
  children: ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  // Ctrl / ⌘ + K → tìm nhanh mục
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div data-ui="AdminShell" className="min-h-screen bg-white text-slate-900">
      <TopBar
        logo={logo}
        mobileTop={mobileTop}
        topRight={topRight}
        breadcrumb={breadcrumb}
        collapsed={collapsed}
        onToggleCollapsed={onToggleCollapsed}
        onOpenMenu={() => setMobileOpen(true)}
        onOpenSearch={() => setPaletteOpen(true)}
      />

      {/* MobileSidebar — menu trái trên điện thoại */}
      <Drawer placement="left" size={264} open={mobileOpen} onClose={() => setMobileOpen(false)} closable={false} styles={{ body: { padding: 12 } }}>
        <div data-ui="MobileSidebar">
          {sidebarHeader && <div className="mb-3">{sidebarHeader(false)}</div>}
          <SidebarNav
            groups={groups}
            active={active}
            mini={false}
            onSelect={(k) => {
              onSelect(k);
              setMobileOpen(false);
            }}
          />
          {sidebarFooter && <div className="mt-4">{sidebarFooter(false)}</div>}
        </div>
      </Drawer>

      <div className="flex">
        <Sidebar collapsed={collapsed} header={sidebarHeader?.(collapsed)} footer={sidebarFooter?.(collapsed)}>
          <SidebarNav groups={groups} active={active} mini={collapsed} onSelect={onSelect} />
        </Sidebar>

        <main data-ui="PageContent" className="min-h-[calc(100vh-48px)] min-w-0 flex-1 bg-slate-50 px-3 py-4 sm:px-5 lg:px-8 lg:py-5">
          {/* Màn hình nhỏ: đường dẫn ở đầu nội dung; từ md trở lên nằm trên TopBar */}
          {!!breadcrumb?.length && (
            <div className="mb-1.5 md:hidden">
              <Breadcrumbs items={breadcrumb} />
            </div>
          )}
          {children}
        </main>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} groups={groups} onSelect={onSelect} />
    </div>
  );
}

/* ═══════ Các phần của khung — tên component trùng thuộc tính data-ui (F12 → Elements tìm data-ui="…") ═══════ */

/**
 * TopBar — thanh trên 48px, chia 3 phần:
 *  TopBarBrand (máy tính: rộng bằng Sidebar — logo + nút thu gọn) · giữa: Breadcrumbs bên trái ⟷ QuickSearchButton bên phải · TopBarRight
 */
function TopBar({
  logo,
  mobileTop,
  topRight,
  breadcrumb,
  collapsed,
  onToggleCollapsed,
  onOpenMenu,
  onOpenSearch,
}: {
  logo: ReactNode;
  mobileTop?: ReactNode;
  topRight?: ReactNode;
  breadcrumb?: ReactNode[];
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onOpenMenu: () => void;
  onOpenSearch: () => void;
}) {
  return (
    <header data-ui="TopBar" className="sticky top-0 z-40 flex h-12 items-center border-b border-slate-200 bg-white">
      {/* TopBarBrand — máy tính: cùng bề rộng & viền phải với Sidebar; điện thoại: nút menu + logo */}
      <div
        data-ui="TopBarBrand"
        className={`flex h-full shrink-0 items-center gap-2 px-2 sm:px-3 lg:border-r lg:border-slate-200 lg:transition-[width] lg:duration-150 ${
          collapsed ? "lg:w-14 lg:justify-center lg:px-0" : "lg:w-60"
        }`}
      >
        <Button type="text" size="small" icon={<LuMenu size={16} />} onClick={onOpenMenu} className="lg:!hidden" aria-label="Mở menu" />
        <div data-ui="TopBarLogo" className={`flex min-w-0 flex-1 items-center gap-2 overflow-hidden whitespace-nowrap ${collapsed ? "lg:hidden" : ""}`}>
          {logo}
        </div>
        <Tooltip title={collapsed ? "Mở rộng menu" : "Thu gọn menu"} placement="right">
          <Button
            type="text"
            size="small"
            icon={collapsed ? <LuPanelLeftOpen size={16} /> : <LuPanelLeftClose size={16} />}
            onClick={onToggleCollapsed}
            className="!hidden shrink-0 lg:!inline-flex"
            aria-label="Thu gọn menu"
          />
        </Tooltip>
      </div>
      <div className="lg:hidden">{mobileTop}</div>

      {/* Giữa: Breadcrumbs trái ⟷ QuickSearchButton phải (lề trùng lề nội dung) */}
      <div data-ui="TopBarCenter" className="flex min-w-0 flex-1 items-center gap-4 px-2 sm:px-5 lg:px-8">
        <div className="hidden min-w-0 flex-1 md:block">{!!breadcrumb?.length && <Breadcrumbs items={breadcrumb} />}</div>
        <QuickSearchButton onClick={onOpenSearch} />
      </div>

      <div data-ui="TopBarRight" className="ml-auto flex shrink-0 items-center gap-1.5 pr-2 sm:pr-3">
        <Button type="text" size="small" icon={<LuSearch size={16} />} onClick={onOpenSearch} className="md:!hidden" aria-label="Tìm nhanh" />
        {topRight}
      </div>
    </header>
  );
}

/** QuickSearchButton — ô "Tìm mục, chuyển trang… Ctrl K" bên phải thanh trên (đối xứng với Breadcrumbs) */
function QuickSearchButton({ onClick }: { onClick: () => void }) {
  return (
    <div data-ui="QuickSearchButton" className="hidden w-64 shrink-0 md:block xl:w-80">
      <button
        type="button"
        onClick={onClick}
        className="flex h-7 w-full items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2.5 text-left text-xs text-slate-400 transition hover:border-slate-300 hover:bg-white"
      >
        <LuSearch size={14} />
        <span className="flex-1 truncate">Tìm mục, chuyển trang…</span>
        <kbd className="rounded border border-slate-200 bg-white px-1.5 font-sans text-2xs font-semibold text-slate-500">Ctrl K</kbd>
      </button>
    </div>
  );
}

/** Sidebar — cột menu trái (máy tính): SidebarHeader (chọn cửa hàng) · SidebarNav · SidebarFooter (bật/tắt Mini App) */
function Sidebar({ collapsed, header, footer, children }: { collapsed: boolean; header?: ReactNode; footer?: ReactNode; children: ReactNode }) {
  return (
    <aside
      data-ui="Sidebar"
      className={`sticky top-12 hidden h-[calc(100vh-48px)] shrink-0 flex-col border-r border-slate-200 bg-white transition-[width] duration-150 lg:flex ${
        collapsed ? "w-14" : "w-60"
      }`}
    >
      {header && (
        <div data-ui="SidebarHeader" className={`border-b border-slate-200 ${collapsed ? "p-2" : "p-3"}`}>
          {header}
        </div>
      )}
      <div className={`min-h-0 flex-1 overflow-y-auto ${collapsed ? "px-2 py-3" : "px-3 py-3"}`}>{children}</div>
      {footer && (
        <div data-ui="SidebarFooter" className={`border-t border-slate-200 ${collapsed ? "p-2" : "p-3"}`}>
          {footer}
        </div>
      )}
    </aside>
  );
}

/** SidebarNav — các nhóm menu; mỗi nhóm (SidebarGroup) = SidebarGroupLabel + các SidebarItem */
function SidebarNav<K extends string>({
  groups,
  active,
  mini,
  onSelect,
}: {
  groups: ShellNavGroup<K>[];
  active: K;
  mini: boolean;
  onSelect: (key: K) => void;
}) {
  const navRef = useRef<HTMLElement>(null);
  return (
    <nav ref={navRef} data-ui="SidebarNav" className="relative space-y-3">
      <SidebarActiveIndicator navRef={navRef} watch={`${active}|${mini}|${groups.map((g) => g.items.length).join()}`} />
      {groups.map((g, gi) => (
        <div key={g.title} data-ui="SidebarGroup">
          {mini ? gi > 0 && <div className="mx-auto mb-3 h-px w-6 bg-slate-300" /> : <SidebarGroupLabel>{g.title}</SidebarGroupLabel>}
          <div className="space-y-px">
            {g.items.map((item) => (
              <SidebarItem key={item.key} item={item} active={item.key === active} mini={mini} onClick={() => onSelect(item.key)} />
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

/**
 * SidebarActiveIndicator — khối nền xanh nhạt + vạch trái "trôi" tới mục đang chọn (thay cho nền / vạch cố định ở từng mục).
 * Đo vị trí SidebarItem có aria-current="page" trong SidebarNav; lần đầu đặt thẳng, các lần sau trượt mượt.
 */
function SidebarActiveIndicator({ navRef, watch }: { navRef: React.RefObject<HTMLElement | null>; watch: string }) {
  const [box, setBox] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const [animate, setAnimate] = useState(false);
  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const measure = () => {
      const el = nav.querySelector<HTMLElement>('[data-ui="SidebarItem"][aria-current="page"]');
      if (!el) return setBox(null);
      const n = nav.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      setBox({ top: r.top - n.top, left: r.left - n.left, width: r.width, height: r.height });
    };
    measure();
    // Bật hiệu ứng sau lần đo đầu tiên (mở trang không bị trượt từ trên xuống)
    const t = requestAnimationFrame(() => setAnimate(true));
    const ro = new ResizeObserver(measure);
    ro.observe(nav);
    return () => {
      cancelAnimationFrame(t);
      ro.disconnect();
    };
  }, [navRef, watch]);
  if (!box) return null;
  return (
    <span
      aria-hidden
      data-ui="SidebarActiveIndicator"
      className={`pointer-events-none absolute left-0 top-0 rounded-md bg-brand-50 ${animate ? "transition-[transform,width,height] duration-200 ease-out" : ""}`}
      style={{ transform: `translate(${box.left}px, ${box.top}px)`, width: box.width, height: box.height }}
    >
      <span className="absolute inset-y-1.5 left-0 w-[3px] rounded-r bg-brand-600" />
    </span>
  );
}

/** SidebarGroupLabel — tên nhóm menu ("Vận hành", "Hàng hoá & nhân sự"…): chữ 10px, nhạt, không viết hoa */
export function SidebarGroupLabel({ children }: { children: ReactNode }) {
  return (
    <div data-ui="SidebarGroupLabel" className="mb-0.5 px-2 text-xs font-medium leading-4 text-slate-400">
      {children}
    </div>
  );
}

/** SidebarItem — 1 mục menu: biểu tượng · tên · SidebarBadge; nền + vạch của mục đang chọn do SidebarActiveIndicator vẽ */
function SidebarItem<K extends string>({ item, active, mini, onClick }: { item: ShellNavItem<K>; active: boolean; mini: boolean; onClick: () => void }) {
  const btn = (
    <button
      type="button"
      data-ui="SidebarItem"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`group relative flex h-7 w-full items-center gap-2 rounded-md text-left text-xs transition-colors ${mini ? "justify-center" : "px-2"} ${
        active ? "font-semibold text-brand-700" : "font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900"
      }`}
    >
      <span className={`flex shrink-0 [&>svg]:h-[15px] [&>svg]:w-[15px] ${active ? "text-brand-600" : "text-slate-400 group-hover:text-slate-600"}`}>
        {item.icon}
      </span>
      {!mini && <span className="min-w-0 flex-1 truncate">{item.label}</span>}
      {!!item.badge &&
        (mini ? (
          item.alert && <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-red-600" />
        ) : (
          <span
            data-ui="SidebarBadge"
            className={`min-w-[16px] rounded px-1 text-center text-2xs font-semibold leading-[14px] tabular-nums ${
              item.alert ? "bg-red-600 text-white" : active ? "bg-brand-100 text-brand-700" : "bg-slate-100 text-slate-600"
            }`}
          >
            {item.badge}
          </span>
        ))}
    </button>
  );
  return mini ? (
    <Tooltip title={item.label} placement="right">
      {btn}
    </Tooltip>
  ) : (
    btn
  );
}

/** Breadcrumbs — đường dẫn vị trí (trên TopBar, bên trái): "Cửa hàng › Thư viện › Tài liệu" */
function Breadcrumbs({ items }: { items: ReactNode[] }) {
  return (
    <div data-ui="Breadcrumbs" className="flex min-w-0 items-center gap-1 text-xs text-slate-400">
      {items.map((b, i) => (
        <Fragment key={i}>
          {i > 0 && <LuChevronRight size={10} className="shrink-0 text-slate-300" />}
          <span className={`truncate ${i === items.length - 1 ? "font-medium text-slate-600" : ""}`}>{b}</span>
        </Fragment>
      ))}
    </div>
  );
}

/** CommandPalette — hộp tìm nhanh (Ctrl K): gõ để lọc mục, ↑ ↓ chọn, Enter mở */
function CommandPalette<K extends string>({
  open,
  onClose,
  groups,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  groups: ShellNavGroup<K>[];
  onSelect: (key: K) => void;
}) {
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase();
  const list = useMemo(() => {
    const k = norm(q.trim());
    return groups
      .flatMap((g) => g.items.flatMap((i) => (i.children?.length ? i.children.map((c) => ({ ...c, group: `${g.title} › ${i.label}` })) : [{ ...i, group: g.title }])))
      .filter((i) => !k || norm(`${i.label} ${i.group}`).includes(k));
  }, [q, groups]);

  useEffect(() => {
    if (open) {
      setQ("");
      setIdx(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);
  useEffect(() => setIdx(0), [q]);

  const pick = (key: K) => {
    onSelect(key);
    onClose();
  };

  return (
    <Modal open={open} onCancel={onClose} footer={null} closable={false} width={520} styles={{ body: { padding: 0 } }} destroyOnHidden>
      <div data-ui="CommandPalette" className="flex items-center gap-2 border-b border-slate-200 px-3">
        <LuSearch size={15} className="text-slate-400" />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setIdx((i) => Math.min(list.length - 1, i + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setIdx((i) => Math.max(0, i - 1));
            } else if (e.key === "Enter" && list[idx]) pick(list[idx].key);
          }}
          placeholder="Tìm mục… (VD: đơn, khách, báo cáo)"
          className="h-10 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
        />
        <kbd className="rounded border border-slate-200 px-1.5 text-2xs font-semibold text-slate-500">Esc</kbd>
      </div>
      <div className="max-h-[360px] overflow-y-auto p-1.5">
        {list.map((i, n) => (
          <button
            key={i.key}
            type="button"
            onMouseEnter={() => setIdx(n)}
            onClick={() => pick(i.key)}
            className={`flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-left text-xs ${n === idx ? "bg-brand-50 text-brand-700" : "text-slate-700"}`}
          >
            <span className={`[&>svg]:h-4 [&>svg]:w-4 ${n === idx ? "text-brand-600" : "text-slate-500"}`}>{i.icon}</span>
            <span className="flex-1 font-medium">{i.label}</span>
            <span className="text-2xs text-slate-400">{i.group}</span>
            {n === idx && <LuCornerDownLeft size={13} className="text-brand-600" />}
          </button>
        ))}
        {list.length === 0 && <div className="py-8 text-center text-sm text-slate-400">Không có mục phù hợp</div>}
      </div>
    </Modal>
  );
}
