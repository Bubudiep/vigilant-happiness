import { useNavigate } from "zmp-ui";

import { Badge, formatPrice, Tile, useTplTheme } from "../_shared/kit";
import { NotaryService, path } from "./data";

export function NotaryServiceCard({ service }: { service: NotaryService }) {
  const navigate = useNavigate();
  const theme = useTplTheme();

  return (
    <button
      onClick={() => navigate(path(`/service/${service.id}`))}
      className="flex w-full items-center gap-3 rounded-2xl border border-gray-200/80 bg-white p-3.5 text-left shadow-sm"
    >
      <Tile seed={service.id} emoji={service.emoji} color={service.color} className="h-16 w-16" rounded="rounded-2xl" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <Badge color={service.color}>⏱ {service.timeEstimate}</Badge>
          <span className="text-[11px] text-gray-400">{service.documents.length} giấy tờ</span>
        </div>
        <div className="mt-1 line-clamp-1 text-sm font-bold text-gray-900">{service.name}</div>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-xs text-gray-500">
            Phí dự kiến:{" "}
            <b className="text-sm" style={{ color: theme.primary }}>
              từ {formatPrice(service.baseFee)}
            </b>
          </span>
          <span
            className="rounded-full px-2.5 py-1 text-[11px] font-bold text-white"
            style={{ background: theme.primary }}
          >
            Xem giấy tờ ›
          </span>
        </div>
      </div>
    </button>
  );
}
