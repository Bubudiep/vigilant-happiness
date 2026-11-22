import { useSetAtom } from "jotai";
import { useState } from "react";
import { useNavigate, useParams, useSnackbar } from "zmp-ui";

import {
  ActionBar,
  DayPicker,
  EmptyState,
  Field,
  formatPrice,
  makeSlots,
  nextDays,
  PrimaryButton,
  Segmented,
  TextArea,
  TextInput,
  TimeSlots,
  TplHeader,
  TplPage,
  useTplTheme,
} from "../../_shared/kit";
import { appointmentsAtom, findDoctor, path, specialties, specialtyLabel } from "../data";

const MORNING = makeSlots(7, 11, 30);
const AFTERNOON = makeSlots(13, 17, 30);

export default function BookPage() {
  const { id } = useParams();
  const doctor = findDoctor(id);
  const navigate = useNavigate();
  const theme = useTplTheme();
  const { openSnackbar } = useSnackbar();
  const setAppointments = useSetAtom(appointmentsAtom);

  const [day, setDay] = useState(nextDays(14)[1].key);
  const [session, setSession] = useState<"am" | "pm">("am");
  const [time, setTime] = useState<string>();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [symptom, setSymptom] = useState("");

  if (!doctor) {
    return (
      <TplPage>
        <TplHeader title="Đặt lịch khám" />
        <EmptyState emoji="🤔" text="Không tìm thấy bác sĩ" />
      </TplPage>
    );
  }

  const confirm = () => {
    if (!time || !name.trim() || !phone.trim()) {
      openSnackbar({ text: "Vui lòng chọn giờ và nhập thông tin bệnh nhân", type: "warning" });
      return;
    }
    const sp = specialties.find((s) => s.id === doctor.specialty);
    setAppointments((a) => [
      { id: `a${Date.now()}`, title: doctor.name, subtitle: `${specialtyLabel(doctor.specialty)} · BN: ${name}`, date: day, time, emoji: sp?.emoji ?? "🩺", status: "upcoming" },
      ...a,
    ]);
    openSnackbar({ text: "Đặt lịch thành công! Vui lòng đến trước 15 phút.", type: "success" });
    navigate(path("/appointments"), { replace: true });
  };

  return (
    <TplPage bottomSpace={68}>
      <TplHeader title="Đặt lịch khám" />

      <div className="flex items-center gap-3 bg-white p-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full text-3xl" style={{ background: `${theme.primary}14` }}>
          {doctor.emoji}
        </div>
        <div className="flex-1">
          <div className="font-semibold">{doctor.name}</div>
          <div className="text-xs text-gray-500">
            {doctor.title} · {specialtyLabel(doctor.specialty)}
          </div>
        </div>
        <div className="text-sm font-bold" style={{ color: theme.primary }}>
          {formatPrice(doctor.fee)}
        </div>
      </div>

      <div className="mt-2 space-y-5 bg-white p-4">
        <Field label="Ngày khám">
          <DayPicker value={day} onChange={setDay} days={nextDays(14)} />
        </Field>
        <Field label="Buổi">
          <Segmented
            options={[
              { id: "am", label: "Sáng 7:00 – 11:00" },
              { id: "pm", label: "Chiều 13:00 – 17:00" },
            ]}
            value={session}
            onChange={(v) => {
              setSession(v);
              setTime(undefined);
            }}
          />
        </Field>
        <Field label="Giờ khám">
          <TimeSlots slots={session === "am" ? MORNING : AFTERNOON} value={time} onChange={setTime} busy={["08:00", "09:30", "14:00"]} />
        </Field>
      </div>

      <div className="mt-2 space-y-4 bg-white p-4">
        <div className="text-sm font-semibold">Thông tin bệnh nhân</div>
        <Field label="Họ tên">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Nguyễn Văn A" />
        </Field>
        <Field label="Số điện thoại">
          <TextInput value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="09xx xxx xxx" inputMode="tel" />
        </Field>
        <Field label="Triệu chứng / lý do khám">
          <TextArea value={symptom} onChange={(e) => setSymptom(e.target.value)} placeholder="VD: ho, sốt nhẹ 2 ngày..." />
        </Field>
      </div>

      <ActionBar>
        <div className="flex-1 text-xs text-gray-500">
          {time ? <span className="text-sm font-semibold text-gray-900">{time} · {day}</span> : "Chưa chọn giờ khám"}
        </div>
        <PrimaryButton onClick={confirm}>Xác nhận</PrimaryButton>
      </ActionBar>
    </TplPage>
  );
}
