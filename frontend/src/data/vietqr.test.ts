import { describe, expect, it } from "vitest";
import { buildVietQr, crc16, toAscii } from "./vietqr";

describe("vietqr", () => {
  it("crc16 CCITT-FALSE", () => {
    expect(crc16("123456789")).toBe("29B1");
  });

  it("mã động có số tiền + nội dung, CRC khớp", () => {
    const s = buildVietQr(
      { bin: "970436", accountNo: "0123456789" },
      150000,
      "Thanh toán ĐH123",
    );
    expect(s.startsWith("000201010212")).toBe(true);
    expect(s).toContain("0010A000000727");
    expect(s).toContain("0006970436");
    expect(s).toContain("01100123456789");
    expect(s).toContain("5406150000");
    expect(s).toContain("0816Thanh toan DH123");
    expect(s.slice(-4)).toBe(crc16(s.slice(0, -4)));
  });

  it("không có số tiền → mã tĩnh", () => {
    const s = buildVietQr({ bin: "970422", accountNo: "999" });
    expect(s.slice(0, 12)).toBe("000201010211");
    expect(s).not.toContain("5406");
  });

  it("bỏ dấu", () => {
    expect(toAscii("Nguyễn Văn Đức!")).toBe("Nguyen Van Duc");
  });
});
