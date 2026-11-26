import { BadRequestException } from "@nestjs/common";
import { randomInt } from "crypto";

/**
 * Chuyển bản ghi DB của từng gian hàng sang đúng dạng web quản trị dùng
 * (ngày dạng YYYY-MM-DD, tổng tiền đơn = total...). Dùng chung cho chủ shop và khách của shop.
 */
const day = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : null);

export const serializeBooking = (b: {
  id: string;
  code: string;
  customerId: string | null;
  customerName: string;
  phone: string;
  serviceName: string;
  bookingDate: Date;
  timeSlot: string;
  staffName: string | null;
  status: string;
  note: string | null;
  treatmentId?: string | null;
  treatmentName?: string | null;
  treatmentSeq?: number | null;
  treatmentTotal?: number | null;
  result?: string | null;
  createdAt: Date;
}) => ({
  id: b.id,
  code: b.code,
  customerId: b.customerId,
  customerName: b.customerName,
  phone: b.phone,
  serviceName: b.serviceName,
  date: day(b.bookingDate),
  timeSlot: b.timeSlot,
  staffName: b.staffName ?? undefined,
  status: b.status,
  note: b.note ?? undefined,
  ...(b.treatmentId ? { treatmentId: b.treatmentId, treatmentName: b.treatmentName ?? undefined, treatmentSeq: b.treatmentSeq ?? undefined, treatmentTotal: b.treatmentTotal ?? undefined } : {}),
  ...(b.result ? { result: b.result } : {}),
  createdAt: b.createdAt.toISOString(),
});

export const serializeOrder = (o: {
  id: string;
  code: string;
  customerId: string | null;
  customerName: string;
  phone: string;
  address: string | null;
  totalAmount: number;
  subtotal?: number;
  shippingFee?: number;
  discountAmount?: number;
  voucherCode?: string | null;
  source?: string;
  status: string;
  paymentMethod: string;
  note: string | null;
  createdAt: Date;
  items?: { productId: string | null; productName: string; unitPrice: number; quantity: number; imageUrl: string | null }[];
}) => ({
  id: o.id,
  code: o.code,
  customerId: o.customerId,
  customerName: o.customerName,
  phone: o.phone,
  address: o.address ?? undefined,
  itemsSummary: (o.items ?? []).map((i) => `${i.productName} x${i.quantity}`).join(", "),
  items: o.items ?? [],
  total: o.totalAmount,
  subtotal: o.subtotal || o.totalAmount,
  shippingFee: o.shippingFee ?? 0,
  discountAmount: o.discountAmount ?? 0,
  voucherCode: o.voucherCode ?? undefined,
  source: o.source ?? "miniapp",
  status: o.status,
  paymentMethod: o.paymentMethod,
  note: o.note ?? undefined,
  createdAt: o.createdAt.toISOString(),
});

type WithDates = { startDate: Date; endDate: Date; createdAt?: Date; updatedAt?: Date };
const withDays = <T extends WithDates>({ createdAt: _c, ...r }: T) => ({ ...r, startDate: day(r.startDate), endDate: day(r.endDate) });

export const serializeEvent = withDays;
export const serializeVoucher = withDays;
export const serializeDocument = (d: { updatedAt: Date; createdAt?: Date; [k: string]: unknown }) => {
  const { createdAt: _c, ...rest } = d;
  return { ...rest, updatedAt: d.updatedAt.toISOString() };
};
export const serializeTier = (t: { createdAt?: Date; updatedAt?: Date; [k: string]: unknown }) => {
  const { createdAt: _c, updatedAt: _u, ...rest } = t;
  return rest;
};

/** Mã đơn / lịch hẹn: DH-2211-4821 */
/** Nhân sự: ngày dạng YYYY-MM-DD, danh sách Json luôn là mảng */
export const serializeStaff = (m: {
  startDate: Date | null;
  birthday: Date | null;
  workDays: unknown;
  services: unknown;
  createdAt: Date;
  updatedAt: Date;
  [k: string]: unknown;
}) => {
  const { createdAt, updatedAt: _u, ...rest } = m;
  const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);
  return {
    ...rest,
    startDate: day(m.startDate),
    birthday: day(m.birthday),
    workDays: Array.isArray(m.workDays) ? m.workDays : [],
    services: Array.isArray(m.services) ? m.services : [],
    createdAt: createdAt.toISOString(),
  };
};

export const makeCode = (prefix: string) => {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${prefix}-${dd}${mm}-${randomInt(1000, 9999)}${randomInt(10, 99)}`;
};

/** Bảng chữ cho mã in thẻ: bỏ 0/O, 1/I/L để khách đọc không nhầm */
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const randomVoucherCode = (prefix: string, length: number) => {
  let out = "";
  for (let i = 0; i < length; i++) out += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return prefix + out;
};

// ───────────────────────── Kiểm tra dữ liệu gửi lên ─────────────────────────

type FieldType = "string" | "text" | "int" | "float" | "bool" | "date" | "strings" | "ints" | { oneOf: readonly string[] };
export type FieldSpec = Record<string, FieldType>;

/**
 * Chỉ giữ các trường cho phép và ép đúng kiểu. Trường thiếu được bỏ qua (dùng được cho cả tạo & sửa);
 * `required` kiểm tra khi tạo mới.
 */
export function pickFields(body: unknown, spec: FieldSpec, required: string[] = []) {
  if (!body || typeof body !== "object") throw new BadRequestException("Dữ liệu không hợp lệ");
  const src = body as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [key, type] of Object.entries(spec)) {
    if (!(key in src) || src[key] === undefined) continue;
    const v = src[key];
    if (v === null) {
      out[key] = null;
      continue;
    }
    if (type === "string" || type === "text") {
      const s = String(v).trim();
      if (s.length > (type === "text" ? 20000 : 300)) throw new BadRequestException(`${key} quá dài`);
      out[key] = s;
    } else if (type === "int" || type === "float") {
      const n = Number(v);
      if (!Number.isFinite(n) || n < 0 || n > 1e12) throw new BadRequestException(`${key} phải là số hợp lệ`);
      out[key] = type === "int" ? Math.round(n) : n;
    } else if (type === "strings" || type === "ints") {
      // Danh sách ngắn lưu dạng Json (VD dịch vụ nhân viên làm được, ngày làm trong tuần)
      if (!Array.isArray(v) || v.length > 100) throw new BadRequestException(`${key} phải là danh sách`);
      if (type === "strings") {
        out[key] = [...new Set(v.map((x) => String(x).trim().slice(0, 140)).filter(Boolean))];
      } else {
        const nums = v.map(Number);
        if (nums.some((n) => !Number.isInteger(n) || n < 0 || n > 6)) throw new BadRequestException(`${key} không hợp lệ`);
        out[key] = [...new Set(nums)].sort();
      }
    } else if (type === "bool") {
      out[key] = v === true || v === "true";
    } else if (type === "date") {
      const d = new Date(String(v));
      if (Number.isNaN(d.getTime())) throw new BadRequestException(`${key} không phải ngày hợp lệ`);
      out[key] = d;
    } else if (!type.oneOf.includes(String(v))) {
      throw new BadRequestException(`${key} không hợp lệ`);
    } else {
      out[key] = String(v);
    }
  }
  for (const k of required) {
    if (out[k] === undefined || out[k] === null || out[k] === "") throw new BadRequestException(`Thiếu ${k}`);
  }
  return out;
}

export const BOOKING_STATUS = ["pending", "confirmed", "completed", "cancelled"] as const;
export const ORDER_STATUS = ["pending", "confirmed", "shipping", "completed", "cancelled"] as const;
export const PAYMENT_METHODS = ["cod", "cash", "bank_transfer", "card", "ewallet"] as const;
export const STAFF_STATUS = ["active", "leave", "quit"] as const;
export const EMPLOYMENT_TYPES = ["full_time", "part_time", "probation", "freelance"] as const;

export const SPECS = {
  bookings: {
    customerName: "string",
    phone: "string",
    serviceName: "string",
    date: "date",
    timeSlot: "string",
    staffName: "string",
    status: { oneOf: BOOKING_STATUS },
    note: "string",
    // Liệu trình (web quản trị tạo nhiều buổi cùng treatmentId)
    treatmentId: "string",
    treatmentName: "string",
    treatmentSeq: "int",
    treatmentTotal: "int",
    result: "text",
  },
  events: {
    title: "string",
    type: { oneOf: ["promotion", "flash_sale", "checkin", "workshop"] },
    bannerUrl: "string",
    startDate: "date",
    endDate: "date",
    status: { oneOf: ["upcoming", "running", "ended"] },
    participants: "int",
    description: "text",
  },
  documents: {
    slug: "string",
    title: "string",
    category: { oneOf: ["warranty", "return", "payment", "terms", "privacy", "notice", "guide"] },
    content: "text",
    published: "bool",
    sortOrder: "int",
  },
  memberTiers: {
    code: "string",
    name: "string",
    minSpent: "int",
    minPoints: "int",
    discountPercent: "int",
    pointMultiplier: "float",
    color: "string",
    benefits: "text",
    sortOrder: "int",
  },
  vouchers: {
    code: "string",
    title: "string",
    discountType: { oneOf: ["percent", "fixed", "freeship"] },
    discountValue: "int",
    minOrderValue: "int",
    maxDiscount: "int",
    tierCode: "string",
    quantity: "int",
    usedCount: "int",
    startDate: "date",
    endDate: "date",
    active: "bool",
  },
  staff: {
    code: "string",
    attendanceCode: "string",
    name: "string",
    phone: "string",
    email: "string",
    position: "string",
    department: "string",
    avatarUrl: "string",
    status: { oneOf: STAFF_STATUS },
    employmentType: { oneOf: EMPLOYMENT_TYPES },
    startDate: "date",
    birthday: "date",
    baseSalary: "int",
    commissionPercent: "float",
    workDays: "ints",
    shiftStart: "string",
    shiftEnd: "string",
    services: "strings",
    note: "text",
    sortOrder: "int",
    loginEmail: "string",
    adminSections: "strings",
  },
  orders: {
    status: { oneOf: ORDER_STATUS },
    note: "string",
    address: "string",
    paymentMethod: { oneOf: PAYMENT_METHODS },
  },
} satisfies Record<string, FieldSpec>;

/** Hạng mặc định tạo sẵn khi mở store mới (chủ shop sửa được ở "Hạng & Voucher"). */
export const DEFAULT_TIERS = [
  { code: "member", name: "Thành viên", minSpent: 0, minPoints: 0, discountPercent: 0, pointMultiplier: 1, color: "#64748b", sortOrder: 0 },
  { code: "silver", name: "Bạc", minSpent: 2_000_000, minPoints: 200, discountPercent: 3, pointMultiplier: 1.2, color: "#94a3b8", sortOrder: 1 },
  { code: "gold", name: "Vàng", minSpent: 5_000_000, minPoints: 500, discountPercent: 5, pointMultiplier: 1.5, color: "#f59e0b", sortOrder: 2 },
  { code: "diamond", name: "Kim Cương", minSpent: 15_000_000, minPoints: 1500, discountPercent: 10, pointMultiplier: 2, color: "#7c3aed", sortOrder: 3 },
];
