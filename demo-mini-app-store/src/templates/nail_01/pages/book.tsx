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
  TextArea,
  Tile,
  TimeSlots,
  TplHeader,
  TplPage,
  useTplTheme,
} from "../../_shared/kit";
import { DesignSwatch } from "../components";
import { artists as staff, bookingsAtom, designs, findService, path, polishColors } from "../data";

const SLOTS = makeSlots(9, 21, 30);
const BUSY = ["10:00", "10:30", "15:00", "19:00"];

export default function BookPage() {
  const { id } = useParams();
  const service = findService(id);
  const navigate = useNavigate();
  const theme = useTplTheme();
  const { openSnackbar } = useSnackbar();
  const setBookings = useSetAtom(bookingsAtom);

  const [day, setDay] = useState(nextDays()[0].key);
  const [time, setTime] = useState<string>();
  const [who, setWho] = useState("any");
  const [note, setNote] = useState("");
  const [design, setDesign] = useState<string>();
  const [color, setColor] = useState<string>();

  if (!service) {
    return (
      <TplPage>
        <TplHeader title="Đặt lịch" />
        <EmptyState emoji="🤔" text="Không tìm thấy dịch vụ" />
      </TplPage>
    );
  }

  const confirm = () => {
    if (!time) {
      openSnackbar({ text: "Vui lòng chọn giờ", type: "warning" });
      return;
    }
    const person = staff.find((s) => s.id === who)!;
    setBookings((b) => [
      { id: `b${Date.now()}`, title: service.name, subtitle: [person.id === "any" ? "Tiệm xếp thợ" : person.name, designs.find((x) => x.id === design)?.name].filter(Boolean).join(" · "), date: day, time, emoji: service.emoji, status: "upcoming" },
      ...b,
    ]);
    openSnackbar({ text: "Đặt lịch thành công!", type: "success" });
    navigate(path("/bookings"), { replace: true });
  };

  return (
    <TplPage bottomSpace={68}>
      <TplHeader title="Đặt lịch" />

      <div className="flex gap-3 bg-white p-4">
        <Tile seed={service.id} emoji={service.emoji} color={service.color} className="h-16 w-16" />
        <div>
          <div className="font-semibold">{service.name}</div>
          <div className="text-xs text-gray-500">
            {service.minutes} phút · {service.description}
          </div>
          <div className="mt-1 text-sm font-bold" style={{ color: theme.primary }}>
            {formatPrice(service.salePrice ?? service.price)}
          </div>
        </div>
      </div>

      <div className="mt-2 space-y-5 bg-white p-4">
        <Field label="Chọn thợ">
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
            {staff.map((s) => (
              <button
                key={s.id}
                onClick={() => setWho(s.id)}
                className="flex w-20 shrink-0 flex-col items-center rounded-xl border py-2 text-xs"
                style={{ borderColor: who === s.id ? theme.primary : "#e5e7eb", color: who === s.id ? theme.primary : undefined }}
              >
                <span className="text-2xl">{s.emoji}</span>
                {s.name}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Chọn mẫu (tuỳ chọn)">
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
            {designs.map((x) => (
              <DesignSwatch key={x.id} colors={x.colors} label={x.name} selected={design === x.id} onClick={() => setDesign(design === x.id ? undefined : x.id)} />
            ))}
          </div>
        </Field>
        <Field label="Hoặc chọn màu sơn">
          <div className="flex flex-wrap gap-2">
            {polishColors.map((c) => (
              <button
                key={c}
                onClick={() => setColor(color === c ? undefined : c)}
                className="h-8 w-8 rounded-full border border-black/10"
                style={{ background: c, boxShadow: color === c ? `0 0 0 2px #fff, 0 0 0 4px ${theme.primary}` : undefined }}
                aria-label={c}
              />
            ))}
          </div>
        </Field>
        <Field label="Chọn ngày">
          <DayPicker value={day} onChange={setDay} />
        </Field>
        <Field label="Chọn giờ">
          <TimeSlots slots={SLOTS} value={time} onChange={setTime} busy={BUSY} />
        </Field>
        <Field label="Ghi chú">
          <TextArea rows={2} placeholder="VD: móng yếu, muốn form oval, gửi ảnh mẫu qua Zalo..." value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </div>

      <ActionBar>
        <div className="flex-1 text-xs text-gray-500">
          {time ? (
            <>
              <div className="text-sm font-semibold text-gray-900">
                {time} · {day}
              </div>
              {staff.find((s) => s.id === who)?.name}
            </>
          ) : (
            "Chưa chọn giờ"
          )}
        </div>
        <PrimaryButton onClick={confirm}>Xác nhận đặt lịch</PrimaryButton>
      </ActionBar>
    </TplPage>
  );
}
