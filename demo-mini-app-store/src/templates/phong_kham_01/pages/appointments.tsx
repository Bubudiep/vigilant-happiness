import { useAtomValue } from "jotai";
import { useState } from "react";
import { useNavigate } from "zmp-ui";

import { BookingCard, EmptyState, Segmented, TplHeader, TplPage, useDemoAction } from "../../_shared/kit";
import { appointmentsAtom, path } from "../data";

export default function AppointmentsPage() {
  const appointments = useAtomValue(appointmentsAtom);
  const navigate = useNavigate();
  const demoAction = useDemoAction();
  const [tab, setTab] = useState<"upcoming" | "history">("upcoming");
  const list = appointments.filter((a) => (tab === "upcoming" ? a.status === "upcoming" : a.status !== "upcoming"));

  return (
    <TplPage tab>
      <TplHeader title="Lịch khám" back={false}>
        <div className="px-4 pb-2">
          <Segmented
            options={[
              { id: "upcoming", label: "Sắp tới" },
              { id: "history", label: "Đã khám" },
            ]}
            value={tab}
            onChange={setTab}
          />
        </div>
      </TplHeader>

      {list.length === 0 ? (
        <EmptyState
          emoji="📅"
          text={tab === "upcoming" ? "Bạn chưa có lịch khám nào" : "Chưa có lịch sử khám"}
          action="Đặt lịch khám"
          onAction={() => navigate(path("/doctors"), { replace: true, direction: "backward" })}
        />
      ) : (
        <div className="mt-3 space-y-2 px-4">
          {list.map((a) => (
            <BookingCard
              key={a.id}
              booking={a}
              onClick={() => demoAction(a.status === "done" ? "Xem kết quả & đơn thuốc" : "Đổi / huỷ lịch khám")}
            />
          ))}
        </div>
      )}
    </TplPage>
  );
}
