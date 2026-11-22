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

/** Ô mẫu nail: 5 móng vẽ bằng dải màu. */
export function DesignSwatch({ colors, selected, onClick, label }: { colors: string[]; selected?: boolean; onClick?: () => void; label: string }) {
  const theme = useTplTheme();
  return (
    <button
      onClick={onClick}
      className="flex w-24 shrink-0 flex-col items-center rounded-2xl border-2 bg-white p-2 shadow-sm"
      style={{ borderColor: selected ? theme.primary : "transparent" }}
    >
      <div className="flex h-14 items-end gap-1">
        {[30, 40, 44, 40, 28].map((h, i) => (
          <span
            key={i}
            className="w-3 rounded-t-full border border-black/5"
            style={{ height: h, background: `linear-gradient(180deg, ${colors[i % colors.length]}, ${colors[(i + 1) % colors.length]})` }}
          />
        ))}
      </div>
      <div className="mt-1.5 line-clamp-2 text-center text-[11px] font-semibold leading-tight text-gray-700">{label}</div>
    </button>
  );
}
