import { atom, PrimitiveAtom } from "jotai";

import { SmartIcon } from "./icons";
import { useTplTheme } from "./theme";

/** Lịch hẹn / đặt chỗ dùng chung cho spa, phòng khám, nhà hàng, khách sạn... */
export interface Booking {
  id: string;
  title: string;
  subtitle?: string;
  /** dd/mm */
  date: string;
  time?: string;
  emoji: string;
  status: "upcoming" | "done" | "cancelled";
}

export function createBookingStore(initial: Booking[] = []): PrimitiveAtom<Booking[]> {
  return atom<Booking[]>(initial);
}

const WEEKDAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

export interface DayOption {
  key: string; // dd/mm
  weekday: string;
  day: number;
}

/** Danh sách `count` ngày kể từ hôm nay. */
export function nextDays(count = 7): DayOption[] {
  const today = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return { key: `${dd}/${mm}`, weekday: i === 0 ? "Hôm nay" : WEEKDAYS[d.getDay()], day: d.getDate() };
  });
}

/** Chọn ngày: hàng ô ngày cuộn ngang. */
export function DayPicker({ value, onChange, days = nextDays() }: { value?: string; onChange: (key: string) => void; days?: DayOption[] }) {
  const theme = useTplTheme();
  return (
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
      {days.map((d) => {
        const active = d.key === value;
        return (
          <button
            key={d.key}
            onClick={() => onChange(d.key)}
            className="flex w-14 shrink-0 flex-col items-center rounded-xl border py-2"
            style={active ? { background: theme.primary, borderColor: theme.primary, color: "#fff" } : { borderColor: "#e5e7eb", background: "#fff" }}
          >
            <span className={`text-[11px] ${active ? "" : "text-gray-500"}`}>{d.weekday}</span>
            <span className="text-lg font-bold">{d.day}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Chọn khung giờ. `busy` là các giờ đã kín. */
export function TimeSlots({
  slots,
  value,
  onChange,
  busy = [],
}: {
  slots: string[];
  value?: string;
  onChange: (slot: string) => void;
  busy?: string[];
}) {
  const theme = useTplTheme();
  return (
    <div className="grid grid-cols-4 gap-2">
      {slots.map((s) => {
        const isBusy = busy.includes(s);
        const active = s === value;
        return (
          <button
            key={s}
            disabled={isBusy}
            onClick={() => onChange(s)}
            className="rounded-lg border py-2 text-sm disabled:bg-gray-100 disabled:text-gray-300 disabled:line-through"
            style={active ? { background: theme.primary, borderColor: theme.primary, color: "#fff" } : { borderColor: "#e5e7eb" }}
          >
            {s}
          </button>
        );
      })}
    </div>
  );
}

export function makeSlots(from: number, to: number, stepMinutes = 30): string[] {
  const out: string[] = [];
  for (let m = from * 60; m < to * 60; m += stepMinutes) {
    out.push(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
  }
  return out;
}

const statusText: Record<Booking["status"], { label: string; color: string }> = {
  upcoming: { label: "Sắp tới", color: "#2563eb" },
  done: { label: "Hoàn thành", color: "#16a34a" },
  cancelled: { label: "Đã huỷ", color: "#9ca3af" },
};

export function BookingCard({ booking, onClick }: { booking: Booking; onClick?: () => void }) {
  const theme = useTplTheme();
  const s = statusText[booking.status];
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 rounded-2xl border border-gray-200/80 bg-white p-3 text-left shadow-sm">
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
        style={{ background: `${theme.primary}14`, color: theme.primary }}
      >
        <SmartIcon token={booking.emoji} size={22} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">{booking.title}</div>
        {booking.subtitle && <div className="truncate text-xs text-gray-500">{booking.subtitle}</div>}
        <div className="mt-0.5 text-xs text-gray-500">
          {booking.time ? `${booking.time} · ` : ""}
          {booking.date}
        </div>
      </div>
      <span className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: `${s.color}1a`, color: s.color }}>
        {s.label}
      </span>
    </button>
  );
}
