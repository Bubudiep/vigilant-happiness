import { Tooltip } from "antd";
import { STAMP_ICON_GROUPS } from "./icons";

/** Lưới ô biểu tượng tem, chia theo nhóm — dùng được trực tiếp trong Form.Item (nhận value / onChange) */
export function StampIconPicker({ value, onChange }: { value?: string; onChange?: (v: string) => void }) {
  return (
    <div className="max-h-56 space-y-2 overflow-y-auto rounded-xl border border-slate-200 p-2">
      {STAMP_ICON_GROUPS.map((g) => (
        <div key={g.label}>
          <div className="mb-1 text-[11px] text-slate-500">{g.label}</div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(34px,1fr))] gap-1">
            {g.icons.map(({ value: key, label, Icon: Ico }) => (
              <Tooltip key={key} title={label}>
                <button
                  type="button"
                  aria-label={label}
                  aria-pressed={value === key}
                  onClick={() => onChange?.(key)}
                  className={`flex aspect-square items-center justify-center rounded-lg border transition ${
                    value === key ? "border-sky-500 bg-sky-50 text-sky-600" : "border-transparent text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Ico size={17} />
                </button>
              </Tooltip>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
