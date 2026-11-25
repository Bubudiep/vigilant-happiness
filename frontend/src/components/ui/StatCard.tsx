import type { ReactNode } from "react";

/** Thẻ thống kê: nhãn 12 hoa, giá trị lớn (tabular-nums), chú thích 12. */
export function StatCard({ label, value, hint, tone = "default" }: { label: ReactNode; value: ReactNode; hint?: ReactNode; tone?: "default" | "danger" | "success" | "warning" }) {
  const color = { default: "text-slate-900", danger: "text-red-600", success: "text-emerald-600", warning: "text-amber-600" }[tone];
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-bold tabular-nums ${color}`}>{value}</div>
      {hint && <div className="mt-0.5 text-xs text-slate-500">{hint}</div>}
    </div>
  );
}
