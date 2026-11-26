import {
  App as AntApp,
  AutoComplete,
  Button,
  Checkbox,
  Empty,
  Input,
  InputNumber,
  Modal,
  Segmented,
  Select,
  Table,
  Tag,
  Tooltip,
} from "antd";
import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import {
  LuCircleDollarSign,
  LuPlus,
  LuReceipt,
  LuRepeat,
  LuTrash2,
  LuWallet,
} from "react-icons/lu";
import {
  checkoutBooking,
  collectDebt,
  type CustomerAfterPay,
  type DebtGroup,
  fetchDebts,
  fetchTreatmentBilling,
  type TreatmentBilling,
} from "../data/billing-api";
import { sendTreatmentResult } from "../data/album-api";
import { ApiError } from "../data/platform-api";
import {
  isService,
  previewVoucher,
  type PaymentMethod,
  type StoreBookingItem,
  type StoreConfig,
  type StoreCustomerItem,
  type StoreOrderItem,
} from "../data/store-api";
import { BankQrPanel, type QrStore } from "./BankQr";
import { useWalletBalance } from "./CustomerWalletViews";
import { PageHeader, StatCard, StatGrid } from "./ui";

/**
 * Thu tiền & công nợ:
 *  - BookingCheckoutModal: bill của 1 lịch hẹn (dịch vụ + bán thêm + phụ thu, sửa / xoá / thêm dòng) → xác nhận thanh toán,
 *    khách trả thiếu thì ghi nợ; buổi liệu trình trọn gói không tính tiền dịch vụ, thu thêm nợ gói được.
 *  - DebtsSection: tab "Công nợ" — khách còn nợ, các đơn chưa thu đủ, thu nợ.
 */

export const money = (n: number) => `${Math.round(n).toLocaleString("vi-VN")}đ`;
const PAY: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "Tiền mặt" },
  { value: "bank_transfer", label: "Chuyển khoản" },
  { value: "card", label: "Thẻ" },
  { value: "ewallet", label: "Ví" },
];
export const BILLING_LABEL: Record<TreatmentBilling["billing"], string> = {
  session: "Thu theo buổi",
  package: "Trọn gói",
  flexible: "Trả linh hoạt",
};
const errText = (e: unknown, fb: string) =>
  e instanceof ApiError ? e.message : fb;
const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .trim();

type Line = {
  key: string;
  productId?: string;
  name: string;
  unitPrice: number;
  quantity: number;
  kind: "service" | "product" | "surcharge";
};
let seq = 0;
const lineKey = () => `l${++seq}`;

/** Đơn thu tiền (khác huỷ) của lịch hẹn — có thì lịch đã thu tiền */
export const paidOrderOf = (store: StoreConfig, bookingId: string) =>
  (store.orders ?? []).find(
    (o) => o.bookingId === bookingId && o.status !== "cancelled",
  );

/**
 * BookingCheckoutModal — bill lịch hẹn: sửa / xoá / thêm dịch vụ, bán thêm sản phẩm, phụ thu, giảm giá →
 * chọn hình thức & số tiền khách trả (thiếu = ghi nợ) → "Xác nhận thanh toán" (lịch chuyển Hoàn thành).
 */
export function BookingCheckoutModal({
  open,
  store,
  booking,
  onClose,
  onDone,
}: {
  open: boolean;
  store: StoreConfig;
  booking: StoreBookingItem | null;
  onClose: () => void;
  /** Đã thu tiền: lịch hẹn mới (đã hoàn thành) + đơn vừa tạo (null nếu không có dòng tính tiền) + khách (số dư ví mới) */
  onDone: (
    booking: StoreBookingItem,
    order: StoreOrderItem | null,
    customer?: CustomerAfterPay | null,
  ) => void;
}) {
  const { message } = AntApp.useApp();
  const [lines, setLines] = useState<Line[]>([]);
  const [discount, setDiscount] = useState(0);
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [paid, setPaid] = useState<number | null>(null);
  const [plan, setPlan] = useState<TreatmentBilling | null>(null);
  const [planPaid, setPlanPaid] = useState(0);
  const [result, setResult] = useState("");
  const [sendResult, setSendResult] = useState(true);
  const [busy, setBusy] = useState(false);
  // Voucher: mã chung hoặc mã thẻ — kiểm tra bằng preview-voucher, máy chủ tính lại khi thu tiền
  const [voucherInput, setVoucherInput] = useState("");
  const [voucher, setVoucher] = useState<{
    code: string;
    title: string;
    discount: number;
  } | null>(null);
  const [voucherErr, setVoucherErr] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  // Ví khách: trừ ví vào bill; khách trả thừa → cộng vào ví (quán đang nợ khách) hoặc thối lại
  const [walletUse, setWalletUse] = useState(0);
  const [overpay, setOverpay] = useState<"wallet" | "change">("wallet");
  const [walletNote, setWalletNote] = useState("");
  const balance = useWalletBalance(store.id, booking?.customerId, open);

  const sellable = useMemo(
    () =>
      store.products.filter((p) => p.kind !== "material" && p.active !== false),
    [store.products],
  );
  const serviceOf = (name: string) => {
    const k = norm(name);
    const svc = sellable.filter(isService);
    return (
      svc.find((p) => norm(p.name) === k) ??
      svc
        .filter((p) => k.includes(norm(p.name)) || norm(p.name).includes(k))
        .sort((a, b) => b.name.length - a.name.length)[0]
    );
  };

  // Mở bill: dòng dịch vụ của lịch (giá theo danh mục dịch vụ); buổi liệu trình trọn gói / linh hoạt thì không tính tiền dịch vụ
  useEffect(() => {
    if (!open || !booking) return;
    setDiscount(0);
    setVoucher(null);
    setVoucherInput("");
    setVoucherErr(null);
    setMethod("cash");
    setPaid(null);
    setWalletUse(0);
    setOverpay(booking.customerId ? "wallet" : "change");
    setWalletNote("");
    setPlan(null);
    setPlanPaid(0);
    setResult(booking.result ?? "");
    setSendResult(true);
    const svc = serviceOf(booking.serviceName);
    const serviceLine: Line = {
      key: lineKey(),
      productId: svc?.id,
      name: svc?.name ?? booking.serviceName,
      unitPrice: svc ? (svc.salePrice ?? svc.price) : 0,
      quantity: 1,
      kind: "service",
    };
    setLines([serviceLine]);
    if (booking.treatmentId) {
      fetchTreatmentBilling(store.id)
        .then((list) => {
          const t = list.find((x) => x.id === booking.treatmentId) ?? null;
          setPlan(t);
          if (t && t.billing !== "session")
            setLines((l) => l.filter((x) => x.key !== serviceLine.key));
        })
        .catch(() => undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, booking?.id]);

  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  const voucherOff = Math.min(subtotal, voucher?.discount ?? 0);
  const total = Math.max(0, subtotal - voucherOff - discount);

  const applyVoucher = async (codeIn?: string) => {
    const code = (codeIn ?? voucherInput).trim();
    if (!code || !booking) return;
    setChecking(true);
    setVoucherErr(null);
    try {
      const r = await previewVoucher(store.id, {
        code,
        subtotal,
        shippingFee: 0,
        customerId: booking.customerId ?? undefined,
      });
      setVoucher(r);
      setVoucherInput("");
    } catch (e) {
      setVoucher(null);
      setVoucherErr(errText(e, "Mã không hợp lệ"));
    } finally {
      setChecking(false);
    }
  };
  // Bill đổi → tính lại số tiền giảm của mã đang áp
  useEffect(() => {
    if (!voucher || !booking) return;
    const t = setTimeout(() => {
      previewVoucher(store.id, {
        code: voucher.code,
        subtotal,
        shippingFee: 0,
        customerId: booking.customerId ?? undefined,
      })
        .then((r) => setVoucher(r))
        .catch((e) => {
          setVoucher(null);
          setVoucherErr(errText(e, "Mã không còn áp dụng được"));
        });
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotal]);
  const voucherOptions = (store.vouchers ?? [])
    .filter((v) => v.active && dayjs().isBefore(dayjs(v.endDate).endOf("day")))
    .map((v) => ({ value: v.code, label: `${v.code} — ${v.title}` }));
  const walletPart = Math.min(walletUse, total, balance ?? 0);
  /** Còn phải trả sau khi trừ ví */
  const due = total - walletPart;
  const pay = paid ?? due;
  const owe = Math.max(0, due - pay);
  const excess = Math.max(0, pay - due);
  const toWallet = excess > 0 && overpay === "wallet" && !!booking?.customerId;
  const patch = (key: string, p: Partial<Line>) =>
    setLines((l) => l.map((x) => (x.key === key ? { ...x, ...p } : x)));

  const addProduct = (id: string) => {
    const p = sellable.find((x) => x.id === id);
    if (!p) return;
    setLines((l) => {
      const same = l.find((x) => x.productId === p.id);
      if (same)
        return l.map((x) =>
          x === same ? { ...x, quantity: x.quantity + 1 } : x,
        );
      return [
        ...l,
        {
          key: lineKey(),
          productId: p.id,
          name: p.name,
          unitPrice: p.salePrice ?? p.price,
          quantity: 1,
          kind: isService(p) ? "service" : "product",
        },
      ];
    });
  };

  const submit = async () => {
    if (!booking) return;
    if (lines.some((l) => !l.name.trim()))
      return message.warning("Nhập tên cho dòng phụ thu / dịch vụ");
    setBusy(true);
    try {
      const r = await checkoutBooking(store.id, booking.id, {
        items: lines.map((l) => ({
          productId: l.productId ?? null,
          productName: l.name.trim(),
          unitPrice: l.unitPrice,
          quantity: l.quantity,
        })),
        extraDiscount: discount || undefined,
        voucherCode: voucher?.code,
        paymentMethod: method,
        paid: pay,
        walletUse: walletPart || undefined,
        overpayToWallet: toWallet || undefined,
        walletReason:
          toWallet && walletNote.trim() ? walletNote.trim() : undefined,
        treatmentPaid: planPaid || undefined,
        result: booking.treatmentId ? result : undefined,
      });
      // Gửi kết quả buổi liệu trình cho khách (thẻ trong chat Mini App)
      if (booking.treatmentId && sendResult && result.trim()) {
        await sendTreatmentResult(store.id, booking.id, result.trim()).catch(
          (e) => message.warning(errText(e, "Chưa gửi được kết quả cho khách")),
        );
      }
      message.success(
        [
          `Đã thu ${money(Math.min(pay, due))}`,
          walletPart && `trừ ví ${money(walletPart)}`,
          owe && `ghi nợ ${money(owe)}`,
          excess &&
            (toWallet
              ? `cộng ví ${money(excess)}`
              : `thối lại ${money(excess)}`),
        ]
          .filter(Boolean)
          .join(" · "),
      );
      onDone(r.booking, r.order, r.customer);
    } catch (e) {
      message.error(errText(e, "Không thu tiền được"));
    } finally {
      setBusy(false);
    }
  };

  if (!booking) return null;
  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={620}
      destroyOnHidden
      title={
        <span className="flex items-center gap-2">
          <LuReceipt size={16} className="text-brand-600" /> Thu tiền lịch hẹn
        </span>
      }
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button onClick={onClose}>Huỷ</Button>
          <Button
            type="primary"
            loading={busy}
            icon={<LuCircleDollarSign size={15} />}
            onClick={submit}
          >
            Xác nhận thanh toán · {money(Math.min(pay, due) + walletPart)}
          </Button>
        </div>
      }
    >
      <div data-ui="BookingCheckoutModal" className="space-y-3 text-xs">
        {/* Đầu bill */}
        <div className="flex flex-wrap items-start justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2">
          <div>
            <div className="text-sm font-semibold text-slate-900">
              {booking.customerName}
            </div>
            <div className="text-slate-500">
              {booking.phone} · {booking.timeSlot}{" "}
              {dayjs(booking.date).format("DD/MM/YYYY")}
              {booking.staffName ? ` · ${booking.staffName}` : ""}
            </div>
          </div>
          <div className="text-right">
            <div className="font-mono text-slate-400">{booking.code}</div>
            {booking.treatmentId && (
              <Tag color="purple" className="!m-0 !mt-0.5">
                <LuRepeat size={10} className="mr-0.5 inline" /> Buổi{" "}
                {booking.treatmentSeq}/{booking.treatmentTotal}
              </Tag>
            )}
          </div>
        </div>

        {plan && plan.billing !== "session" && (
          <div className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-violet-800">
            <div className="font-semibold">
              {BILLING_LABEL[plan.billing]} · {plan.name}: {money(plan.price)}
            </div>
            <div>
              Buổi này đã gồm trong gói — không tính tiền dịch vụ. Đã thu{" "}
              {money(plan.paid)}
              {plan.debt > 0 && (
                <b className="text-red-600"> · còn nợ {money(plan.debt)}</b>
              )}
            </div>
            {plan.debt > 0 && (
              <div className="mt-1.5 flex items-center gap-2">
                <span>Thu thêm tiền gói:</span>
                <InputNumber
                  size="small"
                  min={0}
                  max={plan.debt}
                  step={50000}
                  value={planPaid}
                  onChange={(v) => setPlanPaid(Number(v) || 0)}
                  className="!w-36"
                  suffix="đ"
                />
                <Button
                  size="small"
                  type="link"
                  className="!px-0"
                  onClick={() => setPlanPaid(plan.debt)}
                >
                  Thu hết
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Các dòng bill */}
        <div
          data-ui="CheckoutLines"
          className="rounded-lg border border-slate-200"
        >
          <div className="grid grid-cols-[minmax(0,1fr)_64px_108px_96px_28px] gap-2 border-b border-slate-200 bg-slate-50 px-2.5 py-1.5 font-semibold text-slate-500">
            <span>Dịch vụ / sản phẩm</span>
            <span className="text-center">SL</span>
            <span className="text-right">Đơn giá</span>
            <span className="text-right">Thành tiền</span>
            <span />
          </div>
          {lines.map((l) => (
            <div
              key={l.key}
              className="grid grid-cols-[minmax(0,1fr)_64px_108px_96px_28px] items-center gap-2 border-b border-slate-100 px-2.5 py-1 last:border-b-0"
            >
              <div className="flex min-w-0 items-center gap-1.5">
                <Tag
                  className="!m-0 shrink-0"
                  color={
                    l.kind === "service"
                      ? "blue"
                      : l.kind === "product"
                        ? "green"
                        : "orange"
                  }
                >
                  {l.kind === "service"
                    ? "DV"
                    : l.kind === "product"
                      ? "SP"
                      : "Phụ thu"}
                </Tag>
                {l.productId ? (
                  <span className="truncate font-medium text-slate-800">
                    {l.name}
                  </span>
                ) : (
                  <Input
                    size="small"
                    value={l.name}
                    onChange={(e) => patch(l.key, { name: e.target.value })}
                    placeholder="Tên khoản phụ thu"
                  />
                )}
              </div>
              <InputNumber
                size="small"
                min={1}
                max={999}
                value={l.quantity}
                onChange={(v) => patch(l.key, { quantity: Number(v) || 1 })}
                className="!w-full"
              />
              <InputNumber
                size="small"
                min={0}
                step={10000}
                value={l.unitPrice}
                onChange={(v) => patch(l.key, { unitPrice: Number(v) || 0 })}
                formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
                parser={(v) =>
                  Number((v ?? "").replace(/\./g, "")) as unknown as 0
                }
                className="!w-full"
              />
              <span className="text-right font-semibold tabular-nums text-slate-800">
                {money(l.unitPrice * l.quantity)}
              </span>
              <Button
                size="small"
                type="text"
                danger
                icon={<LuTrash2 size={13} />}
                onClick={() =>
                  setLines((x) => x.filter((y) => y.key !== l.key))
                }
              />
            </div>
          ))}
          {!lines.length && (
            <div className="px-3 py-3 text-center text-slate-400">
              Chưa có dòng tính tiền
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 bg-slate-50/60 px-2.5 py-1.5">
            <Select
              size="small"
              showSearch
              value={null}
              placeholder="+ Thêm dịch vụ / bán thêm sản phẩm…"
              optionFilterProp="label"
              className="min-w-0 flex-1"
              onChange={(v) => v && addProduct(v)}
              options={[
                {
                  label: "Dịch vụ",
                  options: sellable.filter(isService).map((p) => ({
                    value: p.id,
                    label: `${p.name} · ${money(p.salePrice ?? p.price)}`,
                  })),
                },
                {
                  label: "Sản phẩm",
                  options: sellable
                    .filter((p) => !isService(p))
                    .map((p) => ({
                      value: p.id,
                      label: `${p.name} · ${money(p.salePrice ?? p.price)}`,
                    })),
                },
              ]}
            />
            <Button
              size="small"
              icon={<LuPlus size={13} />}
              onClick={() =>
                setLines((l) => [
                  ...l,
                  {
                    key: lineKey(),
                    name: "Phụ thu",
                    unitPrice: 0,
                    quantity: 1,
                    kind: "surcharge",
                  },
                ])
              }
            >
              Phụ thu
            </Button>
          </div>
        </div>

        {/* Tổng & thanh toán */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <div className="text-slate-500">Hình thức thanh toán</div>
            <Segmented
              size="small"
              value={method}
              onChange={(v) => setMethod(v as PaymentMethod)}
              options={PAY}
            />
            {method === "bank_transfer" && pay + planPaid > 0 && (
              <BankQrPanel
                store={store}
                amount={pay + planPaid}
                info={`TT ${booking.code}`}
                size={108}
              />
            )}
            {booking.treatmentId && (
              <>
                <div className="pt-1 text-slate-500">
                  Kết quả buổi {booking.treatmentSeq}
                </div>
                <Input.TextArea
                  value={result}
                  onChange={(e) => setResult(e.target.value)}
                  autoSize={{ minRows: 2, maxRows: 4 }}
                  maxLength={2000}
                  placeholder="Tình trạng, dặn dò…"
                />
                <Checkbox
                  checked={sendResult}
                  onChange={(e) => setSendResult(e.target.checked)}
                >
                  Gửi kết quả cho khách (tin Mini App)
                </Checkbox>
              </>
            )}
          </div>
          <div className="space-y-1 rounded-lg bg-slate-50 p-2.5 tabular-nums">
            <div className="flex justify-between text-slate-600">
              <span>Tạm tính</span>
              <span>{money(subtotal)}</span>
            </div>
            {/* Voucher */}
            <div className="flex items-center justify-between gap-2 text-slate-600">
              <span className="shrink-0">Voucher</span>
              {voucher ? (
                <span className="flex min-w-0 items-center gap-1">
                  <Tooltip title={voucher.title}>
                    <Tag
                      color="magenta"
                      closable
                      onClose={() => setVoucher(null)}
                      className="!m-0 font-mono"
                    >
                      {voucher.code}
                    </Tag>
                  </Tooltip>
                  <span className="text-red-600">−{money(voucherOff)}</span>
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <AutoComplete
                    size="small"
                    value={voucherInput}
                    options={voucherOptions}
                    onChange={(v) =>
                      setVoucherInput(String(v ?? "").toUpperCase())
                    }
                    onSelect={(v) => applyVoucher(String(v))}
                    placeholder="Nhập / chọn mã"
                    className="!w-32"
                    popupMatchSelectWidth={260}
                  />
                  <Button
                    size="small"
                    loading={checking}
                    onClick={() => applyVoucher()}
                  >
                    Áp
                  </Button>
                </span>
              )}
            </div>
            {voucherErr && (
              <div className="text-right text-2xs text-red-600">
                {voucherErr}
              </div>
            )}
            <div className="flex items-center justify-between text-slate-600">
              <span>Giảm thêm</span>
              <InputNumber
                size="small"
                min={0}
                max={Math.max(0, subtotal - voucherOff)}
                step={10000}
                value={discount}
                onChange={(v) => setDiscount(Number(v) || 0)}
                className="!w-32"
                suffix="đ"
              />
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-1 text-sm font-bold text-slate-900">
              <span>Tổng thanh toán</span>
              <span>{money(total)}</span>
            </div>
            {(balance ?? 0) > 0 && total > 0 && (
              <div className="flex items-center justify-between gap-2 text-slate-600">
                <span className="flex min-w-0 flex-col leading-tight">
                  <span className="flex items-center gap-1 whitespace-nowrap">
                    <LuWallet size={13} className="text-emerald-600" /> Trừ ví
                  </span>
                  <button
                    type="button"
                    className="whitespace-nowrap text-left text-2xs text-emerald-700 hover:underline"
                    onClick={() => setWalletUse(Math.min(balance ?? 0, total))}
                  >
                    còn {money(balance ?? 0)} · dùng hết
                  </button>
                </span>
                <span className="flex items-center gap-1">
                  <InputNumber
                    size="small"
                    min={0}
                    max={Math.min(balance ?? 0, total)}
                    step={10000}
                    value={walletUse}
                    onChange={(v) => setWalletUse(Number(v) || 0)}
                    className="!w-32"
                    suffix="đ"
                  />
                </span>
              </div>
            )}
            {walletPart > 0 && (
              <div className="flex justify-between font-semibold text-slate-800">
                <span>Còn phải trả</span>
                <span>{money(due)}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-slate-600">
              <span>Khách trả</span>
              <InputNumber
                size="small"
                min={0}
                step={10000}
                value={pay}
                onChange={(v) => setPaid(v === null ? null : Number(v))}
                className="!w-32"
                suffix="đ"
              />
            </div>
            {excess > 0 && (
              <div
                data-ui="OverpayBox"
                className="space-y-1.5 rounded-lg border border-amber-200 bg-amber-50 p-2"
              >
                <div className="flex items-center justify-between font-semibold text-amber-800">
                  <span>Khách trả thừa</span>
                  <span>{money(excess)}</span>
                </div>
                {booking.customerId ? (
                  <>
                    <Segmented
                      size="small"
                      block
                      value={overpay}
                      onChange={(v) => setOverpay(v as "wallet" | "change")}
                      options={[
                        { value: "wallet", label: "Cộng vào ví khách" },
                        { value: "change", label: "Thối lại tiền" },
                      ]}
                    />
                    {overpay === "wallet" && (
                      <Input
                        size="small"
                        value={walletNote}
                        maxLength={300}
                        onChange={(e) => setWalletNote(e.target.value)}
                        placeholder={`Lý do (mặc định: Khách trả thừa khi thanh toán lịch hẹn ${booking.code})`}
                      />
                    )}
                  </>
                ) : (
                  <div className="text-2xs text-amber-700">
                    Khách lẻ chưa có hồ sơ — thối lại tiền cho khách (lưu hồ sơ
                    khách để dùng ví).
                  </div>
                )}
              </div>
            )}
            <div className="flex items-center justify-between">
              <Button
                size="small"
                type="link"
                className="!h-auto !px-0 !text-2xs"
                onClick={() => setPaid(paid === 0 ? null : 0)}
              >
                {paid === 0 ? "Khách trả đủ" : "Ghi nợ toàn bộ"}
              </Button>
              {owe > 0 && <b className="text-red-600">Ghi nợ {money(owe)}</b>}
            </div>
            {planPaid > 0 && (
              <div className="flex justify-between text-violet-700">
                <span>+ Thu tiền gói</span>
                <span>{money(planPaid)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}

/** Cập nhật khách trong danh sách sau khi thu tiền (số dư ví, chi tiêu, điểm, hạng) */
export function withPaidCustomer(
  list: StoreCustomerItem[],
  c: CustomerAfterPay | null | undefined,
): StoreCustomerItem[] {
  if (!c) return list;
  return list.map((x) => (x.id === c.id ? { ...x, ...c } : x));
}

/** DebtCollectModal — thu nợ 1 đơn hoặc cả khách (trừ đơn cũ trước); trừ ví / trả dư vào ví */
export function DebtCollectModal({
  open,
  storeId,
  title,
  max,
  target,
  customerId,
  qrStore,
  onClose,
  onDone,
}: {
  open: boolean;
  storeId: string;
  title: string;
  max: number;
  target: { orderId?: string; customerId?: string | null; phone?: string };
  /** Khách có hồ sơ → dùng được ví */
  customerId?: string | null;
  /** Gian hàng (tài khoản ngân hàng, Tingee) → mã VietQR khi thu bằng chuyển khoản */
  qrStore?: QrStore;
  onClose: () => void;
  onDone: () => void;
}) {
  const { message } = AntApp.useApp();
  const cid = customerId ?? target.customerId ?? null;
  const balance = useWalletBalance(storeId, cid, open);
  const [walletUse, setWalletUse] = useState(0);
  const [amount, setAmount] = useState(max);
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [note, setNote] = useState("");
  const [overpay, setOverpay] = useState<"wallet" | "change">("wallet");
  const [walletNote, setWalletNote] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) {
      setAmount(max);
      setWalletUse(0);
      setNote("");
      setOverpay(cid ? "wallet" : "change");
      setWalletNote("");
    }
  }, [open, max, cid]);
  const walletPart = Math.min(walletUse, max, balance ?? 0);
  const due = max - walletPart;
  const excess = Math.max(0, amount - due);
  const toWallet = excess > 0 && overpay === "wallet" && !!cid;
  const collectNow = Math.min(amount, due) + walletPart;
  const applyWallet = (v: number) => {
    const w = Math.min(v, balance ?? 0, max);
    setWalletUse(w);
    setAmount(max - w);
  };
  const submit = async () => {
    setBusy(true);
    try {
      const r = await collectDebt(storeId, {
        ...target,
        amount: Math.min(amount, due) + (toWallet ? excess : 0),
        paymentMethod: method,
        note: note.trim() || undefined,
        walletUse: walletPart || undefined,
        overpayToWallet: toWallet || undefined,
        walletReason:
          toWallet && walletNote.trim() ? walletNote.trim() : undefined,
      });
      message.success(
        [
          `Đã thu ${money(r.collected)}`,
          r.fromWallet && `trừ ví ${money(r.fromWallet)}`,
          r.toWallet && `cộng ví ${money(r.toWallet)}`,
          !toWallet && excess && `thối lại ${money(excess)}`,
        ]
          .filter(Boolean)
          .join(" · "),
      );
      onDone();
    } catch (e) {
      message.error(errText(e, "Không thu được"));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={title}
      okText={`Thu ${money(collectNow)}`}
      onOk={submit}
      okButtonProps={{ loading: busy, disabled: !collectNow }}
      cancelText="Huỷ"
      destroyOnHidden
      width={440}
    >
      <div data-ui="DebtCollectModal" className="space-y-3 text-xs">
        <div className="rounded-lg bg-red-50 px-3 py-2 text-red-700">
          Còn nợ <b>{money(max)}</b>
        </div>
        {(balance ?? 0) > 0 && (
          <div className="flex items-center gap-2">
            <span className="flex w-20 items-center gap-1 text-slate-500">
              <LuWallet size={13} className="text-emerald-600" /> Trừ ví
            </span>
            <InputNumber
              min={0}
              max={Math.min(balance ?? 0, max)}
              step={50000}
              value={walletUse}
              onChange={(v) => applyWallet(Number(v) || 0)}
              className="!w-44"
              suffix="đ"
            />
            <Button
              size="small"
              type="link"
              onClick={() => applyWallet(balance ?? 0)}
            >
              Dùng ví ({money(balance ?? 0)})
            </Button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <span className="w-20 text-slate-500">Khách đưa</span>
          <InputNumber
            min={0}
            step={50000}
            value={amount}
            onChange={(v) => setAmount(Number(v) || 0)}
            className="!w-44"
            suffix="đ"
          />
          <Button size="small" type="link" onClick={() => setAmount(due)}>
            Thu hết
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-20 text-slate-500">Hình thức</span>
          <Segmented
            size="small"
            value={method}
            onChange={(v) => setMethod(v as PaymentMethod)}
            options={PAY}
          />
        </div>
        {method === "bank_transfer" && amount > 0 && qrStore && (
          <BankQrPanel
            store={qrStore}
            amount={amount}
            info={`TT no ${title.replace(/^Thu (nợ|tiền) /, "")}`}
          />
        )}
        {excess > 0 && (
          <div
            data-ui="OverpayBox"
            className="space-y-1.5 rounded-lg border border-amber-200 bg-amber-50 p-2"
          >
            <div className="flex items-center justify-between font-semibold text-amber-800">
              <span>Khách đưa dư</span>
              <span>{money(excess)}</span>
            </div>
            {cid ? (
              <>
                <Segmented
                  size="small"
                  block
                  value={overpay}
                  onChange={(v) => setOverpay(v as "wallet" | "change")}
                  options={[
                    { value: "wallet", label: "Cộng vào ví khách" },
                    { value: "change", label: "Thối lại tiền" },
                  ]}
                />
                {overpay === "wallet" && (
                  <Input
                    size="small"
                    value={walletNote}
                    maxLength={300}
                    onChange={(e) => setWalletNote(e.target.value)}
                    placeholder="Lý do (mặc định: Khách trả dư khi thu nợ đơn …)"
                  />
                )}
              </>
            ) : (
              <div className="text-2xs text-amber-700">
                Khách lẻ chưa có hồ sơ — thối lại tiền cho khách.
              </div>
            )}
          </div>
        )}
        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Ghi chú (tuỳ chọn)"
        />
      </div>
    </Modal>
  );
}

const SOURCE_LABEL: Record<string, string> = {
  booking: "Lịch hẹn",
  treatment: "Gói liệu trình",
  pos: "Bán tại quầy",
  admin: "Đơn tại quầy",
  miniapp: "Mini App",
};

/** DebtsSection — tab "Công nợ" của Khách hàng */
export function DebtsSection({ store }: { store: StoreConfig }) {
  const [list, setList] = useState<DebtGroup[] | null>(null);
  const [q, setQ] = useState("");
  const [collect, setCollect] = useState<{
    title: string;
    max: number;
    target: { orderId?: string; customerId?: string | null; phone?: string };
    customerId?: string | null;
  } | null>(null);
  const load = () =>
    fetchDebts(store.id)
      .then(setList)
      .catch(() => setList([]));
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.id]);

  const kw = norm(q);
  const rows = (list ?? []).filter(
    (g) =>
      !kw || norm(g.customerName).includes(kw) || g.phone.includes(q.trim()),
  );
  const totalDebt = (list ?? []).reduce((s, g) => s + g.debt, 0);
  const orderCount = (list ?? []).reduce((s, g) => s + g.orders.length, 0);

  return (
    <div data-ui="DebtsSection" className="space-y-4">
      <StatGrid>
        <StatCard
          label="Tổng công nợ"
          icon={<LuWallet className="text-red-600" size={18} />}
          value={money(totalDebt)}
          hint={`${list?.length ?? 0} khách · ${orderCount} đơn chưa thu đủ`}
        />
      </StatGrid>
      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <PageHeader
          title="Công nợ khách hàng"
          description="Đơn đã hoàn thành nhưng khách chưa trả đủ (thu tiền lịch hẹn ghi nợ, gói liệu trình trả dần…). Thu nợ theo khách sẽ trừ đơn cũ trước."
        />
        <Input
          allowClear
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tìm tên / SĐT"
          className="mb-3 !w-64"
        />
        <Table
          rowKey="key"
          size="small"
          loading={!list}
          dataSource={rows}
          pagination={{ pageSize: 20, hideOnSinglePage: true }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Không có công nợ"
              />
            ),
          }}
          expandable={{
            expandedRowRender: (g) => (
              <div className="space-y-1.5">
                {g.orders.map((o) => (
                  <div
                    key={o.id}
                    className="flex flex-wrap items-center gap-3 rounded-lg bg-white px-3 py-2 text-xs"
                  >
                    <span className="font-mono text-slate-500">{o.code}</span>
                    <span className="text-slate-500">
                      {dayjs(o.createdAt).format("DD/MM/YYYY")}
                    </span>
                    <Tag className="!m-0">
                      {SOURCE_LABEL[o.source ?? ""] ?? o.source}
                    </Tag>
                    <span className="min-w-0 flex-1 truncate text-slate-700">
                      {o.itemsSummary}
                    </span>
                    <span className="tabular-nums text-slate-500">
                      {money(o.paid ?? 0)} / {money(o.total)}
                    </span>
                    <b className="tabular-nums text-red-600">
                      nợ {money(o.debt)}
                    </b>
                    <Button
                      size="small"
                      onClick={() =>
                        setCollect({
                          title: `Thu nợ đơn ${o.code}`,
                          max: o.debt,
                          target: { orderId: o.id },
                          customerId: o.customerId,
                        })
                      }
                    >
                      Thu
                    </Button>
                  </div>
                ))}
              </div>
            ),
          }}
          columns={[
            {
              title: "Khách hàng",
              render: (_, g) => (
                <div>
                  <div className="font-semibold text-slate-900">
                    {g.customerName}
                  </div>
                  <div className="text-xs text-slate-500">{g.phone}</div>
                </div>
              ),
            },
            {
              title: "Số đơn nợ",
              width: 100,
              render: (_, g) => g.orders.length,
            },
            {
              title: "Nợ cũ nhất",
              width: 120,
              render: (_, g) => (
                <span className="text-xs text-slate-500">
                  {dayjs(g.orders[0]?.createdAt).format("DD/MM/YYYY")}
                </span>
              ),
            },
            {
              title: "Còn nợ",
              width: 140,
              align: "right",
              render: (_, g) => (
                <b className="tabular-nums text-red-600">{money(g.debt)}</b>
              ),
            },
            {
              title: "",
              width: 110,
              align: "right",
              render: (_, g) => (
                <Tooltip title="Thu nợ — trừ các đơn cũ trước">
                  <Button
                    size="small"
                    type="primary"
                    onClick={() =>
                      setCollect({
                        title: `Thu nợ ${g.customerName}`,
                        max: g.debt,
                        target: g.customerId
                          ? { customerId: g.customerId }
                          : { phone: g.phone },
                      })
                    }
                  >
                    Thu nợ
                  </Button>
                </Tooltip>
              ),
            },
          ]}
        />
      </div>
      <DebtCollectModal
        open={!!collect}
        storeId={store.id}
        title={collect?.title ?? ""}
        max={collect?.max ?? 0}
        target={collect?.target ?? {}}
        customerId={collect?.customerId}
        qrStore={store}
        onClose={() => setCollect(null)}
        onDone={() => {
          setCollect(null);
          load();
        }}
      />
    </div>
  );
}
