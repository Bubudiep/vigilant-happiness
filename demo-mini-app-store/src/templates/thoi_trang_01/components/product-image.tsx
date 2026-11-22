import { pickStockImage } from "@/assets/stock-images";

import type { ProductCategory } from "../data";

export default function ProductImage({
  category,
  color,
  seed,
  image,
  className = "",
  rounded = "rounded-xl",
}: {
  category: ProductCategory;
  color: string;
  seed?: string;
  image?: string;
  className?: string;
  rounded?: string;
}) {
  const src = image ?? pickStockImage("thoi_trang_01", "product", seed ?? `${category}:${color}`);
  return (
    <div className={`relative overflow-hidden bg-gray-100 ${rounded} ${className}`}>
      <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
    </div>
  );
}
