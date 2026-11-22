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
  TextInput,
  TimeSlots,
  TplHeader,
  TplPage,
  useTplTheme,
} from "../../_shared/kit";
import { appointmentsAtom, busySlots, doctors, findPackage, packages, path, slots } from "../data";

export default function BookPage() {
  const { id } = useParams<{ id: string }>();
  const pkg = findPackage(id) ?? packages[0];
  const navigate = useNavigate();
  const { openSnackbar } = useSnackbar();
  const theme = useTplTheme();
  const setAppointments = useSetAtom(appointmentsAtom);

  const days = nextDays(7);
  const [day, setDay] = useState(days[1].key);
  const [slot, setSlot] = useState("09:30");
  const [doctorId, setDoctorId] = useState(doctors[0].id);
  const [weeks, setWeeks] = useState("22");
  const [phone, setPhone] = useState("");

  const price = pkg.salePrice ?? pkg.price;
  const doc = doctors.find((d) => d.id === doctorId) ?? doctors[0];

  const submit = () => {
    setAppointments((list) => [
      {
        id: `sa_${Date.now()}`,
        title: pkg.name,
        subtitle: `${doc.name} · Thai ${weeks} tuần`,
        date: day,
        time: slot,
        emoji: pkg.emoji,
        status: "upcoming",
      },
      ...list,
    ]);
    openSnackbar({ text: "Đã đặt lịch siêu âm 5D thành công!", type: "success" });
    navigate(path("/appointments"), { replace: true });
  };

  return (
    <TplPage bottomSpace={76}>
      <TplHeader title="Đặt lịch Siêu âm 5D" />

      <div className="space-y-3 px-4 pt-3">
        <Card>
          <div className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.primary }}>
            {pkg.tag} · {pkg.duration} phút
          </div>
          <div className="mt-0.5 text-base font-bold">{pkg.name}</div>
          <div className="mt-1 text-lg font-extrabold" style={{ color: theme.primary }}>
            {formatPrice(price)}
          </div>
        </Card>

        <Card className="space-y-3">
          <div className="text-sm font-bold">1. Chọn Bác sĩ siêu âm</div>
          <Segmented
            options={doctors.map((d) => ({ id: d.id, label: d.name }))}
            value={doctorId}
            onChange={setDoctorId}
          />
          <div className="text-xs text-gray-500">
            {doc.title} · {doc.exp}
          </div>
        </Card>

        <Card className="space-y-3">
          <div className="text-sm font-bold">2. Chọn ngày & khung giờ</div>
          <DayPicker value={day} onChange={setDay} days={days} />
          <TimeSlots slots={slots} value={slot} onChange={setSlot} busy={busySlots} />
        </Card>

        <Card className="space-y-3">
          <div className="text-sm font-bold">3. Thông tin mẹ bầu</div>
          <Field label="Tuần thai hiện tại">
            <TextInput value={weeks} onChange={(e) => setWeeks(e.target.value)} placeholder="VD: 22 tuần" />
          </Field>
          <Field label="Số điện thoại nhận video 5D qua Zalo">
            <TextInput
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              inputMode="tel"
              placeholder="09xx xxx xxx"
            />
          </Field>
        </Card>
      </div>

      <ActionBar>
        <div className="flex-1">
          <div className="text-xs text-gray-500">
            {slot} · Ngày {day}
          </div>
          <div className="text-base font-extrabold" style={{ color: theme.primary }}>
            {formatPrice(price)}
          </div>
        </div>
        <PrimaryButton onClick={submit}>Xác nhận đặt lịch</PrimaryButton>
      </ActionBar>
    </TplPage>
  );
}
