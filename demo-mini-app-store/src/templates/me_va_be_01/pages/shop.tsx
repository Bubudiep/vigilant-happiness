import { useState } from "react";
import { useSearchParams } from "zmp-ui";

import { ChipRow, ProductTileCard, TplHeader, TplPage } from "../../_shared/kit";
import { ages, babyCategories, cart, products } from "../data";

export default function ShopPage() {
  const [params] = useSearchParams();
  const [age, setAge] = useState(params.get("age") ?? "all");
  const [cat, setCat] = useState("all");

  const list = products.filter((p) => (age === "all" || p.ages.includes(age)) && (cat === "all" || p.category === cat));

  return (
    <TplPage tab>
      <TplHeader title="Sản phẩm" back={false}>
        <ChipRow items={babyCategories.map((c) => ({ id: c.id, label: `${c.emoji} ${c.label}` }))} value={cat} onChange={setCat} className="pb-2" />
        <ChipRow items={ages} value={age} onChange={setAge} className="pb-2" />
      </TplHeader>

      <div className="px-4 pt-3 text-xs text-gray-500">{list.length} sản phẩm</div>
      <div className="mt-2 grid grid-cols-2 gap-3 px-4">
        {list.map((p) => (
          <ProductTileCard key={p.id} product={p} store={cart} />
        ))}
      </div>
      {list.length === 0 && <div className="py-12 text-center text-sm text-gray-400">Chưa có sản phẩm phù hợp</div>}
    </TplPage>
  );
}
