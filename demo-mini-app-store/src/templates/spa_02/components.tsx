import { useNavigate } from "zmp-ui";

import { formatPrice, Tile, useTplTheme } from "../_shared/kit";
import { path, Service } from "./data";

export function ServiceRow({ service }: { service: Service }) {
  const navigate = useNavigate();
  const theme = useTplTheme();
  return (
    <div className="flex gap-3 rounded-2xl bg-white p-3 shadow-sm">
      <Tile seed={service.id} emoji={service.emoji} color={service.color} className="h-20 w-20" />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="text-sm font-semibold">{service.name}</div>
        <div className="line-clamp-1 text-xs text-gray-500">
          ⏱ {service.minutes} phút · {service.description}
        </div>
        <div className="mt-auto flex items-end justify-between">
          <div>
            <span className="text-sm font-bold" style={{ color: theme.primary }}>
              {formatPrice(service.salePrice ?? service.price)}
            </span>
            {service.salePrice && <span className="ml-1 text-[11px] text-gray-400 line-through">{formatPrice(service.price)}</span>}
          </div>
          <button
            onClick={() => navigate(path(`/book/${service.id}`))}
            className="rounded-full px-3 py-1.5 text-xs font-semibold text-white"
            style={{ background: theme.primary }}
          >
            Đặt lịch
          </button>
        </div>
      </div>
    </div>
  );
}
