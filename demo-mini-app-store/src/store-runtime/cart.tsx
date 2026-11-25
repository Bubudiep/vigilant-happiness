import { useEffect, useMemo, useState } from "react";
import { LuCheck, LuCircleCheck, LuLoader, LuMinus, LuPlus, LuShoppingBag, LuTrash2, LuX } from "react-icons/lu";

import type { PublicProduct, ProductOptionGroup } from "./api";
import { getShopSession, ShopApiError, ShopAuthError, shopFetch, shopLogin } from "./shop-session";

/**
 * Giỏ hàng của Mini App gian hàng: chọn size / topping → thêm vào giỏ → đặt hàng (POST /shop/:slug/me/orders).
 * Giá hiển thị tính ở máy khách cho nhanh; máy chủ tính lại theo cấu hình món khi đặt.
 */

export type Selection = { groupId: string; choiceIds: string[] };
export interface CartLine {
  key: string;
  productId: string;
  name: string;
  /** "L, Trân châu đen" */
  optionLabel: string;
  image?: string | null;
  unitPrice: number;
  quantity: number;
  selections: Selection[];
}

const vnd = (n: number) => `${n.toLocaleString("vi-VN")}đ`;
const basePrice = (p: PublicProduct) => p.salePrice ?? p.price;

/** Mặc định: nhóm bắt buộc chọn 1 → lựa chọn đầu tiên (VD size M) */
const defaultPick = (groups: ProductOptionGroup[]) =>
  Object.fromEntries(groups.map((g) => [g.id, !g.multiple && g.required && g.choices[0] ? [g.choices[0].id] : []])) as Record<string, string[]>;

function priceOf(p: PublicProduct, pick: Record<string, string[]>) {
  const groups = p.options ?? [];
  return basePrice(p) + groups.reduce((s, g) => s + g.choices.filter((c) => pick[g.id]?.includes(c.id)).reduce((x, c) => x + c.price, 0), 0);
}

export function useCart() {
  const [lines, setLines] = useState<CartLine[]>([]);
  const add = (line: Omit<CartLine, "key">) =>
    setLines((ls) => {
      const key = `${line.productId}|${JSON.stringify(line.selections)}`;
      const found = ls.find((l) => l.key === key);
      if (found) return ls.map((l) => (l.key === key ? { ...l, quantity: Math.min(99, l.quantity + line.quantity) } : l));
      return [...ls, { ...line, key }];
    });
  const setQty = (key: string, q: number) => setLines((ls) => (q <= 0 ? ls.filter((l) => l.key !== key) : ls.map((l) => (l.key === key ? { ...l, quantity: Math.min(99, q) } : l))));
  const count = lines.reduce((s, l) => s + l.quantity, 0);
  const total = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  return { lines, add, setQty, clear: () => setLines([]), count, total };
}
export type Cart = ReturnType<typeof useCart>;

/** Khung bottom sheet chung */
function Sheet({ onClose, children, maxH = "88%" }: { onClose: () => void; children: React.ReactNode; maxH?: string }) {
  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-end bg-slate-900/45" onClick={onClose}>
      <div
        className="flex flex-col overflow-hidden rounded-t-3xl bg-white"
        style={{ maxHeight: maxH, paddingBottom: "var(--zaui-safe-area-inset-bottom, 0px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

const CloseBtn = ({ onClick }: { onClick: () => void }) => (
  <button type="button" onClick={onClick} aria-label="Đóng" className="rounded-full bg-slate-100 p-1.5 text-slate-500">
    <LuX size={16} />
  </button>
);

/* ------------------------------------------------------------------ */
/* Chọn món: size / topping / số lượng                                 */
/* ------------------------------------------------------------------ */
export function ProductSheet({ product, primary, onAdd, onClose }: { product: PublicProduct; primary: string; onAdd: (l: Omit<CartLine, "key">) => void; onClose: () => void }) {
  const groups = product.options ?? [];
  const [pick, setPick] = useState<Record<string, string[]>>(() => defaultPick(groups));
  const [qty, setQty] = useState(1);
  const unit = priceOf(product, pick);
  const missing = groups.find((g) => g.required && !pick[g.id]?.length);

  const toggle = (g: ProductOptionGroup, id: string) =>
    setPick((cur) => {
      const now = cur[g.id] ?? [];
      if (!g.multiple) return { ...cur, [g.id]: g.required || !now.includes(id) ? [id] : [] };
      if (now.includes(id)) return { ...cur, [g.id]: now.filter((x) => x !== id) };
      if (g.max && now.length >= g.max) return cur;
      return { ...cur, [g.id]: [...now, id] };
    });

  const submit = () => {
    if (missing) return;
    const selections = groups.filter((g) => pick[g.id]?.length).map((g) => ({ groupId: g.id, choiceIds: pick[g.id] }));
    const optionLabel = groups.flatMap((g) => g.choices.filter((c) => pick[g.id]?.includes(c.id)).map((c) => c.name)).join(", ");
    onAdd({ productId: product.id, name: product.name, optionLabel, image: product.imageUrl, unitPrice: unit, quantity: qty, selections });
  };

  return (
    <Sheet onClose={onClose}>
      <div className="flex shrink-0 items-start gap-3 border-b border-slate-100 p-4">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} className="h-16 w-16 shrink-0 rounded-2xl object-cover" />
        ) : (
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <LuShoppingBag size={22} />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-bold leading-snug text-slate-900">{product.name}</div>
          {product.description && <div className="mt-0.5 line-clamp-2 text-xs text-slate-500">{product.description}</div>}
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-[15px] font-extrabold" style={{ color: primary }}>
              {vnd(basePrice(product))}
            </span>
            {product.salePrice != null && product.salePrice < product.price && <span className="text-xs text-slate-400 line-through">{vnd(product.price)}</span>}
          </div>
        </div>
        <CloseBtn onClick={onClose} />
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-3">
        {groups.map((g) => (
          <div key={g.id}>
            <div className="mb-1.5 flex items-center gap-2">
              <span className="text-[13px] font-bold text-slate-900">{g.name}</span>
              <span className="text-[11px] text-slate-400">
                {g.required ? "Bắt buộc" : "Tuỳ chọn"}
                {g.multiple ? (g.max ? ` · tối đa ${g.max}` : " · chọn nhiều") : " · chọn 1"}
              </span>
            </div>
            <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200">
              {g.choices.map((c) => {
                const on = !!pick[g.id]?.includes(c.id);
                const full = g.multiple && !!g.max && (pick[g.id]?.length ?? 0) >= g.max && !on;
                return (
                  <button
                    key={c.id}
                    type="button"
                    disabled={full}
                    onClick={() => toggle(g, c.id)}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left disabled:opacity-40"
                  >
                    <span
                      className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center border-2 text-white ${g.multiple ? "rounded-md" : "rounded-full"}`}
                      style={on ? { background: primary, borderColor: primary } : { borderColor: "#cbd5e1" }}
                    >
                      {on && <LuCheck size={11} strokeWidth={3} />}
                    </span>
                    <span className="flex-1 text-[13px] text-slate-800">{c.name}</span>
                    <span className="text-[12px] text-slate-500">{c.price ? `${c.price > 0 ? "+" : ""}${vnd(c.price)}` : ""}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="flex shrink-0 items-center gap-3 border-t border-slate-100 p-3">
        <Stepper value={qty} onChange={(q) => setQty(Math.max(1, q))} />
        <button
          type="button"
          disabled={!!missing}
          onClick={submit}
          className="flex h-11 flex-1 items-center justify-center rounded-full text-sm font-bold text-white disabled:opacity-50"
          style={{ background: primary }}
        >
          {missing ? `Chọn ${missing.name}` : `Thêm vào giỏ · ${vnd(unit * qty)}`}
        </button>
      </div>
    </Sheet>
  );
}

function Stepper({ value, onChange, small }: { value: number; onChange: (v: number) => void; small?: boolean }) {
  const s = small ? "h-7 w-7" : "h-9 w-9";
  return (
    <div className="flex items-center gap-1.5">
      <button type="button" aria-label="Bớt" onClick={() => onChange(value - 1)} className={`${s} flex items-center justify-center rounded-full bg-slate-100 text-slate-700`}>
        {small && value <= 1 ? <LuTrash2 size={13} /> : <LuMinus size={14} />}
      </button>
      <span className="w-6 text-center text-sm font-bold tabular-nums text-slate-900">{value}</span>
      <button type="button" aria-label="Thêm" onClick={() => onChange(value + 1)} className={`${s} flex items-center justify-center rounded-full bg-slate-100 text-slate-700`}>
        <LuPlus size={14} />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Thanh giỏ hàng nổi                                                  */
/* ------------------------------------------------------------------ */
export function CartBar({ cart, primary, bottom, onOpen }: { cart: Cart; primary: string; bottom: number; onOpen: () => void }) {
  if (!cart.count) return null;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="absolute left-3 right-16 z-30 flex h-11 items-center gap-2.5 rounded-full pl-1.5 pr-4 text-white shadow-lg"
      style={{ bottom, background: primary }}
    >
      <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
        <LuShoppingBag size={16} />
        <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold" style={{ color: primary }}>
          {cart.count}
        </span>
      </span>
      <span className="flex-1 text-left text-[13px] font-bold">Xem giỏ hàng</span>
      <span className="text-[13px] font-extrabold tabular-nums">{vnd(cart.total)}</span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Giỏ hàng & đặt hàng                                                 */
/* ------------------------------------------------------------------ */
interface Me {
  name?: string;
  phone?: string | null;
  address?: string | null;
}
interface PlacedOrder {
  code: string;
  total: number;
  discountAmount: number;
}

export function CartSheet({ slug, cart, primary, onClose }: { slug: string; cart: Cart; primary: string; onClose: () => void }) {
  const [form, setForm] = useState({ phone: "", address: "", note: "", voucherCode: "", paymentMethod: "cod" as "cod" | "bank_transfer" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<PlacedOrder | null>(null);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // Đã đăng nhập → điền sẵn SĐT / địa chỉ
  useEffect(() => {
    if (!getShopSession(slug)) return;
    shopFetch<Me>(slug, "/me")
      .then((me) => setForm((f) => ({ ...f, phone: f.phone || me.phone || "", address: f.address || me.address || "" })))
      .catch(() => undefined);
  }, [slug]);

  const lines = cart.lines;
  const summary = useMemo(() => ({ count: cart.count, total: cart.total }), [cart.count, cart.total]);

  const submit = async () => {
    setErr(null);
    setBusy(true);
    try {
      if (!getShopSession(slug)) await shopLogin(slug);
      const order = await shopFetch<PlacedOrder>(slug, "/me/orders", {
        method: "POST",
        body: JSON.stringify({
          items: lines.map((l) => ({ productId: l.productId, quantity: l.quantity, options: l.selections })),
          phone: form.phone.trim() || undefined,
          address: form.address.trim() || undefined,
          note: form.note.trim() || undefined,
          voucherCode: form.voucherCode.trim() || undefined,
          paymentMethod: form.paymentMethod,
        }),
      });
      cart.clear();
      setDone(order);
    } catch (e) {
      setErr(e instanceof ShopApiError || e instanceof ShopAuthError ? e.message : "Chưa đặt được đơn, vui lòng thử lại");
    } finally {
      setBusy(false);
    }
  };

  if (done)
    return (
      <Sheet onClose={onClose} maxH="70%">
        <div className="flex flex-col items-center gap-2 px-6 py-8 text-center">
          <LuCircleCheck size={48} style={{ color: primary }} />
          <div className="text-base font-bold text-slate-900">Đặt hàng thành công!</div>
          <div className="text-sm text-slate-500">
            Mã đơn <b className="text-slate-800">{done.code}</b> · {vnd(done.total)}
            {done.discountAmount > 0 && <> (đã giảm {vnd(done.discountAmount)})</>}
          </div>
          <div className="text-xs text-slate-400">Cửa hàng sẽ liên hệ xác nhận đơn với bạn sớm.</div>
          <button type="button" onClick={onClose} className="mt-3 rounded-full px-8 py-2.5 text-sm font-bold text-white" style={{ background: primary }}>
            Tiếp tục mua
          </button>
        </div>
      </Sheet>
    );

  const input = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[13px] outline-none focus:border-slate-400";
  return (
    <Sheet onClose={onClose} maxH="92%">
      <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-3">
        <div className="text-[15px] font-bold text-slate-900">Giỏ hàng ({summary.count})</div>
        <CloseBtn onClick={onClose} />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {!lines.length ? (
          <div className="px-8 py-14 text-center text-sm text-slate-400">Giỏ hàng trống</div>
        ) : (
          <>
            <div className="divide-y divide-slate-100 px-4">
              {lines.map((l) => (
                <div key={l.key} className="flex items-center gap-3 py-3">
                  {l.image ? (
                    <img src={l.image} alt={l.name} className="h-12 w-12 shrink-0 rounded-xl object-cover" />
                  ) : (
                    <span className="h-12 w-12 shrink-0 rounded-xl bg-slate-100" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-semibold text-slate-900">{l.name}</div>
                    {l.optionLabel && <div className="truncate text-[11px] text-slate-500">{l.optionLabel}</div>}
                    <div className="text-[12px] font-bold" style={{ color: primary }}>
                      {vnd(l.unitPrice * l.quantity)}
                    </div>
                  </div>
                  <Stepper small value={l.quantity} onChange={(q) => cart.setQty(l.key, q)} />
                </div>
              ))}
            </div>

            <div className="space-y-2 border-t-8 border-slate-50 px-4 py-3">
              <div className="text-[13px] font-bold text-slate-900">Thông tin nhận hàng</div>
              <input className={input} type="tel" placeholder="Số điện thoại" value={form.phone} onChange={set("phone")} />
              <input className={input} placeholder="Địa chỉ giao hàng (bỏ trống nếu lấy tại quán)" value={form.address} onChange={set("address")} />
              <textarea className={`${input} resize-none`} rows={2} placeholder="Ghi chú cho cửa hàng" value={form.note} onChange={set("note")} />
              <input className={`${input} uppercase placeholder:normal-case`} placeholder="Mã giảm giá (nếu có)" value={form.voucherCode} onChange={set("voucherCode")} />
              <div className="grid grid-cols-2 gap-2 pt-1">
                {(
                  [
                    ["cod", "Tiền mặt khi nhận"],
                    ["bank_transfer", "Chuyển khoản"],
                  ] as const
                ).map(([k, label]) => {
                  const on = form.paymentMethod === k;
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, paymentMethod: k }))}
                      className="rounded-xl border px-2 py-2 text-[12px] font-semibold"
                      style={on ? { borderColor: primary, color: primary, background: `${primary}0f` } : { borderColor: "#e2e8f0", color: "#475569" }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {lines.length > 0 && (
        <div className="shrink-0 space-y-2 border-t border-slate-100 p-3">
          {err && <div className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">{err}</div>}
          <div className="flex items-center justify-between px-1 text-[13px]">
            <span className="text-slate-500">Tạm tính</span>
            <span className="text-[15px] font-extrabold text-slate-900">{vnd(summary.total)}</span>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={submit}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-full text-sm font-bold text-white disabled:opacity-60"
            style={{ background: primary }}
          >
            {busy && <LuLoader size={15} className="animate-spin" />}
            {getShopSession(slug) ? "Đặt hàng" : "Đăng nhập Zalo & đặt hàng"}
          </button>
        </div>
      )}
    </Sheet>
  );
}
