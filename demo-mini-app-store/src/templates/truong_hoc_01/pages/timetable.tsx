import { useState } from "react";

import { ChipRow, TplHeader, TplPage, useTplTheme } from "../../_shared/kit";
import { periodTimes, student, timetable, weekdays } from "../data";

export default function TimetablePage() {
  const theme = useTplTheme();
  const dow = new Date().getDay();
  const [day, setDay] = useState(dow >= 1 && dow <= 5 ? String(dow + 1) : "2");

  return (
    <TplPage tab>
      <TplHeader title={`Thời khoá biểu · Lớp ${student.className}`} back={false}>
        <ChipRow items={weekdays} value={day} onChange={setDay} className="pb-2" />
      </TplHeader>

      <div className="mt-3 space-y-2 px-4">
        <div className="text-xs font-semibold uppercase text-gray-400">Buổi sáng</div>
        {timetable[day].map((p, i) => (
          <div key={i} className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm">
            <div className="w-14 text-center">
              <div className="text-[11px] text-gray-400">Tiết {i + 1}</div>
              <div className="text-sm font-semibold" style={{ color: theme.primary }}>
                {periodTimes[i]}
              </div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-50 text-xl">{p.emoji}</div>
            <div className="flex-1">
              <div className="text-sm font-semibold">{p.subject}</div>
              {p.teacher && <div className="text-xs text-gray-500">{p.teacher}</div>}
            </div>
          </div>
        ))}
        <div className="pt-2 text-xs font-semibold uppercase text-gray-400">Buổi chiều</div>
        <div className="rounded-2xl bg-white p-3 text-sm text-gray-500 shadow-sm">🏃 14:00 – 16:00 · Câu lạc bộ & tự học có giám sát</div>
      </div>
    </TplPage>
  );
}
