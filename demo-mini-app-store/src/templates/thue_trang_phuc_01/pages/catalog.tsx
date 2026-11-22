import { useState } from "react";
import { useSearchParams } from "zmp-ui";

import { ChipRow, TplHeader, TplPage } from "../../_shared/kit";
import { CostumeCard } from "../components";
import { costumes, costumeTypes } from "../data";

export default function CatalogPage() {
  const [params] = useSearchParams();
  const [type, setType] = useState(params.get("type") ?? "all");
  const list = costumes.filter((c) => type === "all" || c.type === type);

  return (
    <TplPage tab>
      <TplHeader title="Trang phục cho thuê" back={false}>
        <ChipRow items={costumeTypes.map((t) => ({ id: t.id, label: `${t.emoji} ${t.label}` }))} value={type} onChange={setType} className="pb-2" />
      </TplHeader>
      <div className="grid grid-cols-2 gap-3 px-4 pt-3">
        {list.map((c) => (
          <CostumeCard key={c.id} costume={c} />
        ))}
      </div>
    </TplPage>
  );
}
