import { App as AntApp, AutoComplete, Avatar, Button, Checkbox, DatePicker, Drawer, Form, Input, InputNumber, Popconfirm, Segmented, Select, Table, Tabs, Tag, Tooltip } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useMemo, useState } from "react";
import { LuCalendarCheck, LuPhone, LuPlus, LuSearch, LuTrash2, LuUserCheck, LuUserX, LuWallet } from "react-icons/lu";
import { type EmploymentType, isService, type StaffStatus, type StoreConfig, type StoreStaffItem } from "../data/store-api";
import type { StaffStatusSync } from "../data/attendance-api";
import { AttendancePanel } from "./StoreAttendanceViews";
import { FilterBar, FilterSelect, FORM_PROPS, FormFooter, FormGrid, PageHeader, StatCard, StatGrid } from "./ui";

export const STAFF_STATUS: Record<StaffStatus, { label: string; color: string }> = {
  active: { label: "Đang làm", color: "green" },
  leave: { label: "Nghỉ phép", color: "orange" },
  quit: { label: "Đã nghỉ việc", color: "default" },
};
const EMPLOYMENT: Record<EmploymentType, string> = {
  full_time: "Toàn thời gian",
  part_time: "Bán thời gian",
  probation: "Thử việc",
  freelance: "Cộng tác viên",
};
/** Thứ tự hiển thị T2 → CN (0 = CN) */
const WEEK = [1, 2, 3, 4, 5, 6, 0];
const dayLabel = (d: number) => (d === 0 ? "CN" : `T${d + 1}`);
const TIMES = Array.from({ length: 36 }, (_, i) => {
  const m = 5 * 60 + i * 30; // 05:00 → 22:30
  const v = `${String(Math.floor(m / 60)).padStart(2, "0")}:${m % 60 ? "30" : "00"}`;
  return { value: v, label: v };
});
const money = (n: number) => `${n.toLocaleString("vi-VN")}đ`;
const initials = (name: string) =>
  name
    .replace(/^(BS|KTV|ThS|TS)\.?\s+/i, "")
    .split(/\s+/)
    .slice(-2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

/** Mục web quản trị có thể cấp cho tài khoản nhân viên (khoá = đường dẫn /admin/<khoá>) */
export const ADMIN_SECTION_GROUPS: { title: string; items: [string, string][] }[] = [
  { title: "Vận hành", items: [["overview", "Tổng quan"], ["pos", "Bán hàng"], ["orders", "Đơn hàng"], ["bookings", "Lịch hẹn"], ["events", "Sự kiện"]] },
  { title: "Hàng hoá & nhân sự", items: [["products", "Sản phẩm & kho"], ["staff", "Nhân sự & lương"]] },
  { title: "Khách hàng", items: [["customers", "Khách hàng"], ["loyalty", "Hạng & Voucher"], ["oainbox", "Tin nhắn OA"]] },
  { title: "Mini App", items: [["miniapp", "Thiết kế Miniapp"], ["albums", "Album ảnh"], ["media", "Kho ảnh"], ["documents", "Tài liệu"]] },
  { title: "Hệ thống", items: [["reports", "Báo cáo doanh thu"], ["settings", "Thiết lập"], ["support", "Hỗ trợ"]] },
];
const ALL_SECTIONS = ADMIN_SECTION_GROUPS.flatMap((g) => g.items.map(([k]) => k));
const ACCESS_PRESETS: [string, string[]][] = [
  ["Thu ngân", ["overview", "pos", "orders", "bookings", "customers"]],
  ["Quản lý ca", ["overview", "pos", "orders", "bookings", "events", "products", "customers", "loyalty", "oainbox", "albums", "media", "documents"]],
  ["Toàn quyền", ALL_SECTIONS],
];

type FormValues = Omit<StoreStaffItem, "id" | "startDate" | "birthday"> & { startDate?: Dayjs | null; birthday?: Dayjs | null };

/**
 * Nhân sự của gian hàng: hồ sơ, chức danh, ca làm trong tuần, dịch vụ làm được, lương cơ bản / hoa hồng.
 * Tên nhân viên đang làm được gợi ý ở ô "Nhân viên phụ trách" của Lịch hẹn.
 */
export function StaffSection({
  store,
  updateCurrentStore,
  applyLocal,
}: {
  store: StoreConfig & { access?: string[] | null };
  updateCurrentStore: (updater: (s: StoreConfig) => StoreConfig) => void;
  /** Cập nhật giao diện không gửi lên máy chủ (trạng thái do máy chủ đồng bộ từ chấm công) */
  applyLocal: (updater: (s: StoreConfig) => StoreConfig) => void;
}) {
  const { message } = AntApp.useApp();
  const [tab, setTab] = useState("list");
  const syncStatuses = (list: StaffStatusSync) => {
    const m = new Map(list.map((x) => [x.id, x.status]));
    applyLocal((s) =>
      (s.staff ?? []).some((x) => m.has(x.id) && m.get(x.id) !== x.status)
        ? { ...s, staff: (s.staff ?? []).map((x) => (m.has(x.id) ? { ...x, status: m.get(x.id)! } : x)) }
        : s,
    );
  };
  const staff = store.staff ?? [];
  const [status, setStatus] = useState<string>("working");
  const [position, setPosition] = useState<string | undefined>();
  const [q, setQ] = useState("");
  const [drawer, setDrawer] = useState<{ open: boolean; item?: StoreStaffItem }>({ open: false });
  const [form] = Form.useForm<FormValues>();
  // Chỉ chủ shop (không phải tài khoản nhân viên) được cấp tài khoản web cho nhân viên
  const canGrant = !store.access?.length;

  const positions = useMemo(() => [...new Set(staff.map((s) => s.position).filter((p): p is string => !!p))].sort((a, b) => a.localeCompare(b, "vi")), [staff]);
  const serviceNames = store.products.filter(isService).map((p) => p.name);

  // Lịch hẹn 7 ngày tới (chưa huỷ) của từng nhân viên — khớp theo tên ở ô "Phụ trách"
  const today = dayjs().format("YYYY-MM-DD");
  const weekEnd = dayjs().add(6, "day").format("YYYY-MM-DD");
  const upcoming = useMemo(() => {
    const m = new Map<string, { today: number; week: number }>();
    for (const b of store.bookings ?? []) {
      const n = b.staffName?.trim();
      if (!n || b.status === "cancelled" || b.date < today || b.date > weekEnd) continue;
      const c = m.get(n) ?? { today: 0, week: 0 };
      c.week++;
      if (b.date === today) c.today++;
      m.set(n, c);
    }
    return m;
  }, [store.bookings, today, weekEnd]);

  const working = staff.filter((s) => s.status === "active");
  const onLeave = staff.filter((s) => s.status === "leave");
  const payroll = staff.filter((s) => s.status !== "quit").reduce((sum, s) => sum + (s.baseSalary ?? 0), 0);
  const todayBookings = working.reduce((sum, s) => sum + (upcoming.get(s.name)?.today ?? 0), 0);
  const worksToday = working.filter((s) => s.workDays.includes(dayjs().day())).length;

  const kw = q.trim().toLowerCase();
  const shown = staff.filter(
    (s) =>
      (status === "all" || (status === "working" ? s.status !== "quit" : s.status === status)) &&
      (!position || s.position === position) &&
      (!kw || s.name.toLowerCase().includes(kw) || (s.phone ?? "").includes(kw) || (s.code ?? "").toLowerCase().includes(kw)),
  );

  const open = (item?: StoreStaffItem) => {
    setDrawer({ open: true, item });
    form.resetFields();
    form.setFieldsValue(
      item
        ? { ...item, startDate: item.startDate ? dayjs(item.startDate) : null, birthday: item.birthday ? dayjs(item.birthday) : null }
        : { status: "active", employmentType: "full_time", workDays: [1, 2, 3, 4, 5, 6], shiftStart: "08:00", shiftEnd: "17:30", services: [], startDate: dayjs() },
    );
  };

  const save = (v: FormValues) => {
    const clean = (x?: string | null) => (x?.trim() ? x.trim() : null);
    const data: Omit<StoreStaffItem, "id"> = {
      ...v,
      name: v.name.trim(),
      code: clean(v.code),
      attendanceCode: clean(v.attendanceCode),
      phone: clean(v.phone),
      email: clean(v.email),
      position: clean(v.position),
      department: clean(v.department),
      note: clean(v.note),
      loginEmail: clean(v.loginEmail)?.toLowerCase() ?? null,
      adminSections: v.adminSections ?? [],
      baseSalary: v.baseSalary ?? null,
      commissionPercent: v.commissionPercent ?? null,
      workDays: v.workDays ?? [],
      services: v.services ?? [],
      startDate: v.startDate ? v.startDate.format("YYYY-MM-DD") : null,
      birthday: v.birthday ? v.birthday.format("YYYY-MM-DD") : null,
    };
    const editing = drawer.item;
    if (editing) {
      updateCurrentStore((s) => ({ ...s, staff: (s.staff ?? []).map((x) => (x.id === editing.id ? { ...x, ...data } : x)) }));
      message.success("Đã cập nhật hồ sơ");
    } else {
      updateCurrentStore((s) => ({ ...s, staff: [...(s.staff ?? []), { id: `tmp_${Date.now()}`, ...data }] }));
      message.success(`Đã thêm ${data.name}`);
    }
    setDrawer({ open: false });
  };

  const setItemStatus = (item: StoreStaffItem, next: StaffStatus) =>
    updateCurrentStore((s) => ({ ...s, staff: (s.staff ?? []).map((x) => (x.id === item.id ? { ...x, status: next } : x)) }));

  const remove = (item: StoreStaffItem) => {
    updateCurrentStore((s) => ({ ...s, staff: (s.staff ?? []).filter((x) => x.id !== item.id) }));
    message.success("Đã xoá nhân viên");
  };

  return (
    <div className="space-y-4">
      <Tabs
        activeKey={tab}
        onChange={setTab}
        className="!-mb-2"
        items={[
          { key: "list", label: `Danh sách (${staff.filter((s) => s.status !== "quit").length})` },
          { key: "attendance", label: "Chấm công" },
        ]}
      />
      {tab === "attendance" ? (
        <AttendancePanel store={store} onStaffSync={syncStatuses} />
      ) : (
      <>
      <StatGrid>
        <StatCard label="Đang làm" icon={<LuUserCheck size={16} className="text-emerald-600" />} value={working.length} hint={`${worksToday} người có ca hôm nay`} />
        <StatCard label="Nghỉ phép" icon={<LuUserX size={16} className="text-amber-600" />} value={onLeave.length} tone={onLeave.length ? "warning" : "default"} hint={onLeave.map((s) => s.name).join(", ") || "Không có"} />
        <StatCard label="Lịch hẹn hôm nay" icon={<LuCalendarCheck size={16} className="text-sky-600" />} value={todayBookings} hint="Đã phân cho nhân viên" />
        <StatCard label="Quỹ lương cơ bản / tháng" icon={<LuWallet size={16} className="text-brand-600" />} value={money(payroll)} hint="Chưa gồm hoa hồng" />
      </StatGrid>

      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <PageHeader title="Nhân sự" description="Hồ sơ nhân viên, ca làm trong tuần, dịch vụ đảm nhận và lương. Tên nhân viên đang làm được gợi ý khi phân công lịch hẹn." />
        <FilterBar
          search={<Input allowClear prefix={<LuSearch size={14} className="text-slate-400" />} placeholder="Tìm tên, SĐT, mã NV…" value={q} onChange={(e) => setQ(e.target.value)} />}
          filters={
            <>
              <Segmented
                value={status}
                onChange={(v) => setStatus(String(v))}
                options={[
                  { value: "working", label: "Hiện tại" },
                  { value: "active", label: "Đang làm" },
                  { value: "leave", label: "Nghỉ phép" },
                  { value: "quit", label: "Đã nghỉ" },
                  { value: "all", label: "Tất cả" },
                ]}
              />
              {positions.length > 1 && <FilterSelect allowClear placeholder="Chức danh" value={position} onChange={setPosition} options={positions.map((p) => ({ value: p, label: p }))} />}
            </>
          }
          actions={
            <Button type="primary" icon={<LuPlus size={14} />} onClick={() => open()}>
              Thêm nhân viên
            </Button>
          }
        />
        <Table<StoreStaffItem>
          rowKey="id"
          size="small"
          dataSource={shown}
          tableLayout="fixed"
          scroll={{ x: 980 }}
          pagination={{ pageSize: 12, hideOnSinglePage: true, showSizeChanger: false }}
          locale={{ emptyText: staff.length ? "Không có nhân viên phù hợp" : "Chưa có nhân viên — bấm “Thêm nhân viên”" }}
          onRow={(r) => ({ onDoubleClick: () => open(r) })}
          columns={[
            {
              title: "Nhân viên",
              width: 220,
              render: (_, s) => (
                <div className="flex min-w-0 items-center gap-2.5">
                  <Avatar size={32} src={s.avatarUrl || undefined} className={`shrink-0 !text-xs !font-semibold ${s.status === "quit" ? "!bg-slate-300" : "!bg-brand-600"}`}>
                    {initials(s.name)}
                  </Avatar>
                  <div className="min-w-0">
                    <button type="button" className="block max-w-full truncate text-left font-semibold text-slate-900 hover:text-brand-600" onClick={() => open(s)}>
                      {s.name}
                    </button>
                    <div className="flex min-w-0 items-center gap-1.5">
                      <span className="truncate text-xs text-slate-500">{[s.code, s.position].filter(Boolean).join(" · ") || "—"}</span>
                      {s.loginEmail && !!s.adminSections?.length && (
                        <Tooltip title={`Đăng nhập web: ${s.loginEmail} · ${s.adminSections.length} mục`}>
                          <Tag color="blue" className="!m-0 shrink-0 !px-1 !text-3xs">
                            Web
                          </Tag>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                </div>
              ),
            },
            {
              title: "Liên hệ",
              width: 130,
              render: (_, s) =>
                s.phone ? (
                  <a href={`tel:${s.phone}`} className="inline-flex items-center gap-1 tabular-nums text-slate-700">
                    <LuPhone size={12} /> {s.phone}
                  </a>
                ) : (
                  <span className="text-slate-400">—</span>
                ),
            },
            {
              title: "Ca làm",
              width: 190,
              render: (_, s) => (
                <div>
                  <div className="flex gap-0.5">
                    {WEEK.map((d) => (
                      <span
                        key={d}
                        className={`flex h-[18px] w-[22px] items-center justify-center rounded text-2xs font-semibold ${
                          s.workDays.includes(d) ? "bg-brand-50 text-brand-700" : "bg-slate-50 text-slate-300"
                        }`}
                      >
                        {dayLabel(d)}
                      </span>
                    ))}
                  </div>
                  {(s.shiftStart || s.shiftEnd) && (
                    <div className="mt-0.5 text-xs tabular-nums text-slate-500">
                      {s.shiftStart ?? "?"} – {s.shiftEnd ?? "?"}
                    </div>
                  )}
                </div>
              ),
            },
            {
              title: "Dịch vụ đảm nhận",
              render: (_, s) =>
                s.services.length ? (
                  <Tooltip title={s.services.join(", ")}>
                    <div className="flex min-w-0 flex-nowrap gap-1 overflow-hidden">
                      {s.services.slice(0, 2).map((x) => (
                        <Tag key={x} className="!m-0 min-w-0 max-w-[110px] shrink truncate">
                          {x}
                        </Tag>
                      ))}
                      {s.services.length > 2 && <Tag className="!m-0 shrink-0">+{s.services.length - 2}</Tag>}
                    </div>
                  </Tooltip>
                ) : (
                  <span className="text-slate-400">—</span>
                ),
            },
            {
              title: "Lịch 7 ngày",
              width: 96,
              align: "right",
              render: (_, s) => {
                const c = upcoming.get(s.name);
                return c ? (
                  <div className="tabular-nums">
                    <div className="font-semibold text-slate-900">{c.week}</div>
                    {c.today > 0 && <div className="text-xs text-sky-600">{c.today} hôm nay</div>}
                  </div>
                ) : (
                  <span className="text-slate-400">0</span>
                );
              },
            },
            {
              title: "Lương cơ bản",
              width: 120,
              align: "right",
              render: (_, s) => (
                <div className="tabular-nums">
                  <div className="text-slate-900">{s.baseSalary ? money(s.baseSalary) : "—"}</div>
                  {s.commissionPercent ? <div className="text-xs text-slate-500">+{s.commissionPercent}% hoa hồng</div> : null}
                </div>
              ),
            },
            {
              title: "Trạng thái",
              width: 128,
              render: (_, s) => (
                <Select
                  size="small"
                  variant="borderless"
                  value={s.status}
                  popupMatchSelectWidth={false}
                  onChange={(v) => setItemStatus(s, v)}
                  options={(Object.keys(STAFF_STATUS) as StaffStatus[]).map((k) => ({ value: k, label: <Tag color={STAFF_STATUS[k].color} className="!m-0">{STAFF_STATUS[k].label}</Tag> }))}
                />
              ),
            },
            {
              title: "",
              width: 88,
              align: "right",
              render: (_, s) => (
                <div className="flex justify-end gap-1">
                  <Button size="small" onClick={() => open(s)}>
                    Sửa
                  </Button>
                  <Popconfirm
                    title={`Xoá ${s.name}?`}
                    description="Nên chuyển sang “Đã nghỉ việc” để giữ lịch sử."
                    okText="Xoá"
                    okButtonProps={{ danger: true }}
                    cancelText="Huỷ"
                    onConfirm={() => remove(s)}
                  >
                    <Button size="small" danger icon={<LuTrash2 size={13} />} />
                  </Popconfirm>
                </div>
              ),
            },
          ]}
        />
      </div>

      </>
      )}

      <Drawer
        title={drawer.item ? `Hồ sơ · ${drawer.item.name}` : "Thêm nhân viên"}
        open={drawer.open}
        onClose={() => setDrawer({ open: false })}
        width={560}
        destroyOnHidden
      >
        <Form form={form} {...FORM_PROPS} onFinish={save}>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Thông tin</div>
          <FormGrid>
            <Form.Item label="Họ tên" name="name" rules={[{ required: true, whitespace: true, message: "Nhập họ tên" }]}>
              <Input placeholder="VD: BS. Trần Minh Khoa" />
            </Form.Item>
            <Form.Item label="Mã nhân viên" name="code">
              <Input placeholder="NV001" />
            </Form.Item>
            <Form.Item label="Mã chấm công" name="attendanceCode" extra="Trùng mã nhân viên trên máy chấm công">
              <Input placeholder="VD: 101" />
            </Form.Item>
            <Form.Item label="Số điện thoại" name="phone">
              <Input inputMode="tel" />
            </Form.Item>
            <Form.Item label="Email" name="email" rules={[{ type: "email", message: "Email không hợp lệ" }]}>
              <Input />
            </Form.Item>
            <Form.Item label="Ngày sinh" name="birthday">
              <DatePicker className="!w-full" format="DD/MM/YYYY" />
            </Form.Item>
            <Form.Item label="Ảnh đại diện (URL)" name="avatarUrl">
              <Input placeholder="https://…" />
            </Form.Item>
          </FormGrid>

          <div className="mb-2 mt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Công việc</div>
          <FormGrid>
            <Form.Item label="Chức danh" name="position">
              <AutoComplete
                allowClear
                placeholder="Bác sĩ, Kỹ thuật viên, Thu ngân…"
                options={[...new Set([...positions, "Quản lý", "Thu ngân", "Lễ tân", "Kỹ thuật viên", "Nhân viên bán hàng"])].map((p) => ({ value: p }))}
                filterOption={(input, o) => String(o?.value ?? "").toLowerCase().includes(input.toLowerCase())}
              />
            </Form.Item>
            <Form.Item label="Bộ phận" name="department">
              <Input placeholder="Chuyên môn, Bán hàng…" />
            </Form.Item>
            <Form.Item label="Hình thức" name="employmentType">
              <Select options={(Object.keys(EMPLOYMENT) as EmploymentType[]).map((k) => ({ value: k, label: EMPLOYMENT[k] }))} />
            </Form.Item>
            <Form.Item label="Trạng thái" name="status">
              <Select options={(Object.keys(STAFF_STATUS) as StaffStatus[]).map((k) => ({ value: k, label: STAFF_STATUS[k].label }))} />
            </Form.Item>
            <Form.Item label="Ngày vào làm" name="startDate">
              <DatePicker className="!w-full" format="DD/MM/YYYY" />
            </Form.Item>
          </FormGrid>

          <div className="mb-2 mt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Ca làm</div>
          <Form.Item label="Ngày làm trong tuần" name="workDays">
            <Checkbox.Group options={WEEK.map((d) => ({ value: d, label: dayLabel(d) }))} />
          </Form.Item>
          <FormGrid>
            <Form.Item label="Giờ vào" name="shiftStart">
              <Select allowClear options={TIMES} />
            </Form.Item>
            <Form.Item label="Giờ ra" name="shiftEnd">
              <Select allowClear options={TIMES} />
            </Form.Item>
          </FormGrid>
          <Form.Item label="Dịch vụ đảm nhận" name="services" extra={serviceNames.length ? undefined : "Chưa có dịch vụ nào — có thể gõ tên tự do."}>
            <Select mode="tags" placeholder="Chọn hoặc gõ tên dịch vụ" options={serviceNames.map((n) => ({ value: n, label: n }))} />
          </Form.Item>

          <div className="mb-2 mt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Lương</div>
          <FormGrid>
            <Form.Item label="Lương cơ bản / tháng (đ)" name="baseSalary">
              <InputNumber className="!w-full" min={0} step={500000} formatter={(v) => (v ? Number(v).toLocaleString("vi-VN") : "")} parser={(v) => Number((v ?? "").replace(/\D/g, "")) as never} />
            </Form.Item>
            <Form.Item label="Hoa hồng (%)" name="commissionPercent">
              <InputNumber className="!w-full" min={0} max={100} step={0.5} />
            </Form.Item>
          </FormGrid>
          <Form.Item label="Ghi chú" name="note">
            <Input.TextArea rows={2} />
          </Form.Item>

          {canGrant && (
            <>
              <div className="mb-2 mt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Tài khoản web quản trị</div>
              <Form.Item
                label="Email Google đăng nhập"
                name="loginEmail"
                rules={[{ type: "email", message: "Email không hợp lệ" }]}
                extra="Nhân viên đăng nhập web quản trị bằng Google với email này, chỉ thấy các mục được tick bên dưới. Để trống = không có tài khoản."
              >
                <Input placeholder="nhanvien@gmail.com" />
              </Form.Item>
              <Form.Item noStyle shouldUpdate={(a, b) => a.loginEmail !== b.loginEmail}>
                {({ getFieldValue }) =>
                  getFieldValue("loginEmail") ? (
                    <>
                      <div className="mb-2 flex flex-wrap items-center gap-1.5">
                        <span className="text-2xs text-slate-500">Mẫu nhanh:</span>
                        {ACCESS_PRESETS.map(([label, keys]) => (
                          <Button key={label} size="small" onClick={() => form.setFieldValue("adminSections", keys)}>
                            {label}
                          </Button>
                        ))}
                      </div>
                      <Form.Item name="adminSections" extra="Báo cáo doanh thu, Nhân sự & lương và Thiết lập chỉ nên cấp cho người tin cậy.">
                        <Checkbox.Group className="!grid w-full gap-2">
                          {ADMIN_SECTION_GROUPS.map((g) => (
                            <div key={g.title}>
                              <div className="mb-1 text-3xs font-semibold uppercase tracking-[0.08em] text-slate-400">{g.title}</div>
                              <div className="flex flex-wrap gap-x-4 gap-y-1">
                                {g.items.map(([k, label]) => (
                                  <Checkbox key={k} value={k}>
                                    {label}
                                  </Checkbox>
                                ))}
                              </div>
                            </div>
                          ))}
                        </Checkbox.Group>
                      </Form.Item>
                    </>
                  ) : null
                }
              </Form.Item>
            </>
          )}
          <FormFooter>
            <Button onClick={() => setDrawer({ open: false })}>Huỷ</Button>
            <Button type="primary" htmlType="submit">
              Lưu
            </Button>
          </FormFooter>
        </Form>
      </Drawer>
    </div>
  );
}
