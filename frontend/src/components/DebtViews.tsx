import { Alert, App as AntApp, Button, DatePicker, Drawer, Empty, Input, InputNumber, Modal, Popconfirm, Select, Table, Tag } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useCallback, useEffect, useMemo, useState } from "react";
import { LuDownload, LuPlus, LuRefreshCw, LuTrash2 } from "react-icons/lu";
import {
  addDebtPayment,
  ApiError,
  createDebt,
  deleteDebt,
  DebtRow,
  DebtStatus,
  DebtSummary,
  fetchCustomerRows,
  fetchDebts,
  PlatformCustomerRow,
  removeDebtPayment,
  updateDebt,
} from "../data/platform-api";
import { downloadCsv } from "./PlatformViews";
import { FilterBar, FilterSelect, PageHeader, StatCard, StatGrid } from "./ui";

const errMsg = (e: unknown, fb = "Thao tác thất bại") => (e instanceof ApiError ? e.message : fb);
const vnd = (n: number) => `${n.toLocaleString("vi-VN")}đ`;

const STATUS: Record<DebtStatus, { label: string; color: string }> = {
  unpaid: { label: "Chưa thu", color: "gold" },
  partial: { label: "Đã thu một phần", color: "blue" },
  overdue: { label: "Quá hạn", color: "red" },
  paid: { label: "Đã thu đủ", color: "green" },
};

const METHODS = [
  { value: "Chuyển khoản", label: "Chuyển khoản" },
  { value: "Tiền mặt", label: "Tiền mặt" },
  { value: "Ví điện tử", label: "Ví điện tử (Momo, ZaloPay…)" },
  { value: "Khác", label: "Khác" },
];

const customerLabel = (c: { name: string; companyName?: string | null }) => c.companyName || c.name;

type DebtForm = { id: string | null; customerId?: string; title: string; amount: number | null; dueDate: Dayjs | null; note: string };
type PayForm = { debt: DebtRow; amount: number | null; paidAt: Dayjs; method: string; note: string };

/** Công nợ khách hàng reMini: ghi khoản nợ, thu từng phần, theo dõi quá hạn. */
export function DebtsSection() {
  const { message } = AntApp.useApp();
  const [items, setItems] = useState<DebtRow[]>([]);
  const [summary, setSummary] = useState<DebtSummary | null>(null);
  const [customers, setCustomers] = useState<PlatformCustomerRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("open");
  const [kw, setKw] = useState("");
  const [form, setForm] = useState<DebtForm | null>(null);
  const [pay, setPay] = useState<PayForm | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [d, c] = await Promise.all([fetchDebts(), fetchCustomerRows()]);
      setItems(d.items);
      setSummary(d.summary);
      setCustomers(c);
    } catch (e) {
      setError(errMsg(e, "Không tải được công nợ"));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const rows = useMemo(() => {
    const k = kw.trim().toLowerCase();
    return items.filter((d) => {
      if (status === "open" ? d.status === "paid" : status !== "all" && d.status !== status) return false;
      return !k || `${d.title} ${d.customer.name} ${d.customer.companyName ?? ""} ${d.customer.phone}`.toLowerCase().includes(k);
    });
  }, [items, status, kw]);

  const opened = items.find((d) => d.id === openId) ?? null;

  const saveDebt = async () => {
    if (!form || saving) return;
    if (!form.id && !form.customerId) return message.warning("Chọn khách hàng");
    if (!form.title.trim()) return message.warning("Nhập nội dung khoản nợ");
    if (!form.amount || form.amount < 1) return message.warning("Nhập số tiền hợp lệ");
    setSaving(true);
    try {
      const dueDate = form.dueDate ? form.dueDate.format("YYYY-MM-DD") : undefined;
      if (form.id) await updateDebt(form.id, { title: form.title, amount: form.amount, dueDate: dueDate ?? "", note: form.note });
      else await createDebt({ customerId: form.customerId!, title: form.title, amount: form.amount, dueDate, note: form.note || undefined });
      message.success("Đã lưu khoản nợ");
      setForm(null);
      load();
    } catch (e) {
      message.error(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  const savePayment = async () => {
    if (!pay || saving) return;
    if (!pay.amount || pay.amount < 1) return message.warning("Nhập số tiền thu");
    if (pay.amount > pay.debt.remaining) return message.warning(`Chỉ còn nợ ${vnd(pay.debt.remaining)}`);
    setSaving(true);
    try {
      await addDebtPayment(pay.debt.id, { amount: pay.amount, paidAt: pay.paidAt.toISOString(), method: pay.method, note: pay.note || undefined });
      message.success("Đã ghi nhận thu tiền");
      setPay(null);
      load();
    } catch (e) {
      message.error(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  const openPay = (debt: DebtRow) => setPay({ debt, amount: debt.remaining, paidAt: dayjs(), method: "Chuyển khoản", note: "" });

  const exportCsv = () =>
    downloadCsv(`cong-no-${dayjs().format("YYYYMMDD-HHmm")}.csv`, [
      ["Khách hàng", "SĐT", "Nội dung", "Tổng nợ", "Đã thu", "Còn nợ", "Hạn thanh toán", "Trạng thái", "Ghi chú"],
      ...rows.map((d) => [
        customerLabel(d.customer),
        d.customer.phone,
        d.title,
        d.amount,
        d.paid,
        d.remaining,
        d.dueDate ? dayjs(d.dueDate).format("DD/MM/YYYY") : "",
        STATUS[d.status].label,
        d.note,
      ]),
    ]);

  const cards = [
    { label: "Tổng còn nợ", value: summary ? vnd(summary.totalDebt) : "—", tone: "default" as const },
    { label: `Quá hạn (${summary?.overdueCount ?? 0} khoản)`, value: summary ? vnd(summary.overdueAmount) : "—", tone: "danger" as const },
    { label: "Số khách đang nợ", value: summary ? String(summary.debtorCount) : "—", tone: "default" as const },
    { label: "Đã thu được", value: summary ? vnd(summary.collectedTotal) : "—", tone: "success" as const },
  ];

  return (
    <div className="space-y-4">
      <StatGrid>
        {cards.map((c) => (
          <StatCard key={c.label} label={c.label} value={c.value} tone={c.tone} />
        ))}
      </StatGrid>

      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <PageHeader
        title="Khách nợ tiền"
        description={<>Ghi khoản khách còn nợ, thu từng phần và theo dõi khoản quá hạn.</>}
      />
      <FilterBar
        search={<Input.Search allowClear placeholder="Tìm khách / nội dung" onChange={(e) => setKw(e.target.value)} />}
        filters={<><FilterSelect
              value={status}
              onChange={setStatus}
              options={[
                { value: "open", label: "Đang nợ" },
                { value: "overdue", label: "Quá hạn" },
                { value: "partial", label: "Đã thu một phần" },
                { value: "paid", label: "Đã thu đủ" },
                { value: "all", label: "Tất cả" },
              ]}
            /></>}
        actions={<><Button icon={<LuDownload size={14} />} onClick={exportCsv} disabled={!rows.length}>
              Xuất CSV
            </Button>
<Button icon={<LuRefreshCw size={14} />} onClick={load} loading={loading} />
<Button type="primary" icon={<LuPlus size={15} />} onClick={() => setForm({ id: null, title: "", amount: null, dueDate: null, note: "" })}>
              Thêm khoản nợ
            </Button></>}
      />

        {error ? (
          <Alert type="warning" showIcon title="Không tải được dữ liệu" description={error} action={<Button size="small" onClick={load}>Thử lại</Button>} />
        ) : (
          <Table<DebtRow>
            rowKey="id"
            size="small"
            loading={loading}
            dataSource={rows}
            pagination={{ pageSize: 12 }}
            scroll={{ x: 820 }}
            locale={{ emptyText: <Empty description={status === "open" ? "Không có khoản nợ nào đang mở" : "Không có khoản nợ phù hợp"} /> }}
            onRow={(r) => ({ onClick: () => setOpenId(r.id), className: "cursor-pointer" })}
            columns={[
              {
                title: "Khách hàng",
                render: (_, r) => (
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{customerLabel(r.customer)}</div>
                    <div className="font-mono text-xs text-slate-500">{r.customer.phone}</div>
                  </div>
                ),
              },
              { title: "Nội dung", dataIndex: "title", render: (v: string) => <span className="text-xs">{v}</span> },
              { title: "Tổng nợ", align: "right", className: "tabular-nums", render: (_, r) => <span className="text-xs">{vnd(r.amount)}</span> },
              { title: "Đã thu", align: "right", className: "tabular-nums", render: (_, r) => <span className="text-xs text-green-600">{vnd(r.paid)}</span> },
              { title: "Còn nợ", align: "right", className: "tabular-nums", render: (_, r) => <b className={r.remaining ? "text-red-600" : "text-slate-400"}>{vnd(r.remaining)}</b> },
              {
                title: "Hạn",
                width: 100,
                render: (_, r) => (r.dueDate ? <span className={`text-xs ${r.status === "overdue" ? "font-semibold text-red-600" : ""}`}>{dayjs(r.dueDate).format("DD/MM/YYYY")}</span> : <span className="text-slate-300">—</span>),
              },
              { title: "Trạng thái", width: 130, render: (_, r) => <Tag color={STATUS[r.status].color}>{STATUS[r.status].label}</Tag> },
              {
                title: "",
                width: 90,
                render: (_, r) =>
                  r.remaining > 0 ? (
                    <Button
                      size="small"
                      type="primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        openPay(r);
                      }}
                    >
                      Thu tiền
                    </Button>
                  ) : null,
              },
            ]}
          />
        )}
      </div>

      <Modal title={form?.id ? "Sửa khoản nợ" : "Thêm khoản nợ"} open={!!form} onCancel={() => setForm(null)} onOk={saveDebt} okText="Lưu" confirmLoading={saving} destroyOnHidden>
        {form && (
          <div className="space-y-3 pt-2">
            {!form.id && (
              <Select
                showSearch
                className="w-full"
                placeholder="Chọn khách hàng *"
                optionFilterProp="label"
                value={form.customerId}
                onChange={(v) => setForm({ ...form, customerId: v })}
                options={customers.map((c) => ({ value: c.id, label: `${customerLabel(c)} · ${c.phone}` }))}
                notFoundContent="Chưa có khách hàng — thêm ở mục Khách hàng reMini"
              />
            )}
            <Input placeholder="Nội dung (VD: Phí thiết kế đợt 2) *" value={form.title} maxLength={200} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <div className="grid gap-3 sm:grid-cols-2">
            <InputNumber<number>
              className="w-full"
              min={1}
              step={100000}
              placeholder="Số tiền nợ (VND) *"
              value={form.amount}
              onChange={(v) => setForm({ ...form, amount: v })}
              formatter={(v) => (v ? Number(v).toLocaleString("vi-VN") : "")}
              parser={(v) => Number((v ?? "").replace(/\D/g, "")) || 0}
              suffix="đ"
            />
            <DatePicker className="w-full" placeholder="Hạn thanh toán (không bắt buộc)" format="DD/MM/YYYY" value={form.dueDate} onChange={(v) => setForm({ ...form, dueDate: v })} />
            </div>
            <Input.TextArea rows={2} placeholder="Ghi chú" value={form.note} maxLength={500} onChange={(e) => setForm({ ...form, note: e.target.value })} />
            {form.id && <p className="text-xs text-slate-500">Số nợ không được nhỏ hơn số đã thu.</p>}
          </div>
        )}
      </Modal>

      <Modal
        title={pay ? `Thu tiền — ${customerLabel(pay.debt.customer)}` : "Thu tiền"}
        open={!!pay}
        onCancel={() => setPay(null)}
        onOk={savePayment}
        okText="Ghi nhận"
        confirmLoading={saving}
        destroyOnHidden
      >
        {pay && (
          <div className="space-y-3 pt-2">
            <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
              {pay.debt.title} · Còn nợ <b className="text-red-600">{vnd(pay.debt.remaining)}</b>
            </div>
            <InputNumber<number>
              className="w-full"
              min={1}
              max={pay.debt.remaining}
              placeholder="Số tiền thu *"
              value={pay.amount}
              onChange={(v) => setPay({ ...pay, amount: v })}
              formatter={(v) => (v ? Number(v).toLocaleString("vi-VN") : "")}
              parser={(v) => Number((v ?? "").replace(/\D/g, "")) || 0}
              suffix="đ"
            />
            <div className="flex gap-2">
              <DatePicker className="flex-1" format="DD/MM/YYYY" allowClear={false} value={pay.paidAt} onChange={(v) => v && setPay({ ...pay, paidAt: v })} />
              <Select className="flex-1" value={pay.method} onChange={(v) => setPay({ ...pay, method: v })} options={METHODS} />
            </div>
            <Input placeholder="Ghi chú (VD: mã giao dịch)" value={pay.note} maxLength={300} onChange={(e) => setPay({ ...pay, note: e.target.value })} />
          </div>
        )}
      </Modal>

      <Drawer open={!!opened} onClose={() => setOpenId(null)} size={460} title={opened ? customerLabel(opened.customer) : "Khoản nợ"}>
        {opened && (
          <div className="space-y-5 text-sm">
            <div>
              <div className="text-base font-bold text-slate-900">{opened.title}</div>
              <Tag className="mt-1" color={STATUS[opened.status].color}>
                {STATUS[opened.status].label}
              </Tag>
              {opened.note && <p className="mt-2 text-xs text-slate-600">{opened.note}</p>}
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-slate-50 p-2">
                <div className="text-xs uppercase text-slate-500">Tổng nợ</div>
                <div className="text-sm font-bold">{vnd(opened.amount)}</div>
              </div>
              <div className="rounded-xl bg-green-50 p-2">
                <div className="text-xs uppercase text-slate-500">Đã thu</div>
                <div className="text-sm font-bold text-green-600">{vnd(opened.paid)}</div>
              </div>
              <div className="rounded-xl bg-red-50 p-2">
                <div className="text-xs uppercase text-slate-500">Còn nợ</div>
                <div className="text-sm font-bold text-red-600">{vnd(opened.remaining)}</div>
              </div>
            </div>
            <div className="text-xs text-slate-500">
              SĐT khách: <span className="font-mono">{opened.customer.phone}</span>
              {opened.dueDate && <> · Hạn: {dayjs(opened.dueDate).format("DD/MM/YYYY")}</>}
            </div>
            <div className="flex flex-wrap gap-2">
              {opened.remaining > 0 && (
                <Button type="primary" size="small" onClick={() => openPay(opened)}>
                  Thu tiền
                </Button>
              )}
              <Button
                size="small"
                onClick={() =>
                  setForm({ id: opened.id, title: opened.title, amount: opened.amount, dueDate: opened.dueDate ? dayjs(opened.dueDate) : null, note: opened.note ?? "" })
                }
              >
                Sửa khoản nợ
              </Button>
              <Popconfirm
                title="Xoá khoản nợ này? Lịch sử thu tiền cũng bị xoá."
                onConfirm={async () => {
                  try {
                    await deleteDebt(opened.id);
                    setOpenId(null);
                    load();
                  } catch (e) {
                    message.error(errMsg(e));
                  }
                }}
              >
                <Button size="small" danger icon={<LuTrash2 size={12} />}>
                  Xoá
                </Button>
              </Popconfirm>
            </div>
            <div>
              <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Lịch sử thu tiền</div>
              <div className="space-y-1.5">
                {opened.payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-1.5">
                    <div>
                      <div className="text-sm font-semibold text-green-600">+{vnd(p.amount)}</div>
                      <div className="text-xs text-slate-500">
                        {dayjs(p.paidAt).format("DD/MM/YYYY")}
                        {p.method ? ` · ${p.method}` : ""}
                        {p.note ? ` · ${p.note}` : ""}
                      </div>
                    </div>
                    <Popconfirm
                      title="Huỷ lần thu này?"
                      onConfirm={() =>
                        removeDebtPayment(p.id)
                          .then(load)
                          .catch((e) => message.error(errMsg(e)))
                      }
                    >
                      <Button size="small" type="text" danger icon={<LuTrash2 size={12} />} />
                    </Popconfirm>
                  </div>
                ))}
                {opened.payments.length === 0 && <div className="text-xs text-slate-400">Chưa thu lần nào</div>}
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
