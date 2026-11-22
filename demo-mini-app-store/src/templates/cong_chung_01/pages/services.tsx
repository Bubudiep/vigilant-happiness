import { useState } from "react";

import { ChipRow, TplHeader, TplPage } from "../../_shared/kit";
import { NotaryServiceCard } from "../components";
import { notaryServices, serviceCategories } from "../data";

export default function ServicesPage() {
  const [cat, setCat] = useState<string>("all");
  const list = notaryServices.filter((s) => cat === "all" || s.category === cat);

  return (
    <TplPage tab>
      <TplHeader title="Danh mục Thủ tục & Biểu phí" back={false}>
        <ChipRow items={[...serviceCategories]} value={cat} onChange={setCat} className="pb-2" />
      </TplHeader>

      <div className="space-y-2.5 px-4 pt-3">
        {list.map((s) => (
          <NotaryServiceCard key={s.id} service={s} />
        ))}
      </div>
    </TplPage>
  );
}
