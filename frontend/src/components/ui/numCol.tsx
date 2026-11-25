import type { ReactNode } from "react";

/** Cột số/tiền cho antd Table: căn phải + chữ số đều nhau (tabular-nums). Dùng: { title: "Giá", ...numCol((r) => money(r.price)) }. */
export function numCol<T>(render: (row: T) => ReactNode, extra?: { width?: number }) {
  return {
    align: "right" as const,
    ...extra,
    render: (_: unknown, row: T) => <span className="tabular-nums">{render(row)}</span>,
  };
}
