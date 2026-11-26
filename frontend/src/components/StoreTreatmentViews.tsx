import {
  AutoComplete,
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Segmented,
  Select,
  Tag,
  Tooltip,
} from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { LuCircleAlert, LuRepeat } from "react-icons/lu";
import {
  isService,
  type StoreBookingItem,
  type StoreConfig,
} from "../data/store-api";
import { FormGrid } from "./ui";

/**
 * Liệu trình — 1 dịch vụ làm nhiều buổi (VD triệt lông 6 buổi, mỗi buổi cách 4 tuần).
 * Tạo liệu trình = tạo sẵn N lịch hẹn cùng `treatmentId`, mỗi lịch ghi buổi thứ mấy / tổng số buổi.
 * Lịch nhóm, danh sách & Tổng quan hiện nhãn TreatmentBadge "LT 2/6"; bấm vào lịch xem TreatmentProgress.
 */

export const TIME_SLOTS = [
  "08:30",
  "09:00",
  "10:00",
  "10:30",
  "11:00",
  "13:30",
  "14:00",
  "15:00",
  "16:30",
  "18:00",
  "19:30",
];
const WEEKDAY = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const INTERVALS = [
  { value: 7, label: "1 tuần" },
  { value: 14, label: "2 tuần" },
  { value: 28, label: "4 tuần" },
  { value: 30, label: "1 tháng" },
];

/** TreatmentBadge — nhãn "LT 2/6" trên thẻ lịch hẹn thuộc liệu trình */
export function TreatmentBadge({
  b,
  className = "",
}: {
  b: StoreBookingItem;
  className?: string;
}) {
  if (!b.treatmentId) return null;
  return (
    <Tooltip
      title={`Liệu trình: ${b.treatmentName ?? b.serviceName} — buổi ${b.treatmentSeq}/${b.treatmentTotal}`}
    >
      <span
        data-ui="TreatmentBadge"
        className={`inline-flex shrink-0 items-center gap-0.5 rounded bg-violet-100 px-1 text-2xs font-semibold leading-4 text-violet-700 ${className}`}
      >
        <LuRepeat size={10} /> LT {b.treatmentSeq}/{b.treatmentTotal}
      </span>
    </Tooltip>
  );
}

const STATUS_TAG: Record<
  StoreBookingItem["status"],
  { label: string; color: string }
> = {
  pending: { label: "Chờ", color: "orange" },
  confirmed: { label: "Đã hẹn", color: "blue" },
  completed: { label: "Xong", color: "green" },
  cancelled: { label: "Huỷ", color: "default" },
};

/** TreatmentProgress — các buổi của liệu trình (trong popover lịch hẹn) + huỷ các buổi còn lại */
export function TreatmentProgress({
  b,
  bookings,
  onCancelRest,
}: {
  b: StoreBookingItem;
  bookings: StoreBookingItem[];
  onCancelRest: (ids: string[]) => void;
}) {
  if (!b.treatmentId) return null;
  const all = bookings
    .filter((x) => x.treatmentId === b.treatmentId)
    .sort((x, y) => (x.treatmentSeq ?? 0) - (y.treatmentSeq ?? 0));
  const done = all.filter((x) => x.status === "completed").length;
  const rest = all.filter(
    (x) => x.status === "pending" || x.status === "confirmed",
  );
  return (
    <div
      data-ui="TreatmentProgress"
      className="rounded-lg border border-violet-200 bg-violet-50/60 p-2"
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 font-semibold text-violet-800">
          <LuRepeat size={12} /> {b.treatmentName ?? "Liệu trình"}
        </span>
        <span className="text-2xs font-semibold tabular-nums text-violet-700">
          Xong {done}/{all.length}
        </span>
      </div>
      <div className="max-h-40 space-y-0.5 overflow-y-auto">
        {all.map((x) => (
          <div
            key={x.id}
            className={`flex items-center gap-1.5 text-2xs ${x.id === b.id ? "font-semibold text-slate-900" : "text-slate-600"}`}
          >
            <span className="w-11 shrink-0">Buổi {x.treatmentSeq}</span>
            <span className="flex-1 tabular-nums">
              {WEEKDAY[dayjs(x.date).day()]} {dayjs(x.date).format("DD/MM/YY")}{" "}
              · {x.timeSlot}
            </span>
            <Tag
              className="!m-0 !text-2xs !leading-4"
              color={STATUS_TAG[x.status].color}
            >
              {STATUS_TAG[x.status].label}
            </Tag>
          </div>
        ))}
      </div>
      {rest.length > 1 && (
        <Popconfirm
          title={`Huỷ ${rest.length} buổi chưa làm của liệu trình?`}
          okText="Huỷ các buổi"
          okButtonProps={{ danger: true }}
          cancelText="Không"
          onConfirm={() => onCancelRest(rest.map((x) => x.id))}
        >
          <Button
            size="small"
            type="link"
            danger
            className="!mt-1 !h-auto !p-0 !text-2xs"
          >
            Dừng liệu trình (huỷ {rest.length} buổi chưa làm)
          </Button>
        </Popconfirm>
      )}
    </div>
  );
}

type Row = { date: Dayjs; timeSlot: string };

/**
 * TreatmentModal — tạo liệu trình cho khách: chọn khách, dịch vụ, số buổi, khoảng cách → tự xếp lịch các buổi
 * (sửa được từng buổi, báo trùng giờ với lịch khác của cùng nhân viên) → tạo tất cả lịch hẹn một lần.
 */
export function TreatmentModal({
  open,
  onClose,
  store,
  onCreate,
  defaults,
  staffOptions = [],
}: {
  open: boolean;
  onClose: () => void;
  store: StoreConfig;
  onCreate: (items: StoreBookingItem[]) => void;
  defaults?: {
    date?: string;
    staffName?: string;
    customerName?: string;
    phone?: string;
  };
  staffOptions?: string[];
}) {
  const [form] = Form.useForm();
  const services = store.products.filter(isService);
  const sessions = (Form.useWatch("sessions", form) as number | undefined) ?? 0;
  const interval = (Form.useWatch("interval", form) as number | undefined) ?? 7;
  const start = Form.useWatch("start", form) as Dayjs | undefined;
  const timeSlot =
    (Form.useWatch("timeSlot", form) as string | undefined) ?? "10:00";
  const staffName = (
    (Form.useWatch("staffName", form) as string | undefined) ?? ""
  ).trim();

  // Lịch tự xếp; sửa tay từng buổi lưu ở overrides (xếp lại khi đổi số buổi / khoảng cách / ngày đầu)
  const [overrides, setOverrides] = useState<Record<number, Partial<Row>>>({});
  const genKey = `${sessions}|${interval}|${start?.format("YYYY-MM-DD")}|${timeSlot}`;
  useEffect(() => setOverrides({}), [genKey]);
  const rows: Row[] = useMemo(
    () =>
      start && sessions > 0
        ? Array.from({ length: Math.min(sessions, 100) }, (_, i) => ({
            date: overrides[i]?.date ?? start.add(i * interval, "day"),
            timeSlot: overrides[i]?.timeSlot ?? timeSlot,
          }))
        : [],
    [start, sessions, interval, timeSlot, overrides],
  );

  const clashOf = (r: Row) =>
    (store.bookings ?? []).find(
      (x) =>
        x.status !== "cancelled" &&
        x.date === r.date.format("YYYY-MM-DD") &&
        x.timeSlot === r.timeSlot &&
        !!staffName &&
        (x.staffName ?? "").trim() === staffName,
    );

  useEffect(() => {
    if (!open) return;
    const first = services.find((p) => p.treatmentSessions) ?? services[0];
    form.resetFields();
    form.setFieldsValue({
      customerName: defaults?.customerName,
      phone: defaults?.phone,
      serviceName: first?.name,
      sessions: first?.treatmentSessions ?? 6,
      interval: first?.treatmentIntervalDays ?? 7,
      start: defaults?.date ? dayjs(defaults.date) : dayjs().add(1, "day"),
      timeSlot: "10:00",
      staffName: defaults?.staffName,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const pickService = (name: string) => {
    const p = services.find((x) => x.name === name);
    if (p?.treatmentSessions)
      form.setFieldsValue({
        sessions: p.treatmentSessions,
        interval: p.treatmentIntervalDays ?? 7,
      });
  };

  const staffChoices = [
    ...new Set([
      ...(store.staff ?? [])
        .filter((m) => m.status === "active")
        .map((m) => m.name),
      ...staffOptions,
    ]),
  ].map((n) => ({ value: n }));

  const submit = (v: {
    customerName: string;
    phone: string;
    serviceName: string;
    note?: string;
  }) => {
    const id = `LT${dayjs().format("YYMMDD")}${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    const name = `${v.serviceName.trim()} · ${rows.length} buổi`;
    const now = Date.now();
    onCreate(
      rows.map((r, i) => ({
        id: `bk_${now}_${i}`,
        code: "",
        customerName: v.customerName.trim(),
        phone: v.phone.trim(),
        serviceName: v.serviceName.trim(),
        date: r.date.format("YYYY-MM-DD"),
        timeSlot: r.timeSlot,
        staffName: staffName || undefined,
        status: "confirmed",
        note: v.note?.trim() || undefined,
        treatmentId: id,
        treatmentName: name,
        treatmentSeq: i + 1,
        treatmentTotal: rows.length,
        createdAt: dayjs().toISOString(),
      })),
    );
    onClose();
  };

  const clashes = rows.filter((r) => clashOf(r)).length;

  return (
    <Modal
      title="Tạo liệu trình cho khách"
      open={open}
      onCancel={onClose}
      footer={null}
      width={640}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        onFinish={submit}
        data-ui="TreatmentModal"
      >
        {store.customers.length > 0 && !defaults?.customerName && (
          <Form.Item label="Chọn khách đã có (tuỳ chọn)" className="!mb-3">
            <Select
              allowClear
              showSearch
              placeholder="Tìm tên / SĐT khách…"
              optionFilterProp="label"
              onChange={(id) => {
                const c = store.customers.find((x) => x.id === id);
                if (c)
                  form.setFieldsValue({ customerName: c.name, phone: c.phone });
              }}
              options={store.customers.map((c) => ({
                value: c.id,
                label: `${c.name} · ${c.phone}`,
              }))}
            />
          </Form.Item>
        )}
        <FormGrid cols={2}>
          <Form.Item
            name="customerName"
            label="Tên khách"
            rules={[{ required: true, message: "Nhập tên khách" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="phone"
            label="Số điện thoại"
            rules={[{ required: true, message: "Nhập SĐT" }]}
          >
            <Input />
          </Form.Item>
        </FormGrid>
        <Form.Item
          name="serviceName"
          label="Dịch vụ"
          rules={[{ required: true, message: "Chọn dịch vụ" }]}
        >
          <AutoComplete
            onSelect={pickService}
            options={services.map((p) => ({
              value: p.name,
              label: (
                <span>
                  {p.name}
                  {p.treatmentSessions ? (
                    <span className="ml-1.5 text-2xs text-violet-600">
                      {p.treatmentSessions} buổi · cách{" "}
                      {p.treatmentIntervalDays ?? 7} ngày
                    </span>
                  ) : null}
                </span>
              ),
            }))}
            filterOption={(input, o) =>
              String(o?.value ?? "")
                .toLowerCase()
                .includes(input.toLowerCase())
            }
            placeholder="VD: Triệt lông nách, Chăm sóc da…"
          />
        </Form.Item>
        <FormGrid cols={3}>
          <Form.Item
            name="sessions"
            label="Số buổi"
            rules={[{ required: true, message: "Nhập số buổi" }]}
          >
            <InputNumber className="!w-full" min={2} max={100} />
          </Form.Item>
          <Form.Item
            name="start"
            label="Buổi đầu"
            rules={[{ required: true, message: "Chọn ngày" }]}
          >
            <DatePicker
              className="!w-full"
              format="DD/MM/YYYY"
              allowClear={false}
            />
          </Form.Item>
          <Form.Item name="timeSlot" label="Giờ">
            <Select options={TIME_SLOTS.map((t) => ({ value: t }))} />
          </Form.Item>
        </FormGrid>
        <Form.Item label="Mỗi buổi cách" className="!mb-3">
          <div className="flex flex-wrap items-center gap-2">
            <Segmented
              size="small"
              value={
                INTERVALS.some((x) => x.value === interval) ? interval : -1
              }
              onChange={(v) => v !== -1 && form.setFieldValue("interval", v)}
              options={[...INTERVALS, { value: -1, label: "Khác" }]}
            />
            <Form.Item name="interval" noStyle>
              <InputNumber
                size="small"
                min={1}
                max={365}
                className="!w-24"
                suffix="ngày"
              />
            </Form.Item>
          </div>
        </Form.Item>
        <FormGrid cols={2}>
          <Form.Item name="staffName" label="Nhân viên phụ trách">
            <AutoComplete
              options={staffChoices}
              placeholder="Chưa phân công"
              allowClear
            />
          </Form.Item>
          <Form.Item name="note" label="Ghi chú">
            <Input placeholder="VD: Da nhạy cảm, dùng gel làm mát" />
          </Form.Item>
        </FormGrid>

        {/* TreatmentSchedule — lịch các buổi, sửa được từng buổi */}
        <div
          data-ui="TreatmentSchedule"
          className="mb-4 rounded-lg border border-slate-200"
        >
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700">
            <span>Lịch {rows.length} buổi</span>
            {rows.length > 0 && (
              <span className="font-normal text-slate-500">
                {rows[0].date.format("DD/MM/YYYY")} →{" "}
                {rows[rows.length - 1].date.format("DD/MM/YYYY")}
              </span>
            )}
          </div>
          <div className="max-h-56 divide-y divide-slate-100 overflow-y-auto">
            {rows.map((r, i) => {
              const clash = clashOf(r);
              return (
                <div key={i} className="flex items-center gap-2 px-3 py-1">
                  <span className="w-14 shrink-0 text-xs font-semibold text-violet-700">
                    Buổi {i + 1}
                  </span>
                  <DatePicker
                    size="small"
                    variant="borderless"
                    allowClear={false}
                    format={(d) =>
                      `${WEEKDAY[d.day()]} ${d.format("DD/MM/YYYY")}`
                    }
                    value={r.date}
                    onChange={(d) =>
                      d &&
                      setOverrides((o) => ({ ...o, [i]: { ...o[i], date: d } }))
                    }
                    className="!w-36"
                  />
                  <Select
                    size="small"
                    variant="borderless"
                    value={r.timeSlot}
                    onChange={(t) =>
                      setOverrides((o) => ({
                        ...o,
                        [i]: { ...o[i], timeSlot: t },
                      }))
                    }
                    options={TIME_SLOTS.map((t) => ({ value: t }))}
                    className="!w-20"
                  />
                  {clash && (
                    <span className="inline-flex min-w-0 items-center gap-1 truncate text-2xs text-amber-700">
                      <LuCircleAlert size={12} className="shrink-0" /> Trùng
                      lịch {clash.customerName}
                    </span>
                  )}
                </div>
              );
            })}
            {!rows.length && (
              <div className="px-3 py-3 text-center text-xs text-slate-400">
                Nhập số buổi & ngày buổi đầu
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2">
          {clashes > 0 && (
            <span className="mr-auto text-xs text-amber-700">
              {clashes} buổi trùng giờ với lịch khác của {staffName}
            </span>
          )}
          <Button onClick={onClose}>Huỷ</Button>
          <Button
            type="primary"
            htmlType="submit"
            disabled={!rows.length}
            icon={<LuRepeat size={14} />}
          >
            Tạo {rows.length} lịch hẹn
          </Button>
        </div>
      </Form>
    </Modal>
  );
}
