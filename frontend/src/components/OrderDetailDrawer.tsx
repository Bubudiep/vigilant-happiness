import {
  App as AntApp,
  Button,
  Drawer,
  Empty,
  Select,
  Spin,
  Tag,
  Typography,
} from "antd";
import dayjs from "dayjs";
import { useCallback, useEffect, useState } from "react";
import {
  LuCircleDollarSign,
  LuMapPin,
  LuPhone,
  LuPrinter,
  LuShoppingCart,
  LuStickyNote,
  LuUserRound,
  LuWallet,
} from "react-icons/lu";
import { fetchOrderPayments, type OrderPayments } from "../data/billing-api";
import type { StoreConfig, StoreOrderItem } from "../data/store-api";
import { DebtCollectModal } from "./StoreBillingViews";

const money = (n: number) => `${Math.round(n).toLocaleString("vi-VN")}đ`;

export const ORDER_SOURCE: Record<string, { label: string; color?: string }> = {
  miniapp: { label: "Mini App", color: "blue" },
  admin: { label: "Tại quầy" },
  pos: { label: "Bán tại quầy", color: "cyan" },
  booking: { label: "Lịch hẹn", color: "purple" },
  treatment: { label: "Gói liệu trình", color: "magenta" },
};
const METHOD: Record<string, string> = {
  cash: "Tiền mặt",
  bank_transfer: "Chuyển khoản",
  card: "Thẻ / POS",
  ewallet: "Ví điện tử",
  cod: "COD (thu khi giao)",
  wallet: "Ví khách",
};

/** Còn nợ của đơn (chỉ đơn hoàn thành mới tính công nợ) */
export const orderDebt = (o: StoreOrderItem) =>
  o.status === "completed" ? Math.max(0, o.total - (o.paid ?? o.total)) : 0;

const esc = (s: string) =>
  s.replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!,
  );

/** In hoá đơn khổ 80mm (máy in nhiệt) qua iframe ẩn */
function printReceipt(store: StoreConfig, o: StoreOrderItem) {
  const items = o.items ?? [];
  const debt = orderDebt(o);
  const rows = items
    .map(
      (i) =>
        `<tr><td colspan="3">${esc(i.productName)}</td></tr><tr class="sub"><td>${i.quantity} × ${i.unitPrice.toLocaleString("vi-VN")}</td><td></td><td class="r">${(i.unitPrice * i.quantity).toLocaleString("vi-VN")}</td></tr>`,
    )
    .join("");
  const line = (l: string, v: string, b = false) =>
    `<tr${b ? ' class="b"' : ""}><td colspan="2">${l}</td><td class="r">${v}</td></tr>`;
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(o.code)}</title><style>
    @page{size:80mm auto;margin:4mm}body{font:12px/1.4 system-ui,sans-serif;color:#000;margin:0}
    h1{font-size:15px;margin:0;text-align:center}.c{text-align:center}.m{color:#444;font-size:11px}
    table{width:100%;border-collapse:collapse;margin-top:6px}td{padding:1px 0;vertical-align:top}.r{text-align:right;white-space:nowrap}
    .sub td{color:#444;font-size:11px;padding-bottom:3px}.b td{font-weight:700;font-size:13px;border-top:1px dashed #000;padding-top:4px}
    hr{border:0;border-top:1px dashed #000;margin:6px 0}</style></head><body>
    <h1>${esc(store.name)}</h1>
    ${store.address ? `<div class="c m">${esc(store.address)}</div>` : ""}${store.phone ? `<div class="c m">ĐT: ${esc(store.phone)}</div>` : ""}
    <hr><div class="c"><b>HOÁ ĐƠN ${esc(o.code)}</b></div><div class="c m">${dayjs(o.createdAt).format("HH:mm DD/MM/YYYY")}</div>
    <div class="m">Khách: ${esc(o.customerName)}${o.phone ? ` · ${esc(o.phone)}` : ""}</div>
    <table>${rows}</table><table>
    ${line("Tạm tính", (o.subtotal || o.total).toLocaleString("vi-VN"))}
    ${o.shippingFee ? line("Phí giao hàng", o.shippingFee.toLocaleString("vi-VN")) : ""}
    ${o.discountAmount ? line(`Giảm giá${o.voucherCode ? ` (${esc(o.voucherCode)})` : ""}`, "−" + o.discountAmount.toLocaleString("vi-VN")) : ""}
    ${line("TỔNG CỘNG", o.total.toLocaleString("vi-VN") + "đ", true)}
    ${line("Đã thanh toán", (o.paid ?? o.total).toLocaleString("vi-VN"))}
    ${debt ? line("Còn nợ", debt.toLocaleString("vi-VN")) : ""}
    </table><hr><div class="c m">Cảm ơn quý khách!</div></body></html>`;
  const f = document.createElement("iframe");
  f.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  document.body.appendChild(f);
  const doc = f.contentDocument!;
  doc.open();
  doc.write(html);
  doc.close();
  setTimeout(() => {
    f.contentWindow?.focus();
    f.contentWindow?.print();
    setTimeout(() => f.remove(), 1000);
  }, 200);
}

/**
 * OrderDetailDrawer — bấm 1 đơn ở danh sách đơn hàng: xem chi tiết, đổi trạng thái,
 * xem các lần thu tiền, thu tiền còn nợ (trừ ví / chuyển khoản QR), in hoá đơn.
 */
export function OrderDetailDrawer({
  store,
  order,
  statusOptions,
  onClose,
  onStatus,
  onPaid,
}: {
  store: StoreConfig;
  order: StoreOrderItem | null;
  statusOptions: {
    value: StoreOrderItem["status"];
    label: string;
    color: string;
  }[];
  onClose: () => void;
  onStatus: (id: string, status: StoreOrderItem["status"]) => void;
  /** Đã thu thêm tiền → số đã thu mới của đơn */
  onPaid: (id: string, paid: number) => void;
}) {
  const { message } = AntApp.useApp();
  const [pay, setPay] = useState<OrderPayments | null>(null);
  const [loading, setLoading] = useState(false);
  const [collect, setCollect] = useState(false);
  const load = useCallback(() => {
    if (!order) return;
    setLoading(true);
    fetchOrderPayments(store.id, order.id)
      .then(setPay)
      .catch(() => setPay(null))
      .finally(() => setLoading(false));
  }, [store.id, order]);
  useEffect(() => {
    setPay(null);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.id]);

  if (!order) return <Drawer open={false} />;
  const o = order;
  const items = o.items ?? [];
  const subtotal =
    o.subtotal ||
    items.reduce((s, i) => s + i.unitPrice * i.quantity, 0) ||
    o.total;
  const paid = pay?.paid ?? o.paid ?? o.total;
  const debt = o.status === "completed" ? Math.max(0, o.total - paid) : 0;
  // Đơn cũ / đơn Mini App: số đã thu chưa có lần thu chi tiết → hiện 1 dòng "Thu khi tạo đơn"
  const recorded = (pay?.payments ?? []).reduce((s, p) => s + p.amount, 0);
  const payments = pay
    ? [
        ...(paid - recorded > 0
          ? [
              {
                id: "initial",
                amount: paid - recorded,
                method: o.paymentMethod ?? "cod",
                note: "Thu khi tạo đơn",
                createdAt: o.createdAt,
              },
            ]
          : []),
        ...pay.payments,
      ]
    : [];
  const src = ORDER_SOURCE[o.source ?? "miniapp"] ?? ORDER_SOURCE.miniapp;
  const status = statusOptions.find((s) => s.value === o.status);

  return (
    <Drawer
      open
      onClose={onClose}
      size={520}
      title={
        <div className="flex items-center gap-2">
          <Typography.Text
            copyable={{ text: o.code }}
            className="!font-mono !text-base !font-bold"
          >
            {o.code}
          </Typography.Text>
          <Tag color={src.color} className="!m-0">
            {src.label}
          </Tag>
        </div>
      }
      extra={
        <Select
          size="small"
          value={o.status}
          variant="borderless"
          popupMatchSelectWidth={false}
          onChange={(v) => onStatus(o.id, v)}
          labelRender={() => (
            <Tag color={status?.color} className="!m-0">
              {status?.label ?? o.status}
            </Tag>
          )}
          options={statusOptions.map((s) => ({
            value: s.value,
            label: <Tag color={s.color}>{s.label}</Tag>,
          }))}
        />
      }
      footer={
        <div className="flex items-center justify-between gap-2">
          <Button
            icon={<LuPrinter size={15} />}
            onClick={() => printReceipt(store, { ...o, paid })}
          >
            In hoá đơn
          </Button>
          {debt > 0 ? (
            <Button
              type="primary"
              danger
              icon={<LuCircleDollarSign size={15} />}
              onClick={() => setCollect(true)}
            >
              Thu tiền · {money(debt)}
            </Button>
          ) : (
            o.status === "completed" && (
              <Tag color="green" className="!m-0 !px-2 !py-1">
                Đã thu đủ {money(paid)}
              </Tag>
            )
          )}
        </div>
      }
    >
      <div data-ui="OrderDetailDrawer" className="space-y-4 text-sm">
        {/* Khách */}
        <div className="space-y-1 rounded-xl border border-slate-200 p-3 text-xs">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <LuUserRound size={14} className="text-slate-400" />{" "}
            {o.customerName}
          </div>
          {o.phone && (
            <div className="flex items-center gap-2 text-slate-600">
              <LuPhone size={13} className="text-slate-400" />{" "}
              <a href={`tel:${o.phone}`}>{o.phone}</a>
            </div>
          )}
          {o.address && (
            <div className="flex items-center gap-2 text-slate-600">
              <LuMapPin size={13} className="text-slate-400" /> {o.address}
            </div>
          )}
          {o.note && (
            <div className="flex items-start gap-2 text-slate-600">
              <LuStickyNote
                size={13}
                className="mt-0.5 shrink-0 text-slate-400"
              />{" "}
              {o.note}
            </div>
          )}
          <div className="text-slate-400">
            Tạo lúc {dayjs(o.createdAt).format("HH:mm DD/MM/YYYY")}
          </div>
        </div>

        {/* Sản phẩm */}
        <div>
          <div className="mb-1.5 text-xs font-semibold text-slate-700">
            Sản phẩm / dịch vụ ({items.reduce((n, i) => n + i.quantity, 0)})
          </div>
          <div className="space-y-1.5">
            {items.length ? (
              items.map((i, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2"
                >
                  {i.imageUrl ? (
                    <img
                      src={i.imageUrl}
                      alt=""
                      className="h-9 w-9 rounded-lg object-cover"
                    />
                  ) : (
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-slate-400">
                      <LuShoppingCart size={15} />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold text-slate-800">
                      {i.productName}
                    </div>
                    <div className="text-xs text-slate-500">
                      {money(i.unitPrice)} × {i.quantity}
                    </div>
                  </div>
                  <div className="font-bold tabular-nums text-slate-900">
                    {money(i.unitPrice * i.quantity)}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-slate-500">{o.itemsSummary || "—"}</div>
            )}
          </div>
        </div>

        {/* Tổng */}
        <div className="space-y-1 rounded-xl border border-slate-200 p-3 text-xs tabular-nums">
          <Line label="Tạm tính" value={money(subtotal)} />
          {!!o.shippingFee && (
            <Line label="Phí giao hàng" value={money(o.shippingFee)} />
          )}
          {!!o.discountAmount && (
            <Line
              label={o.voucherCode ? `Giảm giá (${o.voucherCode})` : "Giảm giá"}
              value={`−${money(o.discountAmount)}`}
              red
            />
          )}
          <div className="flex items-center justify-between border-t border-slate-100 pt-1.5 text-sm">
            <span className="font-bold">Tổng cộng</span>
            <span className="font-extrabold text-brand-600">
              {money(o.total)}
            </span>
          </div>
          <Line
            label="Hình thức"
            value={METHOD[o.paymentMethod ?? "cod"] ?? o.paymentMethod ?? "—"}
          />
          <Line label="Đã thu" value={money(paid)} />
          {debt > 0 && (
            <div className="flex items-center justify-between font-bold text-red-600">
              <span>Còn nợ</span>
              <span>{money(debt)}</span>
            </div>
          )}
        </div>

        {/* Lịch sử thu tiền */}
        <div>
          <div className="mb-1.5 text-xs font-semibold text-slate-700">
            Lịch sử thu tiền
          </div>
          {loading && !pay ? (
            <div className="flex justify-center py-4">
              <Spin size="small" />
            </div>
          ) : payments.length ? (
            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 text-xs">
              {payments.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-2 px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                      {p.method === "wallet" && (
                        <LuWallet size={13} className="text-emerald-600" />
                      )}
                      {METHOD[p.method] ?? p.method}
                      {p.note && (
                        <span className="truncate font-normal text-slate-500">
                          · {p.note}
                        </span>
                      )}
                    </div>
                    <div className="text-2xs text-slate-400">
                      {dayjs(p.createdAt).format("HH:mm DD/MM/YYYY")}
                    </div>
                  </div>
                  <b className="shrink-0 tabular-nums text-emerald-700">
                    +{money(p.amount)}
                  </b>
                </li>
              ))}
            </ul>
          ) : (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                o.source === "miniapp"
                  ? "Đơn Mini App — thanh toán theo hình thức khách chọn"
                  : "Chưa có lần thu tiền nào được ghi"
              }
            />
          )}
        </div>
      </div>

      <DebtCollectModal
        open={collect}
        storeId={store.id}
        title={`Thu tiền đơn ${o.code}`}
        max={debt}
        target={{ orderId: o.id }}
        customerId={o.customerId}
        qrStore={store}
        onClose={() => setCollect(false)}
        onDone={() => {
          setCollect(false);
          fetchOrderPayments(store.id, o.id)
            .then((r) => {
              setPay(r);
              onPaid(o.id, r.paid);
            })
            .catch(() => message.warning("Đã thu — tải lại để xem số mới"));
        }}
      />
    </Drawer>
  );
}

const Line = ({
  label,
  value,
  red,
}: {
  label: string;
  value: string;
  red?: boolean;
}) => (
  <div className="flex items-center justify-between">
    <span className="text-slate-500">{label}</span>
    <span
      className={`font-semibold ${red ? "text-rose-500" : "text-slate-800"}`}
    >
      {value}
    </span>
  </div>
);
