import { useSetAtom } from "jotai";
import { useState } from "react";
import { useNavigate, useParams, useSnackbar } from "zmp-ui";

import {
  ActionBar,
  Card,
  DayPicker,
  Field,
  formatPrice,
  nextDays,
  PrimaryButton,
  Segmented,
  TextArea,
  TimeSlots,
  TplHeader,
  TplPage,
  useTplTheme,
} from "../../_shared/kit";
import { consultationsAtom, findLawyer, lawyers, path, slots } from "../data";

export default function BookLawyerPage() {
  const { id } = useParams<{ id: string }>();
  const lawyer = findLawyer(id) ?? lawyers[0];
  const navigate = useNavigate();
  const { openSnackbar } = useSnackbar();
  const theme = useTplTheme();
  const setConsultations = useSetAtom(consultationsAtom);

  const [mode, setMode] = useState<"online" | "office">("online");
  const days = nextDays(7);
  const [day, setDay] = useState(days[1].key);
  const [slot, setSlot] = useState("15:00");
  const [summary, setSummary] = useState("");

  const fee = mode === "online" ? lawyer.feeOnline : lawyer.feeOffice;

  const submit = () => {
    setConsultations((list) => [
      {
        id: `lc_${Date.now()}`,
        title: summary.trim() || `Tư vấn ${lawyer.areaLabel}`,
        subtitle: `${lawyer.name} · ${mode === "online" ? "Video Zalo 1-1" : "Tại Văn phòng"}`,
        date: day,
        time: slot,
        emoji: lawyer.emoji,
        status: "upcoming",
      },
      ...list,
    ]);
    openSnackbar({ text: "Đã đặt lịch tư vấn Luật sư thành công!", type: "success" });
    navigate(path("/cases"), { replace: true });
  };

  return (
    <TplPage bottomSpace={76}>
      <TplHeader title="Đặt lịch Tư vấn Luật sư" />

      <div className="space-y-3 px-4 pt-3">
        <Card>
          <div className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.accent }}>
            {lawyer.areaLabel}
          </div>
          <div className="mt-0.5 text-base font-bold text-gray-900">{lawyer.name}</div>
          <div className="text-xs text-gray-500">{lawyer.title}</div>
        </Card>

        <Card className="space-y-3">
          <div className="text-sm font-bold">1. Hình thức tư vấn</div>
          <Segmented
            options={[
              { id: "online", label: `🎥 Video Zalo (${formatPrice(lawyer.feeOnline)})` },
              { id: "office", label: `🏢 Tại Văn phòng (${formatPrice(lawyer.feeOffice)})` },
            ]}
            value={mode}
            onChange={setMode}
          />
        </Card>

        <Card className="space-y-3">
          <div className="text-sm font-bold">2. Chọn ngày & giờ làm việc</div>
          <DayPicker value={day} onChange={setDay} days={days} />
          <TimeSlots slots={slots} value={slot} onChange={setSlot} busy={["09:00", "14:00"]} />
        </Card>

        <Card className="space-y-3">
          <div className="text-sm font-bold">3. Tóm tắt nội dung cần tư vấn (Bảo mật)</div>
          <Field label="Mô tả ngắn gọn sự việc hoặc câu hỏi pháp lý">
            <TextArea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="VD: Tư vấn phân chia di sản thừa kế đất đai không có di chúc..."
            />
          </Field>
        </Card>
      </div>

      <ActionBar>
        <div className="flex-1">
          <div className="text-xs text-gray-500">
            Phí tư vấn ({day} · {slot})
          </div>
          <div className="text-base font-extrabold" style={{ color: theme.primary }}>
            {formatPrice(fee)}
          </div>
        </div>
        <PrimaryButton onClick={submit}>Xác nhận lịch hẹn</PrimaryButton>
      </ActionBar>
    </TplPage>
  );
}
