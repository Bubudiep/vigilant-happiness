import { describe, expect, it } from "vitest";
import { auditActionLabel } from "../data/audit-labels";
import { fmtQuotaMb } from "../data/format";

describe("fmtQuotaMb", () => {
  it("MB / GB / không giới hạn", () => {
    expect(fmtQuotaMb(500)).toBe("500 MB");
    expect(fmtQuotaMb(1024)).toBe("1 GB");
    expect(fmtQuotaMb(1536)).toBe("1.5 GB");
    expect(fmtQuotaMb(null)).toBe("không giới hạn");
    expect(fmtQuotaMb(undefined)).toBe("không giới hạn");
  });
});

describe("auditActionLabel", () => {
  it("action mới có nhãn tiếng Việt", () => {
    expect(auditActionLabel("customer.staff.add")).toBe("Thêm nhân sự khách");
    expect(auditActionLabel("store.delete")).toBe("Xoá gian hàng");
    expect(auditActionLabel("plan_voucher.update")).toBe("Sửa voucher gói");
  });
  it("plan.storage_quota hiện tên gói và A → B (null = không giới hạn)", () => {
    expect(auditActionLabel("plan.storage_quota", { name: "Pro", fromMb: 1024, toMb: 5120 })).toBe("Đổi hạn mức gói Pro: 1 GB → 5 GB");
    expect(auditActionLabel("plan.storage_quota", { name: "Pro", fromMb: 500, toMb: null })).toBe("Đổi hạn mức gói Pro: 500 MB → không giới hạn");
    expect(auditActionLabel("plan.storage_quota", { name: "Pro", fromMb: null, toMb: 100 })).toBe("Đổi hạn mức gói Pro: không giới hạn → 100 MB");
  });
  it("thiếu meta vẫn không lỗi; action lạ giữ mã gốc", () => {
    expect(auditActionLabel("plan.storage_quota")).toBe("Đổi hạn mức dung lượng gói");
    expect(auditActionLabel("foo.bar")).toBe("foo.bar");
  });
});
