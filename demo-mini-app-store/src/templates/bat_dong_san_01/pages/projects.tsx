import { useState } from "react";
import { useSearchParams } from "zmp-ui";

import { ChipRow, TplHeader, TplPage } from "../../_shared/kit";
import { ProjectCard } from "../components";
import { projects, PropertyType, propertyTypes } from "../data";

export default function ProjectsPage() {
  const [params] = useSearchParams();
  const [type, setType] = useState<PropertyType>((params.get("type") as PropertyType) ?? "all");
  const list = projects.filter((p) => type === "all" || p.type === type);

  return (
    <TplPage tab>
      <TplHeader title="Dự án" back={false}>
        <ChipRow items={propertyTypes} value={type} onChange={setType} className="pb-2" />
      </TplHeader>
      <div className="mt-3 space-y-3 px-4">
        {list.map((p) => (
          <ProjectCard key={p.id} project={p} />
        ))}
      </div>
    </TplPage>
  );
}
