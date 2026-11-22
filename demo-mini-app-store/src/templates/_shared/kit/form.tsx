import { ReactNode } from "react";

import { useTplTheme } from "./theme";

const inputClass = "w-full rounded-xl bg-gray-50 px-3 py-2.5 text-sm outline-none ring-1 ring-black/5";

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1.5 text-sm font-medium text-gray-700">{label}</div>
      {children}
    </label>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputClass} ${props.className ?? ""}`} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={3} {...props} className={`${inputClass} ${props.className ?? ""}`} />;
}

/** Chọn một trong vài lựa chọn dạng nút. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: NoInfer<T>; label: string }[];
  value: T;
  onChange: (v: NoInfer<T>) => void;
}) {
  const theme = useTplTheme();
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className="rounded-lg border px-3 py-2 text-sm"
          style={value === o.id ? { background: theme.primary, borderColor: theme.primary, color: "#fff" } : { borderColor: "#e5e7eb", background: "#fff" }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
