import { Button, Drawer, Modal, Tooltip } from "antd";
import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { LuChevronRight, LuCornerDownLeft, LuMenu, LuPanelLeftClose, LuPanelLeftOpen, LuSearch } from "react-icons/lu";

export interface ShellNavItem<K extends string = string> {
  key: K;
  label: string;
  icon: ReactNode;
  badge?: number;
  /** Badge đỏ (VD tin nhắn chưa đọc) */
  alert?: boolean;
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

  const nav = (mini: boolean, after?: () => void) => (
    <nav className="space-y-3">
      {groups.map((g, gi) => (
        <div key={g.title}>
          {mini ? (
            gi > 0 && <div className="mx-auto mb-3 h-px w-6 bg-slate-300" />
          ) : (
            <div className="mb-0.5 px-2 text-3xs font-semibold uppercase leading-3 tracking-[0.08em] text-slate-400">{g.title}</div>
          )}
          <div className="space-y-px">
            {g.items.map((item) => {
              const on = item.key === active;
              const btn = (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    onSelect(item.key);
                    after?.();
                  }}
                  aria-current={on ? "page" : undefined}
                  className={`group relative flex h-7 w-full items-center gap-2 rounded-md text-left text-xs transition-colors ${
                    mini ? "justify-center" : "px-2"
                  } ${on ? "bg-brand-50 font-semibold text-brand-700" : "font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900"}`}
                >
                  {on && <span className="absolute inset-y-1.5 left-0 w-[3px] rounded-r bg-brand-600" />}
                  <span className={`flex shrink-0 [&>svg]:h-[15px] [&>svg]:w-[15px] ${on ? "text-brand-600" : "text-slate-400 group-hover:text-slate-600"}`}>{item.icon}</span>
                  {!mini && <span className="min-w-0 flex-1 truncate">{item.label}</span>}
                  {!!item.badge &&
                    (mini ? (
                      item.alert && <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-red-600" />
                    ) : (
                      <span
                        className={`min-w-[16px] rounded px-1 text-center text-2xs font-semibold leading-[14px] tabular-nums ${
                          item.alert ? "bg-red-600 text-white" : on ? "bg-brand-100 text-brand-700" : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {item.badge}
                      </span>
                    ))}
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
    </nav>
  );

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Thanh trên */}
      <header className="sticky top-0 z-40 flex h-12 items-center gap-2 border-b border-slate-200 bg-white px-2 sm:px-3">
        <Button type="text" size="small" icon={<LuMenu size={16} />} onClick={() => setMobileOpen(true)} className="lg:hidden" aria-label="Mở menu" />
        <Tooltip title={collapsed ? "Mở rộng menu" : "Thu gọn menu"}>
          <Button
            type="text"
            size="small"
            icon={collapsed ? <LuPanelLeftOpen size={16} /> : <LuPanelLeftClose size={16} />}
            onClick={onToggleCollapsed}
            className="!hidden lg:!inline-flex"
            aria-label="Thu gọn menu"
          />
        </Tooltip>
        <div className="flex min-w-0 items-center gap-2">{logo}</div>
        <div className="lg:hidden">{mobileTop}</div>

        <div className="mx-auto hidden w-full max-w-md px-4 md:block">
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="flex h-7 w-full items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2.5 text-left text-xs text-slate-400 transition hover:border-slate-300 hover:bg-white"
          >
            <LuSearch size={14} />
            <span className="flex-1">Tìm mục, chuyển trang…</span>
            <kbd className="rounded border border-slate-200 bg-white px-1.5 font-sans text-2xs font-semibold text-slate-500">Ctrl K</kbd>
          </button>
        </div>
        <div className="ml-auto flex items-center gap-1.5 md:ml-0">
          <Button type="text" size="small" icon={<LuSearch size={16} />} onClick={() => setPaletteOpen(true)} className="md:!hidden" aria-label="Tìm nhanh" />
          {topRight}
        </div>
      </header>

      <Drawer
        placement="left"
        size={264}
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        closable={false}
        styles={{ body: { padding: 12 } }}
      >
        {sidebarHeader && <div className="mb-3">{sidebarHeader(false)}</div>}
        {nav(false, () => setMobileOpen(false))}
        {sidebarFooter && <div className="mt-4">{sidebarFooter(false)}</div>}
      </Drawer>

      <div className="flex">
        {/* Menu trái */}
        <aside
          className={`sticky top-12 hidden h-[calc(100vh-48px)] shrink-0 flex-col border-r border-slate-200 bg-white transition-[width] duration-150 lg:flex ${
            collapsed ? "w-14" : "w-60"
          }`}
        >
          {sidebarHeader && <div className={`border-b border-slate-200 ${collapsed ? "p-2" : "p-3"}`}>{sidebarHeader(collapsed)}</div>}
          <div className={`min-h-0 flex-1 overflow-y-auto ${collapsed ? "px-2 py-3" : "px-3 py-3"}`}>{nav(collapsed)}</div>
          {sidebarFooter && <div className={`border-t border-slate-200 ${collapsed ? "p-2" : "p-3"}`}>{sidebarFooter(collapsed)}</div>}
        </aside>

        <main className="min-h-[calc(100vh-48px)] min-w-0 flex-1 bg-slate-50 px-3 py-4 sm:px-5 lg:px-8 lg:py-5">
          {!!breadcrumb?.length && (
            <div className="mb-1.5 flex min-w-0 items-center gap-1 text-2xs text-slate-400">
              {breadcrumb.map((b, i) => (
                <Fragment key={i}>
                  {i > 0 && <LuChevronRight size={10} className="shrink-0 text-slate-300" />}
                  <span className={`truncate ${i === breadcrumb.length - 1 ? "font-medium text-slate-600" : ""}`}>{b}</span>
                </Fragment>
              ))}
            </div>
          )}
          {children}
        </main>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} groups={groups} onSelect={onSelect} />
    </div>
  );
}

/** Hộp tìm nhanh (Ctrl K): gõ để lọc mục, ↑ ↓ chọn, Enter mở */
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
    return groups.flatMap((g) => g.items.map((i) => ({ ...i, group: g.title }))).filter((i) => !k || norm(`${i.label} ${i.group}`).includes(k));
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
      <div className="flex items-center gap-2 border-b border-slate-200 px-3">
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
