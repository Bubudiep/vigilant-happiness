import { useAtom } from "jotai";
import { useNavigate } from "zmp-ui";

import { DayPicker, formatPrice, QtyStepper, Tile, useTplTheme } from "../_shared/kit";
import { path, Room, stayAtom } from "./data";

export function RoomCard({ room, compact }: { room: Room; compact?: boolean }) {
  const navigate = useNavigate();
  const theme = useTplTheme();
  return (
    <button
      onClick={() => navigate(path(`/room/${room.id}`))}
      className={`overflow-hidden rounded-2xl border border-gray-200/80 bg-white text-left shadow-sm ${compact ? "w-60 shrink-0" : "block w-full"}`}
    >
      <div className="relative">
        <Tile seed={room.id} emoji={room.emoji} color={room.color} className={`w-full ${compact ? "h-32" : "h-40"}`} rounded="" size="text-6xl" />
        {room.left && (
          <span className="absolute left-2 top-2 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">Chỉ còn {room.left} phòng</span>
        )}
      </div>
      <div className="p-3">
        <div className="font-semibold">{room.name}</div>
        <div className="text-xs text-gray-500">
          {room.size}m² · {room.bed} · View {room.view}
        </div>
        <div className="mt-2 flex items-end justify-between">
          <div>
            <span className="text-base font-bold" style={{ color: theme.primary }}>
              {formatPrice(room.price)}
            </span>
            <span className="text-xs text-gray-400"> /đêm</span>
          </div>
          {!compact && <span className="text-xs font-semibold" style={{ color: theme.primary }}>Xem phòng ›</span>}
        </div>
      </div>
    </button>
  );
}

/** Ô chọn ngày nhận phòng, số đêm, số khách. */
export function StayPicker() {
  const [stay, setStay] = useAtom(stayAtom);
  return (
    <div className="space-y-3">
      <div>
        <div className="mb-1.5 text-xs font-medium text-gray-500">Ngày nhận phòng</div>
        <DayPicker value={stay.checkIn} onChange={(checkIn) => setStay({ ...stay, checkIn })} />
      </div>
      <div className="flex items-center justify-between text-sm">
        <span>Số đêm</span>
        <QtyStepper value={stay.nights} min={1} onChange={(nights) => setStay({ ...stay, nights })} />
      </div>
      <div className="flex items-center justify-between text-sm">
        <span>Số khách</span>
        <QtyStepper value={stay.guests} min={1} onChange={(guests) => setStay({ ...stay, guests })} />
      </div>
    </div>
  );
}
