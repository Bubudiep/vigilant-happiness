import { atom, PrimitiveAtom, useAtom, useAtomValue, useSetAtom } from "jotai";
import { Atom } from "jotai";
import { useSnackbar } from "zmp-ui";

import { useDemoAction } from "@/templates/_shared/demo-action";
import { formatPrice } from "@/utils/format";

import {
  ActionBar,
  EmptyState,
  PrimaryButton,
  QtyStepper,
  Tile,
} from "./layout";
import { useTplTheme } from "./theme";

/** Một dòng trong giỏ. `key` phân biệt cùng sản phẩm khác tuỳ chọn. */
export interface CartLine {
  key: string;
  id: string;
  name: string;
  emoji: string;
  color: string;
  unitPrice: number;
  qty: number;
  /** Mô tả tuỳ chọn: "Size L · Ít đá" */
  options?: string;
}

export interface CartStore {
  cartAtom: PrimitiveAtom<CartLine[]>;
  countAtom: Atom<number>;
  totalAtom: Atom<number>;
}

/** Tạo giỏ hàng riêng cho một mẫu (mỗi mẫu một giỏ). */
export function createCartStore(initial: CartLine[] = []): CartStore {
  const cartAtom = atom<CartLine[]>(initial);
  return {
    cartAtom,
    countAtom: atom((get) => get(cartAtom).reduce((s, l) => s + l.qty, 0)),
    totalAtom: atom((get) =>
      get(cartAtom).reduce((s, l) => s + l.qty * l.unitPrice, 0),
    ),
  };
}

/** Thêm vào giỏ (gộp nếu trùng key) + báo snackbar. */
export function useAddToCart(store: CartStore) {
  const setCart = useSetAtom(store.cartAtom);
  const { openSnackbar } = useSnackbar();
  return (
    line: Omit<CartLine, "key" | "qty"> & { key?: string; qty?: number },
    silent = false,
  ) => {
    const key = line.key ?? line.id;
    const qty = line.qty ?? 1;
    setCart((cart) => {
      const found = cart.find((l) => l.key === key);
      if (found)
        return cart.map((l) =>
          l.key === key ? { ...l, qty: l.qty + qty } : l,
        );
      return [...cart, { ...line, key, qty }];
    });
    if (!silent)
      openSnackbar({
        text: `Đã thêm ${line.name}`,
        type: "success",
        duration: 1500,
        position: "top",
      });
  };
}

/**
 * Trang giỏ hàng dùng chung: danh sách, số lượng, phí giao, nút đặt hàng (popup demo).
 * Dùng trong trang tab (thanh đặt hàng nằm trên thanh tab).
 */
export function CartView({
  store,
  checkoutLabel = "Đặt hàng",
  shippingFee = 0,
  feeLabel = "Phí giao hàng",
  freeShipFrom,
  emptyText = "Giỏ hàng đang trống",
  emptyAction = "Mua sắm ngay",
  onEmptyAction,
  extra,
  aboveNav = true,
}: {
  store: CartStore;
  checkoutLabel?: string;
  shippingFee?: number;
  /** Nhãn dòng phí (mặc định "Phí giao hàng") */
  feeLabel?: string;
  freeShipFrom?: number;
  emptyText?: string;
  emptyAction?: string;
  onEmptyAction?: () => void;
  /** Khối thêm phía trên tổng tiền (VD: chọn hình thức nhận hàng) */
  extra?: React.ReactNode;
  aboveNav?: boolean;
}) {
  const [cart, setCart] = useAtom(store.cartAtom);
  const subtotal = useAtomValue(store.totalAtom);
  const demoAction = useDemoAction();
  const theme = useTplTheme();

  if (cart.length === 0) {
    return (
      <EmptyState
        emoji="🛒"
        text={emptyText}
        action={emptyAction}
        onAction={onEmptyAction}
      />
    );
  }

  const ship =
    freeShipFrom !== undefined && subtotal >= freeShipFrom ? 0 : shippingFee;
  const total = subtotal + ship;
  const setQty = (key: string, qty: number) =>
    setCart((c) =>
      c
        .map((l) => (l.key === key ? { ...l, qty } : l))
        .filter((l) => l.qty > 0),
    );

  return (
    <>
      {freeShipFrom !== undefined && subtotal < freeShipFrom && (
        <div className="mx-4 mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Mua thêm {formatPrice(freeShipFrom - subtotal)} để được miễn phí giao
          hàng
        </div>
      )}

      <div className="mt-3 space-y-2 px-4">
        {cart.map((l) => (
          <div key={l.key} className="flex gap-3 rounded-xl bg-white p-3">
            <Tile
              seed={l.id}
              emoji={l.emoji}
              color={l.color}
              className="h-16 w-16"
              size="text-3xl"
            />
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="truncate text-sm font-medium">{l.name}</div>
              {l.options && (
                <div className="truncate text-xs text-gray-400">
                  {l.options}
                </div>
              )}
              <div className="mt-auto flex items-center justify-between pt-1">
                <span className="text-sm font-bold">
                  {formatPrice(l.unitPrice)}
                </span>
                <QtyStepper value={l.qty} onChange={(q) => setQty(l.key, q)} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {extra}

      <div className="mx-4 mt-3 space-y-2 rounded-xl bg-white p-4 text-sm">
        <Row label="Tạm tính" value={formatPrice(subtotal)} />
        {shippingFee > 0 && (
          <Row label={feeLabel} value={ship ? formatPrice(ship) : "Miễn phí"} />
        )}
        <div className="border-t border-gray-100 pt-2">
          <Row label="Tổng cộng" value={formatPrice(total)} bold />
        </div>
      </div>

      <ActionBar aboveNav={aboveNav}>
        <div className="flex-1">
          <div className="text-xs text-gray-500">Tổng thanh toán</div>
          <div className="text-lg font-bold" style={{ color: theme.primary }}>
            {formatPrice(total)}
          </div>
        </div>
        <PrimaryButton onClick={() => demoAction(checkoutLabel)}>
          {checkoutLabel}
        </PrimaryButton>
      </ActionBar>
    </>
  );
}

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div
      className={`flex justify-between ${bold ? "font-bold" : "text-gray-600"}`}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

/** Khoảng trống đáy cần thêm khi trang có CartView (thanh tổng tiền). */
export const CART_BAR_SPACE = 68;
