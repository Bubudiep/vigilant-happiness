import dayjs from "dayjs";
import { useEffect, useState } from "react";
import {
  LuArrowDown,
  LuArrowUp,
  LuBatteryFull,
  LuChevronLeft,
  LuCopy,
  LuEllipsis,
  LuEyeOff,
  LuGripVertical,
  LuSignal,
  LuTrash2,
  LuWifi,
  LuX,
} from "react-icons/lu";
import { BlockRenderer, DocumentLike, ProductLike, RenderCtx, VoucherLike } from "./blocks";
import { Icon } from "./icons";
import { BLOCKS } from "./registry";
import { DEFAULT_BUILDER_AUTH } from "./types";
import type { Block, BlockItem, BlockProps, BuilderAuthConfig, BuilderPage, BuilderSchema, Selection } from "./types";

export type DeviceId = "iphone15" | "iphoneSE" | "android";

export const DEVICES: Record<DeviceId, { label: string; width: number; height: number; island: boolean; statusH: number; radius: number }> = {
  iphone15: { label: "iPhone 15 Pro", width: 393, height: 852, island: true, statusH: 50, radius: 56 },
  android: { label: "Android (Pixel)", width: 360, height: 780, island: false, statusH: 32, radius: 40 },
  iphoneSE: { label: "iPhone SE", width: 375, height: 667, island: false, statusH: 22, radius: 28 },
};

export type BlockAction = "up" | "down" | "duplicate" | "hide" | "delete";
export const DND_NEW = "application/x-remini-new";
export const DND_MOVE = "application/x-remini-move";

function useClock() {
  const [now, setNow] = useState(() => dayjs());
  useEffect(() => {
    const t = setInterval(() => setNow(dayjs()), 20_000);
    return () => clearInterval(t);
  }, []);
  return now.format("HH:mm");
}

export interface PhoneScreenProps {
  schema: BuilderSchema;
  page: BuilderPage;
  products: ProductLike[];
  documents?: DocumentLike[];
  vouchers?: VoucherLike[];
  mode: "edit" | "preview";
  device: DeviceId;
  selection?: Selection | null;
  hoverId?: string | null;
  authPreviewTab?: "login" | "register" | null;
  onCloseAuthPreview?: () => void;
  onSelect?: (sel: Selection | null) => void;
  onHover?: (blockId: string | null) => void;
  onPatchBlock?: (blockId: string, patch: Partial<BlockProps>) => void;
  onPatchItem?: (blockId: string, itemId: string, patch: Partial<BlockItem>) => void;
  onBlockAction?: (blockId: string, action: BlockAction) => void;
  onDropAt?: (index: number, data: { newType?: string; moveId?: string }) => void;
  onNavigate?: (pageId: string) => void;
}

export function PhoneScreen(props: PhoneScreenProps) {
  const { schema, page, products, documents, vouchers, mode, device, selection, hoverId, authPreviewTab, onCloseAuthPreview } = props;
  const dev = DEVICES[device];
  const clock = useClock();
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [memberLoggedIn, setMemberLoggedIn] = useState(false);
  const [authSheet, setAuthSheet] = useState<{ open: boolean; tab: "login" | "register"; reason?: string }>({
    open: false,
    tab: "login",
  });
  const [authToast, setAuthToast] = useState<string | null>(null);
  const editing = mode === "edit";
  const authConfig: BuilderAuthConfig = schema.auth ?? DEFAULT_BUILDER_AUTH;

  useEffect(() => {
    if (authPreviewTab) {
      setAuthSheet({ open: true, tab: authPreviewTab, reason: "Xem trước giao diện Đăng nhập / Đăng ký hội viên" });
    }
  }, [authPreviewTab]);

  useEffect(() => {
    if (!authToast) return;
    const t = setTimeout(() => setAuthToast(null), 2400);
    return () => clearTimeout(t);
  }, [authToast]);

  const handleRequireMemberAuth = (action: keyof BuilderAuthConfig["protectedActions"], reason: string) => {
    if (!authConfig.enabled) return false;
    if (!authConfig.protectedActions[action]) return false;
    if (memberLoggedIn) return false;
    setAuthSheet({ open: true, tab: "login", reason: `Yêu cầu đăng nhập hội viên để: ${reason}` });
    return true;
  };

  const closeAuthSheet = () => {
    setAuthSheet((s) => ({ ...s, open: false }));
    onCloseAuthPreview?.();
  };
  const tabs = schema.pages.filter((p) => p.inTabbar).slice(0, 5);
  const isRoot = tabs.some((t) => t.id === page.id);
  const visibleBlocks = page.blocks.filter((b) => editing || !b.hidden);
  const fontFamily = schema.theme.font === "system" ? "-apple-system, system-ui, sans-serif" : `'${schema.theme.font}', 'Inter', system-ui, sans-serif`;

  const resolvedAppBarStyle =
    page.appBarStyle && page.appBarStyle !== "inherit" ? page.appBarStyle : (schema.theme.appBarStyle ?? "white");
  const firstBlock = visibleBlocks[0];
  const mergedBrandHeader = firstBlock?.type === "header";
  const isTransparentBar = mergedBrandHeader || resolvedAppBarStyle === "transparent";
  const isColoredBar = !mergedBrandHeader && resolvedAppBarStyle === "primary";
  const barBgColor = isTransparentBar
    ? "transparent"
    : isColoredBar
      ? page.appBarBg || schema.theme.appBarBg || schema.theme.primary
      : page.appBarBg || "#ffffff";
  const autoLightText = mergedBrandHeader
    ? firstBlock.props.variant === "solid"
    : isColoredBar;
  const isLightText =
    schema.theme.appBarText === "light" ? true : schema.theme.appBarText === "dark" ? false : autoLightText;
  const topBarTotalH = dev.statusH + 44;

  const readDnd = (e: React.DragEvent) => ({
    newType: e.dataTransfer.getData(DND_NEW) || undefined,
    moveId: e.dataTransfer.getData(DND_MOVE) || undefined,
  });
  const acceptsDnd = (e: React.DragEvent) => e.dataTransfer.types.includes(DND_NEW) || e.dataTransfer.types.includes(DND_MOVE);

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden" style={{ background: page.bgColor || schema.theme.bg, fontFamily }}>
      {/* Status bar + Zalo Mini App navigation bar */}
      <div
        className={`${isTransparentBar ? "pointer-events-none absolute left-0 right-0 top-0" : "relative shrink-0"} z-20 ${
          !isTransparentBar && !isColoredBar ? "border-b border-slate-100" : ""
        }`}
        style={{ background: barBgColor, color: isLightText ? "#ffffff" : "#0f172a" }}
      >
        {/* Status bar */}
        <div className="flex items-end justify-between px-7 pb-1 text-[13px] font-semibold" style={{ height: dev.statusH }}>
          <span className={dev.island ? "pl-2" : ""}>{clock}</span>
          <span className="flex items-center gap-1">
            <LuSignal size={14} />
            <LuWifi size={14} />
            <LuBatteryFull size={18} />
          </span>
        </div>

        {/* Zalo Mini App navigation bar (ẩn tiêu đề khi trang đã có BrandHeader tràn lên) */}
        <div className="flex h-11 items-center justify-between pl-3 pr-2.5">
          <div className="pointer-events-auto flex min-w-0 items-center gap-1.5">
            {!mergedBrandHeader && !isRoot && (
              <button
                type="button"
                className="-ml-1"
                style={{ color: isLightText ? "#ffffff" : "#334155" }}
                onClick={() => props.onNavigate?.(tabs[0]?.id ?? page.id)}
              >
                <LuChevronLeft size={22} />
              </button>
            )}
            {!mergedBrandHeader && (
              <span className="truncate text-[16px] font-semibold">{page.route === "/" ? schema.appName : page.name}</span>
            )}
          </div>
          <div
            className={`pointer-events-auto flex h-[30px] items-center rounded-full border px-1 backdrop-blur-sm ${
              isLightText
                ? "border-white/25 bg-black/20 text-white"
                : "border-slate-200 bg-white/85 text-slate-800"
            }`}
          >
            <span className="flex w-8 justify-center">
              <LuEllipsis size={18} />
            </span>
            <span className={`h-4 w-px ${isLightText ? "bg-white/25" : "bg-slate-200"}`} />
            <span className="flex w-8 justify-center">
              <LuX size={17} />
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div
        className="no-scrollbar relative flex-1 overflow-y-auto overflow-x-hidden"
        onClick={() => editing && props.onSelect?.(null)}
        onDragOver={(e) => {
          if (!editing || !acceptsDnd(e)) return;
          e.preventDefault();
          if (e.target === e.currentTarget) setDropIndex(page.blocks.length);
        }}
        onDragLeave={(e) => {
          if (e.currentTarget === e.target) setDropIndex(null);
        }}
        onDrop={(e) => {
          if (!editing) return;
          e.preventDefault();
          const idx = dropIndex ?? page.blocks.length;
          setDropIndex(null);
          props.onDropAt?.(idx, readDnd(e));
        }}
      >
        {visibleBlocks.length === 0 && (
          <div
            className="m-4 flex h-48 flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-slate-300 text-center text-xs text-slate-400"
            style={isTransparentBar ? { marginTop: topBarTotalH + 16 } : undefined}
          >
            <span className="text-sm font-semibold text-slate-500">Trang trống</span>
            Kéo khối từ thư viện vào đây
          </div>
        )}

        {visibleBlocks.map((block, visibleIdx) => {
          const realIndex = page.blocks.findIndex((b) => b.id === block.id);
          const selected = editing && selection?.blockId === block.id;
          const hovered = editing && hoverId === block.id && !selected;
          const isMergedHeaderBlock = mergedBrandHeader && visibleIdx === 0;
          const handlesOwnInset =
            isMergedHeaderBlock || (isTransparentBar && visibleIdx === 0 && (block.type === "header" || block.type === "profile"));
          const ctx: RenderCtx = {
            theme: schema.theme,
            products,
            documents,
            vouchers,
            auth: authConfig,
            isMemberLoggedIn: memberLoggedIn,
            onRequireMemberAuth: handleRequireMemberAuth,
            onOpenMemberAuth: (tab = "login") => setAuthSheet({ open: true, tab }),
            onMemberLogout: () => {
              setMemberLoggedIn(false);
              setAuthToast("Đã đăng xuất hội viên");
            },
            editable: !!selected,
            topInset: isMergedHeaderBlock ? dev.statusH : handlesOwnInset ? topBarTotalH : 0,
            capsuleInset: isMergedHeaderBlock,
            selectedItemId: selected ? selection?.itemId : undefined,
            onSelectItem: (itemId) => editing && props.onSelect?.({ blockId: block.id, itemId }),
            onEditProp: (key, value) => props.onPatchBlock?.(block.id, { [key]: value } as Partial<BlockProps>),
            onEditItem: (itemId, key, value) => props.onPatchItem?.(block.id, itemId, { [key]: value } as Partial<BlockItem>),
          };
          const padTop = (block.props.paddingY ?? 0) + (isTransparentBar && visibleIdx === 0 && !handlesOwnInset ? topBarTotalH : 0);
          return (
            <div key={block.id} className="relative">
              {editing && dropIndex === realIndex && <DropLine />}
              <div
                className={`relative transition-[box-shadow] ${editing ? "cursor-pointer" : ""} ${block.hidden ? "opacity-35" : ""}`}
                style={{
                  background: block.props.bgColor || undefined,
                  paddingTop: padTop || undefined,
                  paddingBottom: block.props.paddingY ?? undefined,
                  boxShadow: selected ? "inset 0 0 0 2px #0ea5e9" : hovered ? "inset 0 0 0 1.5px #7dd3fc" : undefined,
                }}
                onClick={(e) => {
                  if (!editing) return;
                  e.stopPropagation();
                  if (selection?.blockId !== block.id || selection.itemId) props.onSelect?.({ blockId: block.id });
                }}
                onMouseEnter={() => editing && props.onHover?.(block.id)}
                onMouseLeave={() => editing && props.onHover?.(null)}
                onDragOver={(e) => {
                  if (!editing || !acceptsDnd(e)) return;
                  e.preventDefault();
                  e.stopPropagation();
                  const rect = e.currentTarget.getBoundingClientRect();
                  setDropIndex(e.clientY < rect.top + rect.height / 2 ? realIndex : realIndex + 1);
                }}
              >
                <BlockRenderer block={block} ctx={ctx} />
                {(selected || hovered) && (
                  <BlockChip
                    block={block}
                    selected={!!selected}
                    topOffset={isMergedHeaderBlock ? dev.statusH + 54 : isTransparentBar && visibleIdx === 0 ? topBarTotalH + 4 : 4}
                    onAction={(a) => props.onBlockAction?.(block.id, a)}
                  />
                )}
              </div>
            </div>
          );
        })}
        {editing && dropIndex === page.blocks.length && <DropLine />}
        <div
          style={{
            height:
              tabs.length > 0 && schema.theme.tabbarStyle === "floating"
                ? dev.island
                  ? 104
                  : 88
                : 16,
          }}
        />
      </div>

      {/* Tabbar */}
      {tabs.length > 0 && <TabBar schema={schema} tabs={tabs} activeId={page.id} onNavigate={props.onNavigate} homeIndicator={dev.island} />}
      {tabs.length === 0 && dev.island && <div className="h-6 shrink-0 bg-white" />}

      {/* Toast thông báo trạng thái hội viên */}
      {authToast && (
        <div className="pointer-events-none absolute left-4 right-4 top-20 z-50 flex justify-center">
          <div className="rounded-full bg-slate-900/90 px-3.5 py-1.5 text-[11px] font-semibold text-white shadow-lg">
            {authToast}
          </div>
        </div>
      )}

      {/* Popup Đăng nhập / Đăng ký thành viên Mini App */}
      {authSheet.open && (
        <MemberAuthSheet
          appName={schema.appName}
          theme={schema.theme}
          auth={authConfig}
          initialTab={authSheet.tab}
          reason={authSheet.reason}
          onClose={closeAuthSheet}
          onComplete={(modeLabel) => {
            setMemberLoggedIn(true);
            closeAuthSheet();
            setAuthToast(
              modeLabel === "register" && authConfig.welcomePoints > 0
                ? `Đăng ký thành công! +${authConfig.welcomePoints} điểm thưởng`
                : "Đăng nhập hội viên thành công!",
            );
          }}
        />
      )}
    </div>
  );
}

function MemberAuthSheet({
  appName,
  theme,
  auth,
  initialTab,
  reason,
  onClose,
  onComplete,
}: {
  appName: string;
  theme: BuilderSchema["theme"];
  auth: BuilderAuthConfig;
  initialTab: "login" | "register";
  reason?: string;
  onClose: () => void;
  onComplete: (mode: "login" | "register") => void;
}) {
  const [tab, setTab] = useState<"login" | "register">(initialTab);
  const [followOa, setFollowOa] = useState(auth.requireFollowOa);

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col justify-end bg-black/50 backdrop-blur-[1px]"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div
        className="rounded-t-[26px] bg-white px-4 pb-7 pt-3 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-200" />
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-[15px] font-extrabold text-slate-900">{auth.loginTitle || "Đăng nhập thành viên"}</div>
            <div className="mt-0.5 text-[11px] leading-snug text-slate-500">
              {auth.loginSubtitle || `Trở thành hội viên ${appName} để tích điểm & nhận ưu đãi.`}
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-full bg-slate-100 p-1.5 text-slate-500">
            <LuX size={15} />
          </button>
        </div>

        {reason && (
          <div className="mt-2.5 rounded-xl bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-800">
            {reason}
          </div>
        )}

        <div className="mt-3 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 text-[11.5px] font-bold">
          <button
            type="button"
            onClick={() => setTab("login")}
            className={`rounded-lg py-1.5 transition ${tab === "login" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
          >
            Đăng nhập
          </button>
          <button
            type="button"
            onClick={() => setTab("register")}
            className={`rounded-lg py-1.5 transition ${tab === "register" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
          >
            Đăng ký {auth.welcomePoints > 0 ? `(+${auth.welcomePoints}đ)` : ""}
          </button>
        </div>

        <div className="mt-3.5 space-y-2.5">
          {auth.allowZaloQuickLogin && (
            <button
              type="button"
              onClick={() => onComplete(tab)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0068FF] py-2.5 text-[12.5px] font-bold text-white shadow-sm"
            >
              <span className="rounded bg-white px-1 py-0.5 text-[9px] font-black text-[#0068FF]">Zalo</span>
              <span>
                {tab === "register" ? "Đăng ký 1 chạm bằng Zalo" : "Đăng nhập 1 chạm bằng Zalo"}
              </span>
            </button>
          )}

          {auth.allowPhoneOtp && (
            <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/70 p-2.5">
              {tab === "register" && (
                <input
                  type="text"
                  placeholder="Họ và tên của bạn"
                  className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[12px] outline-none"
                />
              )}
              <input
                type="tel"
                placeholder="Nhập số điện thoại (09xx xxx xxx)"
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[12px] outline-none"
              />
              <button
                type="button"
                onClick={() => onComplete(tab)}
                className="w-full rounded-lg py-2 text-[12px] font-bold text-white"
                style={{ background: theme.primary }}
              >
                {tab === "register" ? "Nhận mã OTP & Đăng ký" : "Tiếp tục với Số điện thoại"}
              </button>
            </div>
          )}

          {auth.requirePhoneVerify && (
            <div className="flex items-center gap-1.5 text-[10.5px] text-slate-500">
              <Icon name="shield" size={13} className="shrink-0 text-emerald-600" />
              <span>Yêu cầu xác thực SĐT Zalo để đồng bộ điểm &amp; đơn hàng.</span>
            </div>
          )}

          {auth.requireFollowOa && (
            <label className="flex cursor-pointer items-center gap-2 rounded-lg bg-blue-50/70 px-2.5 py-1.5 text-[10.5px] text-slate-700">
              <input type="checkbox" checked={followOa} onChange={(e) => setFollowOa(e.target.checked)} />
              <span>Quan tâm Zalo OA <b>{appName}</b> để nhận thông báo ưu đãi</span>
            </label>
          )}
        </div>
      </div>
    </div>
  );
}

function DropLine() {
  return (
    <div className="pointer-events-none relative z-30 mx-2 h-0">
      <div className="absolute -top-[2px] left-0 right-0 h-1 rounded-full bg-sky-500 shadow-[0_0_0_3px_rgba(14,165,233,0.25)]" />
      <div className="absolute -left-1 -top-[5px] h-2.5 w-2.5 rounded-full border-2 border-sky-500 bg-white" />
    </div>
  );
}

function BlockChip({
  block,
  selected,
  topOffset = 4,
  onAction,
}: {
  block: Block;
  selected: boolean;
  topOffset?: number;
  onAction: (a: BlockAction) => void;
}) {
  const meta = BLOCKS[block.type];
  const btn = "flex h-[22px] w-[22px] items-center justify-center rounded-md hover:bg-white/20";
  return (
    <div className="pointer-events-none absolute left-1 right-1 z-30 flex items-start justify-between" style={{ top: topOffset }}>
      <span
        draggable={selected}
        onDragStart={(e) => {
          e.dataTransfer.setData(DND_MOVE, block.id);
          e.dataTransfer.effectAllowed = "move";
        }}
        className={`pointer-events-auto flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold text-white shadow ${selected ? "cursor-grab bg-sky-500" : "bg-sky-400"}`}
      >
        {selected && <LuGripVertical size={11} />}
        {block.name || meta.label}
        {block.hidden && <LuEyeOff size={11} />}
      </span>
      {selected && (
        <span className="pointer-events-auto flex items-center gap-0.5 rounded-lg bg-slate-900/90 p-0.5 text-white shadow-lg" onClick={(e) => e.stopPropagation()}>
          <button type="button" className={btn} title="Lên" onClick={() => onAction("up")}>
            <LuArrowUp size={12} />
          </button>
          <button type="button" className={btn} title="Xuống" onClick={() => onAction("down")}>
            <LuArrowDown size={12} />
          </button>
          <button type="button" className={btn} title="Nhân bản" onClick={() => onAction("duplicate")}>
            <LuCopy size={12} />
          </button>
          <button type="button" className={btn} title="Ẩn/Hiện" onClick={() => onAction("hide")}>
            <LuEyeOff size={12} />
          </button>
          <button type="button" className={`${btn} hover:!bg-rose-500`} title="Xoá" onClick={() => onAction("delete")}>
            <LuTrash2 size={12} />
          </button>
        </span>
      )}
    </div>
  );
}

function TabBar({
  schema,
  tabs,
  activeId,
  onNavigate,
  homeIndicator,
}: {
  schema: BuilderSchema;
  tabs: BuilderPage[];
  activeId: string;
  onNavigate?: (id: string) => void;
  homeIndicator: boolean;
}) {
  const {
    primary,
    tabbarStyle: style,
    tabbarBg,
    tabbarActiveColor,
    tabbarInactiveColor,
    tabbarRadius,
    tabbarShowLabel = true,
    tabbarBorder = true,
  } = schema.theme;

  const isFloating = style === "floating";
  const bg = tabbarBg || (isFloating ? "#0f172a" : "#ffffff");
  const activeColor = tabbarActiveColor || (isFloating && !tabbarBg ? "#ffffff" : primary);
  const inactiveColor = tabbarInactiveColor || "#94a3b8";
  const radius = tabbarRadius ?? (isFloating ? 22 : 0);

  const items = tabs.map((t) => {
    const active = t.id === activeId;
    return (
      <button
        key={t.id}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onNavigate?.(t.id);
        }}
        className="relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors"
        style={{ color: active ? activeColor : inactiveColor }}
      >
        {style === "indicator" && active && (
          <span
            className="absolute top-0 h-[3px] w-7 rounded-b-full"
            style={{ background: activeColor }}
          />
        )}
        {style === "minimal" ? (
          <span
            className="flex h-7 items-center justify-center rounded-full px-3 transition-colors"
            style={active ? { background: `${activeColor}1f` } : undefined}
          >
            <Icon name={t.icon} size={20} />
          </span>
        ) : (
          <Icon name={t.icon} size={tabbarShowLabel ? 21 : 23} />
        )}
        {tabbarShowLabel && <span className={active ? "font-bold" : ""}>{t.name}</span>}
      </button>
    );
  });

  if (isFloating) {
    return (
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-20 px-4" style={{ paddingBottom: homeIndicator ? 26 : 12 }}>
        <div
          className={`pointer-events-auto flex px-1 ${tabbarBorder ? "shadow-[0_12px_30px_-10px_rgba(15,23,42,0.55)] ring-1 ring-black/5" : ""}`}
          style={{ background: bg, borderRadius: radius }}
        >
          {items}
        </div>
        {homeIndicator && <HomeIndicator />}
      </div>
    );
  }
  return (
    <div
      className={`relative z-20 shrink-0 ${tabbarBorder ? "border-t border-slate-200/80 shadow-[0_-4px_16px_-10px_rgba(15,23,42,0.18)]" : ""}`}
      style={{
        background: bg,
        borderTopLeftRadius: radius,
        borderTopRightRadius: radius,
        paddingBottom: homeIndicator ? 22 : 2,
      }}
    >
      <div className="flex px-1">{items}</div>
      {homeIndicator && <HomeIndicator />}
    </div>
  );
}

function HomeIndicator() {
  return <div className="pointer-events-none absolute bottom-2 left-1/2 h-[5px] w-32 -translate-x-1/2 rounded-full bg-slate-900" />;
}

/** Khung thiết bị (bezel, dynamic island, nút cạnh) */
export function DeviceFrame({ device, children }: { device: DeviceId; children: React.ReactNode }) {
  const dev = DEVICES[device];
  const bezel = device === "iphoneSE" ? 14 : 12;
  return (
    <div className="phone-ui relative" style={{ width: dev.width + bezel * 2, height: dev.height + bezel * 2 + (device === "iphoneSE" ? 120 : 0) }}>
      {/* side buttons */}
      <span className="absolute -left-[3px] top-[120px] h-8 w-[3px] rounded-l bg-slate-700" />
      <span className="absolute -left-[3px] top-[170px] h-14 w-[3px] rounded-l bg-slate-700" />
      <span className="absolute -left-[3px] top-[235px] h-14 w-[3px] rounded-l bg-slate-700" />
      <span className="absolute -right-[3px] top-[190px] h-20 w-[3px] rounded-r bg-slate-700" />
      <div
        className="relative h-full w-full bg-gradient-to-b from-slate-800 via-slate-900 to-slate-800 shadow-[0_40px_80px_-30px_rgba(15,23,42,0.6),inset_0_0_0_2px_rgba(255,255,255,0.08)]"
        style={{
          borderRadius: dev.radius + bezel,
          padding: bezel,
          paddingTop: device === "iphoneSE" ? 60 + bezel : bezel,
          paddingBottom: device === "iphoneSE" ? 60 + bezel : bezel,
        }}
      >
        {device === "iphoneSE" && (
          <>
            <span className="absolute left-1/2 top-7 h-1.5 w-14 -translate-x-1/2 rounded-full bg-slate-700" />
            <span className="absolute bottom-6 left-1/2 h-12 w-12 -translate-x-1/2 rounded-full border-2 border-slate-700" />
          </>
        )}
        <div
          className="relative overflow-hidden bg-white"
          style={{
            width: dev.width,
            height: dev.height,
            borderRadius: device === "iphoneSE" ? 4 : dev.radius,
            clipPath: `inset(0 round ${device === "iphoneSE" ? 4 : dev.radius}px)`,
            isolation: "isolate",
          }}
        >
          {children}
          {dev.island && <span className="pointer-events-none absolute left-1/2 top-[11px] z-40 h-[33px] w-[122px] -translate-x-1/2 rounded-full bg-black" />}
          {device === "android" && <span className="pointer-events-none absolute left-1/2 top-[9px] z-40 h-3.5 w-3.5 -translate-x-1/2 rounded-full bg-black" />}
        </div>
      </div>
    </div>
  );
}
