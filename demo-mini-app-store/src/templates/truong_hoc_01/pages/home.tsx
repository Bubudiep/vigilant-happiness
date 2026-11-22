import { useNavigate } from "zmp-ui";

import {
  BrandHeader,
  Card,
  SectionTitle,
  ShortcutGrid,
  TplPage,
  useDemoAction,
  useTplTheme,
  ZaloOACard,
} from "../../_shared/kit";
import { NoticeCard } from "../components";
import { notices, path, periodTimes, student, timetable } from "../data";

export default function HomePage() {
  const navigate = useNavigate();
  const demoAction = useDemoAction();
  const theme = useTplTheme();

  const dow = new Date().getDay();
  const todayKey = dow >= 1 && dow <= 5 ? String(dow + 1) : "2";
  const today = timetable[todayKey];

  return (
    <TplPage tab>
      <BrandHeader logo="🏫" name="THCS Ánh Sao" subtitle="Sổ liên lạc điện tử Nhà trường – Phụ huynh" variant="solid" />

      <div className="px-4 pt-3">
        <div
          className="relative overflow-hidden rounded-2xl p-4 text-white shadow-md"
          style={{ background: `linear-gradient(135deg, ${theme.primary}, #7c74f0)` }}
        >
          <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-white/10" />
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 text-2xl shadow-sm">
              🧑‍🎓
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-bold">{student.name}</span>
                <span className="rounded-full bg-emerald-400/25 px-2 py-0.5 text-[10px] font-bold text-emerald-100">
                  ● Đã vào lớp 07:15
                </span>
              </div>
              <div className="text-xs opacity-90">
                Lớp {student.className} · GVCN: {student.teacher}
              </div>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-xl bg-white/15 py-2 backdrop-blur-sm">
              <div className="text-base font-extrabold">8.7</div>ĐTB HK1
            </div>
            <div className="rounded-xl bg-white/15 py-2 backdrop-blur-sm">
              <div className="text-base font-extrabold">98%</div>Chuyên cần
            </div>
            <div className="rounded-xl bg-white/15 py-2 backdrop-blur-sm">
              <div className="text-base font-extrabold">Tốt</div>Hạnh kiểm
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <ShortcutGrid
          variant="card"
          cols={4}
          items={[
            { emoji: "📊", label: "Điểm số", badge: "Mới", onClick: () => demoAction("Sổ điểm điện tử") },
            { emoji: "💳", label: "Học phí", onClick: () => navigate(path("/fees")) },
            { emoji: "📝", label: "Xin nghỉ", onClick: () => navigate(path("/leave")) },
            { emoji: "🍱", label: "Thực đơn", onClick: () => demoAction("Thực đơn bán trú") },
            { emoji: "✅", label: "Điểm danh", onClick: () => demoAction("Điểm danh khuôn mặt") },
            { emoji: "🚌", label: "Xe đưa đón", badge: "GPS", onClick: () => demoAction("Theo dõi xe đưa đón") },
            { emoji: "🏆", label: "Ngoại khoá", onClick: () => demoAction("Hoạt động ngoại khoá") },
            { emoji: "💬", label: "Nhắn GVCN", onClick: () => demoAction("Nhắn tin giáo viên") },
          ]}
        />
      </div>

      <div className="mt-5">
        <SectionTitle
          title="📚 Thời khoá biểu hôm nay"
          subtitle="5 tiết buổi sáng"
          action="Xem cả tuần"
          onAction={() => navigate(path("/timetable"))}
        />
        <div className="mt-3 px-4">
          <Card className="divide-y divide-gray-100 !py-1">
            {today.slice(0, 3).map((p, i) => (
              <div key={i} className="flex items-center gap-3 py-2.5 text-sm">
                <span className="w-12 rounded-md bg-indigo-50 py-0.5 text-center text-xs font-semibold text-indigo-600">
                  {periodTimes[i]}
                </span>
                <span className="text-lg">{p.emoji}</span>
                <span className="flex-1 font-medium">{p.subject}</span>
                <span className="text-xs text-gray-500">{p.teacher}</span>
              </div>
            ))}
          </Card>
        </div>
      </div>

      <div className="mt-5">
        <SectionTitle title="🔔 Thông báo từ nhà trường" action="Tất cả" onAction={() => navigate(path("/notices"))} />
        <div className="mt-3 space-y-2 px-4">
          {notices.slice(0, 3).map((n) => (
            <NoticeCard key={n.id} notice={n} />
          ))}
        </div>
      </div>

      <div className="mt-5">
        <ZaloOACard
          name="Trường THCS Ánh Sao"
          subtitle="Nhận tin nhắn điểm danh & thông báo khẩn qua Zalo"
          logo="🏫"
        />
      </div>
    </TplPage>
  );
}
