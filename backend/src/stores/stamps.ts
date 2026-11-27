import { BadRequestException } from "@nestjs/common";

/** Thẻ tích tem của gian hàng (lưu ở Store.stampProgram) */
export interface StampProgram {
  enabled: boolean;
  /** Số tem cần để đổi 1 quà (2–50) */
  required: number;
  /** Sản phẩm / dịch vụ được tính tem — rỗng = mọi mặt hàng */
  productIds: string[];
  /** item = mỗi món (theo số lượng) 1 tem | order = mỗi đơn có món áp dụng 1 tem */
  countBy: "item" | "order";
  /** Phần quà khi đủ tem, VD "Tặng 1 ly bất kỳ" */
  reward: string;
  /** Biểu tượng tem trên Mini App */
  icon: string;
}

/** Giữ khớp với STAMP_ICON_GROUPS ở frontend/src/miniapp-builder/icons.tsx */
export const STAMP_ICONS = ["flower", "flower2", "lotus", "tulip", "blossom", "leaf", "clover", "sprout", "potted", "cactus", "tree", "pine", "palm", "butterfly", "sun", "moon", "snow", "rainbow", "droplet", "feather", "shell", "coffee", "cup", "beer", "wine", "cocktail", "icecream", "cake", "cookie", "croissant", "donut", "candy", "pizza", "sandwich", "soup", "food", "cherry", "apple", "citrus", "grape", "paw", "dog", "cat", "rabbit", "bird", "fish", "baby", "star", "heart", "gift", "crown", "sparkles", "gem", "scissors", "bath", "smile", "like", "check", "zap", "flame", "award", "trophy", "medal", "shirt", "dumbbell", "car", "bike", "music", "book", "game", "camera"] as const;

export const DEFAULT_STAMP_PROGRAM: StampProgram = {
  enabled: false,
  required: 10,
  productIds: [],
  countBy: "item",
  reward: "Tặng 1 phần quà",
  icon: "coffee",
};

export function readStampProgram(raw: unknown): StampProgram | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<StampProgram>;
  return {
    enabled: !!r.enabled,
    required: Math.min(50, Math.max(2, Math.round(Number(r.required) || 10))),
    productIds: Array.isArray(r.productIds) ? r.productIds.map(String).slice(0, 500) : [],
    countBy: r.countBy === "order" ? "order" : "item",
    reward: String(r.reward ?? DEFAULT_STAMP_PROGRAM.reward).slice(0, 120),
    icon: (STAMP_ICONS as readonly string[]).includes(String(r.icon)) ? String(r.icon) : "coffee",
  };
}

/** Kiểm tra dữ liệu chủ shop gửi lên */
export function parseStampProgram(body: unknown): StampProgram {
  if (!body || typeof body !== "object") throw new BadRequestException("Dữ liệu không hợp lệ");
  const b = body as Record<string, unknown>;
  const required = Number(b.required);
  if (!Number.isInteger(required) || required < 2 || required > 50) throw new BadRequestException("Số tem phải từ 2 đến 50");
  if (b.productIds !== undefined && !Array.isArray(b.productIds)) throw new BadRequestException("Danh sách sản phẩm không hợp lệ");
  const reward = String(b.reward ?? "").trim();
  if (!reward) throw new BadRequestException("Nhập phần quà khi đủ tem");
  return readStampProgram({ ...b, reward })!;
}

/** Số tem một đơn mang lại theo chương trình */
export function stampsForOrder(program: StampProgram | null, items: { productId: string | null; quantity: number }[]) {
  if (!program?.enabled) return 0;
  const all = program.productIds.length === 0;
  const hit = items.filter((i) => i.productId && (all || program.productIds.includes(i.productId)));
  if (!hit.length) return 0;
  return program.countBy === "order" ? 1 : hit.reduce((n, i) => n + Math.max(0, i.quantity), 0);
}
