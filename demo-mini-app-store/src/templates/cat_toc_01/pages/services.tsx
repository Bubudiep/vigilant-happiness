import { useState } from "react";

import { ChipRow, TplHeader, TplPage } from "../../_shared/kit";
import { ServiceRow } from "../components";
import { serviceCategories, services } from "../data";

export default function ServicesPage() {
  const [cat, setCat] = useState("all");
  const list = services.filter((s) => cat === "all" || s.category === cat);

  return (
    <TplPage tab>
      <TplHeader title="Bảng giá dịch vụ" back={false}>
        <ChipRow items={serviceCategories} value={cat} onChange={setCat} className="pb-2" />
      </TplHeader>
      <div className="mt-3 space-y-2 px-4">
        {list.map((s) => (
          <ServiceRow key={s.id} service={s} />
        ))}
      </div>
    </TplPage>
  );
}
