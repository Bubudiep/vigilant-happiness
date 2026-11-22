import { useState } from "react";
import { useSearchParams } from "zmp-ui";

import { ChipRow, ProductTileCard, TplHeader, TplPage } from "../../_shared/kit";
import { cart, gifts, occasions, recipients } from "../data";

export default function ShopPage() {
  const [params] = useSearchParams();
  const [occasion, setOccasion] = useState(params.get("occasion") ?? "all");
  const [forWho, setForWho] = useState(params.get("for") ?? "all");

  const list = gifts.filter(
    (g) => (occasion === "all" || g.occasions.includes(occasion)) && (forWho === "all" || g.for.includes(forWho)),
  );

  return (
    <TplPage tab>
      <TplHeader title="Quà tặng" back={false}>
        <ChipRow items={occasions.map((o) => ({ id: o.id, label: `${o.emoji} ${o.label}` }))} value={occasion} onChange={setOccasion} className="pb-2" />
        <ChipRow items={recipients} value={forWho} onChange={setForWho} className="pb-2" />
      </TplHeader>

      <div className="px-4 pt-3 text-xs text-gray-500">{list.length} món quà</div>
      <div className="mt-2 grid grid-cols-2 gap-3 px-4">
        {list.map((g) => (
          <ProductTileCard key={g.id} product={g} store={cart} />
        ))}
      </div>
      {list.length === 0 && <div className="py-12 text-center text-sm text-gray-400">Chưa có quà phù hợp – thử dịp khác nhé!</div>}
    </TplPage>
  );
}
