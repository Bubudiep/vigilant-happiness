import { useNavigate } from "zmp-ui";

import { Badge, formatPrice, Tile, useTplTheme } from "../_shared/kit";
import { Lawyer, path } from "./data";

export function LawyerCard({ lawyer }: { lawyer: Lawyer }) {
  const navigate = useNavigate();
  const theme = useTplTheme();

  return (
    <div
      onClick={() => navigate(path(`/book/${lawyer.id}`))}
      className="cursor-pointer rounded-2xl border border-gray-200/80 bg-white p-3.5 shadow-sm"
    >
      <div className="flex gap-3">
        <Tile seed={lawyer.id} emoji={lawyer.emoji} color={lawyer.color} className="h-20 w-20" rounded="rounded-2xl" />
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-1.5">
            <Badge color={theme.accent}>{lawyer.expYears} năm KN</Badge>
            <span className="text-[11px] text-gray-500">{lawyer.casesWon}+ vụ việc</span>
          </div>
          <div className="mt-1 truncate text-sm font-bold text-gray-900">{lawyer.name}</div>
          <div className="truncate text-xs text-gray-500">{lawyer.title}</div>
          <div className="mt-1 truncate text-xs font-medium" style={{ color: theme.accent }}>
            Chuyên môn: {lawyer.areaLabel}
          </div>
        </div>
      </div>

      <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-gray-600">{lawyer.bio}</p>

      <div className="mt-2.5 flex items-center justify-between border-t border-gray-100 pt-2.5">
        <div className="text-xs text-gray-500">
          Phí tư vấn 1-1:{" "}
          <span className="text-sm font-extrabold" style={{ color: theme.primary }}>
            {formatPrice(lawyer.feeOnline)}
          </span>
          <span className="text-[11px] text-gray-400">/giờ</span>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            navigate(path(`/book/${lawyer.id}`));
          }}
          className="rounded-full px-3.5 py-1.5 text-xs font-bold text-white shadow-sm"
          style={{ background: theme.primary }}
        >
          Đặt lịch tư vấn
        </button>
      </div>
    </div>
  );
}
