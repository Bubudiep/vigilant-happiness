import { useAtom, useAtomValue } from "jotai";
import { Icon, useNavigate } from "zmp-ui";

import { useDemoAction } from "@/templates/_shared/demo-action";
import { formatPrice } from "@/utils/format";

import ProductImage from "../components/product-image";
import ShopPage, { BOTTOM_NAV_HEIGHT } from "../components/shop-page";
import { path, theme } from "../constants";
import { effectivePrice, findProduct } from "../data";
import { cartAtom, cartTotalAtom } from "../state";

const FREESHIP_FROM = 499000;
const SHIPPING_FEE = 30000;

export default function CartPage() {
  const [cart, setCart] = useAtom(cartAtom);
  const subtotal = useAtomValue(cartTotalAtom);
  const navigate = useNavigate();
  const demoAction = useDemoAction();

  const shipping = subtotal >= FREESHIP_FROM || subtotal === 0 ? 0 : SHIPPING_FEE;
  const total = subtotal + shipping;

  const changeQty = (key: string, delta: number) =>
    setCart((c) =>
      c
        .map((i) => (i.key === key ? { ...i, quantity: i.quantity + delta } : i))
        .filter((i) => i.quantity > 0),
    );

  return (
    <ShopPage tab="cart" bottomSpace={cart.length ? 64 : 0}>
      <header className="sticky top-0 z-40 bg-white safe-top">
        <div className="zalo-capsule-space flex h-12 items-center pl-4 text-base font-semibold">
          Giỏ hàng ({cart.length})
        </div>
      </header>

      {cart.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-24 text-center">
          <span className="text-5xl">🛍️</span>
          <div className="text-sm text-gray-500">Giỏ hàng đang trống</div>
          <button
            onClick={() => navigate(path(""), { animate: false, replace: true })}
            className="rounded-full px-6 py-2 text-sm font-semibold text-white"
            style={{ background: theme.primary }}
          >
            Mua sắm ngay
          </button>
        </div>
      ) : (
        <>
          {subtotal < FREESHIP_FROM && (
            <div className="mx-4 mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Mua thêm {formatPrice(FREESHIP_FROM - subtotal)} để được miễn phí vận chuyển
            </div>
          )}

          <div className="mt-3 space-y-2 px-4">
            {cart.map((item) => {
              const p = findProduct(item.productId);
              if (!p) return null;
              const hex = p.colors.find((c) => c.name === item.color)?.hex ?? p.colors[0].hex;
              return (
                <div key={item.key} className="flex gap-3 rounded-xl bg-white p-3">
                  <button onClick={() => navigate(path(`/product/${p.id}`))}>
                    <ProductImage seed={p.id} category={p.category} color={hex} className="h-24 w-20" rounded="rounded-lg" />
                  </button>
                  <div className="flex flex-1 flex-col">
                    <div className="line-clamp-2 text-sm">{p.name}</div>
                    <div className="mt-0.5 text-xs text-gray-400">
                      {item.color} · Size {item.size}
                    </div>
                    <div className="mt-auto flex items-center justify-between">
                      <span className="text-sm font-bold">{formatPrice(effectivePrice(p))}</span>
                      <div className="flex items-center rounded-lg border border-gray-200 text-sm">
                        <button className="px-2.5 py-1" onClick={() => changeQty(item.key, -1)}>
                          −
                        </button>
                        <span className="w-6 text-center">{item.quantity}</span>
                        <button className="px-2.5 py-1" onClick={() => changeQty(item.key, 1)}>
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={() => demoAction("Áp dụng voucher")}
            className="mx-4 mt-3 flex w-[calc(100%-2rem)] items-center gap-2 rounded-xl bg-white p-3 text-sm"
          >
            <span>🎟️</span>
            <span className="flex-1 text-left">Chọn hoặc nhập mã giảm giá</span>
            <Icon icon="zi-chevron-right" size={18} className="text-gray-400" />
          </button>

          <div className="mx-4 mt-3 space-y-2 rounded-xl bg-white p-4 text-sm">
            <Row label="Tạm tính" value={formatPrice(subtotal)} />
            <Row label="Phí vận chuyển" value={shipping ? formatPrice(shipping) : "Miễn phí"} />
            <div className="border-t border-gray-100 pt-2">
              <Row label="Tổng cộng" value={formatPrice(total)} bold />
            </div>
          </div>

          {/* Thanh thanh toán, nằm trên bottom nav */}
          <div
            className="fixed inset-x-0 z-40 border-t border-gray-100 bg-white"
            style={{ bottom: `calc(${BOTTOM_NAV_HEIGHT}px + var(--zaui-safe-area-inset-bottom, 0px))` }}
          >
            <div className="flex items-center gap-3 px-4 py-2.5">
              <div className="flex-1">
                <div className="text-xs text-gray-500">Tổng thanh toán</div>
                <div className="text-lg font-bold" style={{ color: theme.sale }}>
                  {formatPrice(total)}
                </div>
              </div>
              <button
                onClick={() => demoAction("Đặt hàng & thanh toán")}
                className="rounded-xl px-6 py-3 text-sm font-semibold text-white"
                style={{ background: theme.primary }}
              >
                Đặt hàng
              </button>
            </div>
          </div>
        </>
      )}
    </ShopPage>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "font-bold" : "text-gray-600"}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
