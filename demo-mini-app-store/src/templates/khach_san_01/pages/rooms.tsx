import { useAtomValue } from "jotai";

import { TplHeader, TplPage } from "../../_shared/kit";
import { RoomCard } from "../components";
import { rooms, stayAtom } from "../data";

export default function RoomsPage() {
  const stay = useAtomValue(stayAtom);
  const list = rooms.filter((r) => r.maxGuests >= stay.guests);

  return (
    <TplPage tab>
      <TplHeader title="Chọn phòng" back={false}>
        <div className="px-4 pb-2 text-xs text-gray-500">
          Nhận phòng {stay.checkIn} · {stay.nights} đêm · {stay.guests} khách
        </div>
      </TplHeader>
      <div className="mt-3 space-y-3 px-4">
        {list.map((r) => (
          <RoomCard key={r.id} room={r} />
        ))}
        {list.length === 0 && <div className="py-12 text-center text-sm text-gray-400">Không có phòng phù hợp số khách</div>}
      </div>
    </TplPage>
  );
}
