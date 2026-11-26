import type { ReactNode } from "react";

/** Đầu trang quản trị: tiêu đề (text-lg = 14/600) + mô tả (text-xs = 12) bên trái, nút hành động bên phải (xuống dòng trên mobile). */
export function PageHeader({ title, description, actions }: { title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div data-ui="PageHeader" className="mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
      <div className="min-w-0">
        <h2 className="flex items-center gap-2 text-lg font-semibold leading-tight tracking-tight text-slate-900">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
