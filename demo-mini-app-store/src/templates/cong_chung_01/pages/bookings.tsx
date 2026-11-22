import { useAtomValue } from "jotai";
import { useNavigate } from "zmp-ui";

import { BookingCard, Card, TplHeader, TplPage, useDemoAction, useTplTheme } from "../../_shared/kit";
import { bookingsAtom, path } from "../data";

export default function BookingsPage() {
  const list = useAtomValue(bookingsAtom);
  const navigate = useNavigate();
  const demoAction = useDemoAction();
  const theme = useTplTheme();

  return (
    <TplPage tab>
      <TplHeader title="Lịch hẹn ký & Tiến độ hồ sơ" back={false} />

      <div className="mt-3 space-y-2.5 px-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold">Hồ sơ đang xử lý ({list.length})</span>
          <button
            onClick={() => navigate(path("/services"))}
            className="text-xs font-semibold"
            style={{ color: theme.primary }}
          >
            + Tạo hồ sơ mới
          </button>
        </div>

        {list.map((b) => (
          <BookingCard key={b.id} booking={b} onClick={() => demoAction("Xem dự thảo hợp đồng đã soạn")} />
        ))}

        <Card className="space-y-2">
          <div className="text-sm font-bold text-gray-900">📄 Bản dự thảo hợp đồng chờ duyệt</div>
          <div className="text-xs text-gray-500">
            Chuyên viên đã soạn xong dự thảo Hợp đồng Chuyển nhượng QSDĐ. Quý khách có thể đọc trước trên Zalo trước khi đến ký.
          </div>
          <button
            onClick={() => demoAction("Mở xem file PDF dự thảo hợp đồng")}
            className="rounded-xl px-4 py-2 text-xs font-bold text-white"
            style={{ background: theme.primary }}
          >
            Xem bản dự thảo PDF
          </button>
        </Card>
      </div>
    </TplPage>
  );
}
