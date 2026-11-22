import { useAtomValue } from "jotai";
import { useNavigate } from "zmp-ui";

import { BookingCard, Card, SectionTitle, TplHeader, TplPage, useDemoAction, useTplTheme } from "../../_shared/kit";
import { appointmentsAtom, babyPhotos, path } from "../data";

export default function AppointmentsPage() {
  const list = useAtomValue(appointmentsAtom);
  const navigate = useNavigate();
  const demoAction = useDemoAction();
  const theme = useTplTheme();

  return (
    <TplPage tab>
      <TplHeader title="Lịch khám & Album 5D" back={false} />

      <div className="mt-3 space-y-2 px-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold">Lịch hẹn của mẹ ({list.length})</span>
          <button
            onClick={() => navigate(path("/packages"))}
            className="text-xs font-semibold"
            style={{ color: theme.primary }}
          >
            + Đặt lịch mới
          </button>
        </div>
        {list.map((b) => (
          <BookingCard key={b.id} booking={b} onClick={() => demoAction("Chi tiết phiếu hẹn & mã QR ưu tiên")} />
        ))}
      </div>

      <div className="mt-5">
        <SectionTitle
          title="🎬 Thư viện Ảnh & Video 5D của bé"
          subtitle="Lưu giữ trọn vẹn hành trình 9 tháng 10 ngày"
        />
        <div className="mt-3 space-y-2.5 px-4">
          {babyPhotos.map((ph) => (
            <Card
              key={ph.id}
              className="flex items-center gap-3 !p-3"
              onClick={() => demoAction(`Phát video 5D & tải ảnh HD: ${ph.title}`)}
            >
              <div
                className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-xl text-white"
                style={{ background: `linear-gradient(135deg, ${ph.color}, #f59e0b)` }}
              >
                <span className="text-base font-black">▶ 5D</span>
                <span className="text-[9px] opacity-90">{ph.date}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold text-gray-900">{ph.title}</div>
                <div className="mt-0.5 text-xs text-gray-500">
                  Cân nặng: {ph.weight} · ĐKLĐ: {ph.bpd} · Tim thai: {ph.hr}
                </div>
                <div className="mt-1 text-xs font-semibold" style={{ color: theme.primary }}>
                  Tải ảnh gốc & chia sẻ gia đình ›
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </TplPage>
  );
}
