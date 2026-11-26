import { LuCalendarClock, LuClipboardCheck, LuPartyPopper, LuUserRound } from "react-icons/lu";
import type { ShopTreatmentCard } from "./shop-api";

const WEEKDAY = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const when = (date: string, time?: string) => {
  const [y, m, d] = date.split("-").map(Number);
  const wd = WEEKDAY[new Date(y, m - 1, d).getDay()];
  return `${wd} ${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}${time ? ` · ${time}` : ""}`;
};

/**
 * TreatmentResultCard — tin "Kết quả buổi liệu trình" cửa hàng gửi khách (hộp thư Mini App).
 * Màu đầu thẻ theo màu chính của cửa hàng.
 */
export function TreatmentResultCard({ card, primary, time }: { card: ShopTreatmentCard; primary: string; time: string }) {
  const finished = !card.next && card.done >= card.total;
  return (
    <div className="w-[82%] max-w-[300px] overflow-hidden rounded-2xl bg-white shadow-sm">
      <div className="px-3.5 pb-3 pt-2.5 text-white" style={{ background: `linear-gradient(135deg, ${primary}, ${primary}bb)` }}>
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-white/85">
          <LuClipboardCheck size={13} /> Kết quả buổi {card.seq}/{card.total}
        </div>
        <div className="mt-0.5 text-[15px] font-bold leading-snug">{card.treatmentName}</div>
        {card.total <= 16 ? (
          <div className="mt-2 flex gap-[3px]">
            {Array.from({ length: card.total }, (_, i) => (
              <span key={i} className={`h-1.5 flex-1 rounded-full ${i < card.done ? "bg-white" : "bg-white/30"}`} />
            ))}
          </div>
        ) : (
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/30">
            <div className="h-full rounded-full bg-white" style={{ width: `${Math.round((card.done / card.total) * 100)}%` }} />
          </div>
        )}
        <div className="mt-1 text-[11px] text-white/85">
          Đã xong {card.done}/{card.total} buổi
        </div>
      </div>
      <div className="space-y-2 px-3.5 py-3 text-[13px]">
        <div className="flex items-center justify-between gap-2 text-[12px] text-slate-500">
          <span>{when(card.date, card.timeSlot)}</span>
          {card.staffName && (
            <span className="inline-flex min-w-0 items-center gap-1 truncate">
              <LuUserRound size={12} /> {card.staffName}
            </span>
          )}
        </div>
        <div className="whitespace-pre-wrap rounded-xl bg-slate-50 px-3 py-2 leading-relaxed text-slate-800">{card.result}</div>
        {card.next ? (
          <div className="flex items-center gap-2 rounded-xl border border-dashed px-3 py-2 text-[12px]" style={{ borderColor: `${primary}66`, color: primary }}>
            <LuCalendarClock size={15} className="shrink-0" />
            <span>
              Buổi tiếp theo: <b>{when(card.next.date, card.next.timeSlot)}</b>
            </span>
          </div>
        ) : finished ? (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-[12px] font-semibold text-emerald-700">
            <LuPartyPopper size={15} /> Bạn đã hoàn thành liệu trình!
          </div>
        ) : null}
      </div>
      <div className="border-t border-slate-100 px-3.5 py-1 text-[10px] text-slate-400">{time}</div>
    </div>
  );
}
