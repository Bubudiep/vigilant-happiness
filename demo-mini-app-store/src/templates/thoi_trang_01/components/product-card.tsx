import { useState } from "react";
import { RiHeart3Fill, RiHeart3Line, RiStarFill } from "react-icons/ri";
import { useNavigate } from "zmp-ui";

import { discountPercent } from "@/utils/format";

import { path, theme } from "../constants";
import type { Product } from "../data";
import Price from "./price";
import ProductImage from "./product-image";

export default function ProductCard({
  product,
  compact,
}: {
  product: Product;
  compact?: boolean;
  poster?: boolean;
}) {
  const navigate = useNavigate();
  const [liked, setLiked] = useState(false);
  const off = discountPercent(product.price, product.salePrice);

  return (
    <div
      onClick={() => navigate(path(`/product/${product.id}`))}
      className={`flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-gray-200/80 bg-white text-left shadow-sm ${
        compact ? "w-36 shrink-0" : ""
      }`}
    >
      <div className="relative w-full">
        <ProductImage
          category={product.category}
          color={product.colors[0].hex}
          seed={product.id}
          className="aspect-square w-full"
          rounded=""
        />

        {off > 0 && (
          <span
            className="absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
            style={{ background: theme.sale }}
          >
            -{off}%
          </span>
        )}
        {product.isNew && !off && (
          <span
            className="absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
            style={{ background: theme.accent }}
          >
            Mới
          </span>
        )}

        {!compact && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setLiked((v) => !v);
            }}
            className="absolute bottom-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 shadow-sm"
          >
            {liked ? (
              <RiHeart3Fill size={13} className="text-[#e5484d]" />
            ) : (
              <RiHeart3Line size={13} className="text-gray-400" />
            )}
          </button>
        )}
      </div>

      <div className="flex w-full flex-1 flex-col gap-1 p-2.5">
        <div className="line-clamp-1 text-xs font-semibold text-gray-800">{product.name}</div>
        <div className="flex items-center gap-1 text-[10px] text-gray-400">
          <RiStarFill size={10} className="text-amber-400" />
          <span>{product.rating}</span>
          <span>·</span>
          <span>Đã bán {product.sold.toLocaleString("vi-VN")}</span>
        </div>
        <div className="mt-auto flex items-center justify-between pt-1">
          <Price product={product} />
          <div className="flex gap-1">
            {product.colors.slice(0, 3).map((c) => (
              <span
                key={c.name}
                className="h-2.5 w-2.5 rounded-full border border-black/15"
                style={{ background: c.hex }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
