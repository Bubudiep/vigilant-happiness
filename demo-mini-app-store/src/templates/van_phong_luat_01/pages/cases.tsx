import { useAtomValue } from "jotai";
import { useNavigate } from "zmp-ui";

import { BookingCard, Card, TplHeader, TplPage, useDemoAction, useTplTheme } from "../../_shared/kit";
import { activeCaseSteps, consultationsAtom, path } from "../data";

export default function CasesPage() {
  const list = useAtomValue(consultationsAtom);
  const navigate = useNavigate();
  const demoAction = useDemoAction();
  const theme = useTplTheme();
  const currentStep = 2;

  return (
    <TplPage tab>
      <TplHeader title="Tiến độ Hồ sơ & Lịch tư vấn" back={false} />

      <div className="space-y-3 px-4 pt-3">
        {/* Tiến độ hồ sơ pháp lý đang uỷ quyền */}
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.accent }}>
                Hồ sơ #HS-2026-089
              </div>
              <div className="text-sm font-bold text-gray-900">Khai nhận di sản thừa kế & tách thửa</div>
            </div>
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-800">
              Bước {currentStep}/4
            </span>
          </div>

          <div className="space-y-2">
            {activeCaseSteps.map((step, i) => {
              const done = i < currentStep;
              const current = i === currentStep - 1;
              return (
                <div key={step} className="flex items-center gap-2.5 text-xs">
                  <span
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                    style={{
                      background: done ? (current ? theme.accent : theme.primary) : "#e5e7eb",
                      color: done ? "#fff" : "#9ca3af",
                    }}
                  >
                    {done ? "✓" : i + 1}
                  </span>
                  <span className={current ? "font-bold text-gray-900" : done ? "text-gray-700" : "text-gray-400"}>
                    {step}
                  </span>
                </div>
              );
            })}
          </div>

          <button
            onClick={() => demoAction("Xem nhật ký làm việc của Luật sư & tài liệu đính kèm")}
            className="w-full rounded-xl bg-gray-100 py-2 text-xs font-semibold text-gray-800"
          >
            Xem tài liệu & biên bản làm việc ›
          </button>
        </Card>

        <div className="flex items-center justify-between pt-1">
          <span className="text-sm font-bold">Lịch hẹn tư vấn ({list.length})</span>
          <button
            onClick={() => navigate(path("/lawyers"))}
            className="text-xs font-semibold"
            style={{ color: theme.accent }}
          >
            + Đặt lịch mới
          </button>
        </div>

        {list.map((c) => (
          <BookingCard key={c.id} booking={c} onClick={() => demoAction("Mở phòng gọi Video Zalo với Luật sư")} />
        ))}
      </div>
    </TplPage>
  );
}
