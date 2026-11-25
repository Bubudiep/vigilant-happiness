import type { ReactNode } from "react";

/** Khối nội dung: viền slate-200, nền trắng; tiêu đề khối 15/600 + phần phụ bên phải. */
export function SectionCard({
  title,
  description,
  extra,
  children,
  className = "",
}: {
  title?: ReactNode;
  description?: ReactNode;
  extra?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-xl border border-slate-200 bg-white p-4 sm:p-5 ${className}`}>
      {(title || extra) && (
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            {title && <h3 className="text-base font-semibold text-slate-900">{title}</h3>}
            {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
          </div>
          {extra && <div className="flex flex-wrap items-center gap-2">{extra}</div>}
        </div>
      )}
      {children}
    </section>
  );
}
