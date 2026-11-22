import { ReactNode } from "react";

export default function Section({
  id,
  eyebrow,
  title,
  children,
  className = "",
}: {
  id?: string;
  eyebrow?: string;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={`px-4 pt-8 ${className}`}>
      {eyebrow && <div className="text-xs font-semibold uppercase tracking-wider text-brand-600">{eyebrow}</div>}
      <h2 className="mt-0.5 text-xl font-bold text-gray-900">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}
