import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { createHmac, randomInt, timingSafeEqual } from "crypto";
import type { AuthContext } from "../common/guards/app-auth.guard";
import { AuthService } from "../auth/auth.service";
import { openSecret, sealSecret } from "../common/secret-box";
import { PrismaService } from "../prisma/prisma.service";
import { StoresService } from "./stores.service";

/** Ký tự mã tham chiếu (bỏ 0/O/1/I dễ nhầm) */
const REF_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
/** Mã tham chiếu trong nội dung chuyển khoản: "RM" + 6 ký tự, VD RM7K2QX9 */
const REF_RE = /RM[A-HJ-NP-Z2-9]{6}/g;

const hmacHex = (algo: "sha256" | "sha512", key: string, msg: string) => createHmac(algo, key).update(msg).digest("hex");
const sameHex = (a: string, b: string) => {
  const x = Buffer.from(a, "hex");
  const y = Buffer.from(b, "hex");
  return x.length > 0 && x.length === y.length && timingSafeEqual(x, y);
};

/** yyyyMMddHHmmss (giờ VN) → Date */
function tingeeDate(s: unknown): Date | null {
  const m = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/.exec(String(s ?? ""));
  if (!m) return null;
  const d = new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}+07:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export type TingeeWebhookResult = { status: number; body: Record<string, unknown> };

/**
 * Tingee — dịch vụ báo biến động số dư: tiền về tài khoản của quán → Tingee gọi webhook (ký HMAC-SHA512)
 * → khớp mã tham chiếu trong nội dung CK với yêu cầu thanh toán → màn hình thu tiền hiện "Đã nhận tiền".
 * Tài liệu: developers.tingee.vn/docs/webhook
 */
@Injectable()
export class TingeeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stores: StoresService,
    private readonly auth: AuthService,
  ) {}

  private secretOf(enc: string | null) {
    return openSecret(enc, this.auth.getServerSecret()) ?? "";
  }

  // ───────────── Cấu hình (Thiết lập gian hàng) ─────────────

  async config(auth: AuthContext, storeId: string) {
    await this.stores.ensureSection(auth, storeId, "settings");
    const s = await this.prisma.store.findUniqueOrThrow({ where: { id: storeId }, select: { slug: true, tingeeClientId: true, tingeeSecretEnc: true } });
    const transactions = await this.prisma.storeBankTransaction.findMany({
      where: { storeId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, transactionCode: true, amount: true, content: true, bank: true, transactionDate: true, matchedRef: true, createdAt: true },
    });
    return {
      clientId: s.tingeeClientId ?? "",
      hasSecret: !!s.tingeeSecretEnc,
      webhookPath: `/api/tingee/webhook/${s.slug}`,
      transactions,
    };
  }

  async saveConfig(auth: AuthContext, storeId: string, body: { clientId?: string; secretToken?: string }) {
    await this.stores.ensureSection(auth, storeId, "settings");
    const secret = body.secretToken?.trim();
    await this.prisma.store.update({
      where: { id: storeId },
      data: {
        ...(body.clientId !== undefined ? { tingeeClientId: String(body.clientId).trim().slice(0, 100) || null } : {}),
        ...(body.secretToken !== undefined ? { tingeeSecretEnc: secret ? sealSecret(secret.slice(0, 500), this.auth.getServerSecret()) : null } : {}),
      },
    });
    return this.config(auth, storeId);
  }

  // ───────────── Yêu cầu thanh toán (màn hình thu tiền) ─────────────

  /** Tạo mã tham chiếu cho 1 lần thu tiền chuyển khoản — nội dung CK = ref + ghi chú */
  async createRequest(auth: AuthContext, storeId: string, body: { amount?: number; note?: string }) {
    await this.stores.ensureAccess(auth, storeId);
    const amount = Math.round(Number(body.amount));
    if (!Number.isFinite(amount) || amount < 1 || amount > 1_000_000_000) throw new BadRequestException("Số tiền không hợp lệ");
    const note = typeof body.note === "string" ? body.note.slice(0, 60) : null;
    for (let i = 0; i < 5; i++) {
      const ref = "RM" + Array.from({ length: 6 }, () => REF_CHARS[randomInt(REF_CHARS.length)]).join("");
      try {
        const r = await this.prisma.storePaymentRequest.create({ data: { storeId, ref, amount, note } });
        return this.view(r);
      } catch (e) {
        if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) throw e;
      }
    }
    throw new BadRequestException("Không tạo được mã thanh toán, thử lại");
  }

  async getRequest(auth: AuthContext, storeId: string, id: string) {
    await this.stores.ensureAccess(auth, storeId);
    const r = await this.prisma.storePaymentRequest.findFirst({ where: { id, storeId } });
    if (!r) throw new NotFoundException("Không tìm thấy yêu cầu thanh toán");
    return this.view(r);
  }

  private view(r: { id: string; ref: string; amount: number; status: string; paidAmount: number; paidAt: Date | null; transactionCode: string | null }) {
    return { id: r.id, ref: r.ref, amount: r.amount, status: r.status, paidAmount: r.paidAmount, paidAt: r.paidAt, transactionCode: r.transactionCode };
  }

  // ───────────── Webhook Tingee (công khai, xác thực bằng chữ ký) ─────────────

  async webhook(slug: string, headers: Record<string, string | string[] | undefined>, raw: string | undefined, body: Record<string, unknown>): Promise<TingeeWebhookResult> {
    const store = await this.prisma.store.findUnique({ where: { slug }, select: { id: true, tingeeClientId: true, tingeeSecretEnc: true } });
    if (!store) return { status: 404, body: { code: "01", message: "Store not found" } };
    const secret = this.secretOf(store.tingeeSecretEnc);
    if (!secret) return { status: 503, body: { code: "02", message: "Tingee chưa được cấu hình" } };
    const h = (k: string) => {
      const v = headers[k];
      return Array.isArray(v) ? v[0] : v;
    };

    // Xác thực URL khi lưu webhook trên cổng Tingee: trả lại plainToken + HMAC-SHA256(secret, plainToken)
    if (h("webhook-type") === "url-validation" || body?.event === "url-validation") {
      const plainToken = String(body?.plainToken ?? "");
      return { status: 200, body: { plainToken, encryptedToken: hmacHex("sha256", secret, plainToken) } };
    }

    // Chữ ký: HMAC-SHA512(secret, x-request-timestamp + ":" + body gốc)
    const ts = h("x-request-timestamp") ?? "";
    const sig = (h("x-signature") ?? "").toLowerCase();
    if (!raw || !/^\d{17}$/.test(ts) || !sameHex(sig, hmacHex("sha512", secret, `${ts}:${raw}`))) {
      return { status: 401, body: { code: "401", message: "Invalid signature" } };
    }
    if (store.tingeeClientId && body.clientId && String(body.clientId) !== store.tingeeClientId) {
      return { status: 401, body: { code: "401", message: "Client ID không khớp" } };
    }

    const ok = { status: 200, body: { code: "00", message: "Success" } };
    if (body.type === "debit") return ok; // chỉ quan tâm tiền về
    const transactionCode = String(body.transactionCode ?? "").slice(0, 100);
    const amount = Math.round(Number(body.amount));
    if (!transactionCode || !Number.isFinite(amount)) return { status: 400, body: { code: "400", message: "Thiếu transactionCode / amount" } };
    const content = typeof body.content === "string" ? body.content.slice(0, 500) : null;

    await this.prisma.$transaction(async (tx) => {
      // Tingee gửi lại (retry) → đã ghi thì bỏ qua
      const dup = await tx.storeBankTransaction.findUnique({ where: { storeId_transactionCode: { storeId: store.id, transactionCode } }, select: { id: true } });
      if (dup) return;
      const refs = [...new Set((content ?? "").toUpperCase().replace(/[^A-Z0-9]/g, " ").replace(/\s+/g, "").match(REF_RE) ?? [])];
      const req = refs.length
        ? await tx.storePaymentRequest.findFirst({ where: { storeId: store.id, ref: { in: refs }, status: { not: "paid" } }, orderBy: { createdAt: "desc" } })
        : null;
      await tx.storeBankTransaction.create({
        data: {
          storeId: store.id,
          transactionCode,
          amount,
          content,
          bank: typeof body.bank === "string" ? body.bank.slice(0, 100) : null,
          accountNumber: typeof body.accountNumber === "string" ? body.accountNumber.slice(0, 50) : null,
          transactionDate: tingeeDate(body.transactionDate),
          matchedRef: req?.ref ?? null,
          raw: body as Prisma.InputJsonValue,
        },
      });
      if (req) {
        const paidAmount = req.paidAmount + amount;
        await tx.storePaymentRequest.update({
          where: { id: req.id },
          data: { paidAmount, status: paidAmount >= req.amount ? "paid" : "partial", paidAt: new Date(), transactionCode },
        });
      }
    });
    return ok;
  }
}
