import { useAtom } from "jotai";
import { useEffect, useState } from "react";
import { useSnackbar } from "zmp-ui";

import { formatPrice, useTplTheme } from "../_shared/kit";
import { Machine, machineLabel, MachineStatus, topups, walletAtom, zoneOf } from "./data";

export const statusStyle: Record<MachineStatus, { label: string; bg: string; fg: string }> = {
  free: { label: "Trống", bg: "#dcfce7", fg: "#15803d" },
  busy: { label: "Đang chơi", bg: "#ede9fe", fg: "#6d28d9" },
  reserved: { label: "Đã đặt", bg: "#fef3c7", fg: "#b45309" },
};

/** Ô máy trên sơ đồ: màn hình + trạng thái. */
export function MachineTile({ machine, selected, onClick }: { machine: Machine; selected?: boolean; onClick?: () => void }) {
  const theme = useTplTheme();
  const s = statusStyle[machine.status];
  const free = machine.status === "free";
  return (
    <button
      disabled={!free}
      onClick={onClick}
      className="rounded-xl border-2 bg-white p-1.5 text-left disabled:opacity-80"
      style={{ borderColor: selected ? theme.accent : "transparent", boxShadow: "0 1px 3px rgba(0,0,0,.08)" }}
    >
      <div
        className="flex aspect-[16/10] items-center justify-center rounded-md text-sm font-black text-white"
        style={{ background: free ? `linear-gradient(135deg, ${theme.primary}, ${theme.accent})` : "#334155" }}
      >
        {String(machine.no).padStart(2, "0")}
      </div>
      <div className="mx-auto h-1 w-3 bg-gray-300" />
      <div className="mt-0.5 flex items-center justify-center">
        <span className="rounded px-1 text-[9px] font-semibold" style={{ background: s.bg, color: s.fg }}>
          {machine.status === "busy" && machine.left ? `còn ${machine.left}′` : s.label}
        </span>
      </div>
    </button>
  );
}

/** Phiên đang chơi: đồng hồ đếm ngược thời gian còn lại trong ví. */
export function LiveSession({ machine, onOrder, onTopup }: { machine: Machine; onOrder: () => void; onTopup: () => void }) {
  const theme = useTplTheme();
  const [wallet] = useAtom(walletAtom);
  const [start] = useState(Date.now());
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const leftSec = Math.max(0, wallet.minutes * 60 - Math.floor((now - start) / 1000));
  const hh = String(Math.floor(leftSec / 3600)).padStart(2, "0");
  const mm = String(Math.floor((leftSec % 3600) / 60)).padStart(2, "0");
  const ss = String(leftSec % 60).padStart(2, "0");
  return (
    <div className="mx-4 overflow-hidden rounded-2xl text-white shadow-sm" style={{ background: "linear-gradient(135deg, #1e1b4b, #4c1d95)" }}>
      <div className="flex items-center justify-between px-4 pt-3 text-xs">
        <span className="flex items-center gap-1.5 font-semibold">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" /> Đang chơi · {machineLabel(machine)}
        </span>
        <span className="opacity-70">{zoneOf(machine.zone).label}</span>
      </div>
      <div className="px-4 pb-3 pt-1">
        <div className="font-mono text-4xl font-black tracking-wider" style={{ color: theme.accent }}>
          {hh}:{mm}:{ss}
        </div>
        <div className="text-[11px] opacity-70">Thời gian còn lại · ví {formatPrice(wallet.balance)}</div>
      </div>
      <div className="grid grid-cols-2 border-t border-white/10 text-sm font-bold">
        <button onClick={onOrder} className="py-2.5">
          🍜 Gọi đồ tới máy
        </button>
        <button onClick={onTopup} className="border-l border-white/10 py-2.5" style={{ color: theme.accent }}>
          ⚡ Nạp thêm giờ
        </button>
      </div>
    </div>
  );
}

/** Lưới gói nạp ví (demo). */
export function TopupGrid() {
  const theme = useTplTheme();
  const { openSnackbar } = useSnackbar();
  const [wallet, setWallet] = useAtom(walletAtom);
  return (
    <div className="grid grid-cols-2 gap-2.5 px-4">
      {topups.map((t) => (
        <button
          key={t.amount}
          onClick={() => {
            const total = t.amount + t.bonus;
            setWallet({ balance: wallet.balance + total, minutes: wallet.minutes + Math.round((total / 15000) * 60) });
            openSnackbar({ text: `Đã nạp ${formatPrice(t.amount)}${t.bonus ? ` (+${formatPrice(t.bonus)} thưởng)` : ""} qua ZaloPay (demo)`, type: "success" });
          }}
          className="rounded-2xl border border-gray-200/80 bg-white p-3 text-left shadow-sm"
        >
          <div className="text-base font-black" style={{ color: theme.primary }}>
            {formatPrice(t.amount)}
          </div>
          <div className="text-[11px] text-gray-500">{t.bonus ? `Tặng thêm ${formatPrice(t.bonus)}` : "Không khuyến mãi"}</div>
        </button>
      ))}
    </div>
  );
}
