import { Tabs } from "antd";
import type { ReactNode } from "react";

export interface SectionTab {
  key: string;
  label: string;
  icon?: ReactNode;
  badge?: number;
  /** Badge đỏ (VD tin chưa đọc) */
  alert?: boolean;
}

/** Tab đầu trang cho các mục gộp trên menu trái (VD Thư viện = Album · Kho ảnh · Tài liệu) */
export function SectionTabs({ items, active, onChange }: { items: SectionTab[]; active: string; onChange: (key: string) => void }) {
  return (
    <Tabs
      activeKey={active}
      onChange={onChange}
      className="!mb-3"
      data-ui="SectionTabs"
      items={items.map((it) => ({
        key: it.key,
        label: (
          <span className="flex items-center gap-1.5 [&>svg]:h-3.5 [&>svg]:w-3.5">
            {it.icon}
            {it.label}
            {!!it.badge && (
              <span
                className={`rounded px-1 text-2xs font-semibold leading-[14px] tabular-nums ${it.alert ? "bg-red-600 text-white" : "bg-slate-100 text-slate-600"}`}
              >
                {it.badge}
              </span>
            )}
          </span>
        ),
      }))}
    />
  );
}
