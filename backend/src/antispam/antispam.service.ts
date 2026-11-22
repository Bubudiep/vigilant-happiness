import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { PrismaService } from "../prisma/prisma.service";

export interface SpamCheckInput {
  /** Tên route để thống kê, VD "leads.create" */
  route: string;
  ip?: string;
  phone?: string;
  userId?: string;
  /** Người dùng đã đăng nhập Zalo (SĐT đã xác minh) → tin cậy hơn */
  trusted?: boolean;
  name?: string;
  /** Các trường văn bản tự do (ghi chú, nội dung ticket...) */
  texts?: (string | undefined | null)[];
  /** Ô "bẫy" ẩn trên form — người thật không bao giờ điền */
  honeypot?: string;
  /** Token lấy từ GET /antispam/form-token khi mở form */
  formToken?: string;
  /** Route không có form người dùng (VD dữ liệu demo) → không đòi form token */
  skipFormToken?: boolean;
}

export interface SpamVerdict {
  action: "allow" | "flag" | "block";
  score: number;
  reasons: string[];
  /** true = chặn âm thầm (honeypot): trả về "thành công" giả để bot không biết */
  silent?: boolean;
}

const DEFAULT_KEYWORDS = [
  "casino", "cá cược", "ca cuoc", "nhà cái", "nha cai", "lô đề", "lo de", "xổ số", "tài xỉu", "tai xiu",
  "vay tiền", "vay tien", "giải ngân", "bốc bát họ", "crypto", "bitcoin", "forex", "sex", "18+",
  "kiếm tiền online", "việc nhẹ lương cao", "bit.ly", "t.me/", "tinyurl", "free money",
];
/** Đầu số di động Việt Nam hiện hành */
const VN_MOBILE = /^0(3[2-9]|5[2689]|7[06-9]|8[1-9]|9\d)\d{7}$/;
const URL_RE = /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|xyz|top|vip|info|io|me|cc|ru|cn|ly|gl|ee|ws)\b)/gi;

/** Có đoạn ≥ n chữ số liên tiếp tăng dần (123456), giảm dần (987654) hoặc lặp (000000)? */
export function hasDigitRun(digits: string, n: number): boolean {
  let up = 1;
  let down = 1;
  let same = 1;
  for (let i = 1; i < digits.length; i++) {
    const d = Number(digits[i]) - Number(digits[i - 1]);
    up = d === 1 ? up + 1 : 1;
    down = d === -1 ? down + 1 : 1;
    same = d === 0 ? same + 1 : 1;
    if (up >= n || down >= n || same >= n) return true;
  }
  return false;
}

const FLAG_AT = 40;
const BLOCK_AT = 80;
const MIN_FILL_MS = 2500;
const MAX_TOKEN_AGE_MS = 2 * 3600 * 1000;

/**
 * Bộ chống spam nhiều lớp cho các form công khai (tư vấn, đặt lịch, ticket, dữ liệu demo):
 *  1. Danh sách chặn IP / SĐT / tài khoản (thủ công + tự động)
 *  2. Ô bẫy (honeypot) — điền vào là bot
 *  3. Form token có chữ ký: phải mở form mới gửi được, gửi < 2,5 giây là bot, dùng lại token bị trừ điểm
 *  4. Kiểm tra SĐT (đầu số VN, số lặp), nội dung (link, từ khoá cờ bạc / vay tiền…)
 *  5. Tần suất theo SĐT (24h) và theo IP — IP bị chặn ≥ 5 lần/giờ tự vào danh sách chặn 24h
 * Người dùng đã đăng nhập Zalo được cộng độ tin cậy (giảm điểm).
 * Điểm ≥ 40: vẫn lưu nhưng đánh dấu nghi spam · ≥ 80: từ chối.
 */
@Injectable()
export class AntiSpamService {
  private readonly usedNonces = new Map<string, number>();
  private readonly keywords: string[];

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    const extra = (this.config.get<string>("SPAM_KEYWORDS") ?? "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    this.keywords = [...DEFAULT_KEYWORDS, ...extra];
  }

  private secret(): string {
    return this.config.get<string>("ANTISPAM_SECRET") || this.config.get<string>("JWT_SECRET") || "dev-antispam";
  }

  private sign(payload: string): string {
    return createHmac("sha256", this.secret()).update(payload).digest("base64url");
  }

  /** Token cấp khi mở form: `<issuedAt>.<nonce>.<chữ ký>` */
  issueFormToken() {
    const payload = `${Date.now()}.${randomBytes(9).toString("base64url")}`;
    return { token: `${payload}.${this.sign(payload)}`, minSeconds: MIN_FILL_MS / 1000 };
  }

  private checkFormToken(token: string | undefined, reasons: string[]): number {
    if (!token) {
      reasons.push("no_form_token");
      return 40;
    }
    const parts = token.split(".");
    if (parts.length !== 3) {
      reasons.push("bad_form_token");
      return 60;
    }
    const [ts, nonce, sig] = parts;
    const expected = Buffer.from(this.sign(`${ts}.${nonce}`));
    const given = Buffer.from(sig);
    if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
      reasons.push("bad_form_token");
      return 60;
    }
    const age = Date.now() - Number(ts);
    let score = 0;
    if (age < MIN_FILL_MS) {
      reasons.push("too_fast");
      score += 50;
    } else if (age > MAX_TOKEN_AGE_MS) {
      reasons.push("form_expired");
      score += 20;
    }
    const now = Date.now();
    if (this.usedNonces.has(nonce)) {
      reasons.push("token_reused");
      score += 30;
    }
    this.usedNonces.set(nonce, now);
    if (this.usedNonces.size > 20000) {
      for (const [k, t] of this.usedNonces) if (now - t > MAX_TOKEN_AGE_MS) this.usedNonces.delete(k);
    }
    return score;
  }

  private checkPhone(phone: string | undefined, reasons: string[]): number {
    if (!phone) return 0;
    let score = 0;
    if (!VN_MOBILE.test(phone)) {
      reasons.push("phone_prefix");
      score += 25;
    }
    if (hasDigitRun(phone.slice(1), 6)) {
      reasons.push("phone_pattern");
      score += 40;
    }
    return score;
  }

  private checkContent(name: string | undefined, texts: (string | undefined | null)[], reasons: string[]): number {
    let score = 0;
    if (name) {
      if (URL_RE.test(name)) {
        reasons.push("url_in_name");
        score += 60;
      }
      URL_RE.lastIndex = 0;
      if (/^\d+$/.test(name.replace(/\s/g, ""))) {
        reasons.push("numeric_name");
        score += 30;
      }
      if (name.length > 60) {
        reasons.push("long_name");
        score += 15;
      }
    }
    const all = [name, ...texts].filter(Boolean).join(" ").toLowerCase();
    const links = all.match(URL_RE)?.length ?? 0;
    URL_RE.lastIndex = 0;
    if (links >= 2) {
      reasons.push("many_links");
      score += 40;
    } else if (links === 1) {
      reasons.push("link");
      score += 10;
    }
    const hit = this.keywords.find((k) => all.includes(k));
    if (hit) {
      reasons.push(`keyword:${hit}`);
      score += 50;
      // Từ khoá spam kèm đường link là mẫu quảng cáo điển hình → đẩy lên mức từ chối
      if (links >= 1) {
        reasons.push("keyword_link");
        score += 30;
      }
    }
    // Lặp ký tự / chuỗi rác kiểu "aaaaaaaa", "asdasdasd"
    if (/(.)\1{9,}/.test(all) || /(\w{2,4})\1{4,}/.test(all)) {
      reasons.push("gibberish");
      score += 20;
    }
    return score;
  }

  private async checkBlocklist(input: SpamCheckInput, reasons: string[]): Promise<boolean> {
    const keys = [
      input.ip ? { kind: "ip", value: input.ip } : null,
      input.phone ? { kind: "phone", value: input.phone } : null,
      input.userId ? { kind: "user", value: input.userId } : null,
    ].filter(Boolean) as { kind: string; value: string }[];
    if (!keys.length) return false;
    const blocks = await this.prisma.spamBlock.findMany({ where: { OR: keys } });
    const active = blocks.filter((b) => !b.expiresAt || b.expiresAt.getTime() > Date.now());
    if (!active.length) return false;
    await this.prisma.spamBlock.updateMany({ where: { id: { in: active.map((b) => b.id) } }, data: { hits: { increment: 1 } } });
    reasons.push(...active.map((b) => `blocked_${b.kind}`));
    return true;
  }

  async check(input: SpamCheckInput): Promise<SpamVerdict> {
    const reasons: string[] = [];

    if (input.honeypot?.trim()) {
      reasons.push("honeypot");
      await this.log(input, "blocked", 100, reasons);
      return { action: "block", score: 100, reasons, silent: true };
    }

    if (await this.checkBlocklist(input, reasons)) {
      await this.log(input, "blocked", 100, reasons);
      return { action: "block", score: 100, reasons };
    }

    let score = 0;
    if (!input.trusted && !input.skipFormToken) score += this.checkFormToken(input.formToken, reasons);
    score += this.checkPhone(input.phone, reasons);
    score += this.checkContent(input.name, input.texts ?? [], reasons);

    if (input.phone) {
      const recent = await this.prisma.consultationLead.count({
        where: { phone: input.phone, createdAt: { gte: new Date(Date.now() - 24 * 3600 * 1000) } },
      });
      if (recent >= 3) {
        reasons.push(`phone_24h:${recent}`);
        score += 25 * (recent - 2);
      }
    }
    if (input.trusted) {
      reasons.push("zalo_verified");
      score -= 40;
    }
    score = Math.max(0, score);

    const action = score >= BLOCK_AT ? "block" : score >= FLAG_AT ? "flag" : "allow";
    if (action !== "allow") {
      await this.log(input, action === "block" ? "blocked" : "flagged", score, reasons);
      if (action === "block") await this.maybeAutoBlockIp(input.ip);
    }
    return { action, score, reasons };
  }

  /** Dùng trong controller: chặn thì ném lỗi chung chung (không gợi ý cho bot cách lách). */
  async enforce(input: SpamCheckInput): Promise<SpamVerdict> {
    const verdict = await this.check(input);
    if (verdict.action === "block" && !verdict.silent) {
      throw new BadRequestException("Yêu cầu chưa được gửi. Vui lòng thử lại sau hoặc gọi hotline để được hỗ trợ.");
    }
    return verdict;
  }

  private async maybeAutoBlockIp(ip?: string) {
    if (!ip) return;
    const count = await this.prisma.spamEvent.count({
      where: { ip, action: "blocked", createdAt: { gte: new Date(Date.now() - 3600 * 1000) } },
    });
    if (count < 5) return;
    await this.prisma.spamBlock.upsert({
      where: { kind_value: { kind: "ip", value: ip } },
      update: { expiresAt: new Date(Date.now() + 24 * 3600 * 1000), reason: `Tự động: ${count} lần bị chặn trong 1 giờ` },
      create: {
        kind: "ip",
        value: ip,
        source: "auto",
        reason: `Tự động: ${count} lần bị chặn trong 1 giờ`,
        expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
      },
    });
  }

  private async log(input: SpamCheckInput, action: "blocked" | "flagged", score: number, reasons: string[]) {
    const sample = [input.name, ...(input.texts ?? [])].filter(Boolean).join(" | ").slice(0, 300) || null;
    await this.prisma.spamEvent
      .create({
        data: { route: input.route, ip: input.ip, phone: input.phone, userId: input.userId, action, score, reasons, sample },
      })
      .catch(() => undefined);
  }

  // ───────── Quản trị ─────────

  listEvents(params: { action?: string; ip?: string; take?: number }) {
    return this.prisma.spamEvent.findMany({
      where: { ...(params.action ? { action: params.action } : {}), ...(params.ip ? { ip: params.ip } : {}) },
      orderBy: { createdAt: "desc" },
      take: Math.min(params.take ?? 200, 500),
    });
  }

  listBlocks() {
    return this.prisma.spamBlock.findMany({ orderBy: { createdAt: "desc" } });
  }

  addBlock(kind: string, value: string, reason: string, hours?: number) {
    const expiresAt = hours ? new Date(Date.now() + hours * 3600 * 1000) : null;
    return this.prisma.spamBlock.upsert({
      where: { kind_value: { kind, value } },
      update: { reason, expiresAt, source: "manual" },
      create: { kind, value, reason, expiresAt, source: "manual" },
    });
  }

  removeBlock(id: string) {
    return this.prisma.spamBlock.delete({ where: { id } });
  }

  async stats() {
    const since = new Date(Date.now() - 7 * 86400 * 1000);
    const [blocked, flagged, blocks] = await Promise.all([
      this.prisma.spamEvent.count({ where: { action: "blocked", createdAt: { gte: since } } }),
      this.prisma.spamEvent.count({ where: { action: "flagged", createdAt: { gte: since } } }),
      this.prisma.spamBlock.count(),
    ]);
    return { last7Days: { blocked, flagged }, activeBlocks: blocks };
  }
}

/**
 * IP của request. Dùng req.ip (Express tự đọc X-Forwarded-For khi bật TRUST_PROXY),
 * không tự đọc header để client không giả IP được khi chạy không có proxy phía trước.
 */
export function clientIp(req: { ip?: string }): string | undefined {
  return req.ip;
}
