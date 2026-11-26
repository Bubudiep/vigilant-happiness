/**
 * VietQR (chuẩn NAPAS 247 / EMVCo) — tạo nội dung mã QR chuyển khoản ngay trên máy,
 * không gọi dịch vụ ngoài. Mọi app ngân hàng Việt Nam quét được, tự điền số tiền + nội dung.
 */

/** Tài khoản nhận chuyển khoản của gian hàng (Store.bankAccount) */
export interface StoreBankAccount {
  /** Mã BIN ngân hàng (NAPAS, 6 chữ số) */
  bin: string;
  bankName: string;
  accountNo: string;
  /** Tên chủ tài khoản — in hoa, không dấu */
  accountName: string;
}

/** Ngân hàng phổ biến: tên ngắn, tên đầy đủ, mã BIN NAPAS */
export const BANKS: { bin: string; short: string; name: string }[] = [
  {
    bin: "970436",
    short: "Vietcombank",
    name: "Ngân hàng TMCP Ngoại thương Việt Nam",
  },
  {
    bin: "970415",
    short: "VietinBank",
    name: "Ngân hàng TMCP Công thương Việt Nam",
  },
  {
    bin: "970418",
    short: "BIDV",
    name: "Ngân hàng TMCP Đầu tư và Phát triển Việt Nam",
  },
  {
    bin: "970405",
    short: "Agribank",
    name: "Ngân hàng Nông nghiệp và Phát triển Nông thôn",
  },
  {
    bin: "970407",
    short: "Techcombank",
    name: "Ngân hàng TMCP Kỹ thương Việt Nam",
  },
  { bin: "970422", short: "MB Bank", name: "Ngân hàng TMCP Quân đội" },
  { bin: "970416", short: "ACB", name: "Ngân hàng TMCP Á Châu" },
  {
    bin: "970432",
    short: "VPBank",
    name: "Ngân hàng TMCP Việt Nam Thịnh Vượng",
  },
  { bin: "970423", short: "TPBank", name: "Ngân hàng TMCP Tiên Phong" },
  {
    bin: "970403",
    short: "Sacombank",
    name: "Ngân hàng TMCP Sài Gòn Thương Tín",
  },
  { bin: "970437", short: "HDBank", name: "Ngân hàng TMCP Phát triển TP.HCM" },
  { bin: "970441", short: "VIB", name: "Ngân hàng TMCP Quốc tế Việt Nam" },
  { bin: "970443", short: "SHB", name: "Ngân hàng TMCP Sài Gòn – Hà Nội" },
  {
    bin: "970431",
    short: "Eximbank",
    name: "Ngân hàng TMCP Xuất Nhập khẩu Việt Nam",
  },
  { bin: "970426", short: "MSB", name: "Ngân hàng TMCP Hàng Hải" },
  { bin: "970448", short: "OCB", name: "Ngân hàng TMCP Phương Đông" },
  { bin: "970440", short: "SeABank", name: "Ngân hàng TMCP Đông Nam Á" },
  { bin: "970449", short: "LPBank", name: "Ngân hàng TMCP Lộc Phát Việt Nam" },
  { bin: "970428", short: "Nam A Bank", name: "Ngân hàng TMCP Nam Á" },
  { bin: "970409", short: "Bac A Bank", name: "Ngân hàng TMCP Bắc Á" },
  { bin: "970425", short: "ABBANK", name: "Ngân hàng TMCP An Bình" },
  {
    bin: "970433",
    short: "VietBank",
    name: "Ngân hàng TMCP Việt Nam Thương Tín",
  },
  { bin: "970454", short: "BVBank", name: "Ngân hàng TMCP Bản Việt" },
  { bin: "970452", short: "KienlongBank", name: "Ngân hàng TMCP Kiên Long" },
  {
    bin: "970412",
    short: "PVcomBank",
    name: "Ngân hàng TMCP Đại Chúng Việt Nam",
  },
  { bin: "970419", short: "NCB", name: "Ngân hàng TMCP Quốc Dân" },
  { bin: "970438", short: "BaoViet Bank", name: "Ngân hàng TMCP Bảo Việt" },
  {
    bin: "970430",
    short: "PGBank",
    name: "Ngân hàng TMCP Thịnh vượng và Phát triển",
  },
  { bin: "970427", short: "VietABank", name: "Ngân hàng TMCP Việt Á" },
  {
    bin: "970400",
    short: "Saigonbank",
    name: "Ngân hàng TMCP Sài Gòn Công Thương",
  },
  { bin: "970406", short: "DongA Bank", name: "Ngân hàng TMCP Đông Á" },
  { bin: "970429", short: "SCB", name: "Ngân hàng TMCP Sài Gòn" },
  {
    bin: "970408",
    short: "GPBank",
    name: "Ngân hàng TM TNHH MTV Dầu Khí Toàn Cầu",
  },
  { bin: "546034", short: "CAKE", name: "Ngân hàng số CAKE by VPBank" },
  { bin: "546035", short: "Ubank", name: "Ngân hàng số Ubank by VPBank" },
  {
    bin: "970424",
    short: "Shinhan Bank",
    name: "Ngân hàng TNHH MTV Shinhan Việt Nam",
  },
  {
    bin: "970457",
    short: "Woori Bank",
    name: "Ngân hàng TNHH MTV Woori Việt Nam",
  },
  {
    bin: "970458",
    short: "UOB",
    name: "Ngân hàng United Overseas Bank Việt Nam",
  },
  {
    bin: "970410",
    short: "Standard Chartered",
    name: "Ngân hàng TNHH MTV Standard Chartered Việt Nam",
  },
  { bin: "458761", short: "HSBC", name: "Ngân hàng TNHH MTV HSBC Việt Nam" },
  {
    bin: "970439",
    short: "Public Bank",
    name: "Ngân hàng TNHH MTV Public Việt Nam",
  },
  { bin: "422589", short: "CIMB", name: "Ngân hàng TNHH MTV CIMB Việt Nam" },
];

export const bankByBin = (bin?: string) => BANKS.find((b) => b.bin === bin);

/** Bỏ dấu tiếng Việt, chỉ giữ chữ / số / khoảng trắng (nội dung chuyển khoản, tên chủ TK) */
export function toAscii(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^A-Za-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF) — trường 63 của EMVCo */
export function crc16(s: string): string {
  let crc = 0xffff;
  for (let i = 0; i < s.length; i++) {
    crc ^= s.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++)
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

const tlv = (id: string, value: string) =>
  `${id}${String(value.length).padStart(2, "0")}${value}`;

/**
 * Nội dung mã VietQR chuyển khoản tới tài khoản.
 * amount > 0 → mã động (app ngân hàng điền sẵn số tiền); info: nội dung chuyển khoản (≤ 50 ký tự, không dấu).
 */
export function buildVietQr(
  acc: Pick<StoreBankAccount, "bin" | "accountNo">,
  amount?: number,
  info?: string,
): string {
  const merchant =
    tlv("00", "A000000727") +
    tlv("01", tlv("00", acc.bin) + tlv("01", acc.accountNo)) +
    tlv("02", "QRIBFTTA");
  const amt = amount && amount > 0 ? Math.round(amount) : 0;
  const note = info ? toAscii(info).slice(0, 50) : "";
  const body =
    tlv("00", "01") +
    tlv("01", amt ? "12" : "11") +
    tlv("38", merchant) +
    tlv("53", "704") +
    (amt ? tlv("54", String(amt)) : "") +
    tlv("58", "VN") +
    (note ? tlv("62", tlv("08", note)) : "") +
    "6304";
  return body + crc16(body);
}

/** Đã thiết lập đủ để tạo mã */
export const hasBank = (
  acc?: StoreBankAccount | null,
): acc is StoreBankAccount => !!acc?.bin && !!acc.accountNo;
