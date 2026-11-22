import { useEffect, useMemo, useRef, useState } from "react";
import { LuBadgeCheck, LuChevronRight, LuMapPin, LuMessageCircle, LuPhone, LuQrCode, LuSearch, LuStar } from "react-icons/lu";
import { Icon } from "./icons";
import { FREEPIK_STOCK } from "./stock-images";
import type { Block, BlockItem, BuilderAuthConfig, BuilderTheme } from "./types";

export interface ProductLike {
  id: string;
  name: string;
  price: number;
  salePrice?: number | null;
  tag?: string;
  category?: string;
  imageUrl?: string;
  active?: boolean;
}

export interface DocumentLike {
  id: string;
  title: string;
  category: string;
  content: string;
  published?: boolean;
}

export interface VoucherLike {
  id: string;
  code: string;
  title: string;
  discountType: "percent" | "fixed" | "freeship";
  discountValue: number;
  minOrderValue: number;
  active?: boolean;
}

export interface RenderCtx {
  theme: BuilderTheme;
  products: ProductLike[];
  documents?: DocumentLike[];
  vouchers?: VoucherLike[];
  auth?: BuilderAuthConfig;
  isMemberLoggedIn?: boolean;
  onRequireMemberAuth?: (action: keyof BuilderAuthConfig["protectedActions"], reason: string) => boolean;
  onOpenMemberAuth?: (tab?: "login" | "register") => void;
  onMemberLogout?: () => void;
  /** Block này đang được chọn và đang ở chế độ chỉnh sửa → cho phép sửa text trực tiếp */
  editable: boolean;
  topInset?: number;
  capsuleInset?: boolean;
  selectedItemId?: string;
  onSelectItem: (itemId: string) => void;
  onEditProp: (key: "title" | "subtitle" | "ctaLabel" | "placeholder" | "eyebrow", value: string) => void;
  onEditItem: (itemId: string, key: keyof BlockItem, value: string) => void;
}

const PALETTE = ["#fde68a", "#bfdbfe", "#fecdd3", "#bbf7d0", "#ddd6fe", "#fed7aa", "#a5f3fc", "#e9d5ff"];
export const vnd = (n?: number | null) => (typeof n === "number" ? `${n.toLocaleString("vi-VN")}đ` : "");

/* ------------------------------------------------------------------ */
/* Inline editable text                                                */
/* ------------------------------------------------------------------ */
export function EditableText({
  value,
  editable,
  onCommit,
  className,
  style,
  placeholder,
}: {
  value?: string;
  editable: boolean;
  onCommit: (v: string) => void;
  className?: string;
  style?: React.CSSProperties;
  placeholder?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  if (!editable) {
    return (
      <span className={className} style={style}>
        {value || placeholder}
      </span>
    );
  }
  return (
    <span
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      className={`${className ?? ""} cursor-text rounded-[3px] outline-none ring-1 ring-dashed ring-sky-400/70 hover:bg-sky-400/10 focus:bg-white/90 focus:text-slate-900 focus:ring-2 focus:ring-sky-500`}
      style={style}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          (e.target as HTMLElement).blur();
        }
        if (e.key === "Escape") {
          if (ref.current) ref.current.innerText = value ?? "";
          (e.target as HTMLElement).blur();
        }
        e.stopPropagation();
      }}
      onBlur={(e) => {
        const next = e.currentTarget.innerText.trim();
        if (next !== (value ?? "")) onCommit(next);
      }}
    >
      {value || placeholder}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */
function useProducts(block: Block, ctx: RenderCtx, fallbackLimit = 4): BlockItem[] {
  const limit = block.props.limit ?? fallbackLimit;
  if (block.props.source === "manual" && block.props.items?.length) return block.props.items.slice(0, limit);
  const stockFallback = FREEPIK_STOCK.retail.products;
  const fromStore = ctx.products
    .filter((p) => p.active !== false)
    .slice(0, limit)
    .map((p, i) => ({
      id: `store_${p.id}`,
      label: p.name,
      sub: p.category,
      price: p.salePrice ?? p.price,
      oldPrice: p.salePrice ? p.price : undefined,
      badge: p.tag,
      image: p.imageUrl || stockFallback[i % stockFallback.length],
      color: PALETTE[i % PALETTE.length],
    }));
  if (fromStore.length) return fromStore;
  return Array.from({ length: limit }).map((_, i) => ({
    id: `demo_${i}`,
    label: ["Áo sơ mi Linen", "Đầm midi hoa nhí", "Set thời trang đen", "Túi mua sắm canvas", "Mũ bucket", "Bình giữ nhiệt"][i % 6],
    price: [329000, 489000, 559000, 199000, 159000, 219000][i % 6],
    oldPrice: i % 2 === 0 ? [429000, 0, 659000][i % 3] || undefined : undefined,
    badge: i === 0 ? "HOT" : undefined,
    image: stockFallback[i % stockFallback.length],
    color: PALETTE[i % PALETTE.length],
  }));
}

function SectionTitle({ block, ctx, right }: { block: Block; ctx: RenderCtx; right?: React.ReactNode }) {
  if (!block.props.title && !right && !block.props.showViewAll) return null;
  return (
    <div className="mb-2.5 flex items-center justify-between">
      <EditableText
        value={block.props.title}
        editable={ctx.editable}
        onCommit={(v) => ctx.onEditProp("title", v)}
        className="text-[15px] font-bold tracking-tight text-slate-900"
      />
      {right ??
        (block.props.showViewAll ? (
          <span className="flex items-center text-[11px] font-semibold" style={{ color: ctx.theme.primary }}>
            Xem tất cả <LuChevronRight size={13} />
          </span>
        ) : null)}
    </div>
  );
}

function ItemShell({
  item,
  ctx,
  className,
  style,
  children,
}: {
  item: BlockItem;
  ctx: RenderCtx;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const selected = ctx.selectedItemId === item.id;
  const isVirtual = item.id.startsWith("store_") || item.id.startsWith("demo_");
  return (
    <div
      className={`${className ?? ""} relative ${selected ? "outline outline-2 outline-offset-2 outline-fuchsia-500" : ""}`}
      style={style}
      onClick={(e) => {
        if (isVirtual) return;
        e.stopPropagation();
        ctx.onSelectItem(item.id);
      }}
    >
      {children}
    </div>
  );
}

function ProductThumb({ color, image, label, radius, height = 120 }: { color?: string; image?: string; label: string; radius: number; height?: number }) {
  const [imgFailed, setImgFailed] = useState(false);
  if (image && !imgFailed) {
    return (
      <div className="relative overflow-hidden bg-slate-100" style={{ height, borderRadius: radius }}>
        <img
          src={image}
          alt={label}
          loading="lazy"
          onError={() => setImgFailed(true)}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }
  return (
    <div
      className="relative overflow-hidden"
      style={{
        height,
        borderRadius: radius,
        background: `radial-gradient(circle at 70% 25%, #ffffffaa 0, transparent 38%), linear-gradient(145deg, ${color ?? "#e2e8f0"}, ${color ?? "#e2e8f0"}88)`,
      }}
    >
      <div className="absolute -bottom-6 -left-4 h-20 w-20 rounded-full bg-white/30" />
      <div className="absolute right-3 top-3 h-8 w-8 rounded-full bg-white/40" />
      <div className="absolute inset-0 flex items-center justify-center text-3xl font-black text-white/80 drop-shadow-sm">
        {label.slice(0, 1).toUpperCase()}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Block renderers                                                      */
/* ------------------------------------------------------------------ */
function HeaderBlock({ block, ctx }: { block: Block; ctx: RenderCtx }) {
  const { theme } = ctx;
  const v = block.props.variant ?? "pastel";
  const isSolid = v === "solid";
  const isPastel = v === "pastel";
  const verified = block.props.verified !== false;
  const bgStyle: React.CSSProperties = isSolid
    ? {
        backgroundColor: theme.primary,
        backgroundImage: `linear-gradient(135deg, ${theme.primary}, ${theme.accent})`,
      }
    : isPastel
      ? {
          backgroundColor: "#ffffff",
          backgroundImage: `linear-gradient(180deg, ${theme.primary}22 0%, ${theme.primary}0a 100%)`,
        }
      : { backgroundColor: "#ffffff" };

  return (
    <div
      className="border-b border-black/[0.04]"
      style={{
        ...bgStyle,
        paddingTop: (ctx.topInset ?? 0) + 8,
        paddingBottom: 11,
        paddingLeft: 16,
        paddingRight: ctx.capsuleInset ? 104 : 16,
      }}
    >
      <div className="flex items-center gap-2.5">
        {block.props.logoUrl ? (
          <img
            src={block.props.logoUrl}
            alt={block.props.title || "Logo"}
            className="h-10 w-10 shrink-0 rounded-xl border border-black/5 bg-white object-cover shadow-sm"
          />
        ) : (
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-black/5 bg-white text-[16px] font-black shadow-sm"
            style={{ color: theme.primary }}
          >
            {(block.props.title || "S").slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1 leading-tight">
          <div className="flex items-center gap-1">
            <EditableText
              value={block.props.title}
              editable={ctx.editable}
              onCommit={(val) => ctx.onEditProp("title", val)}
              className="truncate text-[15px] font-bold tracking-tight"
              style={{ color: isSolid ? "#ffffff" : "#111827" }}
            />
            {verified && (
              <LuBadgeCheck
                size={15}
                className="shrink-0"
                style={{ color: isSolid ? "#ffffff" : "#2563eb" }}
              />
            )}
          </div>
          <EditableText
            value={block.props.subtitle}
            editable={ctx.editable}
            onCommit={(val) => ctx.onEditProp("subtitle", val)}
            className={`mt-0.5 block truncate text-[11px] ${isSolid ? "text-white/80" : "text-slate-500"}`}
          />
        </div>
      </div>
    </div>
  );
}

function SearchBlock({ block, ctx }: { block: Block; ctx: RenderCtx }) {
  return (
    <div className="px-4 py-2">
      <div className="flex items-center gap-2 rounded-full border border-slate-200/80 bg-white px-3.5 py-2.5 text-slate-400 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <LuSearch size={16} />
        <EditableText
          value={block.props.placeholder}
          editable={ctx.editable}
          onCommit={(v) => ctx.onEditProp("placeholder", v)}
          className="flex-1 text-[13px]"
        />
        <LuQrCode size={16} style={{ color: ctx.theme.primary }} />
      </div>
    </div>
  );
}

function NoticeBlock({ block, ctx }: { block: Block; ctx: RenderCtx }) {
  return (
    <div className="px-4 py-2">
      <div className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[12px] font-medium" style={{ background: `${ctx.theme.accent}22`, color: "#7c2d12" }}>
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full" style={{ background: ctx.theme.accent, color: "#fff" }}>
          <Icon name="megaphone" size={13} />
        </span>
        <EditableText value={block.props.title} editable={ctx.editable} onCommit={(v) => ctx.onEditProp("title", v)} className="flex-1 leading-snug" />
      </div>
    </div>
  );
}

function BannerBlock({ block, ctx }: { block: Block; ctx: RenderCtx }) {
  const slides = block.props.items ?? [];
  const [idx, setIdx] = useState(0);
  const height = block.props.height ?? 150;
  const radius = block.props.radius ?? 18;
  const variant = block.props.variant ?? "editorial";

  useEffect(() => {
    if (!block.props.autoplay || slides.length < 2 || ctx.editable) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % slides.length), 3500);
    return () => clearInterval(t);
  }, [block.props.autoplay, slides.length, ctx.editable]);

  useEffect(() => {
    if (ctx.selectedItemId) {
      const i = slides.findIndex((s) => s.id === ctx.selectedItemId);
      if (i >= 0) setIdx(i);
    }
  }, [ctx.selectedItemId, slides]);

  const current = Math.min(idx, Math.max(slides.length - 1, 0));
  if (!slides.length) {
    return <div className="mx-4 my-2 flex items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 text-xs text-slate-400" style={{ height }}>Thêm slide ở bảng thuộc tính</div>;
  }

  return (
    <div className={variant === "poster" ? "py-2" : "px-4 py-2"}>
      <div className="relative overflow-hidden" style={{ height, borderRadius: variant === "poster" ? 0 : radius }}>
        <div className="flex h-full transition-transform duration-500 ease-out" style={{ transform: `translateX(-${current * 100}%)` }}>
          {slides.map((s) => {
            const hasText = Boolean(s.badge || s.label || s.sub);
            return (
              <ItemShell
                key={s.id}
                item={s}
                ctx={ctx}
                className="relative h-full w-full shrink-0 overflow-hidden"
                style={{
                  background: s.image
                    ? "#0f172a"
                    : `linear-gradient(120deg, ${s.color ?? ctx.theme.primary}, ${s.colorTo ?? ctx.theme.accent})`,
                }}
              >
                {s.image ? (
                  <>
                    <img src={s.image} alt={s.label || "Slide"} className="absolute inset-0 h-full w-full object-cover" />
                    {hasText && (
                      <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/30 to-transparent" />
                    )}
                  </>
                ) : (
                  <>
                    <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/15" />
                    <div className="absolute -bottom-14 right-10 h-32 w-32 rounded-full bg-white/10" />
                    {variant === "split" && <div className="absolute bottom-0 right-0 top-0 w-[42%] bg-white/15 backdrop-blur-[1px]" />}
                  </>
                )}
                {hasText && (
                  <div className={`relative flex h-full flex-col justify-center p-4 text-white ${variant === "split" ? "w-[60%]" : "w-[78%]"}`}>
                    {s.badge && (
                      <span className="mb-1.5 w-fit rounded-full bg-white/25 px-2 py-0.5 text-[9px] font-extrabold tracking-[0.12em]">
                        <EditableText value={s.badge} editable={ctx.editable && ctx.selectedItemId === s.id} onCommit={(v) => ctx.onEditItem(s.id, "badge", v)} />
                      </span>
                    )}
                    {s.label && (
                      <EditableText
                        value={s.label}
                        editable={ctx.editable && ctx.selectedItemId === s.id}
                        onCommit={(v) => ctx.onEditItem(s.id, "label", v)}
                        className="text-[18px] font-extrabold leading-tight tracking-tight drop-shadow-sm"
                      />
                    )}
                    {s.sub && (
                      <EditableText
                        value={s.sub}
                        editable={ctx.editable && ctx.selectedItemId === s.id}
                        onCommit={(v) => ctx.onEditItem(s.id, "sub", v)}
                        className="mt-1 text-[11.5px] leading-snug text-white/90 drop-shadow-sm"
                      />
                    )}
                    <span className="mt-2.5 w-fit rounded-full bg-white px-3 py-1 text-[10.5px] font-bold shadow-sm" style={{ color: s.color ?? ctx.theme.primary }}>
                      Khám phá ngay
                    </span>
                  </div>
                )}
              </ItemShell>
            );
          })}
        </div>
        {slides.length > 1 && (
          <div className="absolute bottom-2.5 left-0 right-0 flex justify-center gap-1">
            {slides.map((s, i) => (
              <span
                key={s.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setIdx(i);
                }}
                className="h-1.5 cursor-pointer rounded-full bg-white transition-all"
                style={{ width: i === current ? 16 : 6, opacity: i === current ? 1 : 0.55 }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function QuickActionsBlock({ block, ctx }: { block: Block; ctx: RenderCtx }) {
  const cols = block.props.columns ?? 4;
  const variant = block.props.variant ?? "soft";
  return (
    <div className="px-4 py-2">
      {block.props.title ? <SectionTitle block={block} ctx={ctx} /> : null}
      <div className="grid gap-y-3.5 rounded-2xl bg-white px-2 py-3.5 shadow-[0_1px_3px_rgba(15,23,42,0.05)]" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {(block.props.items ?? []).map((it) => {
          const color = it.color ?? ctx.theme.primary;
          const boxStyle: React.CSSProperties =
            variant === "solid"
              ? { background: color, color: "#fff" }
              : variant === "outline"
                ? { border: `1.5px solid ${color}55`, color }
                : { background: `${color}1a`, color };
          return (
            <ItemShell key={it.id} item={it} ctx={ctx} className="flex cursor-pointer flex-col items-center gap-1.5 rounded-xl">
              <div className="flex h-11 w-11 items-center justify-center rounded-[14px]" style={boxStyle}>
                <Icon name={it.icon} size={20} />
              </div>
              <EditableText
                value={it.label}
                editable={ctx.editable && ctx.selectedItemId === it.id}
                onCommit={(v) => ctx.onEditItem(it.id, "label", v)}
                className="max-w-full truncate px-0.5 text-center text-[11px] font-medium text-slate-700"
              />
            </ItemShell>
          );
        })}
      </div>
    </div>
  );
}

function CategoriesBlock({ block, ctx }: { block: Block; ctx: RenderCtx }) {
  const list = block.props.items ?? [];
  return (
    <div className="py-2">
      {block.props.title ? (
        <div className="px-4">
          <SectionTitle block={block} ctx={ctx} />
        </div>
      ) : null}
      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4">
        {list.map((it, i) => (
          <ItemShell
            key={it.id}
            item={it}
            ctx={ctx}
            className="shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-semibold"
            style={i === 0 ? { background: ctx.theme.primary, color: "#fff" } : { background: "#fff", color: "#334155", border: "1px solid #e2e8f0" }}
          >
            <EditableText value={it.label} editable={ctx.editable && ctx.selectedItemId === it.id} onCommit={(v) => ctx.onEditItem(it.id, "label", v)} />
          </ItemShell>
        ))}
      </div>
    </div>
  );
}

function useCountdown(minutes: number) {
  const end = useMemo(() => Date.now() + minutes * 60_000, [minutes]);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const left = Math.max(0, end - now);
  const h = Math.floor(left / 3_600_000);
  const m = Math.floor((left % 3_600_000) / 60_000);
  const s = Math.floor((left % 60_000) / 1000);
  return [h, m, s].map((x) => String(x).padStart(2, "0"));
}

function FlashSaleBlock({ block, ctx }: { block: Block; ctx: RenderCtx }) {
  const list = useProducts(block, ctx, 6);
  const [h, m, s] = useCountdown(block.props.endsInMinutes ?? 120);
  return (
    <div className="px-4 py-2">
      <div className="rounded-2xl p-3" style={{ background: `linear-gradient(135deg, #fff1f2, ${ctx.theme.accent}22)` }}>
        <div className="mb-2.5 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Icon name="zap" size={16} className="text-rose-500" />
            <EditableText
              value={block.props.title}
              editable={ctx.editable}
              onCommit={(v) => ctx.onEditProp("title", v)}
              className="text-[15px] font-black italic tracking-tight text-rose-600"
            />
          </div>
          <div className="flex items-center gap-1 text-[11px] font-bold text-white">
            {[h, m, s].map((x, i) => (
              <span key={i} className="flex items-center gap-1">
                <span className="rounded-md bg-slate-900 px-1.5 py-0.5 tabular-nums">{x}</span>
                {i < 2 && <span className="text-slate-900">:</span>}
              </span>
            ))}
          </div>
        </div>
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
          {list.map((p, i) => {
            const pct = p.oldPrice && p.price ? Math.round((1 - p.price / p.oldPrice) * 100) : 0;
            const sold = 35 + ((i * 17) % 55);
            return (
              <div key={p.id} className="w-[104px] shrink-0 rounded-xl bg-white p-1.5 shadow-sm">
                <div className="relative">
                  <ProductThumb color={p.color} image={p.image} label={p.label} radius={10} height={86} />
                  {pct > 0 && <span className="absolute left-1 top-1 rounded bg-rose-500 px-1 text-[9px] font-bold text-white">-{pct}%</span>}
                </div>
                <div className="mt-1.5 truncate text-[11px] font-semibold text-slate-800">{p.label}</div>
                <div className="text-[12px] font-extrabold text-rose-600">{vnd(p.price)}</div>
                <div className="relative mt-1 h-3.5 overflow-hidden rounded-full bg-rose-100">
                  <div className="h-full rounded-full bg-gradient-to-r from-rose-500 to-orange-400" style={{ width: `${sold}%` }} />
                  <span className="absolute inset-0 flex items-center justify-center text-[8.5px] font-bold text-white">Đã bán {sold}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ProductGridBlock({ block, ctx }: { block: Block; ctx: RenderCtx }) {
  const list = useProducts(block, ctx, 4);
  const cols = block.props.columns ?? 2;
  const variant = block.props.variant ?? "editorial";
  const r = ctx.theme.radius;
  return (
    <div className="px-4 py-2">
      <SectionTitle block={block} ctx={ctx} />
      <div className="grid gap-2.5" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {list.map((p) => (
          <ItemShell
            key={p.id}
            item={p}
            ctx={ctx}
            className={variant === "minimal" ? "" : "overflow-hidden bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)]"}
            style={{ borderRadius: r }}
          >
            <div className={variant === "minimal" ? "" : "p-1.5"}>
              <div className="relative">
                <ProductThumb color={p.color} image={p.image} label={p.label} radius={Math.max(r - 4, 6)} height={cols === 3 ? 88 : variant === "poster" ? 170 : 132} />
                {p.badge && <span className="absolute left-1.5 top-1.5 rounded-full bg-slate-900/85 px-2 py-0.5 text-[9px] font-bold text-white">{p.badge}</span>}
                <span className="absolute bottom-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-slate-500 shadow-sm">
                  <Icon name="heart" size={12} />
                </span>
              </div>
            </div>
            <div className={variant === "minimal" ? "pt-1.5" : "px-2 pb-2.5"}>
              <EditableText
                value={p.label}
                editable={ctx.editable && ctx.selectedItemId === p.id}
                onCommit={(v) => ctx.onEditItem(p.id, "label", v)}
                className="line-clamp-2 text-[12px] font-semibold leading-snug text-slate-800"
              />
              <div className="mt-1 flex items-end justify-between">
                <div>
                  <div className="text-[13px] font-extrabold" style={{ color: ctx.theme.primary }}>
                    {vnd(p.price)}
                  </div>
                  {p.oldPrice ? <div className="text-[10px] text-slate-400 line-through">{vnd(p.oldPrice)}</div> : null}
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    if (ctx.editable) return;
                    e.stopPropagation();
                    ctx.onRequireMemberAuth?.("checkout", "Thêm sản phẩm & đặt hàng");
                  }}
                  className="flex h-6 w-6 items-center justify-center rounded-full text-sm font-bold text-white"
                  style={{ background: ctx.theme.primary }}
                >
                  +
                </button>
              </div>
            </div>
          </ItemShell>
        ))}
      </div>
    </div>
  );
}

function ProductListBlock({ block, ctx }: { block: Block; ctx: RenderCtx }) {
  const list = useProducts(block, ctx, 3);
  return (
    <div className="px-4 py-2">
      <SectionTitle block={block} ctx={ctx} />
      <div className="space-y-2">
        {list.map((p) => (
          <ItemShell key={p.id} item={p} ctx={ctx} className="flex items-center gap-3 bg-white p-2 shadow-[0_1px_3px_rgba(15,23,42,0.05)]" style={{ borderRadius: ctx.theme.radius }}>
            <div className="w-[68px] shrink-0">
              <ProductThumb color={p.color} image={p.image} label={p.label} radius={Math.max(ctx.theme.radius - 4, 8)} height={68} />
            </div>
            <div className="min-w-0 flex-1">
              <EditableText
                value={p.label}
                editable={ctx.editable && ctx.selectedItemId === p.id}
                onCommit={(v) => ctx.onEditItem(p.id, "label", v)}
                className="block truncate text-[13px] font-bold text-slate-900"
              />
              {p.sub && <div className="truncate text-[11px] text-slate-500">{p.sub}</div>}
              <div className="mt-1 flex items-center gap-1 text-[10px] text-amber-500">
                <LuStar size={11} className="fill-amber-400" /> 4.9 <span className="text-slate-400">(120+)</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <span className="text-[13px] font-extrabold" style={{ color: ctx.theme.primary }}>
                {vnd(p.price)}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  if (ctx.editable) return;
                  e.stopPropagation();
                  ctx.onRequireMemberAuth?.("checkout", "Chọn dịch vụ & đặt hàng");
                }}
                className="rounded-full px-2.5 py-1 text-[10.5px] font-bold text-white"
                style={{ background: ctx.theme.primary }}
              >
                {block.props.ctaLabel || "Chọn"}
              </button>
            </div>
          </ItemShell>
        ))}
      </div>
    </div>
  );
}

function MemberCardBlock({ block, ctx }: { block: Block; ctx: RenderCtx }) {
  const v = block.props.variant ?? "vip";
  const { theme } = ctx;
  if (v === "stamp") {
    return (
      <div className="px-4 py-2">
        <div className="rounded-2xl border border-dashed bg-white p-3.5" style={{ borderColor: `${theme.primary}55` }}>
          <div className="flex items-center justify-between">
            <div>
              <EditableText value={block.props.title} editable={ctx.editable} onCommit={(x) => ctx.onEditProp("title", x)} className="block text-[14px] font-extrabold text-slate-900" />
              <EditableText value={block.props.subtitle} editable={ctx.editable} onCommit={(x) => ctx.onEditProp("subtitle", x)} className="block text-[11px] text-slate-500" />
            </div>
            <span className="rounded-full px-3 py-1.5 text-[11px] font-bold text-white" style={{ background: theme.primary }}>
              <EditableText value={block.props.ctaLabel} editable={ctx.editable} onCommit={(x) => ctx.onEditProp("ctaLabel", x)} />
            </span>
          </div>
          <div className="mt-3 grid grid-cols-5 gap-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="flex aspect-square items-center justify-center rounded-full text-white"
                style={i < 6 ? { background: theme.primary } : { background: "#f1f5f9", color: "#cbd5e1" }}
              >
                <Icon name="coffee" size={14} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  const vip = v === "vip";
  return (
    <div className="px-4 py-2">
      <div
        className="relative overflow-hidden rounded-[20px] p-4"
        style={{
          background: vip ? `linear-gradient(135deg, #0f172a, ${theme.primary})` : "#ffffff",
          color: vip ? "#fff" : "#0f172a",
          boxShadow: vip ? "0 10px 24px -12px rgba(15,23,42,0.6)" : "0 1px 3px rgba(15,23,42,0.06)",
        }}
      >
        {vip && <div className="absolute -right-8 -top-12 h-36 w-36 rounded-full" style={{ background: `${theme.accent}55` }} />}
        <div className="relative flex items-start justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] opacity-70">
              <Icon name="crown" size={12} /> Membership
            </div>
            <EditableText value={block.props.title} editable={ctx.editable} onCommit={(x) => ctx.onEditProp("title", x)} className="mt-1 block text-[17px] font-extrabold" />
            <EditableText value={block.props.subtitle} editable={ctx.editable} onCommit={(x) => ctx.onEditProp("subtitle", x)} className="block text-[11.5px] opacity-80" />
          </div>
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${vip ? "bg-white text-slate-900" : "bg-slate-100"}`}>
            <LuQrCode size={26} />
          </div>
        </div>
        <div className="relative mt-3.5">
          <div className={`h-1.5 overflow-hidden rounded-full ${vip ? "bg-white/20" : "bg-slate-100"}`}>
            <div className="h-full w-[68%] rounded-full" style={{ background: theme.accent }} />
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[10.5px] opacity-80">
            <span>Còn 750 điểm lên hạng tiếp theo</span>
            <span
              onClick={(e) => {
                if (ctx.editable) return;
                e.stopPropagation();
                ctx.onRequireMemberAuth?.("memberCard", "Đổi quà & dùng ưu đãi hội viên");
              }}
              className="cursor-pointer rounded-full px-2 py-0.5 font-bold"
              style={{ background: vip ? "rgba(255,255,255,0.15)" : `${theme.primary}14`, color: vip ? "#fff" : theme.primary }}
            >
              <EditableText value={block.props.ctaLabel} editable={ctx.editable} onCommit={(x) => ctx.onEditProp("ctaLabel", x)} />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function BookingBlock({ block, ctx }: { block: Block; ctx: RenderCtx }) {
  const days = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
  const today = new Date();
  return (
    <div className="px-4 py-2">
      <div className="rounded-2xl bg-white p-3.5 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
        <EditableText value={block.props.title} editable={ctx.editable} onCommit={(x) => ctx.onEditProp("title", x)} className="block text-[15px] font-bold text-slate-900" />
        <EditableText value={block.props.subtitle} editable={ctx.editable} onCommit={(x) => ctx.onEditProp("subtitle", x)} className="block text-[11px] text-slate-500" />
        <div className="mt-3 grid grid-cols-7 gap-1.5">
          {days.map((d, i) => {
            const date = new Date(today.getTime() + i * 86_400_000).getDate();
            const active = i === 0;
            return (
              <div key={d} className="flex flex-col items-center rounded-xl py-1.5 text-[10px]" style={active ? { background: ctx.theme.primary, color: "#fff" } : { background: "#f8fafc", color: "#475569" }}>
                <span className="opacity-75">{d}</span>
                <span className="text-[13px] font-bold">{date}</span>
              </div>
            );
          })}
        </div>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {(block.props.items ?? []).map((it, i) => (
            <ItemShell
              key={it.id}
              item={it}
              ctx={ctx}
              className="rounded-lg border px-2.5 py-1 text-[11px] font-semibold"
              style={i === 1 ? { borderColor: ctx.theme.primary, color: ctx.theme.primary, background: `${ctx.theme.primary}0f` } : { borderColor: "#e2e8f0", color: "#475569" }}
            >
              <EditableText value={it.label} editable={ctx.editable && ctx.selectedItemId === it.id} onCommit={(v) => ctx.onEditItem(it.id, "label", v)} />
            </ItemShell>
          ))}
        </div>
        <div
          onClick={(e) => {
            if (ctx.editable) return;
            e.stopPropagation();
            ctx.onRequireMemberAuth?.("booking", "Đặt lịch hẹn");
          }}
          className="mt-3 cursor-pointer rounded-xl py-2.5 text-center text-[13px] font-bold text-white"
          style={{ background: ctx.theme.primary }}
        >
          <EditableText value={block.props.ctaLabel} editable={ctx.editable} onCommit={(x) => ctx.onEditProp("ctaLabel", x)} />
        </div>
      </div>
    </div>
  );
}

function NewsBlock({ block, ctx }: { block: Block; ctx: RenderCtx }) {
  return (
    <div className="px-4 py-2">
      <SectionTitle block={block} ctx={ctx} />
      <div className="space-y-2">
        {(block.props.items ?? []).map((it) => (
          <ItemShell key={it.id} item={it} ctx={ctx} className="flex gap-3 rounded-2xl bg-white p-2 shadow-[0_1px_3px_rgba(15,23,42,0.05)]">
            <div className="h-[64px] w-[84px] shrink-0 overflow-hidden rounded-xl" style={{ background: `linear-gradient(135deg, ${it.color ?? ctx.theme.primary}, ${it.color ?? ctx.theme.primary}88)` }}>
              {it.image ? (
                <img src={it.image} alt={it.label} loading="lazy" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-white/80">
                  <Icon name="news" size={22} />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1 py-0.5">
              <EditableText
                value={it.label}
                editable={ctx.editable && ctx.selectedItemId === it.id}
                onCommit={(v) => ctx.onEditItem(it.id, "label", v)}
                className="line-clamp-2 text-[12.5px] font-semibold leading-snug text-slate-900"
              />
              <div className="mt-1 text-[10.5px] text-slate-400">{it.sub}</div>
            </div>
          </ItemShell>
        ))}
      </div>
    </div>
  );
}

function FormBlock({ block, ctx }: { block: Block; ctx: RenderCtx }) {
  return (
    <div className="px-4 py-2">
      <div className="rounded-2xl bg-white p-3.5 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
        <EditableText value={block.props.title} editable={ctx.editable} onCommit={(x) => ctx.onEditProp("title", x)} className="block text-[15px] font-bold text-slate-900" />
        <EditableText value={block.props.subtitle} editable={ctx.editable} onCommit={(x) => ctx.onEditProp("subtitle", x)} className="block text-[11px] text-slate-500" />
        <div className="mt-3 space-y-2.5">
          {(block.props.items ?? []).map((it) => (
            <ItemShell key={it.id} item={it} ctx={ctx} className="rounded-lg">
              <EditableText
                value={it.label}
                editable={ctx.editable && ctx.selectedItemId === it.id}
                onCommit={(v) => ctx.onEditItem(it.id, "label", v)}
                className="mb-1 block text-[11px] font-semibold text-slate-600"
              />
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[12px] text-slate-400">{it.sub}</div>
            </ItemShell>
          ))}
        </div>
        <div
          onClick={(e) => {
            if (ctx.editable) return;
            e.stopPropagation();
            ctx.onRequireMemberAuth?.("form", "Gửi biểu mẫu / hồ sơ");
          }}
          className="mt-3.5 cursor-pointer rounded-xl py-2.5 text-center text-[13px] font-bold text-white"
          style={{ background: ctx.theme.primary }}
        >
          <EditableText value={block.props.ctaLabel} editable={ctx.editable} onCommit={(x) => ctx.onEditProp("ctaLabel", x)} />
        </div>
      </div>
    </div>
  );
}

function ProfileBlock({ block, ctx }: { block: Block; ctx: RenderCtx }) {
  return (
    <div
      className="px-4 pb-3"
      style={{ paddingTop: 16 + (ctx.topInset ?? 0), background: `linear-gradient(180deg, ${ctx.theme.primary}22, transparent)` }}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-full text-lg font-black text-white ring-4 ring-white" style={{ background: ctx.theme.primary }}>
          {(block.props.title ?? "U").slice(0, 1)}
        </div>
        <div className="min-w-0">
          <EditableText value={block.props.title} editable={ctx.editable} onCommit={(x) => ctx.onEditProp("title", x)} className="block text-[16px] font-extrabold text-slate-900" />
          <EditableText value={block.props.subtitle} editable={ctx.editable} onCommit={(x) => ctx.onEditProp("subtitle", x)} className="block text-[11.5px] text-slate-500" />
        </div>
      </div>
    </div>
  );
}

function MenuListBlock({ block, ctx }: { block: Block; ctx: RenderCtx }) {
  return (
    <div className="px-4 py-2">
      {block.props.title ? <SectionTitle block={block} ctx={ctx} /> : null}
      <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl bg-white shadow-[0_1px_3px_rgba(15,23,42,0.05)]">
        {(block.props.items ?? []).map((it) => (
          <ItemShell key={it.id} item={it} ctx={ctx} className="flex items-center gap-3 px-3 py-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: `${it.color ?? ctx.theme.primary}1a`, color: it.color ?? ctx.theme.primary }}>
              <Icon name={it.icon} size={16} />
            </span>
            <EditableText
              value={it.label}
              editable={ctx.editable && ctx.selectedItemId === it.id}
              onCommit={(v) => ctx.onEditItem(it.id, "label", v)}
              className="flex-1 text-[13px] font-medium text-slate-800"
            />
            {it.sub && <span className="text-[11px] text-slate-400">{it.sub}</span>}
            <LuChevronRight size={15} className="text-slate-300" />
          </ItemShell>
        ))}
      </div>
    </div>
  );
}

function ContactBlock({ block, ctx }: { block: Block; ctx: RenderCtx }) {
  return (
    <div className="px-4 py-2">
      <div className="overflow-hidden rounded-2xl bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
        <div className="relative h-24 overflow-hidden bg-[#e5efe6]">
          <div className="absolute inset-0 opacity-60" style={{ backgroundImage: "linear-gradient(#cbd5c0 1px, transparent 1px), linear-gradient(90deg, #cbd5c0 1px, transparent 1px)", backgroundSize: "22px 22px" }} />
          <div className="absolute left-0 right-0 top-10 h-3 rotate-[-8deg] bg-white/90" />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full" style={{ color: ctx.theme.primary }}>
            <LuMapPin size={28} className="drop-shadow" />
          </div>
        </div>
        <div className="p-3.5">
          <EditableText value={block.props.title} editable={ctx.editable} onCommit={(x) => ctx.onEditProp("title", x)} className="block text-[14px] font-bold text-slate-900" />
          <EditableText value={block.props.subtitle} editable={ctx.editable} onCommit={(x) => ctx.onEditProp("subtitle", x)} className="mt-0.5 block text-[11.5px] text-slate-500" />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="flex items-center justify-center gap-1.5 rounded-xl py-2 text-[12px] font-bold text-white" style={{ background: ctx.theme.primary }}>
              <LuPhone size={14} />
              <EditableText value={block.props.ctaLabel} editable={ctx.editable} onCommit={(x) => ctx.onEditProp("ctaLabel", x)} />
            </div>
            <div className="flex items-center justify-center gap-1.5 rounded-xl bg-[#0068ff]/10 py-2 text-[12px] font-bold text-[#0068ff]">
              <LuMessageCircle size={14} /> Chat Zalo OA
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const DOC_CATEGORY_STYLE: Record<string, { icon: string; color: string }> = {
  warranty: { icon: "shield", color: "#2563eb" },
  return: { icon: "receipt", color: "#f97316" },
  payment: { icon: "wallet", color: "#10b981" },
  notice: { icon: "megaphone", color: "#eab308" },
  terms: { icon: "file", color: "#8b5cf6" },
  privacy: { icon: "badge", color: "#06b6d4" },
  guide: { icon: "help", color: "#0ea5e9" },
};

function PolicyListBlock({ block, ctx }: { block: Block; ctx: RenderCtx }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const limit = block.props.limit ?? 6;
  const variant = block.props.variant ?? "accordion";

  const items: BlockItem[] =
    block.props.source === "manual"
      ? (block.props.items ?? []).slice(0, limit)
      : ctx.documents?.filter((d) => d.published !== false).length
        ? ctx.documents
            .filter((d) => d.published !== false)
            .slice(0, limit)
            .map((d) => {
              const st = DOC_CATEGORY_STYLE[d.category] ?? { icon: "file", color: ctx.theme.primary };
              return {
                id: `store_doc_${d.id}`,
                label: d.title,
                sub: d.content,
                icon: st.icon,
                color: st.color,
              };
            })
        : (block.props.items ?? []).slice(0, limit);

  if (variant === "cards") {
    return (
      <div className="px-4 py-2">
        {block.props.title ? <SectionTitle block={block} ctx={ctx} /> : null}
        <div className="grid grid-cols-2 gap-2">
          {items.map((it) => (
            <ItemShell
              key={it.id}
              item={it}
              ctx={ctx}
              className="rounded-2xl bg-white p-3 shadow-[0_1px_3px_rgba(15,23,42,0.05)]"
            >
              <span
                className="flex h-8 w-8 items-center justify-center rounded-xl"
                style={{ background: `${it.color ?? ctx.theme.primary}1a`, color: it.color ?? ctx.theme.primary }}
              >
                <Icon name={it.icon || "shield"} size={16} />
              </span>
              <EditableText
                value={it.label}
                editable={ctx.editable && ctx.selectedItemId === it.id}
                onCommit={(v) => ctx.onEditItem(it.id, "label", v)}
                className="mt-2 block line-clamp-2 text-[12px] font-bold leading-snug text-slate-900"
              />
              {it.sub && <div className="mt-1 line-clamp-2 text-[10.5px] leading-snug text-slate-500">{it.sub}</div>}
            </ItemShell>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-2">
      {block.props.title ? <SectionTitle block={block} ctx={ctx} /> : null}
      <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl bg-white shadow-[0_1px_3px_rgba(15,23,42,0.05)]">
        {items.map((it) => {
          const isOpen = variant === "accordion" && openId === it.id;
          return (
            <ItemShell key={it.id} item={it} ctx={ctx}>
              <div
                className="flex cursor-pointer items-center gap-3 px-3 py-3"
                onClick={(e) => {
                  if (variant !== "accordion") return;
                  if (!ctx.editable) e.stopPropagation();
                  setOpenId((prev) => (prev === it.id ? null : it.id));
                }}
              >
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                  style={{ background: `${it.color ?? ctx.theme.primary}1a`, color: it.color ?? ctx.theme.primary }}
                >
                  <Icon name={it.icon || "shield"} size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <EditableText
                    value={it.label}
                    editable={ctx.editable && ctx.selectedItemId === it.id}
                    onCommit={(v) => ctx.onEditItem(it.id, "label", v)}
                    className="block truncate text-[12.5px] font-semibold text-slate-800"
                  />
                  {variant === "list" && it.sub && (
                    <div className="truncate text-[10.5px] text-slate-400">{it.sub}</div>
                  )}
                </div>
                <LuChevronRight
                  size={15}
                  className={`shrink-0 text-slate-300 transition-transform ${isOpen ? "rotate-90 text-slate-600" : ""}`}
                />
              </div>
              {isOpen && it.sub && (
                <div className="border-t border-slate-100 bg-slate-50/70 px-3.5 py-2.5 whitespace-pre-line text-[11px] leading-relaxed text-slate-600">
                  {it.sub}
                </div>
              )}
            </ItemShell>
          );
        })}
      </div>
    </div>
  );
}

function VoucherListBlock({ block, ctx }: { block: Block; ctx: RenderCtx }) {
  const [savedIds, setSavedIds] = useState<Record<string, boolean>>({});
  const limit = block.props.limit ?? 4;
  const items: BlockItem[] =
    block.props.source === "manual"
      ? (block.props.items ?? []).slice(0, limit)
      : ctx.vouchers?.filter((v) => v.active !== false).length
        ? ctx.vouchers
            .filter((v) => v.active !== false)
            .slice(0, limit)
            .map((v) => ({
              id: `store_vc_${v.id}`,
              label: v.code,
              sub: `${v.title} · Đơn từ ${v.minOrderValue.toLocaleString("vi-VN")}đ`,
              badge:
                v.discountType === "percent"
                  ? `-${v.discountValue}%`
                  : v.discountType === "freeship"
                    ? "FREE"
                    : `-${Math.round(v.discountValue / 1000)}K`,
              color:
                v.discountType === "freeship"
                  ? "#10b981"
                  : v.discountType === "percent"
                    ? "#f59e0b"
                    : ctx.theme.primary,
            }))
        : (block.props.items ?? []).slice(0, limit);

  return (
    <div className="px-4 py-2">
      {block.props.title ? <SectionTitle block={block} ctx={ctx} /> : null}
      <div className="space-y-2">
        {items.map((it) => {
          const isSaved = !!savedIds[it.id];
          const color = it.color ?? ctx.theme.primary;
          return (
            <ItemShell
              key={it.id}
              item={it}
              ctx={ctx}
              className="flex overflow-hidden rounded-2xl bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)]"
            >
              <div
                className="flex w-[74px] shrink-0 flex-col items-center justify-center border-r border-dashed border-white/40 px-2 py-3 text-white"
                style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}
              >
                <Icon name="ticket" size={16} />
                <span className="mt-1 text-[12px] font-black tracking-tight">{it.badge || "SALE"}</span>
              </div>
              <div className="flex min-w-0 flex-1 items-center justify-between gap-2 px-3 py-2.5">
                <div className="min-w-0">
                  <EditableText
                    value={it.label}
                    editable={ctx.editable && ctx.selectedItemId === it.id}
                    onCommit={(v) => ctx.onEditItem(it.id, "label", v)}
                    className="block truncate font-mono text-[12.5px] font-extrabold text-slate-900"
                  />
                  <EditableText
                    value={it.sub}
                    editable={ctx.editable && ctx.selectedItemId === it.id}
                    onCommit={(v) => ctx.onEditItem(it.id, "sub", v)}
                    className="mt-0.5 block line-clamp-2 text-[10.5px] leading-snug text-slate-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    if (!ctx.editable) {
                      e.stopPropagation();
                      const blocked = ctx.onRequireMemberAuth?.("voucher", "Lưu & sử dụng Voucher");
                      if (blocked) return;
                    }
                    setSavedIds((prev) => ({ ...prev, [it.id]: !prev[it.id] }));
                  }}
                  className="shrink-0 rounded-full px-2.5 py-1 text-[10.5px] font-bold transition"
                  style={
                    isSaved
                      ? { background: "#f1f5f9", color: "#64748b" }
                      : { background: color, color: "#ffffff" }
                  }
                >
                  {isSaved ? "Đã lưu" : block.props.ctaLabel || "Lưu mã"}
                </button>
              </div>
            </ItemShell>
          );
        })}
      </div>
    </div>
  );
}

function MemberAuthBlock({ block, ctx }: { block: Block; ctx: RenderCtx }) {
  const isBanner = block.props.variant === "banner";
  const welcomePoints = ctx.auth?.welcomePoints ?? 50;

  if (!ctx.editable && ctx.isMemberLoggedIn) {
    return (
      <div className="px-4 py-2">
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-sm font-black text-white">
              M
            </span>
            <div className="min-w-0">
              <div className="truncate text-[13px] font-bold text-slate-900">Hội viên đã đăng nhập</div>
              <div className="text-[11px] text-emerald-700">+{welcomePoints} điểm chào mừng · Hạng Thành viên</div>
            </div>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              ctx.onMemberLogout?.();
            }}
            className="shrink-0 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10.5px] font-semibold text-slate-600"
          >
            Đăng xuất
          </button>
        </div>
      </div>
    );
  }

  if (isBanner) {
    return (
      <div className="px-4 py-2">
        <div
          className="flex items-center justify-between gap-2 rounded-2xl px-3.5 py-3 text-white shadow-sm"
          style={{ background: `linear-gradient(135deg, ${ctx.theme.primary}, ${ctx.theme.accent})` }}
        >
          <div className="min-w-0 flex-1">
            <EditableText
              value={block.props.title}
              editable={ctx.editable}
              onCommit={(v) => ctx.onEditProp("title", v)}
              className="block truncate text-[13px] font-extrabold"
            />
            <EditableText
              value={block.props.subtitle}
              editable={ctx.editable}
              onCommit={(v) => ctx.onEditProp("subtitle", v)}
              className="block truncate text-[10.5px] text-white/85"
            />
          </div>
          <button
            type="button"
            onClick={(e) => {
              if (ctx.editable) return;
              e.stopPropagation();
              ctx.onOpenMemberAuth?.("login");
            }}
            className="shrink-0 rounded-full bg-white px-3 py-1.5 text-[11px] font-bold shadow-sm"
            style={{ color: ctx.theme.primary }}
          >
            <EditableText value={block.props.ctaLabel} editable={ctx.editable} onCommit={(v) => ctx.onEditProp("ctaLabel", v)} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-2">
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_2px_10px_rgba(15,23,42,0.05)]">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
              style={{ background: ctx.theme.primary }}
            >
              <Icon name="fingerprint" size={20} />
            </span>
            <div>
              <EditableText
                value={block.props.title}
                editable={ctx.editable}
                onCommit={(v) => ctx.onEditProp("title", v)}
                className="block text-[14px] font-extrabold text-slate-900"
              />
              <EditableText
                value={block.props.subtitle}
                editable={ctx.editable}
                onCommit={(v) => ctx.onEditProp("subtitle", v)}
                className="mt-0.5 block text-[11px] leading-snug text-slate-500"
              />
            </div>
          </div>
          {welcomePoints > 0 && (
            <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
              +{welcomePoints}đ
            </span>
          )}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={(e) => {
              if (ctx.editable) return;
              e.stopPropagation();
              ctx.onOpenMemberAuth?.("login");
            }}
            className="rounded-xl bg-[#0068FF] py-2 text-[11.5px] font-bold text-white"
          >
            Đăng nhập Zalo
          </button>
          <button
            type="button"
            onClick={(e) => {
              if (ctx.editable) return;
              e.stopPropagation();
              ctx.onOpenMemberAuth?.("register");
            }}
            className="rounded-xl border border-slate-200 bg-slate-50 py-2 text-[11.5px] font-bold text-slate-700"
          >
            Đăng ký hội viên
          </button>
        </div>
      </div>
    </div>
  );
}

export function BlockRenderer({ block, ctx }: { block: Block; ctx: RenderCtx }) {
  switch (block.type) {
    case "header":
      return <HeaderBlock block={block} ctx={ctx} />;
    case "search":
      return <SearchBlock block={block} ctx={ctx} />;
    case "notice":
      return <NoticeBlock block={block} ctx={ctx} />;
    case "banner":
      return <BannerBlock block={block} ctx={ctx} />;
    case "quickActions":
      return <QuickActionsBlock block={block} ctx={ctx} />;
    case "categories":
      return <CategoriesBlock block={block} ctx={ctx} />;
    case "flashSale":
      return <FlashSaleBlock block={block} ctx={ctx} />;
    case "productGrid":
      return <ProductGridBlock block={block} ctx={ctx} />;
    case "productList":
      return <ProductListBlock block={block} ctx={ctx} />;
    case "memberCard":
      return <MemberCardBlock block={block} ctx={ctx} />;
    case "voucherList":
      return <VoucherListBlock block={block} ctx={ctx} />;
    case "booking":
      return <BookingBlock block={block} ctx={ctx} />;
    case "news":
      return <NewsBlock block={block} ctx={ctx} />;
    case "form":
      return <FormBlock block={block} ctx={ctx} />;
    case "profile":
      return <ProfileBlock block={block} ctx={ctx} />;
    case "memberAuth":
      return <MemberAuthBlock block={block} ctx={ctx} />;
    case "menuList":
      return <MenuListBlock block={block} ctx={ctx} />;
    case "policyList":
      return <PolicyListBlock block={block} ctx={ctx} />;
    case "contact":
      return <ContactBlock block={block} ctx={ctx} />;
    case "spacer":
      return <div style={{ height: block.props.height ?? 16 }} />;
    default:
      return null;
  }
}
