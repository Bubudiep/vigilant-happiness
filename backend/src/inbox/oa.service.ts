import { BadGatewayException, Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHash, timingSafeEqual } from "crypto";
import { PrismaService } from "../prisma/prisma.service";

const API = "https://openapi.zalo.me/v3.0/oa";
const REFRESH_URL = "https://oauth.zaloapp.com/v4/oa/access_token";
const REFRESH_MARGIN_MS = 10 * 60 * 1000;

export interface OaStatus {
  configured: boolean;
  webhookReady: boolean;
  tokenExpiresAt: string | null;
  canRefresh: boolean;
  missing: string[];
}

/** Tài khoản OA: của reMini (credId = "default", cấu hình ở env) hoặc của một gian hàng (credId = "store:<id>"). */
export interface OaCtx {
  credId: string;
  appId: string;
  appSecret: string;
  oaSecret: string;
}

/** Chữ ký webhook Zalo: sha256(appId + body thô + timestamp + OA secret key). Header `X-ZEvent-Signature: mac=<hex>`. */
export function oaSignature(appId: string, rawBody: string, timestamp: string, secret: string) {
  return createHash("sha256").update(appId + rawBody + timestamp + secret).digest("hex");
}

export function verifyOaSignature(header: string | undefined, expected: string): boolean {
  const got = (header ?? "").replace(/^mac=/i, "").trim().toLowerCase();
  const a = Buffer.from(got);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Kết nối Zalo OA: giữ token (tự làm mới, refresh_token dùng một lần nên luôn lưu lại DB),
 * gửi tin tư vấn và kiểm tra chữ ký webhook. Không bao giờ ghi token ra log.
 */
@Injectable()
export class OaService {
  private readonly log = new Logger(OaService.name);
  private readonly refreshing = new Map<string, Promise<string>>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  appId() {
    return this.config.get<string>("ZALO_APP_ID") ?? "";
  }
  private appSecret() {
    return this.config.get<string>("ZALO_APP_SECRET") ?? "";
  }
  oaSecret() {
    return this.config.get<string>("ZALO_OA_SECRET") ?? "";
  }

  /** Tài khoản OA mặc định của reMini (đọc từ env). */
  platformCtx(): OaCtx {
    return { credId: "default", appId: this.appId(), appSecret: this.appSecret(), oaSecret: this.oaSecret() };
  }

  /** Lần đầu: lấy từ env (ZALO_OA_ACCESS_TOKEN / ZALO_OA_REFRESH_TOKEN), sau đó dùng bản trong DB. */
  private async credential(ctx: OaCtx) {
    const row = await this.prisma.oaCredential.findUnique({ where: { id: ctx.credId } });
    if (row || ctx.credId !== "default") return row;
    const access = this.config.get<string>("ZALO_OA_ACCESS_TOKEN");
    const refresh = this.config.get<string>("ZALO_OA_REFRESH_TOKEN");
    if (!access && !refresh) return null;
    return this.prisma.oaCredential.create({
      data: { id: "default", accessToken: access ?? "", refreshToken: refresh ?? "", expiresAt: new Date(access ? Date.now() + 3600e3 : 0) },
    });
  }

  async status(ctx: OaCtx = this.platformCtx()): Promise<OaStatus> {
    const c = await this.credential(ctx);
    const own = ctx.credId !== "default";
    const missing: string[] = [];
    if (!ctx.appId) missing.push(own ? "Zalo Mini App ID" : "ZALO_APP_ID");
    if (!ctx.appSecret) missing.push(own ? "App Secret của Mini App" : "ZALO_APP_SECRET");
    if (!ctx.oaSecret) missing.push(own ? "OA Secret Key" : "ZALO_OA_SECRET");
    if (!c) missing.push("access token OA");
    return {
      configured: !!c?.accessToken || !!c?.refreshToken,
      webhookReady: !!ctx.appId && !!ctx.oaSecret,
      tokenExpiresAt: c?.expiresAt.toISOString() ?? null,
      canRefresh: !!c?.refreshToken && !!ctx.appId && !!ctx.appSecret,
      missing,
    };
  }

  async setCredentials(accessToken: string, refreshToken: string, expiresInSec = 90000, ctx: OaCtx = this.platformCtx()) {
    const expiresAt = new Date(Date.now() + expiresInSec * 1000);
    await this.prisma.oaCredential.upsert({
      where: { id: ctx.credId },
      update: { accessToken, refreshToken, expiresAt },
      create: { id: ctx.credId, accessToken, refreshToken, expiresAt },
    });
  }

  /** Xoá token OA của một gian hàng (khi gỡ kết nối). */
  async clearCredentials(ctx: OaCtx) {
    await this.prisma.oaCredential.deleteMany({ where: { id: ctx.credId } });
  }

  /** Làm mới token; gộp các lần gọi đồng thời vì refresh_token chỉ dùng được một lần. */
  private refresh(ctx: OaCtx): Promise<string> {
    let p = this.refreshing.get(ctx.credId);
    if (!p) {
      p = this.doRefresh(ctx).finally(() => this.refreshing.delete(ctx.credId));
      this.refreshing.set(ctx.credId, p);
    }
    return p;
  }

  private async doRefresh(ctx: OaCtx): Promise<string> {
    const c = await this.credential(ctx);
    if (!c?.refreshToken || !ctx.appId || !ctx.appSecret) throw new ServiceUnavailableException("Chưa cấu hình đủ để làm mới token OA");
    const res = await fetch(REFRESH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", secret_key: ctx.appSecret },
      body: new URLSearchParams({ refresh_token: c.refreshToken, app_id: ctx.appId, grant_type: "refresh_token" }),
      signal: AbortSignal.timeout(10000),
    });
    const data = (await res.json().catch(() => ({}))) as { access_token?: string; refresh_token?: string; expires_in?: string | number; error_name?: string };
    if (!data.access_token || !data.refresh_token) {
      this.log.warn(`Làm mới token OA thất bại: ${data.error_name ?? res.status}`);
      throw new BadGatewayException("Làm mới token Zalo OA thất bại — cần cấp lại refresh token");
    }
    await this.setCredentials(data.access_token, data.refresh_token, Number(data.expires_in) || 90000, ctx);
    this.log.log("Đã làm mới token Zalo OA");
    return data.access_token;
  }

  private async accessToken(ctx: OaCtx): Promise<string> {
    const c = await this.credential(ctx);
    if (!c) throw new ServiceUnavailableException("Chưa kết nối Zalo OA");
    if (c.accessToken && c.expiresAt.getTime() - Date.now() > REFRESH_MARGIN_MS) return c.accessToken;
    if (c.refreshToken) return this.refresh(ctx);
    if (c.accessToken) return c.accessToken;
    throw new ServiceUnavailableException("Chưa kết nối Zalo OA");
  }

  private async call(method: "GET" | "POST", url: string, ctx: OaCtx, body?: unknown, retry = true): Promise<{ error?: number; message?: string; data?: Record<string, unknown> }> {
    const token = await this.accessToken(ctx);
    let res: Response;
    try {
      res = await fetch(url, {
        method,
        headers: { access_token: token, ...(body ? { "Content-Type": "application/json" } : {}) },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(15000),
      });
    } catch {
      throw new BadGatewayException("Không kết nối được Zalo OA");
    }
    const json = (await res.json().catch(() => ({}))) as { error?: number; message?: string; data?: Record<string, unknown> };
    // -216 / -124: access token sai hoặc hết hạn → làm mới một lần rồi gọi lại
    if (retry && (json.error === -216 || json.error === -124)) {
      await this.refresh(ctx).catch(() => undefined);
      return this.call(method, url, ctx, body, false);
    }
    return json;
  }

  private explain(json: { error?: number; message?: string }): string {
    if (json.error === -233 || /48/.test(json.message ?? "")) return "Đã quá thời hạn trả lời tin tư vấn của Zalo (khách cần nhắn lại trước)";
    return `Zalo OA từ chối: ${json.message ?? json.error}`;
  }

  /** Trả về message_id của Zalo. Ném lỗi (BadGateway) kèm lý do nếu Zalo từ chối. */
  async sendText(oaUserId: string, text: string, ctx: OaCtx = this.platformCtx()): Promise<string | undefined> {
    const j = await this.call("POST", `${API}/message/cs`, ctx, { recipient: { user_id: oaUserId }, message: { text } });
    if (j.error) throw new BadGatewayException(this.explain(j));
    return j.data?.message_id as string | undefined;
  }

  async sendImage(oaUserId: string, imageUrl: string, caption?: string, ctx: OaCtx = this.platformCtx()): Promise<string | undefined> {
    const j = await this.call("POST", `${API}/message/cs`, ctx, {
      recipient: { user_id: oaUserId },
      message: {
        text: caption || undefined,
        attachment: { type: "template", payload: { template_type: "media", elements: [{ media_type: "image", url: imageUrl }] } },
      },
    });
    if (j.error) throw new BadGatewayException(this.explain(j));
    return j.data?.message_id as string | undefined;
  }

  /** Tên + ảnh đại diện người dùng OA (không bắt buộc — lỗi thì bỏ qua). */
  async profile(oaUserId: string, ctx: OaCtx = this.platformCtx()): Promise<{ name?: string; avatar?: string } | null> {
    try {
      const j = await this.call("GET", `${API}/user/detail?data=${encodeURIComponent(JSON.stringify({ user_id: oaUserId }))}`, ctx);
      if (j.error || !j.data) return null;
      return { name: j.data.display_name as string | undefined, avatar: j.data.avatar as string | undefined };
    } catch {
      return null;
    }
  }
}
