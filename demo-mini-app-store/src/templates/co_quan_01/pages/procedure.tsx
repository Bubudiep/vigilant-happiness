import { useParams } from "zmp-ui";

import { ActionBar, Card, EmptyState, PrimaryButton, TplHeader, TplPage, useDemoAction, useTplTheme } from "../../_shared/kit";
import { findProcedure } from "../data";

export default function ProcedurePage() {
  const { id } = useParams();
  const proc = findProcedure(id);
  const theme = useTplTheme();
  const demoAction = useDemoAction();

  if (!proc) {
    return (
      <TplPage>
        <TplHeader title="Thủ tục" />
        <EmptyState emoji="🤔" text="Không tìm thấy thủ tục" />
      </TplPage>
    );
  }

  return (
    <TplPage bottomSpace={68}>
      <TplHeader title="Chi tiết thủ tục" />
      <div className="space-y-3 px-4 pt-3">
        <Card>
          <div className="text-xs text-gray-400">{proc.group}</div>
          <div className="text-lg font-bold">{proc.name}</div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-xl bg-gray-50 p-3">
              <div className="text-xs text-gray-500">Thời gian giải quyết</div>
              <div className="font-semibold">{proc.time}</div>
            </div>
            <div className="rounded-xl bg-gray-50 p-3">
              <div className="text-xs text-gray-500">Lệ phí</div>
              <div className="font-semibold">{proc.fee}</div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="mb-2 font-semibold">Thành phần hồ sơ</div>
          <ul className="space-y-1.5 text-sm text-gray-700">
            {proc.documents.map((d) => (
              <li key={d}>📎 {d}</li>
            ))}
          </ul>
        </Card>

        <Card>
          <div className="mb-3 font-semibold">Trình tự thực hiện</div>
          <div className="space-y-3">
            {proc.steps.map((s, i) => (
              <div key={s} className="flex gap-3 text-sm">
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ background: theme.primary }}
                >
                  {i + 1}
                </span>
                <span className="pt-0.5 text-gray-700">{s}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <ActionBar>
        <PrimaryButton outline onClick={() => demoAction("Đặt lịch hẹn tại bộ phận một cửa")}>
          Đặt lịch hẹn
        </PrimaryButton>
        <PrimaryButton className="flex-1" onClick={() => demoAction("Nộp hồ sơ trực tuyến")}>
          Nộp hồ sơ trực tuyến
        </PrimaryButton>
      </ActionBar>
    </TplPage>
  );
}
