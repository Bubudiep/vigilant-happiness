import dayjs from "dayjs";
import { LuCalendarClock, LuClipboardCheck, LuPartyPopper, LuUserRound } from "react-icons/lu";
import type { TreatmentResultCard as Card } from "../data/album-api";

const WEEKDAY = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const when = (date: string, time?: string) => `${WEEKDAY[dayjs(date).day()]} ${dayjs(date).format("DD/MM/YYYY")}${time ? ` · ${time}` : ""}`;

/**
 * TreatmentResultCard — tin nhắn dạng thẻ "Kết quả buổi liệu trình" trong chat với khách.
 * Đầu thẻ: buổi x/y + tên liệu trình + thanh các buổi; thân: ngày giờ, người làm, kết quả; chân: buổi tiếp theo.
 */
export function TreatmentResultCard({ card, footer }: { card: Card; footer?: React.ReactNode }) {
  const finished = !card.next && card.done >= card.total;
  return (
    <div data-ui="TreatmentResultCard" className="w-[290px] overflow-hidden rounded-2xl border border-violet-200 bg-white text-left shadow-sm">
      <div className="bg-gradient-to-br from-violet-600 to-fuchsia-500 px-3 pb-2.5 pt-2 text-white">
        <div className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wide text-white/85">
          <LuClipboardCheck size={12} /> Kết quả buổi {card.seq}/{card.total}
        </div>
        <div className="mt-0.5 text-sm font-semibold leading-snug">{card.treatmentName}</div>
        {/* Thanh các buổi: đã xong = trắng, buổi này = viền sáng */}
        {card.total <= 16 ? (
          <div className="mt-2 flex gap-0.5">
            {Array.from({ length: card.total }, (_, i) => (
              <span
                key={i}
                className={`h-1.5 flex-1 rounded-full ${i + 1 === card.seq ? "bg-white ring-2 ring-white/40" : i < card.done ? "bg-white/90" : "bg-white/25"}`}
              />
            ))}
          </div>
        ) : (
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/25">
            <div className="h-full rounded-full bg-white" style={{ width: `${Math.round((card.done / card.total) * 100)}%` }} />
          </div>
        )}
        <div className="mt-1 text-2xs text-white/80">
          Đã xong {card.done}/{card.total} buổi
        </div>
      </div>
      <div className="space-y-2 px-3 py-2.5 text-xs">
        <div className="flex items-center justify-between gap-2 text-slate-500">
          <span className="tabular-nums">{when(card.date, card.timeSlot)}</span>
          {card.staffName && (
            <span className="inline-flex min-w-0 items-center gap-1 truncate">
              <LuUserRound size={11} /> {card.staffName}
            </span>
          )}
        </div>
        <div className="whitespace-pre-wrap rounded-lg bg-violet-50 px-2.5 py-2 leading-relaxed text-slate-800">{card.result}</div>
        {card.next ? (
          <div className="flex items-center gap-1.5 rounded-lg border border-dashed border-violet-300 px-2.5 py-1.5 text-violet-700">
            <LuCalendarClock size={13} className="shrink-0" />
            <span>
              Buổi tiếp theo ({card.next.seq}): <b className="tabular-nums">{when(card.next.date, card.next.timeSlot)}</b>
            </span>
          </div>
        ) : finished ? (
          <div className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1.5 font-medium text-emerald-700">
            <LuPartyPopper size={13} /> Hoàn thành liệu trình — cảm ơn bạn!
          </div>
        ) : null}
      </div>
      {footer && <div className="border-t border-slate-100 px-3 py-1 text-2xs text-slate-400">{footer}</div>}
    </div>
  );
}
