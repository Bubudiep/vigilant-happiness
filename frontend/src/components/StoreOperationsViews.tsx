import {
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Segmented,
  Select,
  Statistic,
  Switch,
  Table,
  Tag,
  App as AntApp,
} from "antd";
import dayjs from "dayjs";
import { useState } from "react";
import {
  LuBookOpen,
  LuCalendarCheck,
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
  StoreOrderItem,
  StoreSupportTicket,
} from "../data/store-api";

export type StoreNavKey =
  | "overview"
  | "bookings"
  | "events"
  | "products"
  | "customers"
  | "loyalty"
  | "orders"
  | "miniapp"
  | "inventory"
  | "documents"
  | "support"
  | "callbacks"
  | "portal"
  | "platformCustomers"
  | "debts"
  | "inbox"
  | "files"
  | "care"
  | "audit"
  | "antispam"
  | "api";

const DEFAULT_EVENTS: StoreEventItem[] = [
  {
    id: "ev_1",
    title: "Flash Sale Cuối Tuần - Giảm 20%",
    type: "flash_sale",
    startDate: dayjs().format("YYYY-MM-DD"),
    endDate: dayjs().add(3, "day").format("YYYY-MM-DD"),
    status: "running",
    participants: 128,
    description: "Áp dụng cho đơn đặt qua Zalo Mini App từ 299.000đ",
  },
  {
    id: "ev_2",
    title: "Check-in nhận điểm thành viên",
    type: "checkin",
    startDate: dayjs().add(5, "day").format("YYYY-MM-DD"),
    endDate: dayjs().add(15, "day").format("YYYY-MM-DD"),
    status: "upcoming",
    participants: 42,
    description: "Tặng 50 điểm thưởng khi khách mở Mini App lần đầu",
  },
];

const DEFAULT_ORDERS: StoreOrderItem[] = [
  {
    id: "ord_1",
    code: "DH-261101",
    customerName: "Nguyễn Minh Anh",
    phone: "0903 445 667",
    itemsSummary: "2x Sản phẩm nổi bật",
    total: 890000,
    status: "pending",
    createdAt: dayjs().subtract(2, "hour").format("DD/MM/YYYY HH:mm"),
  },
  {
    id: "ord_2",
    code: "DH-261102",
    customerName: "Trần Quốc Bảo",
    phone: "0912 889 123",
    itemsSummary: "1x Gói dịch vụ VIP",
    total: 1450000,
    status: "shipping",
    createdAt: dayjs().subtract(1, "day").format("DD/MM/YYYY HH:mm"),
  },
  {
    id: "ord_3",
    code: "DH-261103",
    customerName: "Lê Thu Hà",
    phone: "0988 221 334",
    itemsSummary: "3x Combo ưu đãi",
    total: 640000,
    status: "completed",
    createdAt: dayjs().subtract(2, "day").format("DD/MM/YYYY HH:mm"),
  },
];

const DEFAULT_TICKETS: StoreSupportTicket[] = [
  {
    id: "tk_1",
    subject: "Hướng dẫn gắn Zalo OA ID vào Mini App",
    category: "zalo_review",
    priority: "normal",
    status: "resolved",
    createdAt: dayjs().subtract(3, "day").format("DD/MM/YYYY"),
    message: "Đã cấu hình OA ID và hoàn tất kiểm duyệt trên Zalo Mini App.",
  },
];

const DEFAULT_BOOKINGS: StoreBookingItem[] = [
  {
    id: "bk_1",
    code: "LH-261101",
    customerName: "Nguyễn Minh Anh",
    phone: "0903 445 667",
    serviceName: "Tư vấn & Thử sản phẩm tại cửa hàng",
    date: dayjs().format("YYYY-MM-DD"),
    timeSlot: "10:30",
    staffName: "Lan Anh",
    status: "confirmed",
    note: "Khách hẹn xem bộ sưu tập mới",
    createdAt: dayjs().subtract(3, "hour").format("DD/MM/YYYY HH:mm"),
  },
  {
    id: "bk_2",
    code: "LH-261102",
    customerName: "Phạm Thảo Vy",
    phone: "0977 112 889",
    serviceName: "Chăm sóc dịch vụ VIP 60 phút",
    date: dayjs().format("YYYY-MM-DD"),
    timeSlot: "14:00",
    staffName: "Minh Thư",
    status: "pending",
    note: "Khách đặt qua Zalo Mini App",
    createdAt: dayjs().subtract(1, "hour").format("DD/MM/YYYY HH:mm"),
  },
  {
    id: "bk_3",
    code: "LH-261103",
    customerName: "Trần Quốc Bảo",
    phone: "0912 889 123",
    serviceName: "Lấy hàng & Bảo hành định kỳ",
    date: dayjs().add(1, "day").format("YYYY-MM-DD"),
    timeSlot: "09:00",
    staffName: "Quốc Huy",
    status: "pending",
    createdAt: dayjs().subtract(30, "minute").format("DD/MM/YYYY HH:mm"),
  },
];

const TIME_SLOTS = ["08:30", "09:00", "10:00", "10:30", "11:00", "13:30", "14:00", "15:00", "16:30", "18:00", "19:30"];

const BOOKING_STATUS_OPTIONS = [
  { value: "pending", label: "Chờ xác nhận" },
  { value: "confirmed", label: "Đã xác nhận" },
  { value: "completed", label: "Hoàn thành" },
  { value: "cancelled", label: "Đã hủy" },
];

function BookingCreateModal({
  open,
  onClose,
  store,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  store: StoreConfig;
  onCreate: (item: StoreBookingItem) => void;
}) {
  const [form] = Form.useForm();

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
        {store.customers.length > 0 && (
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
        <div className="grid grid-cols-2 gap-3">
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
                className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-medium text-slate-600 hover:border-brand-400 hover:text-brand-600"
              >
                + {p.name}
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Form.Item name="date" label="Ngày hẹn" rules={[{ required: true, message: "Chọn ngày" }]}>
            <Input type="date" />
          </Form.Item>
          <Form.Item name="timeSlot" label="Khung giờ" rules={[{ required: true, message: "Chọn giờ" }]}>
            <Select options={TIME_SLOTS.map((t) => ({ value: t, label: t }))} />
          </Form.Item>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Form.Item name="staffName" label="Nhân viên phụ trách">
            <Input placeholder="VD: Lan Anh" />
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

  const orders = store.orders ?? DEFAULT_ORDERS;
  const bookings = store.bookings ?? DEFAULT_BOOKINGS;
  const todayStr = dayjs().format("YYYY-MM-DD");
  const todayBookings = bookings.filter((b) => b.date === todayStr);
  const pendingBookings = bookings.filter((b) => b.status === "pending").length;
  const totalRevenue = store.customers.reduce((sum, c) => sum + c.totalSpent, 0);
  const lowStockCount = store.products.filter((p) => (p.stock ?? 25) <= 10).length;

  const handleCreateBooking = (item: StoreBookingItem) => {
    updateCurrentStore((s) => ({ ...s, bookings: [item, ...(s.bookings ?? DEFAULT_BOOKINGS)] }));
    message.success(`Đã tạo lịch hẹn ${item.code} cho ${item.customerName}!`);
  };

  const handleQuickStatus = (id: string, status: StoreBookingItem["status"]) => {
    updateCurrentStore((s) => ({
      ...s,
      bookings: (s.bookings ?? DEFAULT_BOOKINGS).map((b) => (b.id === id ? { ...b, status } : b)),
    }));
    message.success("Đã cập nhật trạng thái lịch hẹn");
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase">Doanh thu tích lũy</span>
            <LuTrendingUp className="text-emerald-600" size={18} />
          </div>
          <div className="mt-2">
            <Statistic value={totalRevenue} suffix="đ" styles={{ content: { fontSize: 22, fontWeight: 800 } }} />
          </div>
          <div className="mt-1 text-xs text-slate-500">Từ {store.customers.length} khách hàng</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase">Lịch hẹn hôm nay</span>
            <LuCalendarCheck className="text-sky-600" size={18} />
          </div>
          <div className="mt-2">
            <Statistic value={todayBookings.length} styles={{ content: { fontSize: 22, fontWeight: 800 } }} />
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {pendingBookings} lịch chờ xác nhận · Tổng {bookings.length}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase">Đơn hàng</span>
            <LuShoppingBag className="text-brand-600" size={18} />
          </div>
          <div className="mt-2">
            <Statistic value={orders.length} styles={{ content: { fontSize: 22, fontWeight: 800 } }} />
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {orders.filter((o) => o.status === "pending").length} đơn chờ xác nhận
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase">Sản phẩm & Kho</span>
            <LuPackage className="text-amber-600" size={18} />
          </div>
          <div className="mt-2">
            <Statistic value={store.products.length} styles={{ content: { fontSize: 22, fontWeight: 800 } }} />
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {lowStockCount > 0 ? `${lowStockCount} sản phẩm sắp hết hàng` : "Tồn kho ổn định"}
          </div>
        </div>
      </div>

      {/* Widget Lịch hẹn & Đặt lịch cho khách ngay trên trang Tổng quan */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
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
                  <span className="inline-flex items-center gap-1 rounded-md bg-brand-600/10 px-2 py-0.5 text-[11px] font-bold text-brand-700">
                    <LuClock size={12} /> {b.timeSlot} · {dayjs(b.date).format("DD/MM")}
                  </span>
                  <span className="font-mono text-[10px] font-semibold text-slate-400">{b.code}</span>
                </div>
                <div className="mt-2 text-xs font-bold text-slate-900">
                  {b.customerName} <span className="font-normal text-slate-500">· {b.phone}</span>
                </div>
                <div className="mt-0.5 truncate text-xs text-slate-600">{b.serviceName}</div>
                {b.staffName && <div className="mt-0.5 text-[11px] text-slate-400">Phụ trách: {b.staffName}</div>}
              </div>
              <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-200/70 pt-2.5">
                <Tag
                  className="m-0 text-[10px]"
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
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
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
                  <div className="text-[11px] text-slate-500">{o.itemsSummary}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-brand-600">{o.total.toLocaleString("vi-VN")}đ</div>
                  <Tag className="mt-0.5 text-[10px]" color={o.status === "completed" ? "green" : o.status === "pending" ? "orange" : "blue"}>
                    {o.status === "pending" ? "Chờ xác nhận" : o.status === "shipping" ? "Đang giao" : o.status === "completed" ? "Hoàn thành" : o.status}
                  </Tag>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
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
              <code className="rounded bg-white px-2 py-0.5 font-mono text-[11px] text-brand-700">{store.slug}</code>
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

export function BookingsSection({
  store,
  updateCurrentStore,
}: {
  store: StoreConfig;
  updateCurrentStore: (updater: (s: StoreConfig) => StoreConfig) => void;
}) {
  const { message } = AntApp.useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("");

  const bookings = store.bookings ?? DEFAULT_BOOKINGS;
  const filtered = bookings.filter((b) => {
    const matchStatus = statusFilter === "all" || b.status === statusFilter;
    const matchDate = !dateFilter || b.date === dateFilter;
    return matchStatus && matchDate;
  });

  const handleCreate = (item: StoreBookingItem) => {
    updateCurrentStore((s) => ({ ...s, bookings: [item, ...(s.bookings ?? DEFAULT_BOOKINGS)] }));
    message.success(`Đã tạo lịch hẹn ${item.code} cho ${item.customerName}!`);
  };

  const updateStatus = (id: string, status: StoreBookingItem["status"]) => {
    updateCurrentStore((s) => ({
      ...s,
      bookings: (s.bookings ?? DEFAULT_BOOKINGS).map((b) => (b.id === id ? { ...b, status } : b)),
    }));
    message.success("Đã cập nhật trạng thái lịch hẹn");
  };

  const removeBooking = (id: string) => {
    updateCurrentStore((s) => ({
      ...s,
      bookings: (s.bookings ?? DEFAULT_BOOKINGS).filter((b) => b.id !== id),
    }));
    message.success("Đã xoá lịch hẹn");
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-2 text-base font-bold text-slate-900">
            <LuCalendarCheck size={18} className="text-brand-600" /> Quản lý Lịch hẹn ({filtered.length})
          </h3>
          <p className="text-xs text-slate-500">Quản lý lịch khách đặt trên Zalo Mini App và đặt lịch trực tiếp cho khách.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="date"
            size="small"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            style={{ width: 150 }}
          />
          <Select
            size="small"
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 150 }}
            options={[{ value: "all", label: "Tất cả trạng thái" }, ...BOOKING_STATUS_OPTIONS]}
          />
          <Button type="primary" icon={<LuPlus size={15} />} onClick={() => setModalOpen(true)}>
            Đặt lịch cho khách
          </Button>
        </div>
      </div>

      <Table
        rowKey="id"
        size="small"
        dataSource={filtered}
        pagination={{ pageSize: 8 }}
        columns={[
          {
            title: "Mã / Thời gian",
            render: (_, r) => (
              <div>
                <div className="font-mono text-xs font-bold text-slate-900">{r.code}</div>
                <div className="text-[11px] font-semibold text-brand-600">
                  {r.timeSlot} · {dayjs(r.date).format("DD/MM/YYYY")}
                </div>
              </div>
            ),
          },
          {
            title: "Khách hàng",
            render: (_, r) => (
              <div>
                <div className="font-semibold text-slate-900">{r.customerName}</div>
                <div className="text-[11px] text-slate-500">{r.phone}</div>
              </div>
            ),
          },
          {
            title: "Dịch vụ / Ghi chú",
            render: (_, r) => (
              <div>
                <div className="font-medium text-slate-800">{r.serviceName}</div>
                {r.note && <div className="text-[11px] text-slate-400">{r.note}</div>}
              </div>
            ),
          },
          {
            title: "Phụ trách",
            dataIndex: "staffName",
            render: (v) => v || <span className="text-slate-400">—</span>,
          },
          {
            title: "Trạng thái",
            dataIndex: "status",
            render: (status, r) => (
              <Select
                size="small"
                value={status}
                style={{ width: 135 }}
                onChange={(next) => updateStatus(r.id, next)}
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

      <BookingCreateModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
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
  const events = store.events ?? DEFAULT_EVENTS;

  const handleAddEvent = (values: Omit<StoreEventItem, "id" | "participants">) => {
    const newItem: StoreEventItem = {
      ...values,
      id: `ev_${Date.now()}`,
      participants: 0,
    };
    updateCurrentStore((s) => ({ ...s, events: [newItem, ...(s.events ?? DEFAULT_EVENTS)] }));
    setModalOpen(false);
    form.resetFields();
    message.success("Đã thêm sự kiện mới!");
  };

  const removeEvent = (id: string) => {
    updateCurrentStore((s) => ({
      ...s,
      events: (s.events ?? DEFAULT_EVENTS).filter((e) => e.id !== id),
    }));
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-bold text-slate-900">Sự kiện & Chiến dịch Mini App</h3>
          <p className="text-xs text-slate-500">Quản lý Flash Sale, Check-in tích điểm và sự kiện cửa hàng.</p>
        </div>
        <Button type="primary" icon={<LuPlus size={15} />} onClick={() => setModalOpen(true)}>
          Tạo sự kiện
        </Button>
      </div>

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
                {r.description && <div className="text-[11px] text-slate-500">{r.description}</div>}
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
          <div className="grid grid-cols-2 gap-3">
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
          <div className="grid grid-cols-2 gap-3">
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

export function OrdersSection({
  store,
  updateCurrentStore,
}: {
  store: StoreConfig;
  updateCurrentStore: (updater: (s: StoreConfig) => StoreConfig) => void;
}) {
  const { message } = AntApp.useApp();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const orders = store.orders ?? DEFAULT_ORDERS;
  const filtered = statusFilter === "all" ? orders : orders.filter((o) => o.status === statusFilter);

  const updateOrderStatus = (id: string, status: StoreOrderItem["status"]) => {
    updateCurrentStore((s) => ({
      ...s,
      orders: (s.orders ?? DEFAULT_ORDERS).map((o) => (o.id === id ? { ...o, status } : o)),
    }));
    message.success("Đã cập nhật trạng thái đơn hàng");
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-bold text-slate-900">Quản lý Đơn hàng ({filtered.length})</h3>
          <p className="text-xs text-slate-500">Theo dõi đơn đặt từ Zalo Mini App và cập nhật trạng thái giao hàng.</p>
        </div>
        <Select
          value={statusFilter}
          onChange={setStatusFilter}
          style={{ width: 180 }}
          options={[
            { value: "all", label: "Tất cả trạng thái" },
            { value: "pending", label: "Chờ xác nhận" },
            { value: "confirmed", label: "Đã xác nhận" },
            { value: "shipping", label: "Đang giao" },
            { value: "completed", label: "Hoàn thành" },
            { value: "cancelled", label: "Đã hủy" },
          ]}
        />
      </div>

      <Table
        rowKey="id"
        size="small"
        dataSource={filtered}
        pagination={{ pageSize: 8 }}
        columns={[
          { title: "Mã đơn", dataIndex: "code", render: (c) => <span className="font-mono font-bold">{c}</span> },
          {
            title: "Khách hàng",
            render: (_, r) => (
              <div>
                <div className="font-semibold text-slate-900">{r.customerName}</div>
                <div className="text-[11px] text-slate-500">{r.phone}</div>
              </div>
            ),
          },
          { title: "Chi tiết", dataIndex: "itemsSummary" },
          {
            title: "Tổng tiền",
            dataIndex: "total",
            render: (v) => <span className="font-bold text-brand-600">{v.toLocaleString("vi-VN")}đ</span>,
          },
          { title: "Thời gian", dataIndex: "createdAt" },
          {
            title: "Trạng thái",
            dataIndex: "status",
            render: (status, r) => (
              <Select
                size="small"
                value={status}
                style={{ width: 135 }}
                onChange={(next) => updateOrderStatus(r.id, next)}
                options={[
                  { value: "pending", label: "Chờ xác nhận" },
                  { value: "confirmed", label: "Đã xác nhận" },
                  { value: "shipping", label: "Đang giao" },
                  { value: "completed", label: "Hoàn thành" },
                  { value: "cancelled", label: "Đã hủy" },
                ]}
              />
            ),
          },
        ]}
      />
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
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
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
                <div className="text-[11px] text-slate-500">SKU: {r.sku || r.id.toUpperCase()} · {r.category}</div>
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
  const tickets = store.tickets ?? DEFAULT_TICKETS;

  const submitTicket = (values: { subject: string; category: StoreSupportTicket["category"]; priority: StoreSupportTicket["priority"]; message: string }) => {
    const ticket: StoreSupportTicket = {
      id: `tk_${Date.now()}`,
      ...values,
      status: "open",
      createdAt: dayjs().format("DD/MM/YYYY HH:mm"),
    };
    updateCurrentStore((s) => ({ ...s, tickets: [ticket, ...(s.tickets ?? DEFAULT_TICKETS)] }));
    form.resetFields();
    message.success("Đã gửi yêu cầu hỗ trợ tới đội ngũ kỹ thuật recloud.vn!");
  };

  return (
    <div className="grid gap-5 lg:grid-cols-12">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-5">
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
          <div className="grid grid-cols-2 gap-3">
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

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-7">
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
              <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-400">
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

const DEFAULT_DOCUMENTS: StoreDocumentItem[] = [
  {
    id: "doc_warranty",
    slug: "chinh-sach-bao-hanh",
    title: "Chính sách bảo hành sản phẩm",
    category: "warranty",
    published: true,
    updatedAt: dayjs().format("DD/MM/YYYY HH:mm"),
    content:
      "1. Thời gian bảo hành: 12 tháng kể từ ngày mua hàng trên Zalo Mini App hoặc tại cửa hàng.\n2. Điều kiện bảo hành: Sản phẩm còn nguyên tem/mã đơn hàng, lỗi kỹ thuật từ nhà sản xuất.\n3. Quy trình tiếp nhận: Khách hàng mang trực tiếp đến cửa hàng hoặc nhắn qua Zalo OA kèm mã đơn hàng để được hỗ trợ trong 24 giờ.",
  },
  {
    id: "doc_return",
    slug: "quy-dinh-doi-tra",
    title: "Quy định đổi trả hàng & hoàn tiền",
    category: "return",
    published: true,
    updatedAt: dayjs().format("DD/MM/YYYY HH:mm"),
    content:
      "1. Thời hạn đổi trả: Trong vòng 07 ngày kể từ ngày nhận hàng.\n2. Yêu cầu sản phẩm: Còn nguyên nhãn mác, chưa qua sử dụng, không bị hư hỏng do tác động bên ngoài.\n3. Hoàn tiền: Thực hiện chuyển khoản hoặc hoàn về ví thanh toán trong 1–3 ngày làm việc sau khi cửa hàng nhận lại sản phẩm.",
  },
  {
    id: "doc_payment",
    slug: "chinh-sach-thanh-toan",
    title: "Hướng dẫn thanh toán & giao nhận",
    category: "payment",
    published: true,
    updatedAt: dayjs().format("DD/MM/YYYY HH:mm"),
    content:
      "- Thanh toán khi nhận hàng (COD).\n- Chuyển khoản ngân hàng qua mã VietQR tự động xác nhận.\n- Thanh toán qua ví ZaloPay / MoMo ngay trên Zalo Mini App.\n- Miễn phí giao hàng nội thành cho đơn từ 299.000đ.",
  },
  {
    id: "doc_terms",
    slug: "dieu-khoan-va-luu-y",
    title: "Điều khoản sử dụng & Lưu ý đặt hàng",
    category: "terms",
    published: true,
    updatedAt: dayjs().format("DD/MM/YYYY HH:mm"),
    content:
      "- Quý khách vui lòng kiểm tra kỹ thông tin số điện thoại và địa chỉ nhận hàng trước khi xác nhận đơn.\n- Điểm thưởng thành viên được cộng tự động sau khi đơn hàng chuyển sang trạng thái Hoàn thành.\n- Mọi thắc mắc vui lòng liên hệ Hotline hoặc Zalo OA của cửa hàng.",
  },
];

export function DocumentsSection({
  store,
  updateCurrentStore,
}: {
  store: StoreConfig;
  updateCurrentStore: (updater: (s: StoreConfig) => StoreConfig) => void;
}) {
  const { message } = AntApp.useApp();
  const docs = store.documents ?? DEFAULT_DOCUMENTS;
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
      documents: (s.documents ?? DEFAULT_DOCUMENTS).map((d) =>
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
      documents: [created, ...(s.documents ?? DEFAULT_DOCUMENTS)],
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
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-4">
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
                      <Tag color={cat.color} className="m-0 text-[10px]">
                        {cat.label}
                      </Tag>
                      {!doc.published && (
                        <Tag color="default" className="m-0 text-[10px]">
                          Bản nháp
                        </Tag>
                      )}
                    </div>
                  </div>
                  <LuFileText size={15} className={active ? "shrink-0 text-brand-600" : "shrink-0 text-slate-400"} />
                </div>
                <div className="mt-2 text-[10px] text-slate-400">Cập nhật: {doc.updatedAt}</div>
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
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-8">
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
                <div className="mt-1 text-[11px] text-slate-400">
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
