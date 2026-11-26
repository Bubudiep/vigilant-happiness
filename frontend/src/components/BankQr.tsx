import { Button, Modal, QRCode, Spin, Typography } from "antd";
import { useEffect, useState } from "react";
import { LuCircleCheck, LuExpand, LuLandmark } from "react-icons/lu";
import { Link } from "react-router-dom";
import type { StoreConfig } from "../data/store-api";
import {
  createPaymentRequest,
  fetchPaymentRequest,
  type PaymentRequest,
} from "../data/tingee-api";
import { bankByBin, buildVietQr, hasBank, toAscii } from "../data/vietqr";

const money = (n: number) => `${Math.round(n).toLocaleString("vi-VN")}đ`;

export type QrStore = Pick<StoreConfig, "id" | "bankAccount" | "hasTingee">;

/**
 * Bật Tingee: tạo yêu cầu thanh toán (mã tham chiếu RMxxxxxx đưa vào nội dung CK) rồi hỏi trạng thái 3 giây/lần
 * cho tới khi Tingee báo tiền về. Số tiền / nội dung đổi → tạo mã mới.
 */
function usePaymentRequest(
  store: QrStore,
  amount: number,
  note: string,
  enabled: boolean,
) {
  const [req, setReq] = useState<PaymentRequest | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    setReq(null);
    setError(false);
    if (!enabled || amount <= 0) return;
    let alive = true;
    let poll: ReturnType<typeof setInterval> | undefined;
    const t = setTimeout(async () => {
      try {
        const r = await createPaymentRequest(store.id, { amount, note });
        if (!alive) return;
        setReq(r);
        poll = setInterval(async () => {
          try {
            const s = await fetchPaymentRequest(store.id, r.id);
            if (!alive) return;
            setReq(s);
            if (s.status === "paid") clearInterval(poll);
          } catch {
            /* mạng chập chờn — hỏi lại lần sau */
          }
        }, 3000);
      } catch {
        if (alive) setError(true);
      }
    }, 500);
    return () => {
      alive = false;
      clearTimeout(t);
      if (poll) clearInterval(poll);
    };
  }, [store.id, amount, note, enabled]);
  return { req, error };
}

/**
 * BankQrPanel — mã VietQR chuyển khoản tới tài khoản của gian hàng (hiện khi chọn hình thức Chuyển khoản).
 * Khách quét bằng app ngân hàng: số tiền và nội dung được điền sẵn. Có Tingee → tự báo "Đã nhận tiền".
 */
export function BankQrPanel({
  store,
  amount,
  info,
  size = 124,
  preview,
  onPaid,
}: {
  store: QrStore;
  amount: number;
  /** Nội dung chuyển khoản (tự bỏ dấu) — VD mã đơn / tên khách */
  info?: string;
  size?: number;
  /** Chỉ xem trước (Thiết lập) — không tạo yêu cầu thanh toán */
  preview?: boolean;
  /** Tingee báo đã nhận đủ tiền */
  onPaid?: (r: PaymentRequest) => void;
}) {
  const [big, setBig] = useState(false);
  const bank = store.bankAccount;
  const baseNote = info ? toAscii(info) : "";
  const live = !preview && !!store.hasTingee && hasBank(bank);
  const { req, error } = usePaymentRequest(
    store,
    amount,
    baseNote.slice(0, 40),
    live,
  );
  const paid = req?.status === "paid";
  useEffect(() => {
    if (paid && req) onPaid?.(req);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paid]);

  if (!hasBank(bank)) {
    return (
      <div
        data-ui="BankQrPanel"
        className="flex items-start gap-2 rounded-lg border border-dashed border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800"
      >
        <LuLandmark size={15} className="mt-0.5 shrink-0" />
        <span>
          Chưa thiết lập tài khoản nhận chuyển khoản nên chưa có mã QR.{" "}
          <Link to="/admin/settings" className="font-semibold underline">
            Thiết lập ngân hàng
          </Link>
        </span>
      </div>
    );
  }
  // Có Tingee: nội dung bắt đầu bằng mã tham chiếu để khớp giao dịch
  const note = (live && req ? `${req.ref} ${baseNote}` : baseNote)
    .slice(0, 50)
    .trim();
  const value = buildVietQr(bank, amount, note);
  const waitingRef = live && !req && !error;
  const bankLabel = bankByBin(bank.bin)?.short ?? bank.bankName;

  const status = live && (
    <div data-ui="BankQrStatus" className="pt-1">
      {paid ? (
        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-xs font-semibold text-emerald-700">
          <LuCircleCheck size={13} /> Đã nhận {money(req!.paidAmount)}
        </span>
      ) : req?.status === "partial" ? (
        <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-xs font-semibold text-amber-700">
          Mới nhận {money(req.paidAmount)} / {money(req.amount)}
        </span>
      ) : error ? (
        <span className="text-xs text-red-600">
          Không tạo được mã đối soát — kiểm tra tiền về thủ công
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
          <Spin size="small" /> Đang chờ tiền về (Tingee)…
        </span>
      )}
    </div>
  );

  const details = (
    <div className="min-w-0 space-y-0.5 text-xs">
      <div className="font-semibold text-slate-900">{bankLabel}</div>
      <Typography.Text
        copyable={{ text: bank.accountNo }}
        className="!font-mono !text-sm !font-bold !text-slate-900"
      >
        {bank.accountNo}
      </Typography.Text>
      {bank.accountName && (
        <div className="truncate text-slate-600">{bank.accountName}</div>
      )}
      <div className="pt-1 text-slate-500">
        Số tiền{" "}
        <b className="tabular-nums text-brand-700">
          {amount > 0 ? money(amount) : "khách tự nhập"}
        </b>
      </div>
      {note && (
        <div className="text-slate-500">
          Nội dung <span className="font-mono text-slate-700">{note}</span>
        </div>
      )}
      {status}
    </div>
  );
  const qr = (s: number) => (
    <div className="relative">
      <QRCode
        value={value}
        size={s}
        bordered={false}
        className="!p-0"
        status={waitingRef ? "loading" : undefined}
      />
      {paid && (
        <div className="absolute inset-0 flex items-center justify-center rounded-md bg-white/85 text-emerald-600">
          <LuCircleCheck size={s / 3} />
        </div>
      )}
    </div>
  );
  return (
    <div
      data-ui="BankQrPanel"
      className={`flex items-center gap-3 rounded-lg border bg-white p-2 ${paid ? "border-emerald-300 ring-2 ring-emerald-100" : "border-slate-200"}`}
    >
      <button
        type="button"
        className="relative shrink-0 cursor-zoom-in rounded-md"
        onClick={() => setBig(true)}
        aria-label="Phóng to mã QR"
      >
        {qr(size)}
        {!paid && (
          <span className="absolute bottom-0 right-0 rounded-tl-md bg-white/90 p-0.5 text-slate-500">
            <LuExpand size={12} />
          </span>
        )}
      </button>
      <div className="min-w-0 flex-1">
        {details}
        {!paid && (
          <Button
            size="small"
            type="link"
            icon={<LuExpand size={12} />}
            className="!mt-1 !h-auto !px-0 !text-2xs"
            onClick={() => setBig(true)}
          >
            Phóng to cho khách quét
          </Button>
        )}
      </div>
      <Modal
        open={big}
        onCancel={() => setBig(false)}
        footer={null}
        width={360}
        centered
        title="Quét mã để chuyển khoản"
      >
        <div className="flex flex-col items-center gap-3 pb-1">
          {qr(280)}
          <div className="text-center text-2xl font-bold tabular-nums text-brand-700">
            {amount > 0 ? money(amount) : ""}
          </div>
          <div className="text-center">{details}</div>
        </div>
      </Modal>
    </div>
  );
}
