import { useState } from "react";
import { useSearchParams } from "zmp-ui";

import { ChipRow, TplHeader, TplPage } from "../../_shared/kit";
import { LawyerCard } from "../components";
import { lawyers, PracticeArea, practiceAreas } from "../data";

export default function LawyersPage() {
  const [params] = useSearchParams();
  const initial = (params.get("area") as PracticeArea | null) ?? "all";
  const [area, setArea] = useState<PracticeArea>(initial);

  const list = lawyers.filter((l) => area === "all" || l.area === area);

  return (
    <TplPage tab>
      <TplHeader title="Đội ngũ Luật sư Chuyên môn" back={false}>
        <ChipRow
          items={practiceAreas.map((a) => ({ id: a.id, label: a.label }))}
          value={area}
          onChange={setArea}
          className="pb-2"
        />
      </TplHeader>

      <div className="space-y-3 px-4 pt-3">
        {list.map((l) => (
          <LawyerCard key={l.id} lawyer={l} />
        ))}
      </div>
    </TplPage>
  );
}
