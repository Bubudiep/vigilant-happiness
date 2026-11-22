import { useAtomValue } from "jotai";
import { useNavigate } from "zmp-ui";

import { EmptyState, TplHeader, TplPage } from "../../_shared/kit";
import { ProjectCard } from "../components";
import { path, projects, savedAtom } from "../data";

export default function SavedPage() {
  const saved = useAtomValue(savedAtom);
  const navigate = useNavigate();
  const list = projects.filter((p) => saved.includes(p.id));

  return (
    <TplPage tab>
      <TplHeader title="Dự án đã lưu" back={false} />
      {list.length === 0 ? (
        <EmptyState
          emoji="🤍"
          text="Bấm ♡ trên dự án để lưu lại và so sánh sau"
          action="Khám phá dự án"
          onAction={() => navigate(path("/projects"), { replace: true, direction: "backward" })}
        />
      ) : (
        <div className="mt-3 space-y-3 px-4">
          {list.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      )}
    </TplPage>
  );
}
