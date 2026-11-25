import type { ReactNode } from "react";

/** Thẻ thống kê: nhãn 12 hoa, giá trị lớn (tabular-nums), chú thích 12. */
export function StatCard({ label, value, hint, icon, tone = "default" }: { label: ReactNode; value: ReactNode; hint?: ReactNode; icon?: ReactNode; tone?: "default" | "danger" | "success" | "warning" }) {
  const color = { default: "text-slate-900", danger: "text-red-600", success: "text-emerald-600", warning: "text-amber-600" }[tone];
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
        {icon}
      </div>
      <div className={`mt-1 text-xl font-bold tabular-nums ${color}`}>{value}</div>
      {hint && <div className="mt-0.5 text-xs text-slate-500">{hint}</div>}
    </div>
  );
}

/** Lưới chuẩn cho hàng thẻ thống kê (2 cột mobile, 4 cột từ lg). */
export function StatGrid({ children, cols = 4 }: { children: ReactNode; cols?: 3 | 4 }) {
  return <div className={`grid grid-cols-2 gap-3 ${cols === 3 ? "lg:grid-cols-3" : "lg:grid-cols-4"}`}>{children}</div>;
}
