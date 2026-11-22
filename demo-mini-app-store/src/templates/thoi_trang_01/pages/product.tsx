import { useAtom, useSetAtom } from "jotai";
import { useState } from "react";
import { Icon, Swiper, useNavigate, useParams, useSnackbar } from "zmp-ui";

import { useDemoAction } from "@/templates/_shared/demo-action";

import Price from "../components/price";
import ProductCard from "../components/product-card";
import ProductImage from "../components/product-image";
import ShopHeader from "../components/shop-header";
import ShopPage from "../components/shop-page";
import { path, theme } from "../constants";
import { findProduct, products } from "../data";
import { cartAtom, favoritesAtom } from "../state";

export default function ProductPage() {
  const { productId } = useParams();
  const product = findProduct(productId);
  const navigate = useNavigate();
  const { openSnackbar } = useSnackbar();
  const demoAction = useDemoAction();
  const setCart = useSetAtom(cartAtom);
  const [favorites, setFavorites] = useAtom(favoritesAtom);

  const [colorIndex, setColorIndex] = useState(0);
  const [size, setSize] = useState<string | undefined>(product?.sizes.length === 1 ? product.sizes[0] : undefined);
  const [quantity, setQuantity] = useState(1);

  if (!product) {
    return (
      <ShopPage>
        <ShopHeader back title="Sản phẩm" />
        <div className="py-20 text-center text-gray-400">Không tìm thấy sản phẩm</div>
      </ShopPage>
    );
  }

  const color = product.colors[colorIndex];
  const isFavorite = favorites.includes(product.id);
  const related = products.filter((p) => p.category === product.category && p.id !== product.id);

  const addToCart = (): boolean => {
    if (!size) {
      openSnackbar({ text: "Vui lòng chọn size", type: "warning" });
      return false;
    }
    const key = `${product.id}|${color.name}|${size}`;
    setCart((cart) => {
      const existing = cart.find((i) => i.key === key);
      if (existing) return cart.map((i) => (i.key === key ? { ...i, quantity: i.quantity + quantity } : i));
      return [...cart, { key, productId: product.id, color: color.name, size, quantity }];
    });
    return true;
  };

  return (
    <ShopPage bottomSpace={64}>
      <ShopHeader
        back
        title={product.name}
        right={
          <button
            onClick={() =>
              setFavorites((f) => (isFavorite ? f.filter((id) => id !== product.id) : [...f, product.id]))
            }
            className="flex h-9 w-9 items-center justify-center"
            style={{ color: isFavorite ? theme.sale : undefined }}
          >
            <Icon icon={isFavorite ? "zi-heart-solid" : "zi-heart"} />
          </button>
        }
      />

      {/* Ảnh theo từng màu */}
      <Swiper key={colorIndex} dots className="bg-white" afterChange={(i) => setColorIndex(i)} defaultActive={colorIndex}>
        {product.colors.map((c) => (
          <Swiper.Slide key={c.name}>
            <ProductImage seed={product.id} category={product.category} color={c.hex} className="aspect-square w-full" rounded="" />
          </Swiper.Slide>
        ))}
      </Swiper>

      <div className="space-y-1 bg-white px-4 pb-4 pt-3">
        <Price product={product} size="lg" />
        <h1 className="text-lg font-semibold leading-snug">{product.name}</h1>
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <Icon icon="zi-star-solid" size={14} className="text-amber-400" />
          {product.rating} · Đã bán {product.sold.toLocaleString("vi-VN")}
        </div>
      </div>

      {/* Chọn màu, size, số lượng */}
      <div className="mt-2 space-y-4 bg-white p-4">
        <div>
          <div className="mb-2 text-sm">
            Màu sắc: <span className="font-semibold">{color.name}</span>
          </div>
          <div className="flex gap-3">
            {product.colors.map((c, i) => (
              <button
                key={c.name}
                onClick={() => setColorIndex(i)}
                className="h-9 w-9 rounded-full border-2 p-0.5"
                style={{ borderColor: i === colorIndex ? theme.primary : "transparent" }}
              >
                <span className="block h-full w-full rounded-full border border-black/10" style={{ background: c.hex }} />
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span>Kích thước</span>
            <button onClick={() => demoAction("Bảng size")} className="text-xs text-gray-500 underline">
              Hướng dẫn chọn size
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {product.sizes.map((s) => (
              <button
                key={s}
                onClick={() => setSize(s)}
                className="min-w-[48px] rounded-lg border px-3 py-2 text-sm"
                style={
                  size === s
                    ? { borderColor: theme.primary, background: theme.primary, color: "#fff" }
                    : { borderColor: "#e5e7eb" }
                }
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span>Số lượng</span>
          <div className="flex items-center rounded-lg border border-gray-200">
            <button className="px-3 py-1.5" onClick={() => setQuantity((q) => Math.max(1, q - 1))}>
              −
            </button>
            <span className="w-8 text-center">{quantity}</span>
            <button className="px-3 py-1.5" onClick={() => setQuantity((q) => q + 1)}>
              +
            </button>
          </div>
        </div>
      </div>

      {/* Mô tả + chính sách */}
      <div className="mt-2 bg-white p-4 text-sm">
        <h2 className="mb-2 font-semibold">Mô tả sản phẩm</h2>
        <p className="leading-relaxed text-gray-600">{product.description}</p>
        <ul className="mt-3 space-y-1 text-gray-600">
          <li>✓ Đổi trả miễn phí trong 7 ngày</li>
          <li>✓ Freeship đơn từ 499.000đ</li>
          <li>✓ Kiểm tra hàng trước khi thanh toán</li>
        </ul>
      </div>

      {related.length > 0 && (
        <section className="mt-4 px-4">
          <h2 className="text-base font-bold">Sản phẩm tương tự</h2>
          <div className="no-scrollbar mt-3 flex gap-3 overflow-x-auto pb-1">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} compact />
            ))}
          </div>
        </section>
      )}

      {/* Thanh hành động */}
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-gray-100 bg-white safe-bottom">
        <div className="flex gap-3 px-4 py-2.5">
          <button
            onClick={() => addToCart() && openSnackbar({ text: "Đã thêm vào giỏ hàng", type: "success" })}
            className="flex-1 rounded-xl border py-3 text-sm font-semibold"
            style={{ borderColor: theme.primary, color: theme.primary }}
          >
            Thêm vào giỏ
          </button>
          <button
            onClick={() => addToCart() && navigate(path("/cart"))}
            className="flex-1 rounded-xl py-3 text-sm font-semibold text-white"
            style={{ background: theme.primary }}
          >
            Mua ngay
          </button>
        </div>
      </div>
    </ShopPage>
  );
}
