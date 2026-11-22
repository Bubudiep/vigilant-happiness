import { useAtom } from "jotai";
import { useState } from "react";
import { useSnackbar } from "zmp-ui";

import {
  ActionBar,
  BookingCard,
  DayPicker,
  Field,
  makeSlots,
  nextDays,
  PrimaryButton,
  QtyStepper,
  Segmented,
  TextArea,
  TextInput,
  TimeSlots,
  TplHeader,
  TplPage,
} from "../../_shared/kit";
import { areas, reservationsAtom } from "../data";

const SLOTS = [...makeSlots(11, 13, 30), ...makeSlots(17, 21, 30)];

export default function ReservePage() {
  const { openSnackbar } = useSnackbar();
  const [reservations, setReservations] = useAtom(reservationsAtom);
  const [day, setDay] = useState(nextDays()[0].key);
  const [time, setTime] = useState<string>();
  const [people, setPeople] = useState(2);
  const [area, setArea] = useState("indoor");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");

  const submit = () => {
    if (!time || !name.trim() || !phone.trim()) {
      openSnackbar({ text: "Vui lòng chọn giờ và nhập tên, số điện thoại", type: "warning" });
      return;
    }
    const areaLabel = areas.find((a) => a.id === area)!.label;
    setReservations((r) => [
      { id: `r${Date.now()}`, title: `Bàn ${people} người · ${areaLabel}`, subtitle: `${name} · ${phone}`, date: day, time, emoji: "🪑", status: "upcoming" },
      ...r,
    ]);
    setTime(undefined);
    setNote("");
    openSnackbar({ text: "Đã gửi yêu cầu đặt bàn. Nhà hàng sẽ gọi xác nhận!", type: "success" });
  };

  return (
    <TplPage tab bottomSpace={68}>
      <TplHeader title="Đặt bàn" back={false} />

      {reservations.length > 0 && (
        <div className="space-y-2 px-4 pt-3">
          <div className="text-sm font-semibold">Bàn đã đặt</div>
          {reservations.map((r) => (
            <BookingCard key={r.id} booking={r} />
          ))}
        </div>
      )}

      <div className="mx-4 mt-3 space-y-5 rounded-2xl bg-white p-4">
        <Field label="Ngày">
          <DayPicker value={day} onChange={setDay} />
        </Field>
        <Field label="Giờ đến">
          <TimeSlots slots={SLOTS} value={time} onChange={setTime} busy={["12:00", "19:00"]} />
        </Field>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Số khách</span>
          <QtyStepper value={people} min={1} onChange={setPeople} />
        </div>
        <Field label="Khu vực">
          <Segmented options={areas} value={area} onChange={setArea} />
        </Field>
        <Field label="Họ tên">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Nguyễn Văn A" />
        </Field>
        <Field label="Số điện thoại">
          <TextInput value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="09xx xxx xxx" inputMode="tel" />
        </Field>
        <Field label="Ghi chú">
          <TextArea value={note} onChange={(e) => setNote(e.target.value)} placeholder="VD: sinh nhật, cần ghế trẻ em..." />
        </Field>
      </div>

      <ActionBar aboveNav>
        <div className="flex-1 text-xs text-gray-500">
          {time ? (
            <span className="text-sm font-semibold text-gray-900">
              {time} · {day} · {people} khách
            </span>
          ) : (
            "Chọn ngày giờ đến"
          )}
        </div>
        <PrimaryButton onClick={submit}>Đặt bàn</PrimaryButton>
      </ActionBar>
    </TplPage>
  );
}
