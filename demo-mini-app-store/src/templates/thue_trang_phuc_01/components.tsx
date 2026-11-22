import { useNavigate } from "zmp-ui";

import { formatPrice, Tile, useTplTheme } from "../_shared/kit";
import { Costume, path } from "./data";

export function CostumeCard({ costume, compact }: { costume: Costume; compact?: boolean }) {
  const navigate = useNavigate();
  const theme = useTplTheme();
  return (
    <button
      onClick={() => navigate(path(`/item/${costume.id}`))}
      className={`overflow-hidden rounded-2xl border border-gray-200/80 bg-white text-left shadow-sm ${compact ? "w-36 shrink-0" : ""}`}
    >
      <div className="relative">
        <Tile seed={costume.id} emoji={costume.emoji} color={costume.color} className="aspect-[3/4] w-full" rounded="" size="text-6xl" />
        {costume.stock <= 2 && (
          <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-red-600">
            Còn {costume.stock} bộ
          </span>
        )}
      </div>
      <div className="p-2.5">
        <div className="line-clamp-2 text-sm font-medium leading-snug">{costume.name}</div>
        <div className="mt-1 text-sm">
          <span className="font-bold" style={{ color: theme.primary }}>
            {formatPrice(costume.pricePerDay)}
          </span>
          <span className="text-[11px] text-gray-400">/ngày</span>
        </div>
      </div>
    </button>
  );
}
