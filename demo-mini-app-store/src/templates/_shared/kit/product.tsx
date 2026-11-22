import { useState } from "react";

import { discountPercent, formatPrice } from "@/utils/format";

import { CartStore, useAddToCart } from "./cart";
import { RiHeart3Fill, RiHeart3Line, RiStarFill } from "./icons";
import { AddButton, Tile } from "./layout";
import { useTplTheme } from "./theme";

export interface SimpleProduct {
  id: string;
  name: string;
  emoji: string;
  color: string;
  price: number;
  salePrice?: number;
  unit?: string;
  category: string;
  tag?: string;
  image?: string;
  rating?: number;
  sold?: number;
}

export type ProductCardVariant = "editorial" | "poster" | "horizontal" | "minimal";

function deriveStats(id: string, rating?: number, sold?: number) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  const abs = Math.abs(hash);
  return {
    rating: rating ?? Number((4.8 + (abs % 3) * 0.1).toFixed(1)),
    sold: sold ?? 45 + (abs % 240),
  };
}

/** Thẻ sản phẩm tinh gọn, không đè chữ quảng cáo thừa lên ảnh. */
export function ProductTileCard({
  product,
  store,
  compact,
  variant = "editorial",
  onClick,
}: {
  product: SimpleProduct;
  store: CartStore;
  compact?: boolean;
  variant?: ProductCardVariant;
  onClick?: () => void;
}) {
  const theme = useTplTheme();
  const add = useAddToCart(store);
  const [liked, setLiked] = useState(false);
  const off = discountPercent(product.price, product.salePrice);
  const price = product.salePrice ?? product.price;
  const stats = deriveStats(product.id, product.rating, product.sold);

  const handleAdd = () =>
    add({
      id: product.id,
      name: product.name,
      emoji: product.emoji,
      color: product.color,
      unitPrice: price,
      options: product.unit,
    });

  if (variant === "horizontal") {
    return (
      <div
        onClick={onClick}
        className="flex items-center gap-3 rounded-2xl border border-gray-200/80 bg-white p-3 shadow-sm"
      >
        <div className="relative shrink-0">
          <Tile
            emoji={product.emoji}
            color={product.color}
            image={product.image}
            seed={product.id}
            className="h-18 w-18"
            rounded="rounded-xl"
            size="text-4xl"
          />
          {off > 0 && (
            <span className="absolute right-1 top-1 rounded-full bg-[#e05246] px-1.5 py-0.5 text-[9px] font-bold text-white">
              -{off}%
            </span>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="line-clamp-1 text-sm font-semibold text-gray-900">{product.name}</div>
          {product.unit && <div className="text-xs text-gray-400">{product.unit}</div>}
          <div className="mt-1.5 flex items-center justify-between">
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm font-bold" style={{ color: off ? "#e05246" : theme.primary }}>
                {formatPrice(price)}
              </span>
              {off > 0 && (
                <span className="text-[11px] text-gray-400 line-through">{formatPrice(product.price)}</span>
              )}
            </div>
            <AddButton onClick={handleAdd} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={`group flex flex-col overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm ${
        compact ? "w-36 shrink-0" : ""
      } ${onClick ? "cursor-pointer" : ""}`}
    >
      <div className="relative overflow-hidden">
        <Tile
          emoji={product.emoji}
          color={product.color}
          image={product.image}
          seed={product.id}
          className="aspect-square w-full"
          rounded=""
          size="text-5xl"
        />

        {off > 0 && (
          <span className="absolute right-2 top-2 rounded-full bg-[#e05246] px-2 py-0.5 text-[10px] font-bold text-white">
            -{off}%
          </span>
        )}
        {product.tag && !off && (
          <span
            className="absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
            style={{ background: theme.accent }}
          >
            {product.tag}
          </span>
        )}

        {!compact && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setLiked((v) => !v);
            }}
            className="absolute bottom-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-xs shadow-sm"
          >
            {liked ? (
              <RiHeart3Fill size={13} className="text-[#e05246]" />
            ) : (
              <RiHeart3Line size={13} className="text-gray-400" />
            )}
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col p-2.5">
        <div className="line-clamp-1 text-xs font-semibold text-gray-800">{product.name}</div>
        {product.unit ? (
          <div className="mt-0.5 truncate text-[11px] text-gray-400">{product.unit}</div>
        ) : (
          <div className="mt-0.5 flex items-center gap-1 text-[10px] text-gray-400">
            <RiStarFill size={10} className="text-amber-400" />
            <span>{stats.rating}</span>
            <span>·</span>
            <span>Đã bán {stats.sold}</span>
          </div>
        )}

        <div className="mt-auto flex items-end justify-between pt-1.5">
          <div className="leading-tight">
            <div className="text-sm font-bold" style={{ color: off ? "#e05246" : theme.primary }}>
              {formatPrice(price)}
            </div>
            {off > 0 && <div className="text-[10px] text-gray-400 line-through">{formatPrice(product.price)}</div>}
          </div>
          <AddButton onClick={handleAdd} />
        </div>
      </div>
    </div>
  );
}
