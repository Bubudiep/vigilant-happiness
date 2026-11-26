/** Tài khoản nhận chuyển khoản của gian hàng (lưu ở Store.bankAccount) — dùng tạo mã VietQR khi thu tiền */
export interface StoreBankAccount {
  /** Mã BIN ngân hàng theo NAPAS (6 chữ số) */
  bin: string;
  bankName: string;
  accountNo: string;
  /** Tên chủ tài khoản — in hoa, không dấu */
  accountName: string;
}

const strip = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");

/** Chuẩn hoá dữ liệu gửi lên; thiếu ngân hàng / số tài khoản → null (chưa thiết lập) */
export function readBankAccount(raw: unknown): StoreBankAccount | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const bin = String(r.bin ?? "").replace(/\D/g, "").slice(0, 6);
  const accountNo = String(r.accountNo ?? "").replace(/[^0-9A-Za-z]/g, "").slice(0, 19);
  if (bin.length !== 6 || !accountNo) return null;
  return {
    bin,
    bankName: String(r.bankName ?? "").trim().slice(0, 60),
    accountNo,
    accountName: strip(String(r.accountName ?? ""))
      .toUpperCase()
      .replace(/[^A-Z0-9 ]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 50),
  };
}
