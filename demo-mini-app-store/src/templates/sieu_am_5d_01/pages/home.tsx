import { useAtom, useAtomValue } from "jotai";
import { LuBell, LuCheckCheck } from "react-icons/lu";
import { useNavigate } from "zmp-ui";

import {
  BookingCard,
  BrandHeader,
  SectionTitle,
  ShortcutGrid,
  TplPage,
  useDemoAction,
  useTplTheme,
} from "../../_shared/kit";
import { MilestoneCard, PackageCard } from "../components";
import {
  appointmentsAtom,
  dailyRemindersAtom,
  milestoneStatus,
  packages,
  path,
  pregnancyMilestones,
  pregnancyWeekAtom,
} from "../data";

export default function HomePage() {
  const navigate = useNavigate();
  const demoAction = useDemoAction();
  const theme = useTplTheme();
  const [week, setWeek] = useAtom(pregnancyWeekAtom);
  const [reminders, setReminders] = useAtom(dailyRemindersAtom);
  const nextAppt = useAtomValue(appointmentsAtom).find((a) => a.status === "upcoming");

  const activeMilestone =
    pregnancyMilestones.find((m) => milestoneStatus(m, week) === "active") ??
    pregnancyMilestones.find((m) => milestoneStatus(m, week) === "upcoming") ??
    pregnancyMilestones[4];

  const toggleDaily = (id: string) => {
    setReminders((list) => list.map((r) => (r.id === id ? { ...r, done: !r.done } : r)));
  };

  return (
    <TplPage tab>
      <BrandHeader
        logo="👶"
        name="BabySee 5D Clinic"
        subtitle="Siêu âm 5D · Theo dõi thai kỳ"
        variant="pastel"
      />

      {/* Thẻ tuần thai gọn gàng */}
      <div className="px-4 pt-3">
        <div
          className="rounded-2xl p-4 text-white shadow-sm"
          style={{ background: "linear-gradient(135deg, #be185d 0%, #db2777 100%)" }}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-pink-100">Dự sinh 12/03/2027 · ~480g</div>
              <div className="mt-0.5 text-lg font-extrabold">Thai kỳ tuần thứ {week}</div>
            </div>
            <div className="flex items-center gap-1 rounded-xl bg-white/15 p-1">
              <button
                onClick={() => setWeek((w) => Math.max(6, w - 1))}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-sm font-bold"
              >
                −
              </button>
              <span className="min-w-[32px] text-center text-xs font-bold">{week}w</span>
              <button
                onClick={() => setWeek((w) => Math.min(40, w + 1))}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-sm font-bold"
              >
                +
              </button>
            </div>
          </div>

          <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/25">
            <div
              className="h-full rounded-full bg-white transition-all"
              style={{ width: `${Math.min(100, Math.round((week / 40) * 100))}%` }}
            />
          </div>

          <div className="mt-2.5 flex items-center justify-between text-xs text-pink-50">
            <span className="truncate">
              Mốc {activeMilestone.label}: <b>{activeMilestone.title}</b>
            </span>
            <button
              onClick={() => navigate(path(`/book/${activeMilestone.packageId}`))}
              className="ml-2 shrink-0 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-pink-700"
            >
              Đặt lịch
            </button>
          </div>
        </div>
      </div>

      {/* 4 lối tắt chính */}
      <div className="mt-3">
        <ShortcutGrid
          cols={4}
          items={[
            { emoji: "📅", label: "Mốc khám", onClick: () => navigate(path("/packages")) },
            { emoji: "👶", label: "Siêu âm 5D", onClick: () => navigate(path("/book/u1")) },
            { emoji: "🎥", label: "Ảnh & Video", onClick: () => navigate(path("/appointments")) },
            { emoji: "👩‍⚕️", label: "Tư vấn BS", onClick: () => demoAction("Nhắn tin Bác sĩ Sản khoa") },
          ]}
        />
      </div>

      {nextAppt && (
        <div className="mt-3 px-4">
          <BookingCard booking={nextAppt} onClick={() => navigate(path("/appointments"))} />
        </div>
      )}

      {/* Lời nhắc trong ngày gọn 1 dòng mỗi mục */}
      <div className="mt-4 px-4">
        <div className="rounded-2xl border border-gray-200/80 bg-white p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-sm font-bold text-gray-900">
              <LuBell size={15} style={{ color: theme.primary }} />
              Lời nhắc hôm nay
            </span>
            <span className="text-xs text-gray-400">
              {reminders.filter((r) => r.done).length}/{reminders.length} hoàn thành
            </span>
          </div>

          <div className="mt-2.5 divide-y divide-gray-100">
            {reminders.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => toggleDaily(r.id)}
                className="flex w-full items-center gap-2.5 py-2 text-left"
              >
                <span className="w-11 shrink-0 text-xs font-semibold text-gray-400">{r.time}</span>
                <span className={`flex-1 truncate text-xs ${r.done ? "text-gray-400 line-through" : "font-medium text-gray-800"}`}>
                  {r.title}
                </span>
                <span
                  className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full text-white"
                  style={{
                    width: 18,
                    height: 18,
                    background: r.done ? "#16a34a" : "#e5e7eb",
                  }}
                >
                  <LuCheckCheck size={11} />
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Lộ trình mốc khám & xét nghiệm */}
      <div className="mt-4">
        <SectionTitle
          title="Lịch khám & Xét nghiệm theo mốc"
          action="Đủ 8 mốc"
          onAction={() => navigate(path("/packages"))}
        />
        <div className="mt-2.5 space-y-2.5 px-4">
          {pregnancyMilestones.slice(2, 6).map((m) => (
            <MilestoneCard key={m.id} milestone={m} currentWeek={week} />
          ))}
        </div>
      </div>

      {/* Gói siêu âm */}
      <div className="mt-4">
        <SectionTitle
          title="Gói siêu âm 5D & NIPT"
          action="Bảng giá"
          onAction={() => navigate(path("/packages"))}
        />
        <div className="mt-2.5 space-y-2.5 px-4">
          {packages.slice(0, 3).map((p) => (
            <PackageCard key={p.id} pkg={p} />
          ))}
        </div>
      </div>
    </TplPage>
  );
}
