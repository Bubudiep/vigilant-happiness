import { CSSProperties, ReactNode, RefObject, useEffect, useRef, useState } from "react";
import { Page, Swiper, useNavigate } from "zmp-ui";

import { pickStockImage } from "@/assets/stock-images";

import { useDemoAction } from "../demo-action";
import {
  LuArrowLeft,
  LuCrown,
  LuGift,
  LuPlus,
  LuSearch,
  LuZap,
  RiVerifiedBadgeFill,
  SmartIcon,
} from "./icons";
import { aboveSafeBottom, NAV_HEIGHT, useTplTheme } from "./theme";

/** Tự động thu gọn phần phụ (thanh tìm kiếm / bộ lọc) khi người dùng vuốt lên (cuộn xuống) và hiện lại khi cuộn lên. */
function useCollapseOnScroll(ref: RefObject<HTMLElement | null>, enabled: boolean) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    const el = ref.current;
    if (!el) return;
    const scroller = (el.closest(".zaui-page") as HTMLElement | null) ?? window;
    let lastY = scroller instanceof Window ? scroller.scrollY : scroller.scrollTop;
    let lockUntil = 0;

    const onScroll = () => {
      const now = performance.now();
      const y = scroller instanceof Window ? scroller.scrollY : scroller.scrollTop;
      if (now < lockUntil) {
        lastY = y;
        return;
      }
      const dy = y - lastY;
      lastY = y;

      if (y <= 16) {
        setCollapsed((prev) => {
          if (prev) lockUntil = now + 220;
          return false;
        });
      } else if (dy > 6 && y > 56) {
        setCollapsed((prev) => {
          if (!prev) lockUntil = now + 220;
          return true;
        });
      } else if (dy < -10) {
        setCollapsed((prev) => {
          if (prev) lockUntil = now + 220;
          return false;
        });
      }
    };

    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => scroller.removeEventListener("scroll", onScroll);
  }, [enabled, ref]);

  return collapsed;
}

/** Bỏ emoji ở đầu chuỗi tiêu đề để giao diện gọn, không bị cảm giác "AI". */
function cleanHeadingText(node: ReactNode): ReactNode {
  if (typeof node !== "string") return node;
  return node.replace(/^[\p{Extended_Pictographic}\uFE0F\u200D\s·•]+/u, "").trim();
}

/** Khung trang của mẫu: nền theo theme + chừa chỗ ở đáy (thanh tab / thanh hành động). */
export function TplPage({
  tab,
  bottomSpace = 0,
  className = "",
  children,
}: {
  /** true nếu trang là một tab (có thanh tab ở đáy) */
  tab?: boolean;
  bottomSpace?: number;
  className?: string;
  children: ReactNode;
}) {
  const theme = useTplTheme();
  return (
    <Page className={`text-gray-900 ${className}`} style={{ background: theme.bg }}>
      <div style={{ paddingBottom: aboveSafeBottom((tab ? NAV_HEIGHT : 0) + 16 + bottomSpace) }}>{children}</div>
    </Page>
  );
}

export type BrandHeaderVariant = "clean" | "pastel" | "solid";

export function BrandHeader({
  logo,
  logoUrl,
  name,
  subtitle,
  verified = true,
  variant = "pastel",
  children,
}: {
  logo: ReactNode;
  logoUrl?: string;
  name: string;
  subtitle?: string;
  verified?: boolean;
  variant?: BrandHeaderVariant;
  children?: ReactNode;
}) {
  const theme = useTplTheme();
  const headerRef = useRef<HTMLElement>(null);
  const collapsed = useCollapseOnScroll(headerRef, !!children);
  const isSolid = variant === "solid";
  const isPastel = variant === "pastel";

  const bgStyle: CSSProperties = isSolid
    ? {
        backgroundColor: theme.primary,
        backgroundImage: `linear-gradient(135deg, ${theme.primary}, ${theme.accent})`,
      }
    : isPastel
      ? {
          backgroundColor: "#ffffff",
          backgroundImage: `linear-gradient(180deg, ${theme.primary}18 0%, ${theme.primary}08 100%)`,
        }
      : { backgroundColor: "#ffffff" };

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-40 border-b border-black/[0.04] safe-top"
      style={bgStyle}
    >
      <div className="zalo-capsule-space flex items-center gap-2.5 py-2.5 pl-4">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={name}
            className="h-10 w-10 shrink-0 rounded-xl border border-gray-200/80 bg-white object-cover shadow-sm"
          />
        ) : (
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-black/5 bg-white shadow-sm"
            style={{ color: theme.primary }}
          >
            <SmartIcon token={logo} size={20} />
          </div>
        )}

        <div className="min-w-0">
          <div className="flex items-center gap-1">
            <span
              className="truncate text-[15px] font-bold tracking-tight"
              style={{ color: isSolid ? "#ffffff" : "#111827" }}
            >
              {name}
            </span>
            {verified && (
              <RiVerifiedBadgeFill
                size={15}
                className="shrink-0"
                style={{ color: isSolid ? "#ffffff" : "#2563eb" }}
              />
            )}
          </div>
          {subtitle && (
            <div className={`truncate text-[11px] ${isSolid ? "text-white/80" : "text-gray-500"}`}>{subtitle}</div>
          )}
        </div>
      </div>

      {children && (
        <div
          className={`px-4 transition-all duration-200 ease-out ${
            collapsed
              ? "pointer-events-none max-h-0 overflow-hidden pb-0 pt-0 opacity-0"
              : "max-h-32 pb-3 pt-1 opacity-100"
          }`}
        >
          {children}
        </div>
      )}
    </header>
  );
}

/** Header trang con: nút back + tiêu đề. Header tab không có back: `back={false}`. */
export function TplHeader({
  title,
  back = true,
  right,
  children,
}: {
  title: ReactNode;
  back?: boolean;
  right?: ReactNode;
  children?: ReactNode;
}) {
  const navigate = useNavigate();
  const headerRef = useRef<HTMLElement>(null);
  const collapsed = useCollapseOnScroll(headerRef, !!children);

  return (
    <header ref={headerRef} className="sticky top-0 z-40 border-b border-gray-100 bg-white safe-top">
      <div className={`zalo-capsule-space flex h-12 items-center gap-2 ${back ? "pl-2" : "pl-4"}`}>
        {back && (
          <button onClick={() => navigate(-1)} className="flex h-9 w-9 items-center justify-center rounded-full">
            <LuArrowLeft size={20} />
          </button>
        )}
        <div className="flex-1 truncate text-base font-semibold">{title}</div>
        {right}
      </div>
      {children && (
        <div
          className={`transition-all duration-200 ease-out ${
            collapsed ? "pointer-events-none max-h-0 overflow-hidden opacity-0" : "max-h-44 opacity-100"
          }`}
        >
          {children}
        </div>
      )}
    </header>
  );
}

/** Ô tìm kiếm: có `onClick` thì là nút giả (mở trang tìm kiếm), có `onChange` thì là input thật. */
export function SearchBox({
  placeholder,
  value,
  onChange,
  onClick,
  variant = "white",
}: {
  placeholder: string;
  value?: string;
  onChange?: (v: string) => void;
  onClick?: () => void;
  variant?: "white" | "gray";
}) {
  const boxCls =
    variant === "white"
      ? "border border-gray-200/80 bg-white shadow-sm"
      : "border border-transparent bg-gray-100";

  if (onClick) {
    return (
      <button
        onClick={onClick}
        className={`flex w-full items-center gap-2 rounded-full px-3.5 py-2 text-xs text-gray-400 ${boxCls}`}
      >
        <LuSearch size={15} className="shrink-0" />
        <span className="truncate">{placeholder}</span>
      </button>
    );
  }
  return (
    <label className={`flex items-center gap-2 rounded-full px-3.5 py-2 text-xs ${boxCls}`}>
      <LuSearch size={15} className="shrink-0 text-gray-400" />
      <input
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent outline-none"
      />
    </label>
  );
}

export function SectionTitle({
  title,
  action,
  onAction,
}: {
  title: ReactNode;
  subtitle?: string;
  action?: string;
  onAction?: () => void;
}) {
  const theme = useTplTheme();
  return (
    <div className="flex items-center justify-between px-4">
      <h2 className="text-[15px] font-bold text-gray-900">{cleanHeadingText(title)}</h2>
      {action && (
        <button
          onClick={onAction}
          className="text-xs font-medium text-gray-500 active:opacity-70"
          style={{ color: theme.primary }}
        >
          {action} ›
        </button>
      )}
    </div>
  );
}

/** Hàng chip chọn một giá trị, cuộn ngang. */
export function ChipRow<T extends string>({
  items,
  value,
  onChange,
  className = "",
}: {
  items: { id: NoInfer<T>; label: string }[];
  value: T;
  onChange: (v: NoInfer<T>) => void;
  className?: string;
}) {
  const theme = useTplTheme();
  return (
    <div className={`no-scrollbar flex gap-2 overflow-x-auto px-4 ${className}`}>
      {items.map((c) => (
        <button
          key={c.id}
          onClick={() => onChange(c.id)}
          className="shrink-0 rounded-full border px-3.5 py-1.5 text-xs transition-colors"
          style={
            value === c.id
              ? { background: theme.primary, borderColor: theme.primary, color: "#fff", fontWeight: 600 }
              : { borderColor: "#e5e7eb", color: "#374151", background: "#fff" }
          }
        >
          {cleanHeadingText(c.label)}
        </button>
      ))}
    </div>
  );
}

export interface BannerItem {
  title: string;
  subtitle: string;
  from: string;
  to: string;
  emoji?: string;
  eyebrow?: string;
  image?: string;
  cta?: string;
  discountBadge?: string;
  highlights?: string[];
  onClick?: () => void;
}

export type BannerVariant = "editorial" | "poster" | "split" | "fullbleed";

/** Slider banner tinh gọn, tràn ngang màn hình. */
export function BannerSwiper({
  banners,
  onBannerClick,
}: {
  banners: BannerItem[];
  variant?: BannerVariant;
  onBannerClick?: (b: BannerItem, index: number) => void;
}) {
  const demoAction = useDemoAction();
  const theme = useTplTheme();

  return (
    <div className="w-full">
      <Swiper autoplay loop duration={4500} className="swiper-fullbleed !rounded-none">
        {banners.map((b, idx) => {
          const bgImage = b.image ?? pickStockImage(theme.templateId, "banner", idx);
          const handleClick = () => {
            if (b.onClick) b.onClick();
            else if (onBannerClick) onBannerClick(b, idx);
            else demoAction(b.title);
          };

          return (
            <Swiper.Slide key={b.title}>
              <div
                onClick={handleClick}
                className="relative flex aspect-[2.1/1] cursor-pointer items-center justify-between overflow-hidden px-5 py-4 text-white"
                style={{ background: `linear-gradient(135deg, ${b.from} 0%, ${b.to} 100%)` }}
              >
                {bgImage && (
                  <>
                    <img
                      src={bgImage}
                      alt={b.title}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                    <div
                      className="pointer-events-none absolute inset-0"
                      style={{
                        background: `linear-gradient(95deg, ${b.from}e8 0%, ${b.from}b8 52%, ${b.to}45 100%)`,
                      }}
                    />
                  </>
                )}

                <div className="relative z-10 flex max-w-[74%] flex-col items-start">
                  {b.eyebrow && (
                    <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-white backdrop-blur-sm">
                      {b.eyebrow}
                    </span>
                  )}
                  <div className="mt-1 text-lg font-extrabold leading-snug drop-shadow-sm">{b.title}</div>
                  <div className="mt-0.5 line-clamp-1 text-xs text-white/90 drop-shadow-sm">{b.subtitle}</div>
                  <span className="mt-2.5 inline-flex items-center gap-1 rounded-full bg-white px-3.5 py-1 text-[11px] font-bold text-gray-900 shadow-sm">
                    {b.cta ?? "Xem ngay"} ›
                  </span>
                </div>
              </div>
            </Swiper.Slide>
          );
        })}
      </Swiper>
    </div>
  );
}

/** Ảnh minh hoạ sản phẩm / dịch vụ. */
export function Tile({
  emoji,
  color,
  image,
  seed,
  className = "",
  rounded = "rounded-xl",
  size = "text-4xl",
}: {
  emoji: string;
  color: string;
  image?: string;
  seed?: string | number;
  className?: string;
  rounded?: string;
  size?: string;
}) {
  const theme = useTplTheme();
  const resolvedImage = image ?? pickStockImage(theme.templateId, "product", seed ?? `${emoji}:${color}`);

  if (resolvedImage) {
    return (
      <div className={`relative shrink-0 overflow-hidden bg-gray-100 ${rounded} ${className}`}>
        <img src={resolvedImage} alt="" className="h-full w-full object-cover" loading="lazy" />
      </div>
    );
  }

  const iconSize = size.includes("6xl") ? 46 : size.includes("5xl") ? 38 : size.includes("4xl") ? 32 : 24;

  return (
    <div
      className={`relative flex shrink-0 items-center justify-center overflow-hidden ${rounded} ${className}`}
      style={{
        background: `linear-gradient(145deg, ${color}12 0%, ${color}28 100%)`,
      }}
    >
      <div
        className="relative z-10 flex items-center justify-center rounded-2xl bg-white/75 p-2.5 shadow-sm"
        style={{ color }}
      >
        <SmartIcon token={emoji} size={iconSize} />
      </div>
    </div>
  );
}

export type ShortcutGridVariant = "card" | "tiles" | "circle" | "pill";

/** Lưới lối tắt tinh gọn, không gắn nhãn rác đè lên icon. */
export function ShortcutGrid({
  items,
  cols = 4,
  variant = "card",
}: {
  items: { emoji: string; label: string; badge?: string; onClick?: () => void }[];
  cols?: 2 | 3 | 4 | 5;
  variant?: ShortcutGridVariant;
}) {
  const theme = useTplTheme();
  const gridCls =
    cols === 5
      ? "grid-cols-5"
      : cols === 3
        ? "grid-cols-3"
        : cols === 2
          ? "grid-cols-2"
          : "grid-cols-4";

  if (variant === "pill") {
    return (
      <div className={`grid gap-2.5 px-4 ${cols === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
        {items.map((s) => (
          <button
            key={s.label}
            onClick={s.onClick}
            className="flex items-center gap-2.5 rounded-2xl border border-gray-200/80 bg-white p-3 text-left shadow-sm active:scale-[0.98]"
          >
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
              style={{ background: `${theme.primary}14`, color: theme.primary }}
            >
              <SmartIcon token={s.emoji} size={18} />
            </span>
            <span className="truncate text-xs font-semibold text-gray-800">{s.label}</span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="px-4">
      <div className={`grid gap-y-3.5 gap-x-2 rounded-2xl border border-gray-200/80 bg-white px-3 py-3.5 shadow-sm ${gridCls}`}>
        {items.map((s) => (
          <button
            key={s.label}
            onClick={s.onClick}
            className="flex flex-col items-center gap-1.5 text-center active:scale-95"
          >
            <span
              className="flex h-11 w-11 items-center justify-center rounded-2xl"
              style={{
                background: `${theme.primary}12`,
                color: theme.primary,
              }}
            >
              <SmartIcon token={s.emoji} size={21} />
            </span>
            <span className="line-clamp-1 text-[11px] font-medium text-gray-700">{s.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export type MemberCardVariant = "minimal" | "gradient" | "stamp" | "vip";

/** Khối Thẻ thành viên gọn nhẹ. */
export function MemberCard({
  tier = "Hạng Bạc",
  points = "1.250 điểm",
  subtitle = "Tích điểm · Nhận ưu đãi",
  stampCurrent = 5,
  stampTotal = 8,
  stampLabel = "Tích đủ 8 lần tặng 1 lần miễn phí",
  variant = "minimal",
  onClick,
}: {
  tier?: string;
  points?: string;
  subtitle?: string;
  progress?: number;
  stampCurrent?: number;
  stampTotal?: number;
  stampLabel?: string;
  variant?: MemberCardVariant;
  onClick?: () => void;
}) {
  const theme = useTplTheme();
  const demoAction = useDemoAction();
  const handle = onClick ?? (() => demoAction("Thẻ thành viên & Ưu đãi"));

  if (variant === "stamp") {
    return (
      <div className="px-4">
        <div
          onClick={handle}
          className="cursor-pointer rounded-2xl border border-gray-200/80 bg-white p-3.5 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-bold text-gray-900">Tích điểm thành viên</div>
              <div className="text-xs text-gray-500">{stampLabel}</div>
            </div>
            <span
              className="rounded-full px-2.5 py-0.5 text-xs font-bold"
              style={{ background: `${theme.primary}14`, color: theme.primary }}
            >
              {stampCurrent}/{stampTotal}
            </span>
          </div>
          <div className="mt-2.5 flex gap-1.5">
            {Array.from({ length: stampTotal }, (_, i) => {
              const done = i < stampCurrent;
              return (
                <div
                  key={i}
                  className="h-2 flex-1 rounded-full"
                  style={{ background: done ? theme.primary : "#e5e7eb" }}
                />
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4">
      <div className="rounded-2xl border border-gray-200/80 bg-white p-3.5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-bold text-gray-900">Thẻ thành viên</div>
            <div className="text-xs text-gray-500">{subtitle}</div>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
            <LuCrown size={13} className="text-amber-500" /> {tier}
          </span>
        </div>
        <div className="mt-2.5 flex items-center justify-between border-t border-gray-100 pt-2 text-xs">
          <button onClick={handle} className="font-medium text-gray-700">
            Xem thẻ ({points}) ›
          </button>
          <button
            onClick={() => demoAction("Kho voucher ưu đãi")}
            className="flex items-center gap-1 font-semibold"
            style={{ color: theme.primary }}
          >
            <LuGift size={13} /> Ưu đãi ›
          </button>
        </div>
      </div>
    </div>
  );
}

/** Thẻ Quan tâm Zalo Official Account. */
export function ZaloOACard({
  name,
  subtitle = "Quan tâm OA để nhận thông báo lịch hẹn & ưu đãi",
  logo = "💬",
  ctaLabel = "Quan tâm",
}: {
  name: string;
  subtitle?: string;
  logo?: ReactNode;
  ctaLabel?: string;
}) {
  const theme = useTplTheme();
  const demoAction = useDemoAction();

  return (
    <div className="px-4">
      <div className="flex items-center gap-3 rounded-2xl border border-gray-200/80 bg-white p-3 shadow-sm">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
          style={{ background: theme.primary }}
        >
          <SmartIcon token={logo} size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <span className="truncate text-xs font-bold text-gray-900">{name}</span>
            <RiVerifiedBadgeFill size={14} className="shrink-0 text-amber-500" />
          </div>
          <div className="line-clamp-1 text-[11px] text-gray-500">{subtitle}</div>
        </div>
        <button
          onClick={() => demoAction(`Quan tâm Zalo OA ${name}`)}
          className="shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold text-white"
          style={{ background: theme.primary }}
        >
          {ctaLabel}
        </button>
      </div>
    </div>
  );
}

/** Header FLASH SALE gọn gàng. */
export function FlashSaleHeader({
  onMore,
}: {
  subtitle?: string;
  onMore?: () => void;
}) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  const diff = Math.max(0, Math.floor((end.getTime() - now.getTime()) / 1000));
  const units = [
    String(Math.floor(diff / 3600)).padStart(2, "0"),
    String(Math.floor((diff % 3600) / 60)).padStart(2, "0"),
    String(diff % 60).padStart(2, "0"),
  ];

  return (
    <div className="flex items-center justify-between px-4">
      <div onClick={onMore} className="flex items-center gap-2">
        <div className="flex items-center gap-1 text-base font-black italic tracking-tight">
          <LuZap size={17} className="fill-[#e05246] text-[#e05246]" />
          <span className="text-gray-900">FLASH</span>
          <span className="text-[#e05246]">SALE</span>
        </div>
        <div className="flex items-center gap-1">
          {units.map((u, i) => (
            <span key={i} className="flex items-center gap-0.5">
              <span className="rounded bg-[#dc4c40] px-1.5 py-0.5 text-[11px] font-bold leading-4 text-white">
                {u}
              </span>
              {i < 2 && <span className="text-xs font-bold text-[#dc4c40]">:</span>}
            </span>
          ))}
        </div>
      </div>

      {onMore && (
        <button onClick={onMore} className="text-xs font-medium text-gray-500">
          Xem tất cả ›
        </button>
      )}
    </div>
  );
}

export function QtyStepper({ value, onChange, min = 0 }: { value: number; onChange: (v: number) => void; min?: number }) {
  return (
    <div className="flex items-center rounded-lg border border-gray-200 bg-white text-sm">
      <button className="px-2.5 py-1" onClick={() => onChange(Math.max(min, value - 1))}>
        −
      </button>
      <span className="w-6 text-center">{value}</span>
      <button className="px-2.5 py-1" onClick={() => onChange(value + 1)}>
        +
      </button>
    </div>
  );
}

export function AddButton({ onClick }: { onClick: () => void }) {
  const theme = useTplTheme();
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="flex h-7 w-7 items-center justify-center rounded-lg text-white shadow-sm active:scale-95"
      style={{ background: theme.primary }}
    >
      <LuPlus size={15} strokeWidth={2.5} />
    </button>
  );
}

export function ActionBar({ children, aboveNav }: { children: ReactNode; aboveNav?: boolean }) {
  return (
    <div
      className={`fixed inset-x-0 z-40 border-t border-gray-100 bg-white ${aboveNav ? "" : "safe-bottom"}`}
      style={{ bottom: aboveNav ? aboveSafeBottom(NAV_HEIGHT) : 0 }}
    >
      <div className="flex items-center gap-3 px-4 py-2.5">{children}</div>
    </div>
  );
}

export function PrimaryButton({
  children,
  onClick,
  outline,
  className = "",
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  outline?: boolean;
  className?: string;
  disabled?: boolean;
}) {
  const theme = useTplTheme();
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl px-5 py-3 text-sm font-semibold disabled:opacity-40 ${className}`}
      style={
        outline
          ? { border: `1px solid ${theme.primary}`, color: theme.primary, background: "#fff" }
          : { background: theme.primary, color: "#fff" }
      }
    >
      {children}
    </button>
  );
}

export function EmptyState({ emoji, text, action, onAction }: { emoji: string; text: string; action?: string; onAction?: () => void }) {
  const theme = useTplTheme();
  return (
    <div className="flex flex-col items-center gap-3 px-8 py-20 text-center">
      <div
        className="flex h-16 w-16 items-center justify-center rounded-full"
        style={{ background: `${theme.primary}15`, color: theme.primary }}
      >
        <SmartIcon token={emoji} size={30} />
      </div>
      <div className="text-sm text-gray-500">{text}</div>
      {action && (
        <PrimaryButton onClick={onAction} className="rounded-full px-6 py-2">
          {action}
        </PrimaryButton>
      )}
    </div>
  );
}

export function Card({ children, className = "", onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp onClick={onClick} className={`block w-full rounded-2xl border border-gray-200/80 bg-white p-3.5 text-left shadow-sm ${className}`}>
      {children}
    </Comp>
  );
}

export function Badge({ children, color }: { children: ReactNode; color: string }) {
  return (
    <span className="rounded-md px-2 py-0.5 text-[10px] font-semibold" style={{ background: `${color}18`, color }}>
      {cleanHeadingText(children)}
    </span>
  );
}
