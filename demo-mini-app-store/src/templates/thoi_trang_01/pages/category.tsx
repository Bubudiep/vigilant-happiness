import { useMemo, useState } from "react";
import { Icon, useSearchParams } from "zmp-ui";

import { TplHeader } from "../../_shared/kit";
import ProductCard from "../components/product-card";
import ShopPage from "../components/shop-page";
import { theme } from "../constants";
import { effectivePrice, ProductCategory, productCategories, products } from "../data";

type Sort = "popular" | "price_asc" | "price_desc";

const sorts: { id: Sort; label: string }[] = [
  { id: "popular", label: "Bán chạy" },
  { id: "price_asc", label: "Giá thấp" },
  { id: "price_desc", label: "Giá cao" },
];

export default function CategoryPage() {
  const [searchParams] = useSearchParams();
  const initial = searchParams.get("cat") as ProductCategory | null;

  const [cat, setCat] = useState<ProductCategory | "all">(initial ?? "all");
  const [sort, setSort] = useState<Sort>("popular");
  const [keyword, setKeyword] = useState("");

  const list = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    const filtered = products.filter(
      (p) => (cat === "all" || p.category === cat) && (!kw || p.name.toLowerCase().includes(kw)),
    );
    return [...filtered].sort((a, b) => {
      if (sort === "price_asc") return effectivePrice(a) - effectivePrice(b);
      if (sort === "price_desc") return effectivePrice(b) - effectivePrice(a);
      return b.sold - a.sold;
    });
  }, [cat, sort, keyword]);

  const chips: { id: ProductCategory | "all"; label: string }[] = [
    { id: "all", label: "Tất cả" },
    ...productCategories,
  ];

  return (
    <ShopPage tab="category">
      <TplHeader title="Danh mục" back={false}>
        <div className="px-4 pb-2">
          <label className="flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-sm">
            <Icon icon="zi-search" size={18} className="text-gray-400" />
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Tìm sản phẩm"
              className="flex-1 bg-transparent outline-none"
            />
          </label>
        </div>
        <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-2">
          {chips.map((c) => (
            <button
              key={c.id}
              onClick={() => setCat(c.id)}
              className="shrink-0 rounded-full border px-4 py-1.5 text-sm"
              style={
                cat === c.id
                  ? { background: theme.primary, borderColor: theme.primary, color: "#fff" }
                  : { borderColor: "#e5e7eb", color: "#374151" }
              }
            >
              {c.label}
            </button>
          ))}
        </div>
        <div className="flex gap-4 border-t border-gray-100 px-4 py-2 text-sm">
          {sorts.map((s) => (
            <button
              key={s.id}
              onClick={() => setSort(s.id)}
              className={sort === s.id ? "font-semibold" : "text-gray-500"}
              style={sort === s.id ? { color: theme.primary } : undefined}
            >
              {s.label}
            </button>
          ))}
          <span className="ml-auto text-gray-400">{list.length} sản phẩm</span>
        </div>
      </TplHeader>

      <div className="grid grid-cols-2 gap-3 px-4 pt-3">
        {list.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
      {list.length === 0 && <div className="py-16 text-center text-sm text-gray-400">Không tìm thấy sản phẩm phù hợp</div>}
    </ShopPage>
  );
}
