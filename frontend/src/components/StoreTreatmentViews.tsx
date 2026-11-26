import {
  App as AntApp,
  AutoComplete,
  Button,
  DatePicker,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Progress,
  Segmented,
  Select,
  Tag,
  Tooltip,
} from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useEffect, useMemo, useState } from "react";
import {
  LuCheck,
  LuCircleAlert,
  LuNotebookPen,
  LuPhone,
  LuRepeat,
  LuSearch,
  LuSend,
  LuX,
} from "react-icons/lu";
import {
  isService,
  type StoreBookingItem,
  type StoreConfig,
} from "../data/store-api";
import { FormGrid, PageHeader } from "./ui";
import { sendTreatmentResult } from "../data/album-api";
import { ApiError } from "../data/platform-api";

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
    const name = /buổi/i.test(v.serviceName) ? v.serviceName.trim() : `${v.serviceName.trim()} · ${rows.length} buổi`;
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

/** So SĐT theo 9 số cuối (0912… / +84912… / 84912… là cùng 1 khách) */
const phoneKey = (p?: string | null) => (p ?? "").replace(/\D/g, "").slice(-9);

const BOOKING_STATUS = [
  { value: "pending", label: "Chờ xác nhận" },
  { value: "confirmed", label: "Đã hẹn" },
  { value: "completed", label: "Hoàn thành" },
  { value: "cancelled", label: "Đã huỷ" },
];

type Patient = {
  key: string;
  name: string;
  phone: string;
  customerId?: string;
  tier?: string;
};
type Plan = { id: string; name: string; sessions: StoreBookingItem[] };

/** Gom lịch hẹn liệu trình theo treatmentId (buổi xếp theo thứ tự) */
const plansOf = (bookings: StoreBookingItem[]): Plan[] => {
  const m = new Map<string, Plan>();
  for (const b of bookings) {
    if (!b.treatmentId) continue;
    const g = m.get(b.treatmentId) ?? {
      id: b.treatmentId,
      name: b.treatmentName ?? b.serviceName,
      sessions: [],
    };
    g.sessions.push(b);
    m.set(b.treatmentId, g);
  }
  return [...m.values()].map((g) => ({
    ...g,
    sessions: g.sessions.sort(
      (x, y) => (x.treatmentSeq ?? 0) - (y.treatmentSeq ?? 0),
    ),
  }));
};
const isOpen = (b: StoreBookingItem) =>
  b.status === "pending" || b.status === "confirmed";

/**
 * TreatmentsSection — tab "Liệu trình" của Khách hàng:
 * trái = danh sách khách (TreatmentCustomerList), phải = liệu trình của khách đang chọn (TreatmentCard) + nút Tạo liệu trình.
 */
export function TreatmentsSection({
  store,
  updateCurrentStore,
}: {
  store: StoreConfig;
  updateCurrentStore: (updater: (s: StoreConfig) => StoreConfig) => void;
}) {
  const { message } = AntApp.useApp();
  const [q, setQ] = useState("");
  const [only, setOnly] = useState<"all" | "active">("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const bookings = store.bookings;
  const plans = useMemo(() => plansOf(bookings ?? []), [bookings]);

  // Khách = tệp khách hàng + người có liệu trình nhưng chưa có trong tệp (đặt bằng SĐT)
  const patients = useMemo(() => {
    const m = new Map<string, Patient>();
    for (const c of store.customers) {
      const k = phoneKey(c.phone) || c.id;
      m.set(k, {
        key: k,
        name: c.name,
        phone: c.phone,
        customerId: c.id,
        tier: c.tier,
      });
    }
    for (const p of plans) {
      const b = p.sessions[0];
      const k = phoneKey(b.phone);
      if (k && !m.has(k))
        m.set(k, { key: k, name: b.customerName, phone: b.phone });
    }
    return [...m.values()];
  }, [store.customers, plans]);
  const plansByPatient = useMemo(() => {
    const m = new Map<string, Plan[]>();
    for (const p of plans) {
      const k = phoneKey(p.sessions[0].phone);
      m.set(k, [...(m.get(k) ?? []), p]);
    }
    return m;
  }, [plans]);
  const activeCount = (k: string) =>
    (plansByPatient.get(k) ?? []).filter((p) => p.sessions.some(isOpen)).length;

  const kw = q.trim().toLowerCase();
  const list = patients
    .filter(
      (p) =>
        (!kw || p.name.toLowerCase().includes(kw) || p.phone.includes(kw)) &&
        (only === "all" || activeCount(p.key) > 0),
    )
    .sort(
      (a, b) =>
        activeCount(b.key) - activeCount(a.key) ||
        a.name.localeCompare(b.name, "vi"),
    );
  const cur = patients.find((p) => p.key === selected) ?? null;
  const curPlans = cur
    ? [...(plansByPatient.get(cur.key) ?? [])].sort(
        (a, b) =>
          Number(b.sessions.some(isOpen)) - Number(a.sessions.some(isOpen)) ||
          b.sessions[0].date.localeCompare(a.sessions[0].date),
      )
    : [];

  const patchSessions = (
    ids: string[],
    patch: Partial<StoreBookingItem>,
    msg: string,
  ) => {
    const set = new Set(ids);
    updateCurrentStore((s) => ({
      ...s,
      bookings: (s.bookings ?? []).map((b) =>
        set.has(b.id) ? { ...b, ...patch } : b,
      ),
    }));
    message.success(msg);
  };

  return (
    <div
      data-ui="TreatmentsSection"
      className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5"
    >
      <PageHeader
        title="Liệu trình"
        description={`Chọn khách bên trái để xem / tạo liệu trình · ${plans.filter((p) => p.sessions.some(isOpen)).length} liệu trình đang chạy`}
      />
      <div className="grid gap-4 md:grid-cols-[280px_minmax(0,1fr)]">
        {/* TreatmentCustomerList — danh sách khách bên trái */}
        <div
          data-ui="TreatmentCustomerList"
          className="flex min-h-0 flex-col rounded-lg border border-slate-200"
        >
          <div className="space-y-2 border-b border-slate-200 p-2">
            <Input
              size="small"
              allowClear
              prefix={<LuSearch size={13} className="text-slate-400" />}
              placeholder="Tìm tên / SĐT"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <Segmented
              size="small"
              block
              value={only}
              onChange={(v) => setOnly(v as "all" | "active")}
              options={[
                { value: "all", label: `Tất cả (${patients.length})` },
                { value: "active", label: "Đang có liệu trình" },
              ]}
            />
          </div>
          <div className="max-h-[560px] flex-1 space-y-px overflow-y-auto p-1">
            {list.map((p) => {
              const n = activeCount(p.key);
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setSelected(p.key)}
                  className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition ${p.key === selected ? "bg-brand-50 text-brand-700" : "hover:bg-slate-50"}`}
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                    {p.name.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold">
                      {p.name}
                    </span>
                    <span className="block truncate text-2xs text-slate-500">
                      {p.phone}
                    </span>
                  </span>
                  {n > 0 && (
                    <Tooltip title={`${n} liệu trình đang chạy`}>
                      <span className="inline-flex items-center gap-0.5 rounded bg-violet-100 px-1 text-2xs font-semibold text-violet-700">
                        <LuRepeat size={10} /> {n}
                      </span>
                    </Tooltip>
                  )}
                </button>
              );
            })}
            {!list.length && (
              <div className="py-6 text-center text-xs text-slate-400">
                Không có khách phù hợp
              </div>
            )}
          </div>
        </div>

        {/* Liệu trình của khách đang chọn */}
        <div className="min-w-0">
          {!cur ? (
            <div className="flex h-full min-h-[240px] items-center justify-center rounded-lg border border-dashed border-slate-200">
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Chọn một khách bên trái để xem & tạo liệu trình"
              />
            </div>
          ) : (
            <>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-base font-semibold text-slate-900">
                    {cur.name}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <LuPhone size={11} /> {cur.phone}
                    {cur.tier && <Tag className="!ml-1">{cur.tier}</Tag>}
                  </div>
                </div>
                <Button
                  type="primary"
                  icon={<LuRepeat size={14} />}
                  onClick={() => setModalOpen(true)}
                >
                  Tạo liệu trình
                </Button>
              </div>
              {!curPlans.length && (
                <div className="rounded-lg border border-dashed border-slate-200 py-8">
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="Khách chưa có liệu trình"
                  >
                    <Button
                      icon={<LuRepeat size={14} />}
                      onClick={() => setModalOpen(true)}
                    >
                      Tạo liệu trình đầu tiên
                    </Button>
                  </Empty>
                </div>
              )}
              <div className="space-y-3">
                {curPlans.map((p) => (
                  <TreatmentCard
                    key={p.id}
                    storeId={store.id}
                    plan={p}
                    onPatch={patchSessions}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <TreatmentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        store={store}
        defaults={
          cur ? { customerName: cur.name, phone: cur.phone } : undefined
        }
        onCreate={(items) => {
          updateCurrentStore((s) => ({
            ...s,
            bookings: [...items, ...(s.bookings ?? [])],
          }));
          message.success(
            `Đã tạo liệu trình ${items.length} buổi cho ${items[0]?.customerName}`,
          );
        }}
      />
    </div>
  );
}

/** TreatmentCard — 1 liệu trình: tiến độ, buổi tiếp theo, dòng thời gian các buổi (đổi trạng thái, kết quả buổi), dừng liệu trình */
function TreatmentCard({
  storeId,
  plan,
  onPatch,
}: {
  storeId: string;
  plan: Plan;
  onPatch: (
    ids: string[],
    patch: Partial<StoreBookingItem>,
    msg: string,
  ) => void;
}) {
  const { message } = AntApp.useApp();
  // SessionResultModal — nhập kết quả / ghi chú khi đánh dấu Hoàn thành (hoặc sửa lại sau)
  const [resultFor, setResultFor] = useState<StoreBookingItem | null>(null);
  const [resultText, setResultText] = useState("");
  const openResult = (b: StoreBookingItem) => {
    setResultFor(b);
    setResultText(b.result ?? "");
  };
  const saveResult = () => {
    if (!resultFor) return;
    onPatch(
      [resultFor.id],
      { status: "completed", result: resultText.trim() || undefined },
      `Buổi ${resultFor.treatmentSeq}: đã hoàn thành`,
    );
    setResultFor(null);
  };
  // Lưu & gửi: máy chủ lưu kết quả + hoàn thành buổi, rồi gửi thẻ kết quả vào chat của khách
  const [sending, setSending] = useState(false);
  const sendResult = async () => {
    if (!resultFor) return;
    setSending(true);
    try {
      const r = await sendTreatmentResult(
        storeId,
        resultFor.id,
        resultText.trim(),
      );
      onPatch(
        [resultFor.id],
        { status: "completed", result: r.booking.result },
        `Đã gửi kết quả buổi ${resultFor.treatmentSeq} cho khách`,
      );
      setResultFor(null);
    } catch (e) {
      message.error(
        e instanceof ApiError ? e.message : "Không gửi được kết quả",
      );
    } finally {
      setSending(false);
    }
  };
  const total = plan.sessions.length;
  const done = plan.sessions.filter((b) => b.status === "completed").length;
  const open = plan.sessions.filter(isOpen);
  const next = open[0];
  const stopped = !open.length && done < total;
  const today = dayjs().format("YYYY-MM-DD");
  return (
    <div
      data-ui="TreatmentCard"
      className="rounded-lg border border-slate-200 p-3"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
            <LuRepeat size={14} className="text-violet-600" /> {plan.name}
            {!open.length && (
              <Tag className="!m-0" color={stopped ? "default" : "green"}>
                {stopped ? "Đã dừng" : "Hoàn tất"}
              </Tag>
            )}
          </div>
          <div className="text-xs text-slate-500">
            {dayjs(plan.sessions[0].date).format("DD/MM/YYYY")} →{" "}
            {dayjs(plan.sessions[total - 1].date).format("DD/MM/YYYY")}
            {plan.sessions[0].staffName && ` · ${plan.sessions[0].staffName}`}
            {next && (
              <span
                className={
                  next.date < today ? "text-red-600" : "text-violet-700"
                }
              >
                {" "}
                · Buổi tiếp: {next.treatmentSeq} —{" "}
                {WEEKDAY[dayjs(next.date).day()]}{" "}
                {dayjs(next.date).format("DD/MM")} {next.timeSlot}
                {next.date < today && " (quá hẹn)"}
              </span>
            )}
          </div>
        </div>
        <div className="w-40 shrink-0">
          <div className="text-right text-2xs font-semibold tabular-nums text-slate-600">
            Xong {done}/{total}
          </div>
          <Progress
            percent={Math.round((done / total) * 100)}
            showInfo={false}
            size="small"
            strokeColor="#7c3aed"
          />
        </div>
      </div>
      {/* TreatmentTimeline — mỗi buổi 1 hàng, nối bằng đường dọc */}
      <ol data-ui="TreatmentTimeline" className="mt-3">
        {plan.sessions.map((b, i) => {
          const isNext = b.id === next?.id;
          const late = isOpen(b) && b.date < today;
          const days = dayjs(b.date).diff(dayjs(today), "day");
          const last = i === total - 1;
          return (
            <li
              key={b.id}
              className={`relative rounded-md p-1 text-xs ${isNext ? "bg-violet-50" : ""}`}
            >
              {/* Đường nối & nút mốc */}
              {!last && (
                <span
                  className={`absolute bottom-[-18px] left-[13px] top-[18px] w-0.5 ${b.status === "completed" ? "bg-violet-400" : "bg-slate-200"}`}
                />
              )}
              <div className="flex items-center gap-3">
                <span
                  className={`relative z-[1] flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 text-white ${
                    b.status === "completed"
                      ? "border-violet-600 bg-violet-600"
                      : b.status === "cancelled"
                        ? "border-slate-300 bg-slate-100 !text-slate-400"
                        : late
                          ? "border-red-500 bg-white"
                          : isNext
                            ? "border-violet-600 bg-white ring-4 ring-violet-100"
                            : "border-slate-300 bg-white"
                  }`}
                >
                  {b.status === "completed" ? (
                    <LuCheck size={11} strokeWidth={3} />
                  ) : b.status === "cancelled" ? (
                    <LuX size={10} strokeWidth={3} />
                  ) : null}
                </span>
                <span
                  className={`w-12 shrink-0 font-semibold ${b.status === "cancelled" ? "text-slate-400" : "text-violet-700"}`}
                >
                  Buổi {b.treatmentSeq}
                </span>
                <span
                  className={`w-36 shrink-0 tabular-nums ${b.status === "cancelled" ? "text-slate-400 line-through" : "text-slate-800"}`}
                >
                  {WEEKDAY[dayjs(b.date).day()]}{" "}
                  {dayjs(b.date).format("DD/MM/YYYY")} · {b.timeSlot}
                </span>
                <span
                  className={`min-w-0 flex-1 truncate ${late ? "font-semibold text-red-600" : "text-slate-400"}`}
                >
                  {isOpen(b)
                    ? late
                      ? `Quá hẹn ${-days} ngày`
                      : days === 0
                        ? "Hôm nay"
                        : days === 1
                          ? "Ngày mai"
                          : `Còn ${days} ngày`
                    : ""}
                  {b.staffName && (
                    <span className="text-slate-400">
                      {isOpen(b) ? " · " : ""}
                      {b.staffName}
                    </span>
                  )}
                </span>
                {b.status === "completed" && (
                  <Tooltip
                    title={b.result ? "Sửa kết quả buổi" : "Thêm kết quả buổi"}
                  >
                    <Button
                      size="small"
                      type="text"
                      icon={<LuNotebookPen size={13} />}
                      onClick={() => openResult(b)}
                    />
                  </Tooltip>
                )}
                <Select
                  size="small"
                  variant="borderless"
                  value={b.status}
                  popupMatchSelectWidth={false}
                  onChange={(v) =>
                    v === "completed"
                      ? openResult(b)
                      : onPatch(
                          [b.id],
                          { status: v },
                          `Buổi ${b.treatmentSeq}: đã cập nhật`,
                        )
                  }
                  options={BOOKING_STATUS.map((o) => ({
                    value: o.value,
                    label: (
                      <Tag
                        className="!m-0"
                        color={
                          STATUS_TAG[o.value as StoreBookingItem["status"]]
                            .color
                        }
                      >
                        {o.label}
                      </Tag>
                    ),
                  }))}
                />
              </div>
              {/* SessionResult — kết quả / ghi chú của buổi */}
              {b.result && (
                <button
                  type="button"
                  onClick={() => openResult(b)}
                  className="ml-[30px] mt-1 block w-[calc(100%-30px)] whitespace-pre-line rounded-md border border-slate-100 bg-slate-50 px-2 py-1 text-left text-xs leading-relaxed text-slate-600 transition hover:border-slate-200"
                >
                  {b.result}
                </button>
              )}
            </li>
          );
        })}
      </ol>
      <Modal
        title={
          resultFor
            ? `Hoàn thành buổi ${resultFor.treatmentSeq}/${resultFor.treatmentTotal} — ${dayjs(resultFor.date).format("DD/MM/YYYY")}`
            : ""
        }
        open={!!resultFor}
        onCancel={() => setResultFor(null)}
        destroyOnHidden
        footer={
          <div className="flex justify-end gap-2">
            <Button onClick={() => setResultFor(null)}>Huỷ</Button>
            <Button onClick={saveResult}>Lưu</Button>
            <Tooltip title="Lưu & gửi khách dạng thẻ trong tin nhắn Mini App">
              <Button
                type="primary"
                icon={<LuSend size={14} />}
                loading={sending}
                disabled={!resultText.trim()}
                onClick={sendResult}
              >
                Lưu & gửi khách
              </Button>
            </Tooltip>
          </div>
        }
      >
        <div data-ui="SessionResultModal">
          <div className="mb-1.5 text-xs text-slate-500">
            Kết quả / ghi chú buổi này (tình trạng, liều dùng, dặn dò…) — xem
            lại ở các buổi sau.
          </div>
          <Input.TextArea
            autoFocus
            value={resultText}
            onChange={(e) => setResultText(e.target.value)}
            autoSize={{ minRows: 3, maxRows: 8 }}
            maxLength={2000}
            placeholder="VD: Mụn viêm giảm ~30%, da bớt đỏ. Dặn dùng kem chống nắng."
          />
        </div>
      </Modal>
      {open.length > 0 && (
        <div className="mt-1 flex justify-end">
          <Popconfirm
            title={`Huỷ ${open.length} buổi chưa làm?`}
            okText="Dừng liệu trình"
            okButtonProps={{ danger: true }}
            cancelText="Không"
            onConfirm={() =>
              onPatch(
                open.map((b) => b.id),
                { status: "cancelled" },
                `Đã dừng liệu trình (huỷ ${open.length} buổi)`,
              )
            }
          >
            <Button size="small" type="text" danger>
              Dừng liệu trình
            </Button>
          </Popconfirm>
        </div>
      )}
    </div>
  );
}
