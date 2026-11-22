import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { openSecret, sealSecret } from "../common/secret-box";
import { PrismaService } from "../prisma/prisma.service";
import { OaCtx, OaService } from "./oa.service";

export interface StoreOaInput {
  oaId?: string;
  /** OA Secret Key (kiểm tra chữ ký webhook) — chuỗi rỗng = xoá */
  oaSecret?: string;
  accessToken?: string;
  refreshToken?: string;
}

/**
 * Zalo OA riêng của từng gian hàng: App ID + App Secret là của Mini App riêng của store (Store.zaloAppId / zaloAppSecretEnc),
 * OA Secret Key lưu mã hoá ở Store.oaSecretEnc, token OA lưu ở OaCredential (id = "store:<storeId>").
 */
@Injectable()
export class StoreOaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
    private readonly oa: OaService,
  ) {}

  private ctxOf(s: { id: string; zaloAppId: string | null; zaloAppSecretEnc: string | null; oaSecretEnc: string | null }): OaCtx {
    const key = this.auth.getServerSecret();
    return {
      credId: `store:${s.id}`,
      appId: s.zaloAppId?.trim() ?? "",
      appSecret: openSecret(s.zaloAppSecretEnc, key) ?? "",
      oaSecret: openSecret(s.oaSecretEnc, key) ?? "",
    };
  }

  private select = { id: true, slug: true, name: true, zaloAppId: true, zaloOaId: true, zaloAppSecretEnc: true, oaSecretEnc: true } as const;

  async ctx(storeId: string): Promise<OaCtx> {
    const s = await this.prisma.store.findUnique({ where: { id: storeId }, select: this.select });
    if (!s) throw new NotFoundException("Không tìm thấy gian hàng");
    return this.ctxOf(s);
  }

  /** Dùng cho webhook công khai: tìm gian hàng theo slug. */
  async ctxBySlug(slug: string): Promise<{ storeId: string; ctx: OaCtx } | null> {
    const s = await this.prisma.store.findUnique({ where: { slug }, select: this.select });
    return s ? { storeId: s.id, ctx: this.ctxOf(s) } : null;
  }

  async status(storeId: string) {
    const s = await this.prisma.store.findUnique({ where: { id: storeId }, select: this.select });
    if (!s) throw new NotFoundException("Không tìm thấy gian hàng");
    const st = await this.oa.status(this.ctxOf(s));
    return { ...st, oaId: s.zaloOaId ?? "", hasOaSecret: !!s.oaSecretEnc, webhookPath: `/api/oa/webhook/${s.slug}` };
  }

  async save(storeId: string, dto: StoreOaInput) {
    const s = await this.prisma.store.findUnique({ where: { id: storeId }, select: { id: true } });
    if (!s) throw new NotFoundException("Không tìm thấy gian hàng");
    const key = this.auth.getServerSecret();
    const secret = dto.oaSecret?.trim();
    await this.prisma.store.update({
      where: { id: storeId },
      data: {
        ...(dto.oaId !== undefined ? { zaloOaId: dto.oaId.trim() || null } : {}),
        ...(dto.oaSecret !== undefined ? { oaSecretEnc: secret ? sealSecret(secret, key) : null } : {}),
      },
    });
    const access = dto.accessToken?.trim();
    const refresh = dto.refreshToken?.trim();
    if (access || refresh) {
      if (!access || !refresh) throw new BadRequestException("Cần dán cả access token và refresh token");
      await this.oa.setCredentials(access, refresh, 90000, await this.ctx(storeId));
    }
    return this.status(storeId);
  }

  /** Gỡ token OA (giữ OA ID / secret). */
  async disconnect(storeId: string) {
    await this.oa.clearCredentials(await this.ctx(storeId));
    return this.status(storeId);
  }
}
