import { useAtomValue } from "jotai";
import { useState } from "react";

import { ChipRow, TplHeader, TplPage } from "../../_shared/kit";
import { MilestoneCard, PackageCard } from "../components";
import { packages, pregnancyMilestones, pregnancyWeekAtom } from "../data";

export default function PackagesPage() {
  const [tab, setTab] = useState<"milestones" | "packages">("milestones");
  const currentWeek = useAtomValue(pregnancyWeekAtom);

  return (
    <TplPage tab>
      <TplHeader title="Lộ trình 8 Mốc khám & Gói 5D" back={false}>
        <ChipRow
          items={[
            { id: "milestones", label: "🗓️ 8 Mốc khám & Xét nghiệm" },
            { id: "packages", label: "👶 Bảng giá Gói Siêu âm 5D" },
          ]}
          value={tab}
          onChange={setTab}
          className="pb-2"
        />
      </TplHeader>

      {tab === "milestones" ? (
        <div className="space-y-3 px-4 pt-3">
          {pregnancyMilestones.map((m) => (
            <MilestoneCard key={m.id} milestone={m} currentWeek={currentWeek} />
          ))}
        </div>
      ) : (
        <div className="space-y-3 px-4 pt-3">
          {packages.map((p) => (
            <PackageCard key={p.id} pkg={p} />
          ))}
        </div>
      )}
    </TplPage>
  );
}
