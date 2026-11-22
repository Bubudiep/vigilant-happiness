import { useEffect, useState } from "react";

import { formatPrice, useTplTheme } from "../_shared/kit";
import { PoolTable, TableStatus, tableLabel, typeOf } from "./data";

export const statusStyle: Record<TableStatus, { label: string; bg: string; fg: string }> = {
  free: { label: "Trống", bg: "#dcfce7", fg: "#15803d" },
  playing: { label: "Đang chơi", bg: "#fee2e2", fg: "#b91c1c" },
  reserved: { label: "Đã đặt", bg: "#fef3c7", fg: "#b45309" },
};

/** Ô bàn trên sơ đồ: mặt bàn nỉ xanh + trạng thái. */
export function TableTile({ table, selected, onClick }: { table: PoolTable; selected?: boolean; onClick?: () => void }) {
  const theme = useTplTheme();
  const s = statusStyle[table.status];
  const free = table.status === "free";
  return (
    <button
      disabled={!free}
      onClick={onClick}
      className="rounded-xl border-2 bg-white p-1.5 text-left disabled:opacity-80"
      style={{ borderColor: selected ? theme.accent : "transparent", boxShadow: "0 1px 3px rgba(0,0,0,.08)" }}
    >
      <div
        className="relative flex aspect-[2/1] items-center justify-center rounded-lg border-4"
        style={{ background: free ? "#15803d" : "#4b5563", borderColor: "#5b3a1e" }}
      >
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className="absolute h-1.5 w-1.5 rounded-full bg-black"
            style={{ [i < 2 ? "top" : "bottom"]: 1, [i % 2 ? "right" : "left"]: 1 } as React.CSSProperties}
          />
        ))}
        <span className="text-sm font-bold text-white">{String(table.no).padStart(2, "0")}</span>
      </div>
      <div className="mt-1 flex items-center justify-between gap-1">
        <span className="truncate text-[10px] text-gray-500">{typeOf(table.type).label.split(" ")[0]}</span>
        <span className="rounded px-1 text-[9px] font-semibold" style={{ background: s.bg, color: s.fg }}>
          {table.status === "playing" ? `${table.minutes}′` : s.label}
        </span>
      </div>
    </button>
  );
}

/** Thẻ phiên chơi đang chạy: đồng hồ + tiền giờ cập nhật mỗi giây. */
export function LiveSession({ table, start, onOrder, onPay }: { table: PoolTable; start: number; onOrder: () => void; onPay: () => void }) {
  const theme = useTplTheme();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const sec = Math.floor((now - start) / 1000);
  const hh = String(Math.floor(sec / 3600)).padStart(2, "0");
  const mm = String(Math.floor((sec % 3600) / 60)).padStart(2, "0");
  const ss = String(sec % 60).padStart(2, "0");
  const price = typeOf(table.type).pricePerHour;
  const cost = Math.ceil(((sec / 3600) * price) / 1000) * 1000;

  return (
    <div className="rounded-2xl p-4 text-white" style={{ background: `linear-gradient(135deg, ${theme.primary}, #064e3b)` }}>
      <div className="flex items-center justify-between">
        <span className="text-sm opacity-90">
          🎱 Bạn đang chơi · <b>{tableLabel(table)}</b> · {typeOf(table.type).label}
        </span>
        <span className="flex items-center gap-1 text-[11px]">
          <span className="h-2 w-2 animate-pulse rounded-full bg-red-400" /> LIVE
        </span>
      </div>
      <div className="mt-2 flex items-end justify-between">
        <div className="font-mono text-4xl font-bold tracking-wider">
          {hh}:{mm}
          <span className="text-xl opacity-70">:{ss}</span>
        </div>
        <div className="text-right">
          <div className="text-[11px] opacity-80">Tiền giờ tạm tính</div>
          <div className="text-lg font-bold" style={{ color: theme.accent }}>
            {formatPrice(cost)}
          </div>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <button onClick={onOrder} className="flex-1 rounded-lg bg-white/15 py-2 text-sm font-semibold">
          🥤 Gọi đồ lên bàn
        </button>
        <button onClick={onPay} className="flex-1 rounded-lg py-2 text-sm font-semibold text-gray-900" style={{ background: theme.accent }}>
          Thanh toán
        </button>
      </div>
    </div>
  );
}
