import { useState } from "react";
import { useSearchParams } from "zmp-ui";

import { ProductTileCard, SearchBox, TplHeader, TplPage, useTplTheme } from "../../_shared/kit";
import { cart, groceryCategories, products } from "../data";

export default function CategoryPage() {
  const theme = useTplTheme();
  const [params] = useSearchParams();
  const [cat, setCat] = useState(params.get("cat") ?? groceryCategories[0].id);
  const [keyword, setKeyword] = useState("");

  const kw = keyword.trim().toLowerCase();
  const list = kw ? products.filter((p) => p.name.toLowerCase().includes(kw)) : products.filter((p) => p.category === cat);

  return (
    <TplPage tab>
      <TplHeader title="Danh mục" back={false}>
        <div className="px-4 pb-2">
          <SearchBox placeholder="Tìm sản phẩm" value={keyword} onChange={setKeyword} />
        </div>
      </TplHeader>

      <div className="flex">
        {!kw && (
          <aside className="sticky top-[104px] w-[84px] shrink-0 self-start">
            {groceryCategories.map((c) => {
              const active = c.id === cat;
              return (
                <button
                  key={c.id}
                  onClick={() => setCat(c.id)}
                  className="flex w-full flex-col items-center gap-1 border-l-4 px-1 py-3 text-[11px]"
                  style={
                    active
                      ? { borderColor: theme.primary, background: "#fff", color: theme.primary, fontWeight: 600 }
                      : { borderColor: "transparent", color: "#6b7280" }
                  }
                >
                  <span className="text-xl">{c.emoji}</span>
                  {c.label}
                </button>
              );
            })}
          </aside>
        )}
        <div className="grid flex-1 grid-cols-2 content-start gap-2 bg-white p-2">
          {list.map((p) => (
            <ProductTileCard key={p.id} product={p} store={cart} />
          ))}
          {list.length === 0 && <div className="col-span-2 py-12 text-center text-sm text-gray-400">Không có sản phẩm</div>}
        </div>
      </div>
    </TplPage>
  );
}
