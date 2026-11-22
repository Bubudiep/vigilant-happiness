export function formatPrice(value: number): string {
  return value.toLocaleString("vi-VN") + "đ";
}

export function discountPercent(price: number, salePrice?: number): number {
  if (!salePrice || salePrice >= price) return 0;
  return Math.round(((price - salePrice) / price) * 100);
}
