import { useAtomValue } from "jotai";
import { useState } from "react";
import { useNavigate } from "zmp-ui";

import { BookingCard, EmptyState, Segmented, TplHeader, TplPage, useDemoAction } from "../../_shared/kit";
import { bookingsAtom, path } from "../data";

export default function BookingsPage() {
  const bookings = useAtomValue(bookingsAtom);
  const navigate = useNavigate();
  const demoAction = useDemoAction();
  const [tab, setTab] = useState<"upcoming" | "history">("upcoming");
  const list = bookings.filter((b) => (tab === "upcoming" ? b.status === "upcoming" : b.status !== "upcoming"));

  return (
    <TplPage tab>
      <TplHeader title="Lịch hẹn của tôi" back={false}>
        <div className="px-4 pb-2">
          <Segmented
            options={[
              { id: "upcoming", label: "Sắp tới" },
              { id: "history", label: "Lịch sử" },
            ]}
            value={tab}
            onChange={setTab}
          />
        </div>
      </TplHeader>

      {list.length === 0 ? (
        <EmptyState
          emoji="📅"
          text={tab === "upcoming" ? "Bạn chưa có lịch hẹn nào" : "Chưa có lịch sử"}
          action="Đặt lịch ngay"
          onAction={() => navigate(path("/services"), { replace: true, direction: "backward" })}
        />
      ) : (
        <div className="mt-3 space-y-2 px-4">
          {list.map((b) => (
            <BookingCard key={b.id} booking={b} onClick={() => demoAction("Chi tiết / đổi lịch hẹn")} />
          ))}
        </div>
      )}
    </TplPage>
  );
}
