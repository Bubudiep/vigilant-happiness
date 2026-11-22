import { useAtomValue } from "jotai";
import { useNavigate } from "zmp-ui";

import { BookingCard, EmptyState, TplHeader, TplPage, useDemoAction } from "../../_shared/kit";
import { myBookingsAtom, path } from "../data";

export default function BookingsPage() {
  const bookings = useAtomValue(myBookingsAtom);
  const navigate = useNavigate();
  const demoAction = useDemoAction();

  return (
    <TplPage tab>
      <TplHeader title="Phòng đã đặt" back={false} />
      {bookings.length === 0 ? (
        <EmptyState
          emoji="🧳"
          text="Bạn chưa đặt phòng nào"
          action="Tìm phòng"
          onAction={() => navigate(path("/rooms"), { replace: true, direction: "backward" })}
        />
      ) : (
        <div className="mt-3 space-y-2 px-4">
          {bookings.map((b) => (
            <BookingCard key={b.id} booking={b} onClick={() => demoAction("Check-in online / đổi ngày")} />
          ))}
        </div>
      )}
    </TplPage>
  );
}
