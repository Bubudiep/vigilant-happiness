import {
  App as AntApp,
  Button,
  DatePicker,
  Dropdown,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Progress,
  Segmented,
  Select,
  Switch,
  Table,
  Tabs,
  Tag,
  Tooltip,
} from "antd";
import dayjs from "dayjs";
import { useCallback, useEffect, useMemo, useState } from "react";
import { LuCheck, LuEllipsis, LuPackage, LuPencil, LuPlus, LuRefreshCw, LuSearch, LuTicketPercent, LuTrash2, LuUserPlus } from "react-icons/lu";
import {
  ApiError,
  createSubscription,
  deletePlan,
  deletePlatformVoucher,
  fetchPlans,
  fetchPlatformCustomers,
  fetchPlatformVouchers,
  fetchSubscriptions,
  PlanInput,
  PlanRow,
  PlatformCustomerLite,
  PlatformVoucherRow,
  previewPlatformVoucher,
  savePlan,
  savePlatformVoucher,
  SubscriptionRow,
  updateSubscription,
} from "../data/platform-api";

const errMsg = (e: unknown, fb = "Thao tác thất bại") => (e instanceof ApiError ? e.message : fb);
const money = (n: number) => `${n.toLocaleString("vi-VN")}đ`;
const moneyInput = {
  formatter: (v?: string | number) => `${v ?? ""}`.replace(/\B(?=(\d{3})+(?!\d))/g, "."),
  parser: (v?: string) => Number((v ?? "").replace(/\D/g, "")),
};

export const SUB_STATUS: Record<string, { label: string; color: string }> = {
  active: { label: "Đang dùng", color: "green" },
  trial: { label: "Dùng thử", color: "blue" },
  expired: { label: "Hết hạn", color: "red" },
  cancelled: { label: "Đã huỷ", color: "default" },
};

// ═════════════════════════════ Gói dịch vụ ═════════════════════════════

export function PlansSection() {
  const [tab, setTab] = useState("subs");
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const reloadPlans = useCallback(() => fetchPlans().then(setPlans).catch(() => undefined), []);
  useEffect(() => {
    reloadPlans();
  }, [reloadPlans]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <h3 className="flex items-center gap-2 text-base font-bold text-slate-900">
        <LuPackage size={18} className="text-brand-600" /> Gói dịch vụ
      </h3>
      <p className="text-xs text-slate-500">Danh mục gói reMini và gói khách đang dùng: đăng ký, gia hạn, áp voucher, đổi trạng thái.</p>
      <Tabs
        activeKey={tab}
        onChange={setTab}
        className="mt-2"
        items={[
          { key: "subs", label: "Khách đang dùng", children: <SubscriptionsTab plans={plans} /> },
          { key: "plans", label: `Danh mục gói (${plans.length})`, children: <PlanCatalog plans={plans} onChanged={reloadPlans} /> },
        ]}
      />
    </div>
  );
}

function PlanCatalog({ plans, onChanged }: { plans: PlanRow[]; onChanged: () => void }) {
  const { message } = AntApp.useApp();
  const [editing, setEditing] = useState<PlanRow | "new" | null>(null);

  return (
    <>
      <div className="mb-3 flex justify-end">
        <Button type="primary" icon={<LuPlus size={14} />} onClick={() => setEditing("new")}>
          Thêm gói
        </Button>
      </div>
      {plans.length === 0 ? (
        <Empty description="Chưa có gói nào" />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {plans.map((p) => (
            <div key={p.id} className={`rounded-2xl border p-4 ${p.isActive ? "border-slate-200" : "border-dashed border-slate-300 opacity-60"}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-base font-extrabold text-slate-900">{p.name}</div>
                  <div className="text-[11px] text-slate-400">{p.code}</div>
                </div>
                <div className="flex gap-1">
                  {!p.isActive && <Tag className="m-0">Đã tắt</Tag>}
                  <Button size="small" type="text" icon={<LuPencil size={13} />} onClick={() => setEditing(p)} />
                  <Popconfirm
                    title={`Xoá gói "${p.name}"?`}
                    description={p._count?.subscriptions ? "Gói đang có khách — chỉ tắt được, không xoá được." : undefined}
                    okText="Xoá"
                    okButtonProps={{ danger: true }}
                    onConfirm={async () => {
                      try {
                        await deletePlan(p.id);
                        message.success("Đã xoá gói");
                        onChanged();
                      } catch (e) {
                        message.error(errMsg(e));
                      }
                    }}
                  >
                    <Button size="small" type="text" danger icon={<LuTrash2 size={13} />} />
                  </Popconfirm>
                </div>
              </div>
              <div className="mt-2 text-lg font-black text-brand-600">
                {money(p.priceMonthly)}
                <span className="text-xs font-semibold text-slate-400">/tháng</span>
              </div>
              <div className="text-xs text-slate-500">{money(p.priceYearly)}/năm</div>
              {p.description && <div className="mt-2 text-xs text-slate-600">{p.description}</div>}
              <div className="mt-2 flex flex-wrap gap-1 text-[11px]">
                <Tag className="m-0">{p.maxStores} store</Tag>
                <Tag className="m-0">{p.maxProducts} sản phẩm</Tag>
                <Tag className="m-0">{p.maxStaff} nhân sự</Tag>
              </div>
              {p.features?.length > 0 && (
                <ul className="mt-2 space-y-0.5 text-xs text-slate-600">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-1">
                      <LuCheck size={12} className="mt-0.5 shrink-0 text-emerald-500" /> {f}
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-2 text-[11px] text-slate-400">{p._count?.subscriptions ?? 0} lượt đăng ký</div>
            </div>
          ))}
        </div>
      )}
      <PlanModal
        plan={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          onChanged();
        }}
      />
    </>
  );
}

function PlanModal({ plan, onClose, onSaved }: { plan: PlanRow | "new" | null; onClose: () => void; onSaved: () => void }) {
  const { message } = AntApp.useApp();
  const [form] = Form.useForm<PlanInput>();
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!plan) return;
    form.setFieldsValue(
      plan === "new"
        ? { code: "", name: "", description: "", priceMonthly: 0, priceYearly: 0, maxStores: 1, maxProducts: 100, maxStaff: 5, features: [], isActive: true, sortOrder: 0 }
        : plan,
    );
  }, [plan, form]);

  const submit = async () => {
    const v = await form.validateFields();
    setSaving(true);
    try {
      await savePlan(plan === "new" || !plan ? null : plan.id, v);
      message.success("Đã lưu gói");
      onSaved();
    } catch (e) {
      message.error(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={!!plan} title={plan === "new" ? "Thêm gói dịch vụ" : "Sửa gói dịch vụ"} onCancel={onClose} onOk={submit} okText="Lưu" confirmLoading={saving} width={620} destroyOnHidden>
      <Form form={form} layout="vertical" requiredMark={false} className="pt-2">
        <div className="grid grid-cols-2 gap-3">
          <Form.Item name="name" label="Tên gói" rules={[{ required: true, message: "Nhập tên" }]}>
            <Input maxLength={100} placeholder="VD: Gói Pro" />
          </Form.Item>
          <Form.Item name="code" label="Mã gói" rules={[{ required: true, message: "Nhập mã" }]}>
            <Input maxLength={40} placeholder="VD: pro" />
          </Form.Item>
          <Form.Item name="priceMonthly" label="Giá / tháng">
            <InputNumber className="w-full" min={0} step={10000} {...moneyInput} addonAfter="đ" />
          </Form.Item>
          <Form.Item name="priceYearly" label="Giá / năm">
            <InputNumber className="w-full" min={0} step={100000} {...moneyInput} addonAfter="đ" />
          </Form.Item>
        </div>
        <Form.Item name="description" label="Mô tả">
          <Input.TextArea rows={2} maxLength={300} />
        </Form.Item>
        <div className="grid grid-cols-3 gap-3">
          <Form.Item name="maxStores" label="Số store">
            <InputNumber className="w-full" min={1} />
          </Form.Item>
          <Form.Item name="maxProducts" label="Số sản phẩm">
            <InputNumber className="w-full" min={1} />
          </Form.Item>
          <Form.Item name="maxStaff" label="Số nhân sự">
            <InputNumber className="w-full" min={1} />
          </Form.Item>
        </div>
        <Form.Item name="features" label="Tính năng (gõ rồi Enter)">
          <Select mode="tags" tokenSeparators={[","]} placeholder="VD: Tích điểm, Đặt lịch, OA riêng" />
        </Form.Item>
        <div className="grid grid-cols-2 gap-3">
          <Form.Item name="sortOrder" label="Thứ tự hiển thị">
            <InputNumber className="w-full" />
          </Form.Item>
          <Form.Item name="isActive" label="Đang bán" valuePropName="checked">
            <Switch />
          </Form.Item>
        </div>
      </Form>
    </Modal>
  );
}

function SubscriptionsTab({ plans }: { plans: PlanRow[] }) {
  const { message, modal } = AntApp.useApp();
  const [rows, setRows] = useState<SubscriptionRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState("all");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<SubscriptionRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await fetchSubscriptions());
    } catch (e) {
      message.error(errMsg(e, "Không tải được danh sách"));
    } finally {
      setLoading(false);
    }
  }, [message]);
  useEffect(() => {
    load();
  }, [load]);

  const patch = async (s: SubscriptionRow, data: Parameters<typeof updateSubscription>[1], ok: string) => {
    try {
      await updateSubscription(s.id, data);
      message.success(ok);
      load();
    } catch (e) {
      message.error(errMsg(e));
    }
  };
  const extend = (s: SubscriptionRow, unit: "month" | "year") => {
    const base = dayjs(s.expiresAt).isAfter(dayjs()) ? dayjs(s.expiresAt) : dayjs();
    const next = base.add(1, unit);
    modal.confirm({
      title: `Gia hạn ${unit === "year" ? "1 năm" : "1 tháng"} cho ${s.customer.companyName || s.customer.name}?`,
      content: `Hạn mới: ${next.format("DD/MM/YYYY")} · gói ${s.plan.name}`,
      okText: "Gia hạn",
      onOk: () => patch(s, { expiresAt: next.toISOString(), status: "active" }, `Đã gia hạn đến ${next.format("DD/MM/YYYY")}`),
    });
  };

  const shown = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return (rows ?? []).filter((s) => {
      const expired = dayjs(s.expiresAt).isBefore(dayjs());
      const st = s.status === "active" && expired ? "expired" : s.status;
      if (status !== "all" && st !== status) return false;
      return !kw || [s.customer.name, s.customer.companyName, s.customer.phone, s.plan.name, s.voucherCode].some((x) => x?.toLowerCase().includes(kw));
    });
  }, [rows, keyword, status]);

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            allowClear
            prefix={<LuSearch size={14} className="text-slate-400" />}
            placeholder="Khách, SĐT, gói, voucher"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            style={{ width: 240 }}
          />
          <Segmented
            value={status}
            onChange={(v) => setStatus(String(v))}
            options={[
              { value: "all", label: "Tất cả" },
              { value: "active", label: "Đang dùng" },
              { value: "trial", label: "Dùng thử" },
              { value: "expired", label: "Hết hạn" },
              { value: "cancelled", label: "Đã huỷ" },
            ]}
          />
        </div>
        <div className="flex gap-2">
          <Button icon={<LuRefreshCw size={14} />} onClick={load} loading={loading} />
          <Button type="primary" icon={<LuUserPlus size={14} />} onClick={() => setCreating(true)} disabled={!plans.length}>
            Đăng ký gói cho khách
          </Button>
        </div>
      </div>
      <Table<SubscriptionRow>
        rowKey="id"
        size="middle"
        loading={loading && !rows}
        dataSource={shown}
        pagination={{ pageSize: 20, hideOnSinglePage: true }}
        scroll={{ x: 980 }}
        columns={[
          {
            title: "Khách hàng",
            key: "customer",
            render: (_, s) => (
              <div className="text-xs">
                <div className="font-bold text-slate-900">{s.customer.companyName || s.customer.name}</div>
                <div className="text-slate-500">{s.customer.phone}</div>
              </div>
            ),
          },
          {
            title: "Gói",
            key: "plan",
            width: 160,
            render: (_, s) => (
              <div className="text-xs">
                <div className="font-semibold">{s.plan.name}</div>
                <div className="text-slate-500">
                  {s.billingCycle === "yearly" ? "Theo năm" : "Theo tháng"} · {s._count?.stores ?? 0} store
                </div>
              </div>
            ),
          },
          {
            title: "Đã thu",
            key: "paid",
            width: 150,
            render: (_, s) => (
              <div className="text-xs">
                <div className="font-bold">{money(s.pricePaid)}</div>
                {s.voucherCode && (
                  <Tooltip title={`Giảm ${money(s.discountAmount)}`}>
                    <Tag color="magenta" className="m-0 mt-0.5">
                      {s.voucherCode}
                    </Tag>
                  </Tooltip>
                )}
              </div>
            ),
          },
          {
            title: "Thời hạn",
            key: "time",
            width: 210,
            render: (_, s) => {
              const start = dayjs(s.startedAt);
              const end = dayjs(s.expiresAt);
              const total = Math.max(1, end.diff(start, "day"));
              const left = end.diff(dayjs(), "day");
              return (
                <div className="text-xs">
                  <div className={left < 0 ? "font-semibold text-rose-600" : left <= 15 ? "font-semibold text-amber-600" : "text-slate-600"}>
                    {start.format("DD/MM/YY")} → {end.format("DD/MM/YYYY")} · {left < 0 ? `quá ${-left} ngày` : `còn ${left} ngày`}
                  </div>
                  <Progress percent={Math.min(100, Math.max(0, Math.round(((total - Math.max(0, left)) / total) * 100)))} size="small" showInfo={false} strokeColor={left <= 15 ? "#f59e0b" : undefined} />
                </div>
              );
            },
          },
          {
            title: "Trạng thái",
            key: "status",
            width: 120,
            render: (_, s) => {
              const st = s.status === "active" && dayjs(s.expiresAt).isBefore(dayjs()) ? "expired" : s.status;
              return (
                <div className="flex flex-col items-start gap-0.5">
                  <Tag color={SUB_STATUS[st]?.color} className="m-0">
                    {SUB_STATUS[st]?.label ?? st}
                  </Tag>
                  {s.autoRenew && <span className="text-[10px] text-slate-400">Tự gia hạn</span>}
                </div>
              );
            },
          },
          {
            title: "",
            key: "act",
            width: 170,
            fixed: "right",
            render: (_, s) => (
              <div className="flex justify-end gap-1">
                <Button size="small" onClick={() => extend(s, s.billingCycle === "yearly" ? "year" : "month")}>
                  Gia hạn
                </Button>
                <Dropdown
                  trigger={["click"]}
                  menu={{
                    items: [
                      { key: "edit", icon: <LuPencil size={13} />, label: "Sửa", onClick: () => setEditing(s) },
                      { key: "m", label: "Gia hạn +1 tháng", onClick: () => extend(s, "month") },
                      { key: "y", label: "Gia hạn +1 năm", onClick: () => extend(s, "year") },
                      { type: "divider" },
                      ...Object.entries(SUB_STATUS)
                        .filter(([k]) => k !== s.status)
                        .map(([k, v]) => ({ key: `st_${k}`, label: `Chuyển: ${v.label}`, onClick: () => patch(s, { status: k }, `Đã chuyển "${v.label}"`) })),
                    ],
                  }}
                >
                  <Button size="small" icon={<LuEllipsis size={14} />} />
                </Dropdown>
              </div>
            ),
          },
        ]}
      />
      <CreateSubscriptionModal
        open={creating}
        plans={plans.filter((p) => p.isActive)}
        onClose={() => setCreating(false)}
        onCreated={() => {
          setCreating(false);
          load();
        }}
      />
      <EditSubscriptionModal
        sub={editing}
        plans={plans}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          load();
        }}
      />
    </>
  );
}

function CreateSubscriptionModal({ open, plans, onClose, onCreated }: { open: boolean; plans: PlanRow[]; onClose: () => void; onCreated: () => void }) {
  const { message } = AntApp.useApp();
  const [form] = Form.useForm();
  const [customers, setCustomers] = useState<PlatformCustomerLite[]>([]);
  const [saving, setSaving] = useState(false);
  const [quote, setQuote] = useState<{ discount: number; finalAmount: number; title: string } | null>(null);
  const [quoteErr, setQuoteErr] = useState<string | null>(null);
  const planId = Form.useWatch("planId", form) as string | undefined;
  const cycle = (Form.useWatch("billingCycle", form) as string | undefined) ?? "monthly";
  const startedAt = Form.useWatch("startedAt", form) as dayjs.Dayjs | undefined;
  const code = (Form.useWatch("voucherCode", form) as string | undefined)?.trim() ?? "";
  const plan = plans.find((p) => p.id === planId);
  const price = plan ? (cycle === "yearly" ? plan.priceYearly : plan.priceMonthly) : 0;

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    form.setFieldsValue({ billingCycle: "monthly", startedAt: dayjs(), status: "active", autoRenew: false });
    setQuote(null);
    setQuoteErr(null);
    fetchPlatformCustomers().then(setCustomers).catch(() => undefined);
  }, [open, form]);

  // Hạn mặc định theo chu kỳ
  useEffect(() => {
    if (!open) return;
    form.setFieldValue("expiresAt", (startedAt ?? dayjs()).add(1, cycle === "yearly" ? "year" : "month"));
  }, [cycle, startedAt, open, form]);

  // Xem trước voucher
  useEffect(() => {
    setQuote(null);
    setQuoteErr(null);
    if (!code || !planId) return;
    const t = setTimeout(() => {
      previewPlatformVoucher({ code, planId, billingCycle: cycle })
        .then((q) => setQuote(q))
        .catch((e) => setQuoteErr(errMsg(e, "Không áp được voucher")));
    }, 400);
    return () => clearTimeout(t);
  }, [code, planId, cycle]);

  const submit = async () => {
    const v = await form.validateFields();
    if (code && quoteErr) return message.warning(quoteErr);
    setSaving(true);
    try {
      await createSubscription({
        customerId: v.customerId,
        planId: v.planId,
        billingCycle: v.billingCycle,
        startedAt: (v.startedAt as dayjs.Dayjs).toISOString(),
        expiresAt: (v.expiresAt as dayjs.Dayjs).toISOString(),
        status: v.status,
        autoRenew: v.autoRenew,
        note: v.note?.trim() || undefined,
        voucherCode: code || undefined,
        ...(typeof v.pricePaid === "number" ? { pricePaid: v.pricePaid } : {}),
      });
      message.success("Đã đăng ký gói cho khách");
      onCreated();
    } catch (e) {
      message.error(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} title="Đăng ký gói cho khách" onCancel={onClose} onOk={submit} okText="Đăng ký" confirmLoading={saving} width={600} destroyOnHidden>
      <Form form={form} layout="vertical" requiredMark={false} className="pt-2">
        <Form.Item name="customerId" label="Khách hàng" rules={[{ required: true, message: "Chọn khách" }]}>
          <Select showSearch optionFilterProp="label" options={customers.map((c) => ({ value: c.id, label: `${c.companyName || c.name} · ${c.phone}` }))} />
        </Form.Item>
        <div className="grid grid-cols-2 gap-3">
          <Form.Item name="planId" label="Gói" rules={[{ required: true, message: "Chọn gói" }]}>
            <Select options={plans.map((p) => ({ value: p.id, label: p.name }))} />
          </Form.Item>
          <Form.Item name="billingCycle" label="Chu kỳ">
            <Segmented
              block
              options={[
                { value: "monthly", label: "Theo tháng" },
                { value: "yearly", label: "Theo năm" },
              ]}
            />
          </Form.Item>
          <Form.Item name="startedAt" label="Bắt đầu" rules={[{ required: true }]}>
            <DatePicker className="w-full" format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item name="expiresAt" label="Hết hạn" rules={[{ required: true }]}>
            <DatePicker className="w-full" format="DD/MM/YYYY" />
          </Form.Item>
        </div>
        <Form.Item name="voucherCode" label="Voucher (tuỳ chọn)" normalize={(v: string) => v?.toUpperCase()}>
          <Input placeholder="Nhập mã giảm giá" maxLength={30} />
        </Form.Item>
        <div className="mb-4 rounded-xl bg-slate-50 p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Giá gói</span>
            <span>{money(price)}</span>
          </div>
          {quote && (
            <div className="flex justify-between text-emerald-600">
              <span>Voucher {quote.title}</span>
              <span>−{money(quote.discount)}</span>
            </div>
          )}
          {quoteErr && <div className="text-xs text-rose-600">{quoteErr}</div>}
          <div className="mt-1 flex justify-between border-t border-slate-200 pt-1 font-bold">
            <span>Thành tiền</span>
            <span>{money(quote ? quote.finalAmount : price)}</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Form.Item name="pricePaid" label="Số tiền thực thu (nếu khác)">
            <InputNumber className="w-full" min={0} {...moneyInput} addonAfter="đ" placeholder="Theo giá ở trên" />
          </Form.Item>
          <Form.Item name="status" label="Trạng thái">
            <Select options={Object.entries(SUB_STATUS).map(([k, v]) => ({ value: k, label: v.label }))} />
          </Form.Item>
        </div>
        <Form.Item name="autoRenew" label="Tự gia hạn" valuePropName="checked">
          <Switch />
        </Form.Item>
        <Form.Item name="note" label="Ghi chú">
          <Input.TextArea rows={2} maxLength={500} />
        </Form.Item>
      </Form>
    </Modal>
  );
}

function EditSubscriptionModal({ sub, plans, onClose, onSaved }: { sub: SubscriptionRow | null; plans: PlanRow[]; onClose: () => void; onSaved: () => void }) {
  const { message } = AntApp.useApp();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!sub) return;
    form.setFieldsValue({
      planId: sub.planId,
      billingCycle: sub.billingCycle,
      pricePaid: sub.pricePaid,
      status: sub.status,
      expiresAt: dayjs(sub.expiresAt),
      autoRenew: sub.autoRenew,
      note: sub.note ?? "",
    });
  }, [sub, form]);

  const submit = async () => {
    if (!sub) return;
    const v = await form.validateFields();
    setSaving(true);
    try {
      await updateSubscription(sub.id, { ...v, expiresAt: (v.expiresAt as dayjs.Dayjs).toISOString() });
      message.success("Đã lưu");
      onSaved();
    } catch (e) {
      message.error(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={!!sub} title={sub ? `Sửa gói · ${sub.customer.companyName || sub.customer.name}` : ""} onCancel={onClose} onOk={submit} okText="Lưu" confirmLoading={saving} destroyOnHidden>
      <Form form={form} layout="vertical" requiredMark={false} className="pt-2">
        <div className="grid grid-cols-2 gap-3">
          <Form.Item name="planId" label="Gói">
            <Select options={plans.map((p) => ({ value: p.id, label: p.name }))} />
          </Form.Item>
          <Form.Item name="billingCycle" label="Chu kỳ">
            <Select
              options={[
                { value: "monthly", label: "Theo tháng" },
                { value: "yearly", label: "Theo năm" },
              ]}
            />
          </Form.Item>
          <Form.Item name="pricePaid" label="Đã thu">
            <InputNumber className="w-full" min={0} {...moneyInput} addonAfter="đ" />
          </Form.Item>
          <Form.Item name="expiresAt" label="Hết hạn">
            <DatePicker className="w-full" format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item name="status" label="Trạng thái">
            <Select options={Object.entries(SUB_STATUS).map(([k, v]) => ({ value: k, label: v.label }))} />
          </Form.Item>
          <Form.Item name="autoRenew" label="Tự gia hạn" valuePropName="checked">
            <Switch />
          </Form.Item>
        </div>
        <Form.Item name="note" label="Ghi chú">
          <Input.TextArea rows={2} maxLength={500} />
        </Form.Item>
      </Form>
    </Modal>
  );
}

// ═════════════════════════════ Voucher nền tảng ═════════════════════════════

export function PlatformVouchersSection() {
  const { message } = AntApp.useApp();
  const [rows, setRows] = useState<PlatformVoucherRow[] | null>(null);
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<PlatformVoucherRow | "new" | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [v, p] = await Promise.all([fetchPlatformVouchers(), fetchPlans()]);
      setRows(v);
      setPlans(p);
    } catch (e) {
      message.error(errMsg(e, "Không tải được voucher"));
    } finally {
      setLoading(false);
    }
  }, [message]);
  useEffect(() => {
    load();
  }, [load]);

  const planName = (id: string) => plans.find((p) => p.id === id)?.name ?? "?";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-base font-bold text-slate-900">
            <LuTicketPercent size={18} className="text-brand-600" /> Voucher gói reMini
          </h3>
          <p className="text-xs text-slate-500">Mã giảm giá khi khách mua / gia hạn gói. Áp ở bước "Đăng ký gói cho khách" (mục Gói dịch vụ).</p>
        </div>
        <div className="flex gap-2">
          <Button icon={<LuRefreshCw size={14} />} onClick={load} loading={loading} />
          <Button type="primary" icon={<LuPlus size={14} />} onClick={() => setEditing("new")}>
            Tạo voucher
          </Button>
        </div>
      </div>
      <Table<PlatformVoucherRow>
        rowKey="id"
        size="middle"
        loading={loading && !rows}
        dataSource={rows ?? []}
        pagination={{ pageSize: 20, hideOnSinglePage: true }}
        scroll={{ x: 900 }}
        columns={[
          {
            title: "Mã",
            key: "code",
            render: (_, v) => (
              <div>
                <span className="rounded-md bg-slate-900 px-2 py-0.5 font-mono text-xs font-bold text-white">{v.code}</span>
                <div className="mt-1 text-xs text-slate-600">{v.title}</div>
              </div>
            ),
          },
          {
            title: "Giảm",
            key: "discount",
            width: 170,
            render: (_, v) => (
              <div className="text-xs">
                <div className="font-bold text-rose-600">{v.discountType === "percent" ? `${v.discountValue}%` : money(v.discountValue)}</div>
                {v.discountType === "percent" && v.maxDiscount > 0 && <div className="text-slate-500">tối đa {money(v.maxDiscount)}</div>}
                {v.minAmount > 0 && <div className="text-slate-500">đơn từ {money(v.minAmount)}</div>}
              </div>
            ),
          },
          {
            title: "Áp dụng",
            key: "scope",
            width: 190,
            render: (_, v) => (
              <div className="flex flex-wrap gap-1 text-[11px]">
                {v.planIds.length ? v.planIds.map((id) => <Tag key={id} className="m-0">{planName(id)}</Tag>) : <Tag className="m-0">Mọi gói</Tag>}
                {v.billingCycle !== "all" && <Tag color="purple" className="m-0">{v.billingCycle === "yearly" ? "Gói năm" : "Gói tháng"}</Tag>}
              </div>
            ),
          },
          {
            title: "Đã dùng",
            key: "used",
            width: 130,
            render: (_, v) => (
              <div className="text-xs">
                {v.usedCount}/{v.quantity}
                <Progress percent={Math.round((v.usedCount / Math.max(1, v.quantity)) * 100)} size="small" showInfo={false} />
              </div>
            ),
          },
          {
            title: "Thời gian",
            key: "time",
            width: 160,
            render: (_, v) => {
              const expired = v.endDate && dayjs(v.endDate).isBefore(dayjs());
              return (
                <div className={`text-xs ${expired ? "text-rose-600" : "text-slate-600"}`}>
                  {dayjs(v.startDate).format("DD/MM/YY")} → {v.endDate ? dayjs(v.endDate).format("DD/MM/YY") : "không hạn"}
                </div>
              );
            },
          },
          {
            title: "Bật",
            key: "active",
            width: 70,
            render: (_, v) => (
              <Switch
                size="small"
                checked={v.active}
                onChange={async (active) => {
                  try {
                    await savePlatformVoucher(v.id, { active });
                    setRows((l) => l?.map((x) => (x.id === v.id ? { ...x, active } : x)) ?? null);
                  } catch (e) {
                    message.error(errMsg(e));
                  }
                }}
              />
            ),
          },
          {
            title: "",
            key: "act",
            width: 90,
            fixed: "right",
            render: (_, v) => (
              <div className="flex justify-end gap-1">
                <Button size="small" type="text" icon={<LuPencil size={13} />} onClick={() => setEditing(v)} />
                <Popconfirm
                  title={`Xoá voucher ${v.code}?`}
                  description={v.usedCount ? "Đã có khách dùng — các gói đã đăng ký vẫn giữ mã." : undefined}
                  okText="Xoá"
                  okButtonProps={{ danger: true }}
                  onConfirm={async () => {
                    try {
                      await deletePlatformVoucher(v.id);
                      message.success("Đã xoá");
                      load();
                    } catch (e) {
                      message.error(errMsg(e));
                    }
                  }}
                >
                  <Button size="small" type="text" danger icon={<LuTrash2 size={13} />} />
                </Popconfirm>
              </div>
            ),
          },
        ]}
      />
      <VoucherModal
        voucher={editing}
        plans={plans}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          load();
        }}
      />
    </div>
  );
}

function VoucherModal({ voucher, plans, onClose, onSaved }: { voucher: PlatformVoucherRow | "new" | null; plans: PlanRow[]; onClose: () => void; onSaved: () => void }) {
  const { message } = AntApp.useApp();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const type = Form.useWatch("discountType", form) as string | undefined;

  useEffect(() => {
    if (!voucher) return;
    form.setFieldsValue(
      voucher === "new"
        ? { code: "", title: "", discountType: "percent", discountValue: 10, maxDiscount: 0, minAmount: 0, planIds: [], billingCycle: "all", quantity: 100, range: [dayjs(), null], active: true, note: "" }
        : { ...voucher, range: [dayjs(voucher.startDate), voucher.endDate ? dayjs(voucher.endDate) : null] },
    );
  }, [voucher, form]);

  const submit = async () => {
    const { range, ...v } = await form.validateFields();
    setSaving(true);
    try {
      await savePlatformVoucher(voucher === "new" || !voucher ? null : voucher.id, {
        ...v,
        startDate: range?.[0] ? (range[0] as dayjs.Dayjs).startOf("day").toISOString() : undefined,
        endDate: range?.[1] ? (range[1] as dayjs.Dayjs).endOf("day").toISOString() : null,
      });
      message.success("Đã lưu voucher");
      onSaved();
    } catch (e) {
      message.error(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={!!voucher} title={voucher === "new" ? "Tạo voucher gói" : "Sửa voucher gói"} onCancel={onClose} onOk={submit} okText="Lưu" confirmLoading={saving} width={620} destroyOnHidden>
      <Form form={form} layout="vertical" requiredMark={false} className="pt-2">
        <div className="grid grid-cols-2 gap-3">
          <Form.Item
            name="code"
            label="Mã"
            normalize={(v: string) => v?.toUpperCase().replace(/\s/g, "")}
            rules={[{ required: true, pattern: /^[A-Z0-9_-]{3,30}$/, message: "3–30 ký tự: chữ, số, - _" }]}
          >
            <Input placeholder="VD: REMINI2026" maxLength={30} />
          </Form.Item>
          <Form.Item name="title" label="Tên" rules={[{ required: true, message: "Nhập tên" }]}>
            <Input placeholder="VD: Giảm 20% gói năm" maxLength={120} />
          </Form.Item>
          <Form.Item name="discountType" label="Loại giảm">
            <Segmented
              block
              options={[
                { value: "percent", label: "Theo %" },
                { value: "fixed", label: "Số tiền" },
              ]}
            />
          </Form.Item>
          <Form.Item name="discountValue" label={type === "fixed" ? "Số tiền giảm" : "Phần trăm giảm"}>
            {type === "fixed" ? <InputNumber className="w-full" min={0} {...moneyInput} addonAfter="đ" /> : <InputNumber className="w-full" min={1} max={100} addonAfter="%" />}
          </Form.Item>
          {type !== "fixed" && (
            <Form.Item name="maxDiscount" label="Giảm tối đa (0 = không giới hạn)">
              <InputNumber className="w-full" min={0} {...moneyInput} addonAfter="đ" />
            </Form.Item>
          )}
          <Form.Item name="minAmount" label="Giá gói tối thiểu">
            <InputNumber className="w-full" min={0} {...moneyInput} addonAfter="đ" />
          </Form.Item>
          <Form.Item name="planIds" label="Chỉ áp cho gói (bỏ trống = mọi gói)">
            <Select mode="multiple" allowClear options={plans.map((p) => ({ value: p.id, label: p.name }))} />
          </Form.Item>
          <Form.Item name="billingCycle" label="Chu kỳ">
            <Select
              options={[
                { value: "all", label: "Tháng & năm" },
                { value: "monthly", label: "Chỉ gói tháng" },
                { value: "yearly", label: "Chỉ gói năm" },
              ]}
            />
          </Form.Item>
          <Form.Item name="quantity" label="Số lượt dùng">
            <InputNumber className="w-full" min={1} />
          </Form.Item>
          <Form.Item name="range" label="Thời gian (bỏ trống ngày cuối = không hạn)">
            <DatePicker.RangePicker className="w-full" format="DD/MM/YYYY" allowEmpty={[false, true]} />
          </Form.Item>
        </div>
        <Form.Item name="note" label="Ghi chú nội bộ">
          <Input.TextArea rows={2} maxLength={500} />
        </Form.Item>
        <Form.Item name="active" label="Đang bật" valuePropName="checked">
          <Switch />
        </Form.Item>
      </Form>
    </Modal>
  );
}
