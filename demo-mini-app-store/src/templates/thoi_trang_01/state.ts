import { atom } from "jotai";

import { effectivePrice, findProduct } from "./data";

export interface CartItem {
  key: string; // productId|color|size
  productId: string;
  color: string;
  size: string;
  quantity: number;
}

export const cartAtom = atom<CartItem[]>([
  // Có sẵn 1 sản phẩm để khách thấy giỏ hàng trông thế nào
  { key: "p02|Đen|M", productId: "p02", color: "Đen", size: "M", quantity: 1 },
]);

export const cartCountAtom = atom((get) => get(cartAtom).reduce((s, i) => s + i.quantity, 0));

export const cartTotalAtom = atom((get) =>
  get(cartAtom).reduce((sum, item) => {
    const p = findProduct(item.productId);
    return p ? sum + effectivePrice(p) * item.quantity : sum;
  }, 0),
);

export const favoritesAtom = atom<string[]>([]);
