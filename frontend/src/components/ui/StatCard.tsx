import type { ReactNode } from "react";

/** Thẻ thống kê: nhãn 12 (1 dòng), giá trị lớn (tabular-nums), chú thích 12. */
export function StatCard({ label, value, hint, icon, tone = "default" }: { label: ReactNode; value: ReactNode; hint?: ReactNode; icon?: ReactNode; tone?: "default" | "danger" | "success" | "warning" }) {
  const color = { default: "text-slate-900", danger: "text-red-600", success: "text-emerald-600", warning: "text-amber-600" }[tone];
  return (
    <div className="min-w-0 rounded-lg border border-slate-200 bg-white px-3.5 py-3 transition hover:border-slate-300">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 truncate text-3xs font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</div>
        {icon}
      </div>
      <div className={`mt-1 text-xl font-semibold tabular-nums tracking-tight ${color}`}>{value}</div>
      {hint && <div className="mt-0.5 truncate text-2xs text-slate-400">{hint}</div>}
    </div>
  );
}

/** Lưới chuẩn cho hàng thẻ thống kê (2 cột mobile, 4 cột từ lg). */
export function StatGrid({ children, cols = 4 }: { children: ReactNode; cols?: 3 | 4 }) {
  return <div className={`grid grid-cols-2 gap-3 ${cols === 3 ? "lg:grid-cols-3" : "lg:grid-cols-4"}`}>{children}</div>;
}
