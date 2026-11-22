import { discountPercent, formatPrice } from "@/utils/format";

import { theme } from "../constants";
import type { Product } from "../data";

export default function Price({ product, size = "sm" }: { product: Product; size?: "sm" | "lg" }) {
  const off = discountPercent(product.price, product.salePrice);
  const current = product.salePrice ?? product.price;
  const lg = size === "lg";

  return (
    <div className="flex flex-wrap items-baseline gap-x-2">
      <span
        className={`font-bold ${lg ? "text-2xl" : "text-sm"}`}
        style={{ color: off ? theme.sale : theme.primary }}
      >
        {formatPrice(current)}
      </span>
      {off > 0 && (
        <span className={`text-gray-400 line-through ${lg ? "text-sm" : "text-[11px]"}`}>
          {formatPrice(product.price)}
        </span>
      )}
      {off > 0 && lg && (
        <span className="rounded px-1.5 py-0.5 text-xs font-semibold text-white" style={{ background: theme.sale }}>
          -{off}%
        </span>
      )}
    </div>
  );
}
