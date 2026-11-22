import {
  App as AntApp,
  AutoComplete,
  Button,
  Checkbox,
  Drawer,
  Empty,
  Input,
  InputNumber,
  Segmented,
  Select,
  Table,
  Tag,
  Tooltip,
} from "antd";
import dayjs from "dayjs";
import { useEffect, useMemo, useRef, useState } from "react";
import { LuMinus, LuPackagePlus, LuPlus, LuSearch, LuShoppingCart, LuTicket, LuTrash2, LuUserRound, LuX } from "react-icons/lu";
import { ApiError } from "../data/platform-api";
import {
  createStoreOrder,
  PaymentMethod,
  previewVoucher,
  StoreConfig,
  StoreCustomerItem,
  StoreOrderItem,
} from "../data/store-api";

const money = (n: number) => `${Math.round(n).toLocaleString("vi-VN")}đ`;
const errMsg = (e: unknown, fallback: string) => (e instanceof ApiError ? e.message : fallback);

export const ORDER_STATUS: { value: StoreOrderItem["status"]; label: string; color: string }[] = [
  { value: "pending", label: "Chờ xác nhận", color: "gold" },
  { value: "confirmed", label: "Đã xác nhận", color: "blue" },
  { value: "shipping", label: "Đang giao", color: "purple" },
  { value: "completed", label: "Hoàn thành", color: "green" },
  { value: "cancelled", label: "Đã huỷ", color: "default" },
];

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "Tiền mặt" },
  { value: "bank_transfer", label: "Chuyển khoản" },
  { value: "card", label: "Thẻ / POS" },
  { value: "ewallet", label: "Ví điện tử" },
  { value: "cod", label: "COD (thu khi giao)" },
];
const paymentLabel = (m?: string) => PAYMENT_METHODS.find((p) => p.value === m)?.label ?? "COD";

/** Quản lý đơn hàng: lọc / tìm, xem chi tiết từng đơn, đổi trạng thái và tạo đơn tại quầy. */
export function OrdersSection({
  store,
  updateCurrentStore,
  applyLocal,
}: {
  store: StoreConfig;
  updateCurrentStore: (updater: (s: StoreConfig) => StoreConfig) => void;
  /** Ghi vào giao diện (dữ liệu đã lưu trên máy chủ) */
  applyLocal: (updater: (s: StoreConfig) => StoreConfig) => void;
}) {
  const { message } = AntApp.useApp();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);
  const orders = store.orders ?? [];

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: orders.length };
    for (const o of orders) c[o.status] = (c[o.status] ?? 0) + 1;
    return c;
  }, [orders]);

  const kw = q.trim().toLowerCase();
  const filtered = orders.filter(
    (o) =>
      (statusFilter === "all" || o.status === statusFilter) &&
      (!kw || o.code.toLowerCase().includes(kw) || o.customerName.toLowerCase().includes(kw) || o.phone.includes(kw)),
  );

  const updateOrderStatus = (id: string, status: StoreOrderItem["status"]) => {
    updateCurrentStore((s) => ({ ...s, orders: (s.orders ?? []).map((o) => (o.id === id ? { ...o, status } : o)) }));
    message.success("Đã cập nhật trạng thái đơn hàng");
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900">Quản lý Đơn hàng</h3>
          <p className="text-xs text-slate-500">Đơn đặt từ Zalo Mini App và đơn tạo tại quầy / qua điện thoại.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            allowClear
            prefix={<LuSearch size={14} className="text-slate-400" />}
            placeholder="Mã đơn, tên, SĐT…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ width: 220 }}
          />
          <Button type="primary" icon={<LuPlus size={15} />} onClick={() => setCreating(true)} className="font-semibold">
            Tạo đơn
          </Button>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {[{ value: "all", label: "Tất cả" }, ...ORDER_STATUS].map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => setStatusFilter(s.value)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              statusFilter === s.value ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {s.label}
            <span className={`ml-1.5 ${statusFilter === s.value ? "text-white/70" : "text-slate-400"}`}>{counts[s.value] ?? 0}</span>
          </button>
        ))}
      </div>

      <Table
        rowKey="id"
        size="small"
        dataSource={filtered}
        pagination={{ pageSize: 10 }}
        scroll={{ x: 900 }}
        locale={{ emptyText: <Empty description="Chưa có đơn hàng" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
        expandable={{ expandedRowRender: (o) => <OrderDetail order={o} />, rowExpandable: () => true }}
        columns={[
          {
            title: "Mã đơn",
            dataIndex: "code",
            render: (c, r) => (
              <div>
                <span className="font-mono font-bold">{c}</span>
                <div className="mt-0.5">
                  {r.source === "admin" ? (
                    <Tag className="m-0 text-[10px]">Tại quầy</Tag>
                  ) : (
                    <Tag color="blue" className="m-0 text-[10px]">
                      Mini App
                    </Tag>
                  )}
                </div>
              </div>
            ),
          },
          {
            title: "Khách hàng",
            render: (_, r) => (
              <div>
                <div className="font-semibold text-slate-900">{r.customerName}</div>
                <div className="text-[11px] text-slate-500">{r.phone || "—"}</div>
              </div>
            ),
          },
          { title: "Sản phẩm", dataIndex: "itemsSummary", ellipsis: true },
          {
            title: "Tổng tiền",
            dataIndex: "total",
            render: (v, r) => (
              <div>
                <span className="font-bold text-brand-600">{money(v)}</span>
                {!!r.discountAmount && (
                  <div className="text-[11px] text-rose-500">
                    −{money(r.discountAmount)}
                    {r.voucherCode && <span className="ml-1 font-mono">{r.voucherCode}</span>}
                  </div>
                )}
              </div>
            ),
          },
          { title: "Thanh toán", dataIndex: "paymentMethod", render: (m) => <span className="text-xs">{paymentLabel(m)}</span> },
          {
            title: "Thời gian",
            dataIndex: "createdAt",
            render: (d) => <span className="text-xs text-slate-600">{dayjs(d).format("DD/MM HH:mm")}</span>,
          },
          {
            title: "Trạng thái",
            dataIndex: "status",
            render: (status, r) => (
              <Select
                size="small"
                value={status}
                style={{ width: 135 }}
                onChange={(next) => updateOrderStatus(r.id, next)}
                options={ORDER_STATUS.map(({ value, label }) => ({ value, label }))}
              />
            ),
          },
        ]}
      />

      <OrderCreateDrawer
        open={creating}
        store={store}
        onClose={() => setCreating(false)}
        onCreated={(order, customer, voucher) => {
          applyLocal((s) => ({
            ...s,
            orders: [order, ...(s.orders ?? [])],
            customers: customer
              ? s.customers.some((c) => c.id === customer.id)
                ? s.customers.map((c) => (c.id === customer.id ? customer : c))
                : [customer, ...s.customers]
              : s.customers,
            vouchers: voucher
              ? (s.vouchers ?? []).map((v) =>
                  v.id === voucher.id
                    ? { ...v, usedCount: v.usedCount + 1, codeUsed: (v.codeUsed ?? 0) + (voucher.singleUse ? 1 : 0) }
                    : v,
                )
              : s.vouchers,
          }));
          setCreating(false);
        }}
      />
    </div>
  );
}

function OrderDetail({ order }: { order: StoreOrderItem }) {
  const items = order.items ?? [];
  const subtotal = order.subtotal || items.reduce((s, i) => s + i.unitPrice * i.quantity, 0) || order.total;
  return (
    <div className="grid gap-4 py-1 md:grid-cols-[1fr_260px]">
      <div className="space-y-1.5">
        {items.length ? (
          items.map((i, idx) => (
            <div key={idx} className="flex items-center gap-3 rounded-xl bg-white px-3 py-2 ring-1 ring-slate-100">
              {i.imageUrl ? (
                <img src={i.imageUrl} alt="" className="h-9 w-9 rounded-lg object-cover" />
              ) : (
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                  <LuShoppingCart size={15} />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-slate-800">{i.productName}</div>
                <div className="text-[11px] text-slate-500">
                  {money(i.unitPrice)} × {i.quantity}
                </div>
              </div>
              <div className="text-sm font-bold text-slate-900">{money(i.unitPrice * i.quantity)}</div>
            </div>
          ))
        ) : (
          <div className="text-sm text-slate-500">{order.itemsSummary || "—"}</div>
        )}
        {(order.address || order.note) && (
          <div className="pt-1 text-xs text-slate-600">
            {order.address && (
              <div>
                <b>Địa chỉ:</b> {order.address}
              </div>
            )}
            {order.note && (
              <div>
                <b>Ghi chú:</b> {order.note}
              </div>
            )}
          </div>
        )}
      </div>
      <div className="space-y-1 rounded-xl bg-white p-3 text-xs ring-1 ring-slate-100">
        <Row label="Tạm tính" value={money(subtotal)} />
        {!!order.shippingFee && <Row label="Phí giao hàng" value={money(order.shippingFee)} />}
        {!!order.discountAmount && (
          <Row label={order.voucherCode ? `Giảm giá (${order.voucherCode})` : "Giảm giá"} value={`−${money(order.discountAmount)}`} red />
        )}
        <div className="flex items-center justify-between border-t border-slate-100 pt-1.5 text-sm">
          <span className="font-bold">Tổng cộng</span>
          <span className="font-extrabold text-brand-600">{money(order.total)}</span>
        </div>
        <div className="text-[11px] text-slate-400">Thanh toán: {paymentLabel(order.paymentMethod)}</div>
      </div>
    </div>
  );
}

const Row = ({ label, value, red }: { label: string; value: string; red?: boolean }) => (
  <div className="flex items-center justify-between">
    <span className="text-slate-500">{label}</span>
    <span className={`font-semibold ${red ? "text-rose-500" : "text-slate-800"}`}>{value}</span>
  </div>
);

// ───────────────────────── Tạo đơn tại quầy ─────────────────────────

type Line = { key: string; productId: string | null; name: string; unitPrice: number; quantity: number; imageUrl?: string; stock?: number };
type Applied = { voucherId: string; code: string; title: string; discount: number; singleUse: boolean };

function OrderCreateDrawer({
  open,
  store,
  onClose,
  onCreated,
}: {
  open: boolean;
  store: StoreConfig;
  onClose: () => void;
  onCreated: (order: StoreOrderItem, customer: StoreCustomerItem | null, voucher: { id: string; singleUse: boolean } | null) => void;
}) {
  const { message } = AntApp.useApp();
  const [customer, setCustomer] = useState<StoreCustomerItem | null>(null);
  const [custQuery, setCustQuery] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [saveCustomer, setSaveCustomer] = useState(true);
  const [lines, setLines] = useState<Line[]>([]);
  const [shippingFee, setShippingFee] = useState(0);
  const [extraDiscount, setExtraDiscount] = useState(0);
  const [voucherInput, setVoucherInput] = useState("");
  const [applied, setApplied] = useState<Applied | null>(null);
  const [voucherErr, setVoucherErr] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [payment, setPayment] = useState<PaymentMethod>("cash");
  const [status, setStatus] = useState<StoreOrderItem["status"]>("completed");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [productPick, setProductPick] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setCustomer(null);
    setCustQuery("");
    setName("");
    setPhone("");
    setAddress("");
    setSaveCustomer(true);
    setLines([]);
    setShippingFee(0);
    setExtraDiscount(0);
    setVoucherInput("");
    setApplied(null);
    setVoucherErr(null);
    setPayment("cash");
    setStatus("completed");
    setNote("");
  }, [open]);

  const products = store.products.filter((p) => p.active);
  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  const voucherDiscount = applied?.discount ?? 0;
  const discount = Math.min(subtotal + shippingFee, voucherDiscount + extraDiscount);
  const total = subtotal + shippingFee - discount;

  // Giỏ / phí ship / khách đổi → tính lại giảm giá của mã đang áp
  const recheck = useRef(0);
  useEffect(() => {
    if (!applied) return;
    const n = ++recheck.current;
    const t = setTimeout(async () => {
      try {
        const r = await previewVoucher(store.id, { code: applied.code, subtotal, shippingFee, customerId: customer?.id });
        if (n === recheck.current) {
          setApplied(r);
          setVoucherErr(null);
        }
      } catch (e) {
        if (n === recheck.current) {
          setApplied(null);
          setVoucherErr(errMsg(e, "Mã không còn áp dụng được"));
        }
      }
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotal, shippingFee, customer?.id]);

  const applyVoucher = async () => {
    const code = voucherInput.trim();
    if (!code) return;
    setChecking(true);
    setVoucherErr(null);
    try {
      const r = await previewVoucher(store.id, { code, subtotal, shippingFee, customerId: customer?.id });
      setApplied(r);
      setVoucherInput("");
    } catch (e) {
      setApplied(null);
      setVoucherErr(errMsg(e, "Mã không hợp lệ"));
    } finally {
      setChecking(false);
    }
  };

  const addProduct = (id: string) => {
    const p = products.find((x) => x.id === id);
    if (!p) return;
    setLines((ls) => {
      const found = ls.find((l) => l.productId === id);
      if (found) return ls.map((l) => (l === found ? { ...l, quantity: l.quantity + 1 } : l));
      return [
        ...ls,
        { key: `p_${id}`, productId: id, name: p.name, unitPrice: p.salePrice ?? p.price, quantity: 1, imageUrl: p.imageUrl, stock: p.stock },
      ];
    });
    setProductPick(null);
  };
  const addCustomLine = () =>
    setLines((ls) => [...ls, { key: `c_${Date.now()}`, productId: null, name: "", unitPrice: 0, quantity: 1 }]);
  const setLine = (key: string, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const pickCustomer = (id: string) => {
    const c = store.customers.find((x) => x.id === id);
    if (!c) return;
    setCustomer(c);
    setName(c.name);
    setPhone(c.phone);
    setAddress(c.address ?? "");
    setCustQuery("");
  };
  const ckw = custQuery.trim().toLowerCase();
  const custOptions = ckw
    ? store.customers
        .filter((c) => c.name.toLowerCase().includes(ckw) || c.phone.includes(ckw))
        .slice(0, 8)
        .map((c) => ({
          value: c.id,
          label: (
            <div className="flex items-center justify-between gap-2">
              <span className="truncate font-semibold">{c.name}</span>
              <span className="text-xs text-slate-500">
                {c.phone} · {c.tier}
              </span>
            </div>
          ),
        }))
    : [];

  const submit = async () => {
    const custName = name.trim() || (customer ? customer.name : "Khách lẻ");
    if (!lines.length) return message.warning("Thêm ít nhất 1 sản phẩm");
    const bad = lines.find((l) => !l.name.trim());
    if (bad) return message.warning("Nhập tên cho dòng sản phẩm tự nhập");
    setSaving(true);
    try {
      const res = await createStoreOrder(store.id, {
        customerId: customer?.id,
        customerName: custName,
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        note: note.trim() || undefined,
        status,
        paymentMethod: payment,
        saveCustomer: !customer && saveCustomer,
        voucherCode: applied?.code,
        shippingFee,
        extraDiscount,
        items: lines.map((l) => ({
          productId: l.productId,
          productName: l.productId ? undefined : l.name.trim(),
          unitPrice: l.unitPrice,
          quantity: l.quantity,
        })),
      });
      const { customer: savedCustomer, customerCreated, ...order } = res;
      message.success(`Đã tạo đơn ${order.code}${customerCreated ? " · đã thêm khách mới" : ""}`);
      onCreated(order, savedCustomer, applied ? { id: applied.voucherId, singleUse: applied.singleUse } : null);
    } catch (e) {
      message.error(errMsg(e, "Tạo đơn thất bại"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      size={1000}
      destroyOnHidden
      title={
        <span className="inline-flex items-center gap-2">
          <LuShoppingCart size={17} /> Tạo đơn hàng
        </span>
      }
      styles={{ body: { background: "#f8fafc" } }}
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          {/* Khách hàng */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-900">
                <LuUserRound size={15} /> Khách hàng
              </h4>
              {customer && (
                <Button size="small" type="text" icon={<LuX size={13} />} onClick={() => setCustomer(null)}>
                  Bỏ chọn
                </Button>
              )}
            </div>
            {customer ? (
              <div className="flex items-center gap-3 rounded-xl bg-brand-50 px-3 py-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
                  {customer.name[0]?.toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold text-slate-900">{customer.name}</div>
                  <div className="text-xs text-slate-500">
                    {customer.phone} · Hạng {customer.tier} · {customer.points.toLocaleString("vi-VN")} điểm
                  </div>
                </div>
              </div>
            ) : (
              <AutoComplete
                className="w-full"
                value={custQuery}
                options={custOptions}
                onSearch={setCustQuery}
                onChange={setCustQuery}
                onSelect={(id: string) => pickCustomer(id)}
                placeholder="Tìm khách có sẵn theo tên / SĐT (bỏ trống = khách lẻ)"
              />
            )}
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <Input placeholder="Tên khách" value={name} onChange={(e) => setName(e.target.value)} />
              <Input placeholder="Số điện thoại" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={!!customer} />
              <Input className="sm:col-span-2" placeholder="Địa chỉ giao hàng (nếu có)" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            {!customer && phone.trim() && (
              <Checkbox className="mt-2" checked={saveCustomer} onChange={(e) => setSaveCustomer(e.target.checked)}>
                <span className="text-xs">Lưu vào danh sách khách hàng (tích điểm cho đơn này)</span>
              </Checkbox>
            )}
          </section>

          {/* Sản phẩm */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h4 className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-900">
                <LuPackagePlus size={15} /> Sản phẩm ({lines.length})
              </h4>
              <Button size="small" icon={<LuPlus size={13} />} onClick={addCustomLine}>
                Dòng tự nhập
              </Button>
            </div>
            <Select
              showSearch
              className="w-full"
              value={productPick}
              placeholder={products.length ? "Tìm & thêm sản phẩm…" : "Store chưa có sản phẩm — dùng “Dòng tự nhập”"}
              disabled={!products.length}
              optionFilterProp="search"
              onChange={(id: string) => addProduct(id)}
              options={products.map((p) => ({
                value: p.id,
                search: `${p.name} ${p.sku ?? ""} ${p.category}`.toLowerCase(),
                label: (
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate">{p.name}</span>
                    <span className="shrink-0 text-xs text-slate-500">
                      {money(p.salePrice ?? p.price)}
                      {typeof p.stock === "number" && ` · tồn ${p.stock}`}
                    </span>
                  </div>
                ),
              }))}
            />

            <div className="mt-3 space-y-2">
              {!lines.length && <div className="rounded-xl border border-dashed border-slate-200 py-6 text-center text-xs text-slate-400">Chưa có sản phẩm</div>}
              {lines.map((l) => (
                <div key={l.key} className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/60 p-2">
                  {l.imageUrl ? (
                    <img src={l.imageUrl} alt="" className="h-10 w-10 rounded-lg object-cover" />
                  ) : (
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-slate-400 ring-1 ring-slate-100">
                      <LuShoppingCart size={15} />
                    </span>
                  )}
                  <div className="min-w-[140px] flex-1">
                    {l.productId ? (
                      <div className="truncate text-sm font-semibold text-slate-800">{l.name}</div>
                    ) : (
                      <Input size="small" placeholder="Tên sản phẩm / dịch vụ" value={l.name} onChange={(e) => setLine(l.key, { name: e.target.value })} />
                    )}
                    {typeof l.stock === "number" && l.quantity > l.stock && (
                      <div className="text-[11px] text-amber-600">Vượt tồn kho ({l.stock})</div>
                    )}
                  </div>
                  <Tooltip title="Đơn giá">
                    <InputNumber
                      size="small"
                      min={0}
                      step={1000}
                      value={l.unitPrice}
                      onChange={(v) => setLine(l.key, { unitPrice: Number(v) || 0 })}
                      formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
                      parser={(v) => Number((v ?? "").replace(/\./g, ""))}
                      style={{ width: 110 }}
                      suffix="đ"
                    />
                  </Tooltip>
                  <div className="flex items-center rounded-lg bg-white ring-1 ring-slate-200">
                    <button type="button" className="px-2 py-1 text-slate-500 hover:text-slate-900" onClick={() => setLine(l.key, { quantity: Math.max(1, l.quantity - 1) })}>
                      <LuMinus size={13} />
                    </button>
                    <InputNumber
                      size="small"
                      variant="borderless"
                      min={1}
                      max={9999}
                      controls={false}
                      value={l.quantity}
                      onChange={(v) => setLine(l.key, { quantity: Math.max(1, Number(v) || 1) })}
                      style={{ width: 44 }}
                      className="text-center"
                    />
                    <button type="button" className="px-2 py-1 text-slate-500 hover:text-slate-900" onClick={() => setLine(l.key, { quantity: l.quantity + 1 })}>
                      <LuPlus size={13} />
                    </button>
                  </div>
                  <div className="w-24 text-right text-sm font-bold text-slate-900">{money(l.unitPrice * l.quantity)}</div>
                  <Button size="small" type="text" danger icon={<LuTrash2 size={14} />} onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))} />
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <h4 className="mb-2 text-sm font-bold text-slate-900">Ghi chú</h4>
            <Input.TextArea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="VD: giao trước 17h, gói quà…" maxLength={500} />
          </section>
        </div>

        {/* Thanh toán */}
        <aside className="lg:sticky lg:top-0 lg:self-start">
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h4 className="text-sm font-bold text-slate-900">Thanh toán</h4>

            <div>
              <div className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                <LuTicket size={13} /> Mã voucher
              </div>
              {applied ? (
                <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
                  <div className="min-w-0">
                    <div className="font-mono text-sm font-extrabold text-emerald-700">{applied.code}</div>
                    <div className="truncate text-[11px] text-emerald-700/80">{applied.title}</div>
                  </div>
                  <Button size="small" type="text" icon={<LuX size={13} />} onClick={() => setApplied(null)} />
                </div>
              ) : (
                <Input.Search
                  value={voucherInput}
                  onChange={(e) => {
                    setVoucherInput(e.target.value.toUpperCase());
                    setVoucherErr(null);
                  }}
                  onSearch={applyVoucher}
                  enterButton="Áp dụng"
                  loading={checking}
                  placeholder="Nhập / quét mã trên thẻ"
                  className="font-mono"
                />
              )}
              {voucherErr && <div className="mt-1 text-[11px] text-rose-500">{voucherErr}</div>}
            </div>

            <div className="space-y-2 text-sm">
              <Row label="Tạm tính" value={money(subtotal)} />
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500">Phí giao hàng</span>
                <InputNumber size="small" min={0} step={5000} value={shippingFee} onChange={(v) => setShippingFee(Number(v) || 0)} style={{ width: 120 }} suffix="đ" />
              </div>
              {!!applied && <Row label="Giảm từ voucher" value={`−${money(voucherDiscount)}`} red />}
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500">Giảm thêm</span>
                <InputNumber size="small" min={0} step={5000} value={extraDiscount} onChange={(v) => setExtraDiscount(Number(v) || 0)} style={{ width: 120 }} suffix="đ" />
              </div>
              <div className="flex items-end justify-between border-t border-dashed border-slate-200 pt-3">
                <span className="font-bold text-slate-900">Khách cần trả</span>
                <span className="text-2xl font-extrabold text-brand-600">{money(total)}</span>
              </div>
            </div>

            <div>
              <div className="mb-1.5 text-xs font-semibold text-slate-600">Phương thức</div>
              <Select className="w-full" value={payment} onChange={setPayment} options={PAYMENT_METHODS} />
            </div>
            <div>
              <div className="mb-1.5 text-xs font-semibold text-slate-600">Trạng thái đơn</div>
              <Segmented
                block
                size="small"
                value={status}
                onChange={(v) => setStatus(v as StoreOrderItem["status"])}
                options={[
                  { value: "completed", label: "Đã xong" },
                  { value: "confirmed", label: "Xác nhận" },
                  { value: "pending", label: "Chờ" },
                ]}
              />
              <div className="mt-1 text-[11px] text-slate-400">
                {status === "completed" ? "Khách đã nhận hàng — cộng điểm & chi tiêu ngay." : "Cộng điểm khi đơn chuyển sang Hoàn thành."}
              </div>
            </div>

            <Button type="primary" size="large" block loading={saving} onClick={submit} disabled={!lines.length} className="font-bold">
              Tạo đơn · {money(total)}
            </Button>
          </div>
        </aside>
      </div>
    </Drawer>
  );
}
