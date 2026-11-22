import { useAtom } from "jotai";
import { LuBell, LuCheckCheck, LuClock } from "react-icons/lu";
import { useNavigate, useSnackbar } from "zmp-ui";

import { Badge, formatPrice, Tile, useTplTheme } from "../_shared/kit";
import {
  milestoneReminderAtom,
  milestoneStatus,
  path,
  PregnancyMilestone,
  UltrasoundPackage,
} from "./data";

export function PackageCard({ pkg }: { pkg: UltrasoundPackage }) {
  const navigate = useNavigate();
  const theme = useTplTheme();
  const price = pkg.salePrice ?? pkg.price;

  return (
    <div
      onClick={() => navigate(path(`/book/${pkg.id}`))}
      className="flex cursor-pointer items-center gap-3 rounded-2xl border border-gray-200/80 bg-white p-3 shadow-sm"
    >
      <Tile seed={pkg.id} emoji={pkg.emoji} color={pkg.color} className="h-16 w-16" rounded="rounded-xl" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <Badge color={pkg.color}>{pkg.tag}</Badge>
          <span className="flex items-center gap-0.5 text-[11px] text-gray-400">
            <LuClock size={11} /> {pkg.duration}p · {pkg.weeks}
          </span>
        </div>
        <div className="mt-1 truncate text-sm font-bold text-gray-900">{pkg.name}</div>
        <div className="mt-1 flex items-center justify-between">
          <div className="flex items-baseline gap-1.5">
            <span className="text-sm font-bold" style={{ color: theme.primary }}>
              {formatPrice(price)}
            </span>
            {pkg.salePrice && (
              <span className="text-[11px] text-gray-400 line-through">{formatPrice(pkg.price)}</span>
            )}
          </div>
          <span
            className="rounded-full px-3 py-1 text-xs font-semibold text-white"
            style={{ background: theme.primary }}
          >
            Đặt lịch
          </span>
        </div>
      </div>
    </div>
  );
}

/** Thẻ Mốc khám thai & Xét nghiệm tinh gọn. */
export function MilestoneCard({
  milestone,
  currentWeek,
}: {
  milestone: PregnancyMilestone;
  currentWeek: number;
}) {
  const navigate = useNavigate();
  const { openSnackbar } = useSnackbar();
  const theme = useTplTheme();
  const [reminders, setReminders] = useAtom(milestoneReminderAtom);

  const status = milestoneStatus(milestone, currentWeek);
  const reminded = !!reminders[milestone.id];

  const toggleRemind = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !reminded;
    setReminders((r) => ({ ...r, [milestone.id]: next }));
    openSnackbar({
      text: next ? `Đã bật nhắc mốc ${milestone.label}` : `Đã tắt nhắc mốc ${milestone.label}`,
      type: "success",
      duration: 1500,
    });
  };

  return (
    <div
      className={`rounded-2xl border bg-white p-3.5 shadow-sm ${
        status === "active" ? "border-pink-500" : "border-gray-200/80"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className="shrink-0 rounded-md px-2 py-0.5 text-[11px] font-bold text-white"
            style={{
              background:
                status === "done"
                  ? "#16a34a"
                  : status === "active"
                    ? theme.primary
                    : "#64748b",
            }}
          >
            {milestone.label}
          </span>
          <span className="truncate text-sm font-bold text-gray-900">{milestone.title}</span>
        </div>

        <button
          type="button"
          onClick={toggleRemind}
          className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
            reminded
              ? "border-pink-200 bg-pink-50 text-pink-700"
              : "border-gray-200 bg-gray-50 text-gray-500"
          }`}
        >
          {status === "done" ? (
            <>
              <LuCheckCheck size={11} className="text-emerald-600" /> Đã khám
            </>
          ) : (
            <>
              <LuBell size={11} /> {reminded ? "Đang nhắc" : "Nhắc lịch"}
            </>
          )}
        </button>
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        {milestone.tests.map((t) => (
          <span key={t} className="rounded-md bg-gray-100 px-2 py-0.5 text-[11px] text-gray-700">
            {t}
          </span>
        ))}
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 border-t border-gray-100 pt-2">
        <span className="line-clamp-1 text-[11px] text-gray-500">{milestone.prepNote}</span>
        <button
          type="button"
          onClick={() => navigate(path(`/book/${milestone.packageId}`))}
          className="shrink-0 text-xs font-bold"
          style={{ color: theme.primary }}
        >
          Đặt khám ›
        </button>
      </div>
    </div>
  );
}
