import {
  App as AntApp,
  Button,
  Empty,
  Input,
  InputNumber,
  Modal,
  Segmented,
  Spin,
  Tag,
} from "antd";
import dayjs from "dayjs";
import { useCallback, useEffect, useState } from "react";
import {
  LuArrowDownLeft,
  LuArrowUpRight,
  LuPlus,
  LuSlidersHorizontal,
  LuUndo2,
  LuWallet,
} from "react-icons/lu";
import { ApiError } from "../data/platform-api";
import type {
  PaymentMethod,
  StoreConfig,
  StoreCustomerItem,
} from "../data/store-api";
import {
  adjustWallet,
  fetchWallet,
  WALLET_KIND,
  type WalletTxn,
} from "../data/wallet-api";
import { BankQrPanel } from "./BankQr";

const money = (n: number) => `${Math.round(n).toLocaleString("vi-VN")}đ`;
const errText = (e: unknown, fb: string) =>
  e instanceof ApiError ? e.message : fb;
const METHOD_LABEL: Record<string, string> = {
  cash: "Tiền mặt",
  bank_transfer: "Chuyển khoản",
  card: "Thẻ",
  ewallet: "Ví điện tử",
  wallet: "Ví khách",
};

type AdjustKind = "topup" | "refund" | "adjust";
const KIND_INFO: Record<
  AdjustKind,
  { title: string; hint: string; reasons: string[] }
> = {
  topup: {
    title: "Nạp tiền vào ví",
    hint: "Khách đưa tiền trước để trừ dần vào các lần sau.",
    reasons: [
      "Khách nạp trước tiền dịch vụ",
      "Khách đặt cọc cho lịch hẹn",
      "Khách gửi lại tiền thối",
    ],
  },
  refund: {
    title: "Hoàn tiền cho khách",
    hint: "Quán trả lại tiền trong ví cho khách (tiền mặt / chuyển khoản).",
    reasons: [
      "Trả lại tiền thừa cho khách",
      "Khách rút tiền trong ví",
      "Khách huỷ dịch vụ đã nạp trước",
    ],
  },
  adjust: {
    title: "Điều chỉnh số dư",
    hint: "Sửa sai hoặc bù cho khách — không có tiền thật ra / vào quỹ.",
    reasons: [
      "Sửa sai số dư do nhập nhầm",
      "Bù cho khách vì dịch vụ chưa đạt",
      "Quà tặng khách thân thiết",
    ],
  },
};

/** Nạp / hoàn tiền / điều chỉnh ví — bắt buộc lý do, xem trước số dư sau khi đổi */
function WalletAdjustModal({
  open,
  store,
  customer,
  balance,
  initialKind,
  onClose,
  onDone,
}: {
  open: boolean;
  store: StoreConfig;
  customer: StoreCustomerItem;
  balance: number;
  initialKind: AdjustKind;
  onClose: () => void;
  onDone: (balance: number) => void;
}) {
  const { message } = AntApp.useApp();
  const [kind, setKind] = useState<AdjustKind>(initialKind);
  const [amount, setAmount] = useState<number>(0);
  const [minus, setMinus] = useState(false);
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open) return;
    setKind(initialKind);
    setAmount(initialKind === "refund" ? balance : 0);
    setMinus(false);
    setMethod("cash");
    setReason("");
  }, [open, initialKind, balance]);

  const delta =
    kind === "topup"
      ? amount
      : kind === "refund"
        ? -amount
        : minus
          ? -amount
          : amount;
  const after = balance + delta;
  const info = KIND_INFO[kind];
  const reasonOk = reason.trim().length >= 5;
  const invalid = !amount || after < 0 || !reasonOk;

  const submit = async () => {
    setBusy(true);
    try {
      const r = await adjustWallet(store.id, customer.id, {
        kind,
        amount: kind === "adjust" ? delta : amount,
        reason: reason.trim(),
        ...(kind !== "adjust" ? { paymentMethod: method } : {}),
      });
      message.success(
        `${info.title}: ${delta > 0 ? "+" : "−"}${money(Math.abs(delta))} · số dư ${money(r.balance)}`,
      );
      onDone(r.balance);
    } catch (e) {
      message.error(errText(e, "Không lưu được giao dịch ví"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={`Ví của ${customer.name}`}
      okText={info.title}
      onOk={submit}
      okButtonProps={{ loading: busy, disabled: invalid, danger: delta < 0 }}
      cancelText="Huỷ"
      destroyOnHidden
      width={460}
    >
      <div data-ui="WalletAdjustModal" className="space-y-3 text-xs">
        <Segmented
          block
          value={kind}
          onChange={(v) => {
            setKind(v as AdjustKind);
            setReason("");
            if (v === "refund") setAmount(balance);
          }}
          options={[
            { value: "topup", label: "Nạp tiền" },
            { value: "refund", label: "Hoàn tiền", disabled: balance <= 0 },
            { value: "adjust", label: "Điều chỉnh" },
          ]}
        />
        <div className="text-slate-500">{info.hint}</div>
        <div className="flex items-center gap-2">
          <span className="w-20 shrink-0 text-slate-500">Số tiền</span>
          {kind === "adjust" && (
            <Segmented
              size="small"
              value={minus ? "minus" : "plus"}
              onChange={(v) => setMinus(v === "minus")}
              options={[
                { value: "plus", label: "Cộng" },
                { value: "minus", label: "Trừ" },
              ]}
            />
          )}
          <InputNumber
            min={0}
            max={kind === "refund" || minus ? balance : 1_000_000_000}
            step={50000}
            value={amount}
            onChange={(v) => setAmount(Number(v) || 0)}
            className="!w-40"
            suffix="đ"
            autoFocus
          />
          {kind === "refund" && (
            <Button
              size="small"
              type="link"
              className="!px-0"
              onClick={() => setAmount(balance)}
            >
              Hoàn hết
            </Button>
          )}
        </div>
        {kind !== "adjust" && (
          <div className="flex items-center gap-2">
            <span className="w-20 shrink-0 text-slate-500">
              {kind === "topup" ? "Khách trả bằng" : "Trả khách bằng"}
            </span>
            <Segmented
              size="small"
              value={method}
              onChange={(v) => setMethod(v as PaymentMethod)}
              options={[
                { value: "cash", label: "Tiền mặt" },
                { value: "bank_transfer", label: "Chuyển khoản" },
                { value: "card", label: "Thẻ" },
                { value: "ewallet", label: "Ví điện tử" },
              ]}
            />
          </div>
        )}
        {kind === "topup" && method === "bank_transfer" && amount > 0 && (
          <BankQrPanel
            store={store}
            amount={amount}
            info={`Nap vi ${customer.phone || customer.name}`}
            size={108}
          />
        )}
        <div>
          <div className="mb-1 text-slate-500">
            Lý do <span className="text-red-500">*</span>
          </div>
          <Input.TextArea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            autoSize={{ minRows: 2, maxRows: 4 }}
            maxLength={300}
            showCount
            placeholder="Ghi rõ vì sao đổi số dư — VD: Khách nạp trước 10 buổi gội đầu"
            status={reason && !reasonOk ? "error" : undefined}
          />
          <div className="mt-1.5 flex flex-wrap gap-1">
            {info.reasons.map((r) => (
              <Tag
                key={r}
                className="!m-0 cursor-pointer"
                onClick={() => setReason(r)}
              >
                {r}
              </Tag>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 tabular-nums">
          <span className="text-slate-500">
            Số dư hiện tại <b className="text-slate-800">{money(balance)}</b>
          </span>
          <span
            className={after < 0 ? "font-bold text-red-600" : "text-slate-500"}
          >
            Sau khi đổi{" "}
            <b className={delta >= 0 ? "text-emerald-700" : "text-red-600"}>
              {money(after)}
            </b>
          </span>
        </div>
      </div>
    </Modal>
  );
}

/** Một dòng lịch sử ví */
function TxnRow({ t }: { t: WalletTxn }) {
  const kind = WALLET_KIND[t.kind] ?? { label: t.kind, color: "default" };
  const inflow = t.amount > 0;
  return (
    <li className="flex gap-2.5 py-2.5">
      <span
        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${inflow ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}
      >
        {inflow ? <LuArrowDownLeft size={15} /> : <LuArrowUpRight size={15} />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Tag color={kind.color} className="!mr-1.5 !text-2xs">
              {kind.label}
            </Tag>
            <span className="text-xs text-slate-800">{t.reason}</span>
          </div>
          <b
            className={`shrink-0 text-sm tabular-nums ${inflow ? "text-emerald-700" : "text-rose-600"}`}
          >
            {inflow ? "+" : "−"}
            {money(Math.abs(t.amount))}
          </b>
        </div>
        <div className="mt-0.5 flex flex-wrap items-center justify-between gap-x-2 text-2xs text-slate-400">
          <span>
            {dayjs(t.createdAt).format("HH:mm DD/MM/YYYY")}
            {t.orderCode && (
              <>
                {" · "}
                <span className="font-mono">{t.orderCode}</span>
              </>
            )}
            {t.method && ` · ${METHOD_LABEL[t.method] ?? t.method}`}
            {t.createdBy && ` · ${t.createdBy}`}
          </span>
          <span className="tabular-nums">Số dư {money(t.balanceAfter)}</span>
        </div>
      </div>
    </li>
  );
}

/** WalletPanel — tab "Ví" trong hồ sơ khách: số dư, nạp / hoàn / điều chỉnh, lịch sử */
export function WalletPanel({
  store,
  customer,
  onBalance,
}: {
  store: StoreConfig;
  customer: StoreCustomerItem;
  /** Số dư mới → cập nhật danh sách khách trên giao diện */
  onBalance?: (balance: number) => void;
}) {
  const [data, setData] = useState<{
    balance: number;
    txns: WalletTxn[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adjust, setAdjust] = useState<AdjustKind | null>(null);
  const load = useCallback(() => {
    setError(null);
    fetchWallet(store.id, customer.id)
      .then((d) => {
        setData(d);
        if (d.balance !== (customer.walletBalance ?? 0)) onBalance?.(d.balance);
      })
      .catch((e) => setError(errText(e, "Không tải được ví")));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.id, customer.id]);
  useEffect(load, [load]);

  if (error)
    return <div className="py-6 text-center text-xs text-red-600">{error}</div>;
  if (!data)
    return (
      <div className="flex justify-center py-8">
        <Spin />
      </div>
    );
  const totalIn = data.txns
    .filter((t) => t.amount > 0)
    .reduce((s, t) => s + t.amount, 0);
  const totalOut = data.txns
    .filter((t) => t.amount < 0)
    .reduce((s, t) => s - t.amount, 0);
  return (
    <div data-ui="WalletPanel" className="space-y-3 pb-5">
      <div className="rounded-xl bg-gradient-to-br from-emerald-600 to-teal-500 p-4 text-white shadow-sm">
        <div className="flex items-center gap-1.5 text-xs opacity-90">
          <LuWallet size={14} /> Số dư ví · quán đang giữ của khách
        </div>
        <div className="mt-1 text-2xl font-extrabold tabular-nums">
          {money(data.balance)}
        </div>
        <div className="mt-1 text-2xs opacity-80">
          Tổng vào {money(totalIn)} · tổng ra {money(totalOut)}
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Button
            size="small"
            icon={<LuPlus size={13} />}
            onClick={() => setAdjust("topup")}
          >
            Nạp tiền
          </Button>
          <Button
            size="small"
            icon={<LuUndo2 size={13} />}
            disabled={data.balance <= 0}
            onClick={() => setAdjust("refund")}
          >
            Hoàn tiền
          </Button>
          <Button
            size="small"
            icon={<LuSlidersHorizontal size={13} />}
            onClick={() => setAdjust("adjust")}
          >
            Điều chỉnh
          </Button>
        </div>
      </div>
      <div className="text-2xs text-slate-500">
        Tiền vào ví khi khách trả thừa (chọn “Cộng vào ví” lúc thu tiền) hoặc
        nạp trước; dùng bằng ô “Trừ ví” trong bill thu tiền / thu nợ.
      </div>
      <div>
        <div className="mb-1 text-xs font-semibold text-slate-700">
          Lịch sử ví
        </div>
        {data.txns.length ? (
          <ul className="divide-y divide-slate-100">
            {data.txns.map((t) => (
              <TxnRow key={t.id} t={t} />
            ))}
          </ul>
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Chưa có giao dịch ví"
          />
        )}
      </div>
      <WalletAdjustModal
        open={!!adjust}
        store={store}
        customer={customer}
        balance={data.balance}
        initialKind={adjust ?? "topup"}
        onClose={() => setAdjust(null)}
        onDone={(b) => {
          setAdjust(null);
          onBalance?.(b);
          load();
        }}
      />
    </div>
  );
}

/** Số dư ví của khách (tải mới mỗi lần mở bill) — null khi khách lẻ */
export function useWalletBalance(
  storeId: string,
  customerId: string | null | undefined,
  open: boolean,
) {
  const [balance, setBalance] = useState<number | null>(null);
  useEffect(() => {
    setBalance(null);
    if (!open || !customerId) return;
    let alive = true;
    fetchWallet(storeId, customerId)
      .then((d) => alive && setBalance(d.balance))
      .catch(() => alive && setBalance(null));
    return () => {
      alive = false;
    };
  }, [storeId, customerId, open]);
  return balance;
}
