import { useState } from "react";
import { useSearchParams } from "zmp-ui";

import { ChipRow, TplHeader, TplPage } from "../../_shared/kit";
import { DoctorCard } from "../components";
import { doctors, specialties } from "../data";

export default function DoctorsPage() {
  const [params] = useSearchParams();
  const [sp, setSp] = useState(params.get("sp") ?? "all");
  const list = doctors.filter((d) => sp === "all" || d.specialty === sp);

  return (
    <TplPage tab>
      <TplHeader title="Bác sĩ" back={false}>
        <ChipRow items={specialties.map((s) => ({ id: s.id, label: s.label }))} value={sp} onChange={setSp} className="pb-2" />
      </TplHeader>
      <div className="mt-3 space-y-2 px-4">
        {list.map((d) => (
          <DoctorCard key={d.id} doctor={d} />
        ))}
        {list.length === 0 && <div className="py-12 text-center text-sm text-gray-400">Chưa có bác sĩ cho chuyên khoa này</div>}
      </div>
    </TplPage>
  );
}
