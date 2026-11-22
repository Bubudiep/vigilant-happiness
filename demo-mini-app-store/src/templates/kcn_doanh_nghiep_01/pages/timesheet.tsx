import { useAtomValue } from "jotai";
import { useState } from "react";
import { useNavigate } from "zmp-ui";

import { Badge, Card, ChipRow, TplHeader, TplPage, useTplTheme } from "../../_shared/kit";
import { attendanceList, checkedOutTodayAtom, employee, path } from "../data";

export default function TimesheetPage() {
  const navigate = useNavigate();
  const theme = useTplTheme();
  const checkedOut = useAtomValue(checkedOutTodayAtom);
  const [filter, setFilter] = useState<"all" | "ot" | "missing">("all");

  const records = attendanceList.map((r, idx) =>
    idx === 0 && checkedOut ? { ...r, checkOut: "16:32", note: "Đủ công" } : r,
  );

  const filtered = records.filter((r) => {
    if (filter === "ot") return r.otHours > 0;
    if (filter === "missing") return r.status === "missing";
    return true;
  });

  return (
    <TplPage tab>
      <TplHeader title="Bảng công & Tăng ca" back={false}>
        <ChipRow
          items={[
            { id: "all", label: "Tất cả ngày" },
            { id: "ot", label: "Có tăng ca (OT)" },
            { id: "missing", label: "Thiếu dữ liệu công" },
          ]}
          value={filter}
          onChange={setFilter}
          className="pb-2"
        />
      </TplHeader>

      <div className="space-y-3 px-4 pt-3">
        <Card className="grid grid-cols-3 divide-x divide-gray-100 text-center text-xs !p-3">
          <div>
            <div className="text-base font-extrabold text-gray-900">22.0</div>
            <div className="text-[11px] text-gray-500">Công thực tế</div>
          </div>
          <div>
            <div className="text-base font-extrabold" style={{ color: theme.accent }}>14.5h</div>
            <div className="text-[11px] text-gray-500">Giờ OT (x1.5)</div>
          </div>
          <div>
            <div className="text-base font-extrabold text-amber-600">1 ngày</div>
            <div className="text-[11px] text-gray-500">Cần giải trình</div>
          </div>
        </Card>

        <div className="text-xs text-gray-500">
          Kỳ công Tháng 11/2026 · {employee.name} ({employee.code})
        </div>

        <div className="space-y-2">
          {filtered.map((r) => (
            <Card key={r.date} className="flex items-center justify-between gap-3 !p-3">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl text-xs font-bold"
                  style={
                    r.status === "missing"
                      ? { background: "#fef2f2", color: "#dc2626" }
                      : { background: `${theme.primary}12`, color: theme.primary }
                  }
                >
                  <span className="text-[10px] font-medium opacity-75">{r.weekday}</span>
                  <span>{r.date}</span>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-gray-900">{r.shift}</span>
                    {r.otHours > 0 && <Badge color={theme.accent}>+{r.otHours}h OT</Badge>}
                  </div>
                  <div className="mt-0.5 text-xs text-gray-500">
                    Vào: <b>{r.checkIn}</b> · Ra: <b>{r.checkOut}</b>
                  </div>
                </div>
              </div>

              {r.status === "missing" ? (
                <button
                  onClick={() => navigate(path("/forms?tab=form&type=explain"))}
                  className="rounded-lg bg-red-600 px-2.5 py-1.5 text-[11px] font-bold text-white"
                >
                  Giải trình
                </button>
              ) : (
                <Badge color={r.status === "leave" ? "#0284c7" : "#16a34a"}>
                  {r.note ?? "Đủ công"}
                </Badge>
              )}
            </Card>
          ))}
        </div>
      </div>
    </TplPage>
  );
}
