import { useAtom } from "jotai";
import { useState } from "react";
import { useSnackbar } from "zmp-ui";

import {
  ActionBar,
  BookingCard,
  ChipRow,
  DayPicker,
  Field,
  formatPrice,
  makeSlots,
  nextDays,
  PrimaryButton,
  QtyStepper,
  TimeSlots,
  TplHeader,
  TplPage,
} from "../../_shared/kit";
import { statusStyle, TableTile } from "../components";
import { reservationsAtom, tableLabel, tables, TableType, tableTypes, typeOf } from "../data";

const SLOTS = makeSlots(9, 24, 60);

export default function TablesPage() {
  const { openSnackbar } = useSnackbar();
  const [reservations, setReservations] = useAtom(reservationsAtom);
  const [type, setType] = useState<TableType | "all">("all");
  const [selected, setSelected] = useState<number>();
  const [day, setDay] = useState(nextDays()[0].key);
  const [time, setTime] = useState<string>();
  const [hours, setHours] = useState(2);

  const list = tables.filter((t) => type === "all" || t.type === type);
  const table = tables.find((t) => t.no === selected);
  const total = table ? typeOf(table.type).pricePerHour * hours : 0;

  const book = () => {
    if (!table || !time) {
      openSnackbar({ text: "Chọn bàn trống và giờ bắt đầu", type: "warning" });
      return;
    }
    setReservations((r) => [
      {
        id: `bd${Date.now()}`,
        title: `${tableLabel(table)} · ${typeOf(table.type).label}`,
        subtitle: `${hours} giờ · tạm tính ${formatPrice(total)}`,
        date: day,
        time,
        emoji: "🎱",
        status: "upcoming",
      },
      ...r,
    ]);
    setSelected(undefined);
    setTime(undefined);
    openSnackbar({ text: "Đặt bàn thành công! Giữ bàn 15 phút sau giờ hẹn.", type: "success" });
  };

  return (
    <TplPage tab bottomSpace={68}>
      <TplHeader title="Sơ đồ & đặt bàn" back={false}>
        <ChipRow
          items={[{ id: "all" as const, label: "Tất cả" }, ...tableTypes.map((t) => ({ id: t.id, label: t.label }))]}
          value={type}
          onChange={(v) => {
            setType(v);
            setSelected(undefined);
          }}
          className="pb-2"
        />
      </TplHeader>

      {reservations.length > 0 && (
        <div className="space-y-2 px-4 pt-3">
          <div className="text-sm font-semibold">Bàn bạn đã đặt</div>
          {reservations.map((r) => (
            <BookingCard key={r.id} booking={r} />
          ))}
        </div>
      )}

      <div className="flex gap-3 px-4 pt-3 text-[11px]">
        {(Object.keys(statusStyle) as (keyof typeof statusStyle)[]).map((k) => (
          <span key={k} className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: statusStyle[k].fg }} />
            {statusStyle[k].label}
          </span>
        ))}
        <span className="ml-auto text-gray-400">Chạm bàn trống để chọn</span>
      </div>

      <div className="grid grid-cols-3 gap-2 px-4 pt-2">
        {list.map((t) => (
          <TableTile key={t.no} table={t} selected={t.no === selected} onClick={() => setSelected(t.no)} />
        ))}
      </div>

      <div className="mx-4 mt-4 space-y-5 rounded-2xl bg-white p-4 shadow-sm">
        <div className="text-sm font-semibold">
          {table ? `Đặt ${tableLabel(table)} · ${typeOf(table.type).label}` : "Chọn một bàn trống ở trên"}
        </div>
        <Field label="Ngày">
          <DayPicker value={day} onChange={setDay} />
        </Field>
        <Field label="Giờ bắt đầu">
          <TimeSlots slots={SLOTS} value={time} onChange={setTime} busy={["19:00", "20:00"]} />
        </Field>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Số giờ chơi</span>
          <QtyStepper value={hours} min={1} onChange={setHours} />
        </div>
      </div>

      <ActionBar aboveNav>
        <div className="flex-1">
          <div className="text-xs text-gray-500">{table ? `${hours} giờ × ${formatPrice(typeOf(table.type).pricePerHour)}` : "Chưa chọn bàn"}</div>
          <div className="text-lg font-bold">{formatPrice(total)}</div>
        </div>
        <PrimaryButton onClick={book}>Đặt bàn</PrimaryButton>
      </ActionBar>
    </TplPage>
  );
}
