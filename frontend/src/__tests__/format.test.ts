import { describe, expect, it } from "vitest";
import { fmtBytes } from "../data/format";

describe("fmtBytes", () => {
  it("byte nhỏ giữ nguyên", () => {
    expect(fmtBytes(0)).toBe("0 B");
    expect(fmtBytes(1023)).toBe("1023 B");
  });
  it("đổi đơn vị KB/MB/GB/TB", () => {
    expect(fmtBytes(1024)).toBe("1.0 KB");
    expect(fmtBytes(1536)).toBe("1.5 KB");
    expect(fmtBytes(5 * 1024 * 1024)).toBe("5.0 MB");
    expect(fmtBytes(2 * 1024 ** 3)).toBe("2.0 GB");
    expect(fmtBytes(3 * 1024 ** 4)).toBe("3.0 TB");
  });
  it("từ 100 trở lên bỏ số lẻ", () => {
    expect(fmtBytes(150 * 1024)).toBe("150 KB");
  });
  it("vượt TB vẫn dùng TB", () => {
    expect(fmtBytes(2048 * 1024 ** 4)).toBe("2048 TB");
  });
});
