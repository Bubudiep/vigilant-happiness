import { useAtomValue } from "jotai";
import { useState } from "react";
import { useNavigate } from "zmp-ui";

import { BookingCard, EmptyState, Segmented, TplHeader, TplPage, useDemoAction } from "../../_shared/kit";
import { path, rentalsAtom } from "../data";

export default function RentalsPage() {
  const rentals = useAtomValue(rentalsAtom);
  const navigate = useNavigate();
  const demoAction = useDemoAction();
  const [tab, setTab] = useState<"upcoming" | "history">("upcoming");
  const list = rentals.filter((r) => (tab === "upcoming" ? r.status === "upcoming" : r.status !== "upcoming"));

  return (
    <TplPage tab>
      <TplHeader title="Lịch thuê đồ" back={false}>
        <div className="px-4 pb-2">
          <Segmented
            options={[
              { id: "upcoming", label: "Sắp nhận / đang thuê" },
              { id: "history", label: "Đã trả" },
            ]}
            value={tab}
            onChange={setTab}
          />
        </div>
      </TplHeader>
      {list.length === 0 ? (
        <EmptyState
          emoji="👗"
          text={tab === "upcoming" ? "Bạn chưa thuê bộ nào" : "Chưa có lịch sử thuê"}
          action="Chọn trang phục"
          onAction={() => navigate(path("/catalog"), { replace: true, direction: "backward" })}
        />
      ) : (
        <div className="space-y-2 px-4 pt-3">
          {list.map((r) => (
            <BookingCard key={r.id} booking={r} onClick={() => demoAction("Gia hạn / đổi ngày thuê")} />
          ))}
          {tab === "upcoming" && (
            <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
              🔔 Tiệm sẽ nhắc bạn qua Zalo 1 ngày trước ngày nhận và ngày trả đồ.
            </div>
          )}
        </div>
      )}
    </TplPage>
  );
}
