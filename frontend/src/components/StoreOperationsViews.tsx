import {
  AutoComplete,
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Popover,
  Segmented,
  Select,
 
  Switch,
  Table,
  Tag,
  App as AntApp,
} from "antd";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import {
  LuBookOpen,
  LuCalendarCheck,
  LuChevronLeft,
  LuChevronRight,
  LuCircleCheck,
  LuClock,
  LuFileText,
  LuHeadphones,
  LuPackage,
  LuPlus,
  LuSave,
  LuShoppingBag,
  LuTrash2,
  LuTrendingUp,
  LuUsers,
  LuWarehouse,
} from "react-icons/lu";
import { siteConfig } from "../data/site";
import {
  StoreBookingItem,
  StoreConfig,
  StoreDocumentItem,
  StoreEventItem,
  StoreSupportTicket,
} from "../data/store-api";
import { FilterBar, FilterSelect, PageHeader, StatCard, StatGrid } from "./ui";

export type StoreNavKey =
  | "overview"
  | "bookings"
  | "events"
  | "products"
  | "customers"
  | "albums"
  | "media"
  | "loyalty"
  | "orders"
  | "miniapp"
  | "inventory"
  | "documents"
  | "support"
  | "oainbox"
  | "settings"
  | "callbacks"
  | "portal"
  | "platformCustomers"
  | "debts"
  | "inbox"
  | "files"
  | "care"
  | "audit"
  | "antispam"
  | "accounts"
  | "api";

const TIME_SLOTS = ["08:30", "09:00", "10:00", "10:30", "11:00", "13:30", "14:00", "15:00", "16:30", "18:00", "19:30"];

const BOOKING_STATUS_OPTIONS = [
  { value: "pending", label: "Chờ xác nhận" },
  { value: "confirmed", label: "Đã xác nhận" },
  { value: "completed", label: "Hoàn thành" },
  { value: "cancelled", label: "Đã hủy" },
];

export function BookingCreateModal({
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
  onCreate: (item: StoreBookingItem) => void;
  /** Điền sẵn khi bấm vào ô trống trên lịch nhóm */
  defaults?: { date?: string; staffName?: string; customerName?: string; phone?: string };
  staffOptions?: string[];
}) {
  const [form] = Form.useForm();

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue({
      date: defaults?.date ?? dayjs().format("YYYY-MM-DD"),
      ...(defaults?.staffName ? { staffName: defaults.staffName } : {}),
      ...(defaults?.customerName ? { customerName: defaults.customerName, phone: defaults.phone ?? "" } : {}),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleSelectExistingCustomer = (customerId: string) => {
    const found = store.customers.find((c) => c.id === customerId);
    if (found) {
      form.setFieldsValue({ customerName: found.name, phone: found.phone });
    }
  };

  const handleFinish = (values: {
    customerName: string;
    phone: string;
    serviceName: string;
    date: string;
    timeSlot: string;
    staffName?: string;
    status: StoreBookingItem["status"];
    note?: string;
  }) => {
    const code = `LH-${dayjs().format("DDMM")}${String(Math.floor(10 + Math.random() * 89))}`;
    onCreate({
      id: `bk_${Date.now()}`,
      code,
      customerName: values.customerName.trim(),
      phone: values.phone.trim(),
      serviceName: values.serviceName.trim(),
      date: values.date,
      timeSlot: values.timeSlot,
      staffName: values.staffName?.trim() || undefined,
      status: values.status,
      note: values.note?.trim() || undefined,
      createdAt: dayjs().format("DD/MM/YYYY HH:mm"),
    });
    form.resetFields();
    onClose();
  };

  return (
    <Modal title="Đặt lịch hẹn cho khách" open={open} onCancel={onClose} footer={null} destroyOnHidden>
      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        initialValues={{
          date: dayjs().format("YYYY-MM-DD"),
          timeSlot: "10:00",
          status: "confirmed",
          serviceName: store.products[0]?.name || "Tư vấn dịch vụ",
        }}
      >
        {store.customers.length > 0 && !defaults?.customerName && (
          <Form.Item label="Chọn nhanh từ tệp khách hàng (tuỳ chọn)">
            <Select
              allowClear
              showSearch
              placeholder="Chọn khách hàng đã có để tự điền..."
              optionFilterProp="label"
              onChange={(val) => val && handleSelectExistingCustomer(val)}
              options={store.customers.map((c) => ({
                value: c.id,
                label: `${c.name} · ${c.phone} (${c.tier})`,
              }))}
            />
          </Form.Item>
        )}
        <div className="grid gap-x-4 sm:grid-cols-2">
          <Form.Item name="customerName" label="Tên khách hàng" rules={[{ required: true, message: "Nhập tên khách" }]}>
            <Input placeholder="VD: Nguyễn Minh Anh" />
          </Form.Item>
          <Form.Item name="phone" label="Số điện thoại" rules={[{ required: true, message: "Nhập SĐT" }]}>
            <Input placeholder="09xx xxx xxx" />
          </Form.Item>
        </div>

        <Form.Item name="serviceName" label="Dịch vụ / Nội dung hẹn" rules={[{ required: true, message: "Nhập dịch vụ" }]}>
          <Input placeholder="VD: Chăm sóc da chuyên sâu, Tư vấn sản phẩm..." />
        </Form.Item>

        {store.products.length > 0 && (
          <div className="-mt-2 mb-3 flex flex-wrap gap-1.5">
            {store.products.slice(0, 4).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => form.setFieldValue("serviceName", p.name)}
                className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-2xs font-medium text-slate-600 hover:border-brand-400 hover:text-brand-600"
              >
                + {p.name}
              </button>
            ))}
          </div>
        )}

        <div className="grid gap-x-4 sm:grid-cols-2">
          <Form.Item name="date" label="Ngày hẹn" rules={[{ required: true, message: "Chọn ngày" }]}>
            <Input type="date" />
          </Form.Item>
          <Form.Item name="timeSlot" label="Khung giờ" rules={[{ required: true, message: "Chọn giờ" }]}>
            <Select options={TIME_SLOTS.map((t) => ({ value: t, label: t }))} />
          </Form.Item>
        </div>

        <div className="grid gap-x-4 sm:grid-cols-2">
          <Form.Item name="staffName" label="Nhân viên phụ trách">
            <AutoComplete
              placeholder="VD: Lan Anh"
              options={staffOptions.map((n) => ({ value: n }))}
              filterOption={(input, opt) => String(opt?.value ?? "").toLowerCase().includes(input.toLowerCase())}
            />
          </Form.Item>
          <Form.Item name="status" label="Trạng thái">
            <Select options={BOOKING_STATUS_OPTIONS} />
          </Form.Item>
        </div>

        <Form.Item name="note" label="Ghi chú">
          <Input.TextArea rows={2} placeholder="Yêu cầu đặc biệt của khách..." />
        </Form.Item>
        <Button type="primary" htmlType="submit" block className="font-bold">
          Xác nhận đặt lịch
        </Button>
      </Form>
    </Modal>
  );
}

export function OverviewSection({
  store,
  onNavigate,
  updateCurrentStore,
}: {
  store: StoreConfig;
  onNavigate: (key: StoreNavKey) => void;
  updateCurrentStore: (updater: (s: StoreConfig) => StoreConfig) => void;
}) {
  const { message } = AntApp.useApp();
  const [bookingModalOpen, setBookingModalOpen] = useState(false);

  const orders = store.orders ?? [];
  const bookings = store.bookings ?? [];
  const todayStr = dayjs().format("YYYY-MM-DD");
  const todayBookings = bookings.filter((b) => b.date === todayStr);
  const pendingBookings = bookings.filter((b) => b.status === "pending").length;
  const totalRevenue = store.customers.reduce((sum, c) => sum + c.totalSpent, 0);
  const lowStockCount = store.products.filter((p) => (p.stock ?? 25) <= 10).length;

  const handleCreateBooking = (item: StoreBookingItem) => {
    updateCurrentStore((s) => ({ ...s, bookings: [item, ...(s.bookings ?? [])] }));
    message.success(`Đã tạo lịch hẹn ${item.code} cho ${item.customerName}!`);
  };

  const handleQuickStatus = (id: string, status: StoreBookingItem["status"]) => {
    updateCurrentStore((s) => ({
      ...s,
      bookings: (s.bookings ?? []).map((b) => (b.id === id ? { ...b, status } : b)),
    }));
    message.success("Đã cập nhật trạng thái lịch hẹn");
  };

  return (
    <div className="space-y-5">
      <StatGrid>
        <StatCard
          label="Doanh thu tích lũy"
          icon={<LuTrendingUp className="text-emerald-600" size={18} />}
          value={`${totalRevenue.toLocaleString("vi-VN")}đ`}
          hint={`Từ ${store.customers.length} khách hàng`}
        />
        <StatCard
          label="Lịch hẹn hôm nay"
          icon={<LuCalendarCheck className="text-sky-600" size={18} />}
          value={todayBookings.length.toLocaleString("vi-VN")}
          hint={`${pendingBookings} lịch chờ xác nhận · Tổng ${bookings.length}`}
        />
        <StatCard
          label="Đơn hàng"
          icon={<LuShoppingBag className="text-brand-600" size={18} />}
          value={orders.length.toLocaleString("vi-VN")}
          hint={`${orders.filter((o) => o.status === "pending").length} đơn chờ xác nhận`}
        />
        <StatCard
          label="Sản phẩm & Kho"
          icon={<LuPackage className="text-amber-600" size={18} />}
          value={store.products.length.toLocaleString("vi-VN")}
          hint={lowStockCount > 0 ? `${lowStockCount} sản phẩm sắp hết hàng` : "Tồn kho ổn định"}
        />
      </StatGrid>

      {/* Widget Lịch hẹn & Đặt lịch cho khách ngay trên trang Tổng quan */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <LuCalendarCheck size={17} className="text-brand-600" /> Lịch hẹn sắp tới & Đặt lịch cho khách
            </h3>
            <p className="text-xs text-slate-500">
              Theo dõi lịch hẹn khách đặt qua Mini App hoặc tạo lịch hẹn trực tiếp tại quầy.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button type="primary" size="small" icon={<LuPlus size={14} />} onClick={() => setBookingModalOpen(true)}>
              Đặt lịch cho khách
            </Button>
            <Button type="link" size="small" onClick={() => onNavigate("bookings")}>
              Quản lý lịch hẹn
            </Button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {bookings.slice(0, 6).map((b) => (
            <div key={b.id} className="flex flex-col justify-between rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1 rounded-md bg-brand-600/10 px-2 py-0.5 text-xs font-bold text-brand-700">
                    <LuClock size={12} /> {b.timeSlot} · {dayjs(b.date).format("DD/MM")}
                  </span>
                  <span className="font-mono text-xs font-semibold text-slate-400">{b.code}</span>
                </div>
                <div className="mt-2 text-xs font-bold text-slate-900">
                  {b.customerName} <span className="font-normal text-slate-500">· {b.phone}</span>
                </div>
                <div className="mt-0.5 truncate text-xs text-slate-600">{b.serviceName}</div>
                {b.staffName && <div className="mt-0.5 text-xs text-slate-400">Phụ trách: {b.staffName}</div>}
              </div>
              <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-200/70 pt-2.5">
                <Tag
                  className="m-0 text-xs"
                  color={b.status === "completed" ? "green" : b.status === "confirmed" ? "blue" : b.status === "pending" ? "orange" : "red"}
                >
                  {BOOKING_STATUS_OPTIONS.find((o) => o.value === b.status)?.label}
                </Tag>
                <Select
                  size="small"
                  value={b.status}
                  style={{ width: 122 }}
                  onChange={(next) => handleQuickStatus(b.id, next)}
                  options={BOOKING_STATUS_OPTIONS}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Đơn hàng gần đây</h3>
            <Button type="link" size="small" onClick={() => onNavigate("orders")}>
              Xem tất cả
            </Button>
          </div>
          <div className="space-y-2.5">
            {orders.slice(0, 4).map((o) => (
              <div key={o.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
                <div>
                  <div className="text-xs font-bold text-slate-900">
                    {o.code} · {o.customerName}
                  </div>
                  <div className="text-xs text-slate-500">{o.itemsSummary}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-brand-600">{o.total.toLocaleString("vi-VN")}đ</div>
                  <Tag className="mt-0.5 text-xs" color={o.status === "completed" ? "green" : o.status === "pending" ? "orange" : "blue"}>
                    {o.status === "pending" ? "Chờ xác nhận" : o.status === "shipping" ? "Đang giao" : o.status === "completed" ? "Hoàn thành" : o.status}
                  </Tag>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Trạng thái Store & Mini App</h3>
            <Button type="link" size="small" onClick={() => onNavigate("miniapp")}>
              Cấu hình Miniapp
            </Button>
          </div>
          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5">
              <span className="text-slate-600">Tên gian hàng</span>
              <span className="font-bold text-slate-900">{store.name}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5">
              <span className="text-slate-600">Slug công khai</span>
              <code className="rounded bg-white px-2 py-0.5 font-mono text-xs text-brand-700">{store.slug}</code>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5">
              <span className="text-slate-600">Zalo Mini App ID</span>
              <span className="font-semibold text-slate-800">{store.zaloAppId || "Chưa gắn"}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5">
              <span className="text-slate-600">Khách hàng CRM</span>
              <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                <LuUsers size={13} /> {store.customers.length} khách
              </span>
            </div>
          </div>
        </div>
      </div>

      <BookingCreateModal
        open={bookingModalOpen}
        onClose={() => setBookingModalOpen(false)}
        store={store}
        onCreate={handleCreateBooking}
      />
    </div>
  );
}

const STATUS_STYLE: Record<StoreBookingItem["status"], { chip: string; dot: string; label: string }> = {
  pending: { chip: "border-amber-200 bg-amber-50 text-amber-900", dot: "bg-amber-500", label: "Chờ xác nhận" },
  confirmed: { chip: "border-sky-200 bg-sky-50 text-sky-900", dot: "bg-sky-500", label: "Đã xác nhận" },
  completed: { chip: "border-emerald-200 bg-emerald-50 text-emerald-900", dot: "bg-emerald-500", label: "Hoàn thành" },
  cancelled: { chip: "border-slate-200 bg-slate-50 text-slate-400 line-through", dot: "bg-slate-300", label: "Đã hủy" },
};
const WEEKDAY = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const UNASSIGNED = "__none__";
/** Hôm qua + hôm nay + 5 ngày tới */
const CAL_DAYS = 7;

export function BookingsSection({
  store,
  updateCurrentStore,
}: {
  store: StoreConfig;
  updateCurrentStore: (updater: (s: StoreConfig) => StoreConfig) => void;
}) {
  const { message } = AntApp.useApp();
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const [modal, setModal] = useState<{ open: boolean; date?: string; staffName?: string }>({ open: false });
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("");
  const [hideCancelled, setHideCancelled] = useState(true);
  const [start, setStart] = useState(() => dayjs().subtract(1, "day").startOf("day"));
  const [openChip, setOpenChip] = useState<string | null>(null);

  const bookings = store.bookings ?? [];
  const todayStr = dayjs().format("YYYY-MM-DD");
  const days = Array.from({ length: CAL_DAYS }, (_, i) => start.add(i, "day"));
  const dayKeys = days.map((d) => d.format("YYYY-MM-DD"));

  const inRange = bookings.filter(
    (b) => dayKeys.includes(b.date) && (statusFilter === "all" || b.status === statusFilter) && !(hideCancelled && b.status === "cancelled"),
  );
  const staffNames = Array.from(
    new Set([...bookings.map((b) => b.staffName?.trim()).filter((n): n is string => !!n)]),
  ).sort((x, y) => x.localeCompare(y, "vi"));
  // Mỗi hàng = 1 nhân viên đã từng nhận lịch (để đặt lịch mới vào ô trống) + hàng "Chưa phân công"
  const rows = [...staffNames, UNASSIGNED];

  const cell = (staff: string, date: string) =>
    inRange
      .filter((b) => b.date === date && (staff === UNASSIGNED ? !b.staffName?.trim() : b.staffName?.trim() === staff))
      .sort((x, y) => x.timeSlot.localeCompare(y.timeSlot));

  const filteredList = bookings.filter(
    (b) => (statusFilter === "all" || b.status === statusFilter) && (!dateFilter || b.date === dateFilter),
  );

  const handleCreate = (item: StoreBookingItem) => {
    updateCurrentStore((s) => ({ ...s, bookings: [item, ...(s.bookings ?? [])] }));
    message.success(`Đã tạo lịch hẹn cho ${item.customerName}`);
  };

  const patchBooking = (id: string, patch: Partial<StoreBookingItem>, msg = "Đã cập nhật lịch hẹn") => {
    updateCurrentStore((s) => ({
      ...s,
      bookings: (s.bookings ?? []).map((b) => (b.id === id ? { ...b, ...patch } : b)),
    }));
    message.success(msg);
  };

  const removeBooking = (id: string) => {
    updateCurrentStore((s) => ({ ...s, bookings: (s.bookings ?? []).filter((b) => b.id !== id) }));
    setOpenChip(null);
    message.success("Đã xoá lịch hẹn");
  };

  const pendingCount = inRange.filter((b) => b.status === "pending").length;
  const todayCount = inRange.filter((b) => b.date === todayStr).length;

  const chipDetail = (b: StoreBookingItem) => (
    <div className="w-[260px] space-y-2 text-xs">
      <div>
        <div className="text-sm font-bold text-slate-900">{b.customerName}</div>
        <a href={`tel:${b.phone}`} className="font-mono text-brand-600">
          {b.phone}
        </a>
      </div>
      <div className="rounded-lg bg-slate-50 p-2 text-slate-600">
        <div className="font-semibold text-slate-800">{b.serviceName}</div>
        <div>
          {b.timeSlot} · {WEEKDAY[dayjs(b.date).day()]} {dayjs(b.date).format("DD/MM")} · {b.staffName || "Chưa phân công"}
        </div>
        {b.note && <div className="mt-1 text-slate-500">“{b.note}”</div>}
        <div className="mt-1 font-mono text-xs text-slate-400">{b.code}</div>
      </div>
      <div className="flex flex-wrap gap-1">
        {BOOKING_STATUS_OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => patchBooking(b.id, { status: o.value as StoreBookingItem["status"] }, `Đã chuyển sang "${o.label}"`)}
            className={`rounded-full border px-2 py-0.5 text-2xs font-semibold transition ${
              b.status === o.value ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 text-slate-600 hover:border-slate-400"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
      <Select
        size="small"
        className="w-full"
        value={b.staffName || UNASSIGNED}
        onChange={(v) => patchBooking(b.id, { staffName: v === UNASSIGNED ? "" : v }, "Đã đổi người phụ trách")}
        options={[
          { value: UNASSIGNED, label: "Chưa phân công" },
          ...staffNames.map((n) => ({ value: n, label: n })),
        ]}
      />
      <div className="flex justify-end">
        <Popconfirm title="Xoá lịch hẹn này?" onConfirm={() => removeBooking(b.id)}>
          <Button size="small" type="text" danger icon={<LuTrash2 size={13} />}>
            Xoá
          </Button>
        </Popconfirm>
      </div>
    </div>
  );

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <PageHeader
        title={<><LuCalendarCheck size={18} className="text-brand-600" /> Lịch hẹn</>}
        description={<>{view === "calendar"
              ? `${days[0].format("DD/MM")} – ${days[CAL_DAYS - 1].format("DD/MM")} · ${inRange.length} lịch · ${todayCount} hôm nay · ${pendingCount} chờ xác nhận`
              : "Toàn bộ lịch khách đặt trên Mini App và lịch đặt tại quầy."}</>}
      />
      <FilterBar
        filters={<><Segmented
            size="small"
            value={view}
            onChange={(v) => setView(v as "calendar" | "list")}
            options={[
              { value: "calendar", label: "Lịch nhóm" },
              { value: "list", label: "Danh sách" },
            ]}
          />
<FilterSelect
            size="small"
            value={statusFilter}
            onChange={setStatusFilter}
            options={[{ value: "all", label: "Tất cả trạng thái" }, ...BOOKING_STATUS_OPTIONS]}
          /></>}
        actions={<><Button type="primary" icon={<LuPlus size={15} />} onClick={() => setModal({ open: true })}>
            Đặt lịch
          </Button></>}
      />

      {view === "calendar" ? (
        <>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <Button size="small" icon={<LuChevronLeft size={14} />} onClick={() => setStart((d) => d.subtract(CAL_DAYS, "day"))} />
              <Button size="small" onClick={() => setStart(dayjs().subtract(1, "day").startOf("day"))}>
                Hôm nay
              </Button>
              <Button size="small" icon={<LuChevronRight size={14} />} onClick={() => setStart((d) => d.add(CAL_DAYS, "day"))} />
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
              {(Object.keys(STATUS_STYLE) as StoreBookingItem["status"][]).map((k) => (
                <span key={k} className="flex items-center gap-1">
                  <span className={`h-2 w-2 rounded-full ${STATUS_STYLE[k].dot}`} /> {STATUS_STYLE[k].label}
                </span>
              ))}
              <label className="flex cursor-pointer items-center gap-1.5">
                <Switch size="small" checked={hideCancelled} onChange={setHideCancelled} /> Ẩn lịch đã huỷ
              </label>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <div className="grid min-w-[900px]" style={{ gridTemplateColumns: `170px repeat(${CAL_DAYS}, minmax(0, 1fr))` }}>
              {/* Hàng tiêu đề ngày */}
              <div className="sticky left-0 z-10 border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                Nhân viên
              </div>
              {days.map((d) => {
                const key = d.format("YYYY-MM-DD");
                const isToday = key === todayStr;
                const isPast = d.isBefore(dayjs(), "day");
                const count = inRange.filter((b) => b.date === key).length;
                return (
                  <div
                    key={key}
                    className={`border-b border-l border-slate-200 px-2 py-2 text-center ${isToday ? "bg-brand-50" : "bg-slate-50"}`}
                  >
                    <div className={`text-xs font-bold ${isToday ? "text-brand-600" : isPast ? "text-slate-400" : "text-slate-500"}`}>
                      {isToday ? "Hôm nay" : WEEKDAY[d.day()]}
                    </div>
                    <div className={`text-base font-extrabold ${isToday ? "text-brand-600" : isPast ? "text-slate-400" : "text-slate-900"}`}>
                      {d.format("DD/MM")}
                    </div>
                    <div className="text-xs text-slate-400">{count ? `${count} lịch` : "—"}</div>
                  </div>
                );
              })}

              {/* Mỗi hàng = 1 nhân viên */}
              {rows.map((staff) => (
                <div key={staff} className="contents">
                  <div className="sticky left-0 z-10 flex items-start gap-2 border-b border-slate-100 bg-white px-3 py-2.5">
                    <span
                      className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                        staff === UNASSIGNED ? "border border-dashed border-slate-300 text-slate-400" : "bg-slate-900 text-white"
                      }`}
                    >
                      {staff === UNASSIGNED ? "?" : staff.slice(0, 1).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate text-xs font-bold text-slate-800">{staff === UNASSIGNED ? "Chưa phân công" : staff}</div>
                      <div className="text-xs text-slate-400">
                        {inRange.filter((b) => (staff === UNASSIGNED ? !b.staffName?.trim() : b.staffName?.trim() === staff)).length} lịch
                      </div>
                    </div>
                  </div>
                  {dayKeys.map((date) => {
                    const items = cell(staff, date);
                    const isToday = date === todayStr;
                    return (
                      <div
                        key={date}
                        className={`group relative min-h-[76px] space-y-1 border-b border-l border-slate-100 p-1.5 ${isToday ? "bg-brand-50/40" : ""}`}
                      >
                        {items.map((b) => (
                          <Popover
                            key={b.id}
                            trigger="click"
                            open={openChip === b.id}
                            onOpenChange={(o) => setOpenChip(o ? b.id : null)}
                            content={chipDetail(b)}
                            placement="right"
                          >
                            <button
                              type="button"
                              className={`block w-full rounded-lg border px-1.5 py-1 text-left transition hover:shadow-sm ${STATUS_STYLE[b.status].chip}`}
                            >
                              <div className="flex items-center gap-1 text-xs font-bold">
                                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_STYLE[b.status].dot}`} />
                                {b.timeSlot}
                                <span className="truncate font-semibold">{b.customerName}</span>
                              </div>
                              <div className="truncate text-xs opacity-75">{b.serviceName}</div>
                            </button>
                          </Popover>
                        ))}
                        {date >= todayStr && (
                          <button
                            type="button"
                            onClick={() => setModal({ open: true, date, staffName: staff === UNASSIGNED ? undefined : staff })}
                            className="flex w-full items-center justify-center rounded-lg border border-dashed border-transparent py-0.5 text-slate-300 opacity-0 transition hover:border-brand-300 hover:text-brand-600 group-hover:opacity-100"
                            title="Đặt lịch vào ô này"
                          >
                            <LuPlus size={13} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          {bookings.length === 0 && (
            <div className="mt-3 text-center text-xs text-slate-400">
              Chưa có lịch hẹn. Khách đặt trên Mini App sẽ hiện ở đây — hoặc bấm “Đặt lịch” để tạo cho khách.
            </div>
          )}
        </>
      ) : (
        <>
          <FilterBar filters={<Input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="w-full sm:!w-40" />} />
          <Table
            rowKey="id"
            size="small"
            dataSource={[...filteredList].sort((x, y) => (y.date + y.timeSlot).localeCompare(x.date + x.timeSlot))}
            pagination={{ pageSize: 10 }}
            columns={[
              {
                title: "Thời gian",
                render: (_, r) => (
                  <div>
                    <div className="text-xs font-bold text-brand-600">
                      {r.timeSlot} · {dayjs(r.date).format("DD/MM/YYYY")}
                    </div>
                    <div className="font-mono text-xs text-slate-400">{r.code}</div>
                  </div>
                ),
              },
              {
                title: "Khách hàng",
                render: (_, r) => (
                  <div>
                    <div className="font-semibold text-slate-900">{r.customerName}</div>
                    <div className="text-xs text-slate-500">{r.phone}</div>
                  </div>
                ),
              },
              {
                title: "Dịch vụ / Ghi chú",
                render: (_, r) => (
                  <div>
                    <div className="font-medium text-slate-800">{r.serviceName}</div>
                    {r.note && <div className="text-xs text-slate-400">{r.note}</div>}
                  </div>
                ),
              },
              { title: "Phụ trách", dataIndex: "staffName", render: (v) => v || <span className="text-slate-400">—</span> },
              {
                title: "Trạng thái",
                dataIndex: "status",
                render: (status, r) => (
                  <Select
                    size="small"
                    value={status}
                    style={{ width: 135 }}
                    onChange={(next) => patchBooking(r.id, { status: next })}
                    options={BOOKING_STATUS_OPTIONS}
                  />
                ),
              },
              {
                title: "",
                width: 56,
                render: (_, r) => (
                  <Popconfirm title="Xoá lịch hẹn này?" onConfirm={() => removeBooking(r.id)}>
                    <Button size="small" danger icon={<LuTrash2 size={13} />} />
                  </Popconfirm>
                ),
              },
            ]}
          />
        </>
      )}

      <BookingCreateModal
        open={modal.open}
        defaults={{ date: modal.date, staffName: modal.staffName }}
        staffOptions={staffNames}
        onClose={() => setModal({ open: false })}
        store={store}
        onCreate={handleCreate}
      />
    </div>
  );
}

export function EventsSection({
  store,
  updateCurrentStore,
}: {
  store: StoreConfig;
  updateCurrentStore: (updater: (s: StoreConfig) => StoreConfig) => void;
}) {
  const { message } = AntApp.useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  const events = store.events ?? [];

  const handleAddEvent = (values: Omit<StoreEventItem, "id" | "participants">) => {
    const newItem: StoreEventItem = {
      ...values,
      id: `ev_${Date.now()}`,
      participants: 0,
    };
    updateCurrentStore((s) => ({ ...s, events: [newItem, ...(s.events ?? [])] }));
    setModalOpen(false);
    form.resetFields();
    message.success("Đã thêm sự kiện mới!");
  };

  const removeEvent = (id: string) => {
    updateCurrentStore((s) => ({
      ...s,
      events: (s.events ?? []).filter((e) => e.id !== id),
    }));
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <PageHeader
        title="Sự kiện & Chiến dịch Mini App"
        description={<>Quản lý Flash Sale, Check-in tích điểm và sự kiện cửa hàng.</>}
        actions={<><Button type="primary" icon={<LuPlus size={15} />} onClick={() => setModalOpen(true)}>
          Tạo sự kiện
        </Button></>}
      />

      <Table
        rowKey="id"
        size="small"
        dataSource={events}
        pagination={{ pageSize: 6 }}
        columns={[
          {
            title: "Sự kiện",
            dataIndex: "title",
            render: (t, r) => (
              <div>
                <div className="font-semibold text-slate-900">{t}</div>
                {r.description && <div className="text-xs text-slate-500">{r.description}</div>}
              </div>
            ),
          },
          {
            title: "Loại",
            dataIndex: "type",
            render: (type) => <Tag color="blue">{type}</Tag>,
          },
          {
            title: "Thời gian",
            render: (_, r) => (
              <span className="text-xs text-slate-600">
                {r.startDate} → {r.endDate}
              </span>
            ),
          },
          {
            title: "Trạng thái",
            dataIndex: "status",
            render: (st) => (
              <Tag color={st === "running" ? "green" : st === "upcoming" ? "gold" : "default"}>
                {st === "running" ? "Đang chạy" : st === "upcoming" ? "Sắp diễn ra" : "Đã kết thúc"}
              </Tag>
            ),
          },
          {
            title: "Tham gia",
            dataIndex: "participants",
            render: (v) => <span className="font-semibold">{v} lượt</span>,
          },
          {
            title: "",
            width: 60,
            render: (_, r) => (
              <Popconfirm title="Xóa sự kiện?" onConfirm={() => removeEvent(r.id)}>
                <Button size="small" danger icon={<LuTrash2 size={13} />} />
              </Popconfirm>
            ),
          },
        ]}
      />

      <Modal title="Tạo sự kiện / chiến dịch" open={modalOpen} onCancel={() => setModalOpen(false)} footer={null}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleAddEvent}
          initialValues={{
            type: "promotion",
            status: "running",
            startDate: dayjs().format("YYYY-MM-DD"),
            endDate: dayjs().add(7, "day").format("YYYY-MM-DD"),
          }}
        >
          <Form.Item name="title" label="Tên sự kiện" rules={[{ required: true, message: "Nhập tên sự kiện" }]}>
            <Input placeholder="VD: Tuần lễ tri ân khách hàng" />
          </Form.Item>
          <div className="grid gap-x-4 sm:grid-cols-2">
            <Form.Item name="type" label="Loại">
              <Select
                options={[
                  { value: "promotion", label: "Khuyến mãi" },
                  { value: "flash_sale", label: "Flash Sale" },
                  { value: "checkin", label: "Check-in tích điểm" },
                  { value: "workshop", label: "Sự kiện / Hội thảo" },
                ]}
              />
            </Form.Item>
            <Form.Item name="status" label="Trạng thái">
              <Select
                options={[
                  { value: "running", label: "Đang chạy" },
                  { value: "upcoming", label: "Sắp diễn ra" },
                  { value: "ended", label: "Đã kết thúc" },
                ]}
              />
            </Form.Item>
          </div>
          <div className="grid gap-x-4 sm:grid-cols-2">
            <Form.Item name="startDate" label="Ngày bắt đầu">
              <Input />
            </Form.Item>
            <Form.Item name="endDate" label="Ngày kết thúc">
              <Input />
            </Form.Item>
          </div>
          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>
            Lưu sự kiện
          </Button>
        </Form>
      </Modal>
    </div>
  );
}

export function InventorySection({
  store,
  updateCurrentStore,
}: {
  store: StoreConfig;
  updateCurrentStore: (updater: (s: StoreConfig) => StoreConfig) => void;
}) {
  const { message } = AntApp.useApp();

  const updateStock = (productId: string, stock: number) => {
    updateCurrentStore((s) => ({
      ...s,
      products: s.products.map((p) => (p.id === productId ? { ...p, stock } : p)),
    }));
    message.success("Đã cập nhật tồn kho");
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-base font-bold text-slate-900">
            <LuWarehouse size={18} className="text-brand-600" /> Quản lý Kho hàng
          </h3>
          <p className="text-xs text-slate-500">Điều chỉnh số lượng tồn kho và theo dõi sản phẩm sắp hết.</p>
        </div>
      </div>

      <Table
        rowKey="id"
        size="small"
        dataSource={store.products}
        pagination={{ pageSize: 8 }}
        columns={[
          {
            title: "SKU / Sản phẩm",
            render: (_, r) => (
              <div>
                <div className="font-semibold text-slate-900">{r.name}</div>
                <div className="text-xs text-slate-500">SKU: {r.sku || r.id.toUpperCase()} · {r.category}</div>
              </div>
            ),
          },
          {
            title: "Tồn kho",
            width: 150,
            render: (_, r) => (
              <InputNumber
                min={0}
                size="small"
                value={r.stock ?? 25}
                onChange={(val) => updateStock(r.id, Number(val ?? 0))}
              />
            ),
          },
          {
            title: "Tình trạng",
            render: (_, r) => {
              const qty = r.stock ?? 25;
              if (qty === 0) return <Tag color="red">Hết hàng</Tag>;
              if (qty <= 10) return <Tag color="orange">Sắp hết ({qty})</Tag>;
              return <Tag color="green">Còn hàng</Tag>;
            },
          },
        ]}
      />
    </div>
  );
}

export function SupportSection({
  store,
  updateCurrentStore,
}: {
  store: StoreConfig;
  updateCurrentStore: (updater: (s: StoreConfig) => StoreConfig) => void;
}) {
  const { message } = AntApp.useApp();
  const [form] = Form.useForm();
  const tickets = store.tickets ?? [];

  const submitTicket = (values: { subject: string; category: StoreSupportTicket["category"]; priority: StoreSupportTicket["priority"]; message: string }) => {
    const ticket: StoreSupportTicket = {
      id: `tk_${Date.now()}`,
      ...values,
      status: "open",
      createdAt: dayjs().format("DD/MM/YYYY HH:mm"),
    };
    updateCurrentStore((s) => ({ ...s, tickets: [ticket, ...(s.tickets ?? [])] }));
    form.resetFields();
    message.success("Đã gửi yêu cầu hỗ trợ tới đội ngũ kỹ thuật recloud.vn!");
  };

  return (
    <div className="grid gap-5 lg:grid-cols-12">
      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 lg:col-span-5">
        <h3 className="mb-1 flex items-center gap-2 text-base font-bold text-slate-900">
          <LuHeadphones size={18} className="text-brand-600" /> Gửi yêu cầu hỗ trợ
        </h3>
        <p className="mb-4 text-xs text-slate-500">
          Hotline kỹ thuật: <strong>{siteConfig.phoneDisplay}</strong> · Zalo hỗ trợ duyệt Mini App 24/7
        </p>
        <Form
          form={form}
          layout="vertical"
          onFinish={submitTicket}
          initialValues={{ category: "technical", priority: "normal" }}
        >
          <Form.Item name="subject" label="Tiêu đề" rules={[{ required: true, message: "Nhập tiêu đề hỗ trợ" }]}>
            <Input placeholder="VD: Cần hỗ trợ kết nối Zalo Pay / OA" />
          </Form.Item>
          <div className="grid gap-x-4 sm:grid-cols-2">
            <Form.Item name="category" label="Danh mục">
              <Select
                options={[
                  { value: "technical", label: "Kỹ thuật / API" },
                  { value: "zalo_review", label: "Duyệt Zalo Mini App" },
                  { value: "billing", label: "Gói cước / Thanh toán" },
                  { value: "feature", label: "Yêu cầu tính năng" },
                ]}
              />
            </Form.Item>
            <Form.Item name="priority" label="Mức độ">
              <Select
                options={[
                  { value: "low", label: "Thấp" },
                  { value: "normal", label: "Bình thường" },
                  { value: "high", label: "Khẩn cấp" },
                ]}
              />
            </Form.Item>
          </div>
          <Form.Item name="message" label="Nội dung chi tiết" rules={[{ required: true, message: "Nhập nội dung" }]}>
            <Input.TextArea rows={3} placeholder="Mô tả vấn đề bạn đang gặp..." />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>
            Gửi yêu cầu
          </Button>
        </Form>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 lg:col-span-7">
        <h3 className="mb-3 text-base font-bold text-slate-900">Lịch sử hỗ trợ ({tickets.length})</h3>
        <div className="space-y-3">
          {tickets.map((tk) => (
            <div key={tk.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-bold text-slate-900">{tk.subject}</div>
                  <div className="mt-0.5 text-xs text-slate-600">{tk.message}</div>
                </div>
                <Tag color={tk.status === "resolved" ? "green" : tk.status === "in_progress" ? "blue" : "orange"}>
                  {tk.status === "resolved" ? (
                    <span className="inline-flex items-center gap-1">
                      <LuCircleCheck size={11} /> Đã xử lý
                    </span>
                  ) : tk.status === "in_progress" ? (
                    "Đang xử lý"
                  ) : (
                    "Mới tiếp nhận"
                  )}
                </Tag>
              </div>
              <div className="mt-2 flex items-center gap-3 text-xs text-slate-400">
                <span>{tk.createdAt}</span>
                <span>·</span>
                <span>Mức độ: {tk.priority}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const DOC_CATEGORY_OPTIONS: { value: StoreDocumentItem["category"]; label: string; color: string }[] = [
  { value: "warranty", label: "Chính sách bảo hành", color: "blue" },
  { value: "return", label: "Quy định đổi trả hàng", color: "orange" },
  { value: "payment", label: "Thanh toán & Giao nhận", color: "green" },
  { value: "notice", label: "Lưu ý quan trọng", color: "gold" },
  { value: "terms", label: "Điều khoản sử dụng", color: "purple" },
  { value: "privacy", label: "Chính sách bảo mật", color: "cyan" },
  { value: "guide", label: "Hướng dẫn khách hàng", color: "geekblue" },
];

export function DocumentsSection({
  store,
  updateCurrentStore,
}: {
  store: StoreConfig;
  updateCurrentStore: (updater: (s: StoreConfig) => StoreConfig) => void;
}) {
  const { message } = AntApp.useApp();
  const docs = store.documents ?? [];
  const [selectedDocId, setSelectedDocId] = useState<string>(docs[0]?.id ?? "");
  const [catFilter, setCatFilter] = useState<string>("all");
  const [editorMode, setEditorMode] = useState<"edit" | "preview">("edit");
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm] = Form.useForm();

  const filteredDocs = catFilter === "all" ? docs : docs.filter((d) => d.category === catFilter);
  const currentDoc = docs.find((d) => d.id === selectedDocId) ?? filteredDocs[0] ?? docs[0];

  const patchDoc = (id: string, patch: Partial<StoreDocumentItem>) => {
    updateCurrentStore((s) => ({
      ...s,
      documents: (s.documents ?? []).map((d) =>
        d.id === id ? { ...d, ...patch, updatedAt: dayjs().format("DD/MM/YYYY HH:mm") } : d,
      ),
    }));
  };

  const handleCreateDoc = (values: {
    title: string;
    category: StoreDocumentItem["category"];
    content?: string;
  }) => {
    const slug = values.title
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const created: StoreDocumentItem = {
      id: `doc_${Date.now()}`,
      slug: slug || `tai-lieu-${Date.now()}`,
      title: values.title.trim(),
      category: values.category,
      content: values.content?.trim() || "Nhập nội dung chi tiết tại đây...",
      published: true,
      updatedAt: dayjs().format("DD/MM/YYYY HH:mm"),
    };
    updateCurrentStore((s) => ({
      ...s,
      documents: [created, ...(s.documents ?? [])],
    }));
    setSelectedDocId(created.id);
    setCreateOpen(false);
    createForm.resetFields();
    message.success(`Đã tạo tài liệu "${created.title}"!`);
  };

  const deleteDoc = (id: string) => {
    const next = docs.filter((d) => d.id !== id);
    updateCurrentStore((s) => ({ ...s, documents: next }));
    if (selectedDocId === id) setSelectedDocId(next[0]?.id ?? "");
    message.success("Đã xóa tài liệu");
  };

  const getCatMeta = (cat: StoreDocumentItem["category"]) =>
    DOC_CATEGORY_OPTIONS.find((c) => c.value === cat) ?? DOC_CATEGORY_OPTIONS[0];

  return (
    <div className="grid gap-5 lg:grid-cols-12">
      {/* Cột trái: Danh sách tài liệu */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 lg:col-span-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <LuBookOpen size={17} className="text-brand-600" /> Thư viện &amp; Tài liệu ({docs.length})
          </h3>
          <Button type="primary" size="small" icon={<LuPlus size={14} />} onClick={() => setCreateOpen(true)}>
            Tạo mới
          </Button>
        </div>

        <Select
          size="small"
          value={catFilter}
          onChange={setCatFilter}
          className="mb-3 w-full"
          options={[
            { value: "all", label: "Tất cả danh mục chính sách" },
            ...DOC_CATEGORY_OPTIONS.map((c) => ({ value: c.value, label: c.label })),
          ]}
        />

        <div className="space-y-2">
          {filteredDocs.map((doc) => {
            const active = currentDoc?.id === doc.id;
            const cat = getCatMeta(doc.category);
            return (
              <button
                key={doc.id}
                type="button"
                onClick={() => setSelectedDocId(doc.id)}
                className={`w-full rounded-xl border p-3 text-left transition ${
                  active
                    ? "border-brand-500 bg-brand-50/50 ring-1 ring-brand-200"
                    : "border-slate-100 bg-slate-50/70 hover:border-slate-200 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-bold text-slate-900">{doc.title}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <Tag color={cat.color} className="m-0 text-xs">
                        {cat.label}
                      </Tag>
                      {!doc.published && (
                        <Tag color="default" className="m-0 text-xs">
                          Bản nháp
                        </Tag>
                      )}
                    </div>
                  </div>
                  <LuFileText size={15} className={active ? "shrink-0 text-brand-600" : "shrink-0 text-slate-400"} />
                </div>
                <div className="mt-2 text-xs text-slate-400">Cập nhật: {doc.updatedAt}</div>
              </button>
            );
          })}
          {filteredDocs.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
              Chưa có tài liệu trong mục này
            </div>
          )}
        </div>
      </div>

      {/* Cột phải: Trình soạn thảo & Xem trước */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 lg:col-span-8">
        {currentDoc ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Segmented
                  size="small"
                  value={editorMode}
                  onChange={(v) => setEditorMode(v as "edit" | "preview")}
                  options={[
                    { value: "edit", label: "Soạn thảo" },
                    { value: "preview", label: "Xem trước" },
                  ]}
                />
                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                  <Switch
                    size="small"
                    checked={currentDoc.published}
                    onChange={(v) => patchDoc(currentDoc.id, { published: v })}
                  />
                  <span>Hiển thị trên App</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="small"
                  type="primary"
                  icon={<LuSave size={13} />}
                  onClick={() => message.success(`Đã lưu "${currentDoc.title}"`)}
                >
                  Lưu tài liệu
                </Button>
                <Popconfirm title="Xóa tài liệu này?" onConfirm={() => deleteDoc(currentDoc.id)}>
                  <Button size="small" danger icon={<LuTrash2 size={13} />} />
                </Popconfirm>
              </div>
            </div>

            {editorMode === "edit" ? (
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <div className="mb-1 text-xs font-semibold text-slate-600">Tiêu đề tài liệu</div>
                    <Input
                      value={currentDoc.title}
                      onChange={(e) => patchDoc(currentDoc.id, { title: e.target.value })}
                    />
                  </div>
                  <div>
                    <div className="mb-1 text-xs font-semibold text-slate-600">Danh mục</div>
                    <Select
                      className="w-full"
                      value={currentDoc.category}
                      onChange={(v) => patchDoc(currentDoc.id, { category: v })}
                      options={DOC_CATEGORY_OPTIONS.map((c) => ({ value: c.value, label: c.label }))}
                    />
                  </div>
                </div>
                <div>
                  <div className="mb-1 text-xs font-semibold text-slate-600">Đường dẫn (Slug)</div>
                  <Input
                    size="small"
                    prefix={<span className="text-slate-400">/docs/</span>}
                    value={currentDoc.slug}
                    onChange={(e) => patchDoc(currentDoc.id, { slug: e.target.value })}
                  />
                </div>
                <div>
                  <div className="mb-1 text-xs font-semibold text-slate-600">Nội dung chi tiết</div>
                  <Input.TextArea
                    rows={12}
                    value={currentDoc.content}
                    onChange={(e) => patchDoc(currentDoc.id, { content: e.target.value })}
                    placeholder="Viết chính sách bảo hành, quy định đổi trả, hướng dẫn thanh toán, lưu ý..."
                  />
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                <Tag color={getCatMeta(currentDoc.category).color} className="mb-2">
                  {getCatMeta(currentDoc.category).label}
                </Tag>
                <h2 className="text-lg font-extrabold text-slate-900">{currentDoc.title}</h2>
                <div className="mt-1 text-xs text-slate-400">
                  Cập nhật lần cuối: {currentDoc.updatedAt} · Đường dẫn: /docs/{currentDoc.slug}
                </div>
                <div className="mt-4 whitespace-pre-line text-sm leading-relaxed text-slate-700">
                  {currentDoc.content}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="py-16 text-center text-sm text-slate-400">Chọn một tài liệu bên trái hoặc tạo tài liệu mới.</div>
        )}
      </div>

      <Modal
        title="Tạo tài liệu / chính sách mới"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        footer={null}
        destroyOnHidden
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={handleCreateDoc}
          initialValues={{ category: "warranty" }}
        >
          <Form.Item name="title" label="Tiêu đề" rules={[{ required: true, message: "Nhập tiêu đề tài liệu" }]}>
            <Input placeholder="VD: Chính sách bảo hành 1 đổi 1" />
          </Form.Item>
          <Form.Item name="category" label="Loại tài liệu">
            <Select options={DOC_CATEGORY_OPTIONS.map((c) => ({ value: c.value, label: c.label }))} />
          </Form.Item>
          <Form.Item name="content" label="Nội dung ban đầu">
            <Input.TextArea rows={4} placeholder="Nhập nội dung chính sách, quy định hoặc lưu ý..." />
          </Form.Item>
          <Button type="primary" htmlType="submit" block className="font-bold">
            Tạo tài liệu
          </Button>
        </Form>
      </Modal>
    </div>
  );
}
