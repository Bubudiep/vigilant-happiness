import { useAtom } from "jotai";
import { Icon, useNavigate } from "zmp-ui";

import { Badge, Tile, useTplTheme } from "../_shared/kit";
import { path, Project, savedAtom } from "./data";

const statusColor: Record<Project["status"], string> = {
  "Đang mở bán": "#16a34a",
  "Sắp mở bán": "#d97706",
  "Đã bàn giao": "#6b7280",
};

export function SaveButton({ id, className = "" }: { id: string; className?: string }) {
  const [saved, setSaved] = useAtom(savedAtom);
  const on = saved.includes(id);
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        setSaved((s) => (on ? s.filter((x) => x !== id) : [...s, id]));
      }}
      className={`flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow ${className}`}
      style={{ color: on ? "#e5484d" : "#6b7280" }}
    >
      <Icon icon={on ? "zi-heart-solid" : "zi-heart"} size={20} />
    </button>
  );
}

export function ProjectCard({ project }: { project: Project }) {
  const navigate = useNavigate();
  const theme = useTplTheme();
  return (
    <button onClick={() => navigate(path(`/project/${project.id}`))} className="block w-full overflow-hidden rounded-2xl bg-white text-left shadow-sm">
      <div className="relative">
        <Tile seed={project.id} emoji={project.emoji} color={project.color} className="h-40 w-full" rounded="" size="text-7xl" />
        <SaveButton id={project.id} className="absolute right-2 top-2" />
      </div>
      <div className="p-3">
        <div className="flex items-center gap-2">
          <Badge color={statusColor[project.status]}>{project.status}</Badge>
        </div>
        <div className="mt-1.5 font-semibold">{project.name}</div>
        <div className="text-xs text-gray-500">📍 {project.location}</div>
        <div className="mt-1 text-sm">
          Giá từ{" "}
          <span className="font-bold" style={{ color: theme.accent }}>
            {project.priceFrom}
          </span>
        </div>
      </div>
    </button>
  );
}
