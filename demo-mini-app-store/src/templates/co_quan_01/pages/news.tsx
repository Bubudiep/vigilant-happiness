import { useState } from "react";

import { ChipRow, TplHeader, TplPage } from "../../_shared/kit";
import { NewsRow } from "../components";
import { news, newsTypes } from "../data";

export default function NewsPage() {
  const [type, setType] = useState("all");
  const list = news.filter((n) => type === "all" || n.type === type);

  return (
    <TplPage tab>
      <TplHeader title="Tin tức – Thông báo" back={false}>
        <ChipRow items={newsTypes} value={type} onChange={setType} className="pb-2" />
      </TplHeader>
      <div className="mt-3 space-y-2 px-4">
        {list.map((n) => (
          <NewsRow key={n.id} item={n} />
        ))}
      </div>
    </TplPage>
  );
}
