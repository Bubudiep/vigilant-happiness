import { ForbiddenException, HttpException, HttpStatus, Injectable, NotFoundException } from "@nestjs/common";
import { OAuthApplication, Prisma, User } from "@prisma/client";
import type { AuthContext } from "../common/guards/app-auth.guard";
import { PrismaService } from "../prisma/prisma.service";
import { PREFIX, randomToken, safeEqualHex, sha256 } from "./oauth.crypto";
import { CreateOAuthAppDto, UpdateOAuthAppDto } from "./dto/oauth.dto";
import { ZaloService } from "./zalo.service";

export const GRANT = {
  clientCredentials: "client_credentials",
  refreshToken: "refresh_token",
  zaloMiniApp: "zalo_mini_app",
} as const;

export const CHANNELS = ["zalo_mini_app", "web", "pos", "api", "webhook"] as const;
export type Channel = (typeof CHANNELS)[number];

/** Lỗi đúng định dạng RFC 6749 §5.2: { error, error_description } */
export class OAuthError extends HttpException {
  constructor(error: string, description: string, status = HttpStatus.BAD_REQUEST) {
    super({ error, error_description: description }, status);
  }
}

export interface TokenResponse {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
  scope: string;
  refresh_token?: string;
  user?: { id: string; name: string; phone: string | null; avatarUrl: string | null; phoneVerified: boolean };
}

export interface ClientCredentials {
  clientId?: string;
  clientSecret?: string;
}

/** Kết quả kiểm tra một access token OAuth (dùng trong AppAuthGuard). */
export interface ResolvedAccessToken {
  application: OAuthApplication;
  user: Pick<User, "id" | "email" | "role" | "customerId"> | null;
  scopes: string[];
}

function defaultsForChannel(channel: Channel): { clientType: "public" | "confidential"; grantTypes: string[] } {
  switch (channel) {
    case "zalo_mini_app":
      return { clientType: "public", grantTypes: [GRANT.zaloMiniApp, GRANT.refreshToken] };
    case "web":
      return { clientType: "confidential", grantTypes: [GRANT.clientCredentials, GRANT.refreshToken] };
    default:
      return { clientType: "confidential", grantTypes: [GRANT.clientCredentials] };
  }
}

const APP_PUBLIC_SELECT = {
  id: true,
  name: true,
  channel: true,
  clientId: true,
  clientType: true,
  secretHint: true,
  grantTypes: true,
  scopes: true,
  redirectUris: true,
  customerId: true,
  storeId: true,
  accessTokenTtl: true,
  refreshTokenTtl: true,
  active: true,
  lastUsedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.OAuthApplicationSelect;

@Injectable()
export class OAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly zalo: ZaloService,
  ) {}

  // ───────────────────────────── Xác thực client ─────────────────────────────

  /**
   * Confidential client bắt buộc đúng secret; public client (Mini App) chỉ cần client_id
   * vì code chạy trên máy người dùng không thể giữ bí mật.
   */
  async authenticateClient(creds: ClientCredentials, opts: { requireConfidential?: boolean } = {}) {
    if (!creds.clientId) throw new OAuthError("invalid_client", "Thiếu client_id", HttpStatus.UNAUTHORIZED);
    const app = await this.prisma.oAuthApplication.findUnique({ where: { clientId: creds.clientId } });
    if (!app || !app.active) throw new OAuthError("invalid_client", "Client không tồn tại hoặc đã bị khoá", HttpStatus.UNAUTHORIZED);

    if (app.clientType === "confidential" || opts.requireConfidential) {
      if (!app.clientSecretHash || !creds.clientSecret || !safeEqualHex(sha256(creds.clientSecret), app.clientSecretHash)) {
        throw new OAuthError("invalid_client", "Sai client_secret", HttpStatus.UNAUTHORIZED);
      }
    }
    return app;
  }

  private assertGrant(app: OAuthApplication, grant: string) {
    if (!app.grantTypes.includes(grant)) {
      throw new OAuthError("unauthorized_client", `Client không được phép dùng grant_type=${grant}`);
    }
  }

  /** scope yêu cầu phải nằm trong scope được cấp cho app; bỏ trống = toàn bộ scope của app. */
  private resolveScope(app: OAuthApplication, requested?: string): string {
    if (!requested?.trim()) return app.scopes.join(" ");
    const asked = requested.trim().split(/\s+/);
    const invalid = asked.filter((s) => !app.scopes.includes(s));
    if (invalid.length) throw new OAuthError("invalid_scope", `Scope không hợp lệ: ${invalid.join(", ")}`);
    return asked.join(" ");
  }

  // ───────────────────────────── Phát hành token ─────────────────────────────

  private async issue(
    app: OAuthApplication,
    userId: string | null,
    scope: string,
    withRefresh: boolean,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<TokenResponse> {
    const access = randomToken(PREFIX.accessToken);
    const now = Date.now();
    const accessRow = await tx.oAuthAccessToken.create({
      data: {
        tokenHash: sha256(access),
        applicationId: app.id,
        userId,
        scope,
        expiresAt: new Date(now + app.accessTokenTtl * 1000),
      },
    });

    const result: TokenResponse = { access_token: access, token_type: "Bearer", expires_in: app.accessTokenTtl, scope };
    if (withRefresh) {
      const refresh = randomToken(PREFIX.refreshToken, 48);
      await tx.oAuthRefreshToken.create({
        data: {
          tokenHash: sha256(refresh),
          applicationId: app.id,
          userId,
          accessTokenId: accessRow.id,
          scope,
          expiresAt: new Date(now + app.refreshTokenTtl * 1000),
        },
      });
      result.refresh_token = refresh;
    }
    await tx.oAuthApplication.update({ where: { id: app.id }, data: { lastUsedAt: new Date() } });
    return result;
  }

  /** grant_type=client_credentials — token đại diện cho chính kênh (máy chủ ↔ máy chủ). */
  async clientCredentials(creds: ClientCredentials, scope?: string): Promise<TokenResponse> {
    const app = await this.authenticateClient(creds, { requireConfidential: true });
    this.assertGrant(app, GRANT.clientCredentials);
    return this.issue(app, null, this.resolveScope(app, scope), false);
  }

  /**
   * grant_type=refresh_token — xoay vòng (rotation): refresh cũ bị thu hồi, cấp cặp mới.
   * Nếu một refresh token đã thu hồi bị dùng lại (dấu hiệu bị đánh cắp) thì thu hồi
   * toàn bộ token của user trên kênh đó.
   */
  async refresh(creds: ClientCredentials, refreshToken?: string, scope?: string): Promise<TokenResponse> {
    const app = await this.authenticateClient(creds);
    this.assertGrant(app, GRANT.refreshToken);
    if (!refreshToken) throw new OAuthError("invalid_request", "Thiếu refresh_token");

    const row = await this.prisma.oAuthRefreshToken.findUnique({ where: { tokenHash: sha256(refreshToken) } });
    if (!row || row.applicationId !== app.id) throw new OAuthError("invalid_grant", "refresh_token không hợp lệ");

    if (row.revokedAt) {
      await this.revokeAllFor(app.id, row.userId);
      throw new OAuthError("invalid_grant", "refresh_token đã bị thu hồi — toàn bộ phiên đã được đăng xuất");
    }
    if (row.expiresAt.getTime() < Date.now()) throw new OAuthError("invalid_grant", "refresh_token đã hết hạn");

    // Scope mới chỉ được hẹp hơn hoặc bằng scope cũ
    let nextScope = row.scope;
    if (scope?.trim()) {
      const old = new Set(row.scope.split(" ").filter(Boolean));
      const asked = scope.trim().split(/\s+/);
      if (asked.some((s) => !old.has(s))) throw new OAuthError("invalid_scope", "Không được mở rộng scope khi refresh");
      nextScope = asked.join(" ");
    }

    return this.prisma.$transaction(async (tx) => {
      const now = new Date();
      // updateMany có điều kiện revokedAt=null → 2 request refresh đồng thời chỉ 1 cái thắng
      const claimed = await tx.oAuthRefreshToken.updateMany({ where: { id: row.id, revokedAt: null }, data: { revokedAt: now } });
      if (!claimed.count) throw new OAuthError("invalid_grant", "refresh_token đã được dùng");
      if (row.accessTokenId) {
        await tx.oAuthAccessToken.updateMany({ where: { id: row.accessTokenId, revokedAt: null }, data: { revokedAt: now } });
      }
      return this.issue(app, row.userId, nextScope, true, tx);
    });
  }

  /**
   * grant_type=zalo_mini_app — đăng nhập bằng Zalo trong Mini App.
   * Xác minh access token với Zalo, lấy SĐT bằng phone token, tạo/cập nhật User rồi cấp token.
   */
  async zaloMiniApp(
    creds: ClientCredentials,
    zaloAccessToken?: string,
    phoneToken?: string,
    scope?: string,
  ): Promise<TokenResponse> {
    const app = await this.authenticateClient(creds);
    this.assertGrant(app, GRANT.zaloMiniApp);
    if (!zaloAccessToken) throw new OAuthError("invalid_request", "Thiếu zalo_access_token");

    const profile = await this.zalo.getProfile(zaloAccessToken).catch((e: Error) => {
      throw new OAuthError("invalid_grant", e.message);
    });
    let phone: string | null = null;
    if (phoneToken) {
      phone = await this.zalo.getPhoneNumber(zaloAccessToken, phoneToken).catch((e: Error) => {
        console.warn("[zalo] Không lấy được số điện thoại:", e.message);
        return null;
      });
    }

    const user = await this.prisma.user.upsert({
      where: { provider_providerId: { provider: "zalo", providerId: profile.id } },
      update: {
        name: profile.name,
        avatarUrl: profile.avatarUrl ?? undefined,
        ...(phone ? { phone } : {}),
        lastLoginAt: new Date(),
      },
      create: {
        provider: "zalo",
        providerId: profile.id,
        name: profile.name,
        avatarUrl: profile.avatarUrl ?? null,
        phone,
        // Người dùng cuối của Mini App, không phải chủ shop
        role: "member",
      },
    });

    const tokens = await this.issue(app, user.id, this.resolveScope(app, scope), app.grantTypes.includes(GRANT.refreshToken));
    return {
      ...tokens,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        phoneVerified: !!phone || !!user.phone,
      },
    };
  }

  // ───────────────────────────── Thu hồi / kiểm tra ─────────────────────────────

  /** RFC 7009: luôn trả 200 kể cả token không tồn tại (không tiết lộ thông tin). */
  async revoke(creds: ClientCredentials, token?: string, hint?: string) {
    const app = await this.authenticateClient(creds);
    if (!token) return { revoked: false };
    const hash = sha256(token);
    const now = new Date();

    if (hint !== "access_token") {
      const rt = await this.prisma.oAuthRefreshToken.findUnique({ where: { tokenHash: hash } });
      if (rt && rt.applicationId === app.id) {
        await this.prisma.oAuthRefreshToken.update({ where: { id: rt.id }, data: { revokedAt: now } });
        if (rt.accessTokenId) {
          await this.prisma.oAuthAccessToken.updateMany({ where: { id: rt.accessTokenId, revokedAt: null }, data: { revokedAt: now } });
        }
        return { revoked: true };
      }
    }
    const at = await this.prisma.oAuthAccessToken.findUnique({ where: { tokenHash: hash } });
    if (at && at.applicationId === app.id) {
      await this.prisma.oAuthAccessToken.update({ where: { id: at.id }, data: { revokedAt: now } });
      await this.prisma.oAuthRefreshToken.updateMany({ where: { accessTokenId: at.id, revokedAt: null }, data: { revokedAt: now } });
    }
    return { revoked: true };
  }

  /** RFC 7662 — chỉ confidential client được hỏi. */
  async introspect(creds: ClientCredentials, token?: string) {
    await this.authenticateClient(creds, { requireConfidential: true });
    if (!token) return { active: false };
    const at = await this.prisma.oAuthAccessToken.findUnique({
      where: { tokenHash: sha256(token) },
      include: { application: { select: { clientId: true, channel: true } } },
    });
    if (!at || at.revokedAt || at.expiresAt.getTime() < Date.now()) return { active: false };
    return {
      active: true,
      scope: at.scope,
      client_id: at.application.clientId,
      channel: at.application.channel,
      user_id: at.userId,
      token_type: "Bearer",
      exp: Math.floor(at.expiresAt.getTime() / 1000),
      iat: Math.floor(at.createdAt.getTime() / 1000),
    };
  }

  /** Dùng trong guard: trả về null nếu token không hợp lệ / hết hạn / bị thu hồi. */
  async resolveAccessToken(token: string): Promise<ResolvedAccessToken | null> {
    if (!token.startsWith(PREFIX.accessToken)) return null;
    const at = await this.prisma.oAuthAccessToken.findUnique({
      where: { tokenHash: sha256(token) },
      include: {
        application: true,
        user: { select: { id: true, email: true, role: true, customerId: true } },
      },
    });
    if (!at || at.revokedAt || at.expiresAt.getTime() < Date.now() || !at.application.active) return null;
    return { application: at.application, user: at.user, scopes: at.scope.split(" ").filter(Boolean) };
  }

  /** SĐT đã xác minh qua Zalo của user (null nếu chưa có). */
  async userPhone(userId: string): Promise<string | null> {
    const u = await this.prisma.user.findUnique({ where: { id: userId }, select: { phone: true, provider: true } });
    return u?.provider === "zalo" ? u.phone : null;
  }

  private async revokeAllFor(applicationId: string, userId: string | null) {
    const now = new Date();
    const where = { applicationId, ...(userId ? { userId } : {}), revokedAt: null };
    await this.prisma.oAuthRefreshToken.updateMany({ where, data: { revokedAt: now } });
    await this.prisma.oAuthAccessToken.updateMany({ where, data: { revokedAt: now } });
  }

  // ───────────────────────────── Quản lý kênh (application) ─────────────────────────────

  private scope(auth: AuthContext): Prisma.OAuthApplicationWhereInput {
    if (auth.isAdmin) return {};
    return auth.customerId ? { customerId: auth.customerId } : { id: "__none__" };
  }

  private async findOwned(auth: AuthContext, id: string) {
    const app = await this.prisma.oAuthApplication.findFirst({ where: { id, ...this.scope(auth) } });
    if (!app) throw new NotFoundException("Không tìm thấy kênh kết nối");
    return app;
  }

  async listApps(auth: AuthContext, customerId?: string) {
    const now = new Date();
    const apps = await this.prisma.oAuthApplication.findMany({
      where: { ...this.scope(auth), ...(customerId && auth.isAdmin ? { customerId } : {}) },
      select: {
        ...APP_PUBLIC_SELECT,
        customer: { select: { id: true, name: true, companyName: true } },
        _count: { select: { accessTokens: { where: { revokedAt: null, expiresAt: { gt: now } } } } },
      },
      orderBy: { createdAt: "desc" },
    });
    return apps.map(({ _count, ...a }) => ({ ...a, activeTokens: _count.accessTokens }));
  }

  /** Secret chỉ trả về đúng 1 lần lúc tạo / xoay vòng — giống django-oauth-toolkit ≥ 2.0 (hash secret). */
  async createApp(auth: AuthContext, dto: CreateOAuthAppDto) {
    const customerId = auth.isAdmin ? dto.customerId ?? null : auth.customerId ?? null;
    if (!auth.isAdmin && !customerId) {
      throw new ForbiddenException("Tài khoản chưa gắn với khách hàng nào — hãy tạo store trước");
    }
    const channel = (dto.channel ?? "api") as Channel;
    const defaults = defaultsForChannel(channel);
    const clientType = dto.clientType ?? defaults.clientType;
    const secret = clientType === "confidential" ? randomToken(PREFIX.clientSecret) : null;

    const app = await this.prisma.oAuthApplication.create({
      data: {
        name: dto.name,
        channel,
        clientId: randomToken(PREFIX.clientId, 12),
        clientType,
        clientSecretHash: secret ? sha256(secret) : null,
        secretHint: secret ? secret.slice(-4) : null,
        grantTypes: dto.grantTypes?.length ? dto.grantTypes : defaults.grantTypes,
        scopes: dto.scopes ?? [],
        redirectUris: dto.redirectUris ?? [],
        customerId,
        storeId: dto.storeId,
        ...(dto.accessTokenTtl ? { accessTokenTtl: dto.accessTokenTtl } : {}),
        ...(dto.refreshTokenTtl ? { refreshTokenTtl: dto.refreshTokenTtl } : {}),
      },
      select: APP_PUBLIC_SELECT,
    });
    return { ...app, clientSecret: secret };
  }

  async updateApp(auth: AuthContext, id: string, dto: UpdateOAuthAppDto) {
    await this.findOwned(auth, id);
    const app = await this.prisma.oAuthApplication.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
        ...(dto.grantTypes !== undefined ? { grantTypes: dto.grantTypes } : {}),
        ...(dto.scopes !== undefined ? { scopes: dto.scopes } : {}),
        ...(dto.redirectUris !== undefined ? { redirectUris: dto.redirectUris } : {}),
        ...(dto.storeId !== undefined ? { storeId: dto.storeId } : {}),
        ...(dto.accessTokenTtl !== undefined ? { accessTokenTtl: dto.accessTokenTtl } : {}),
        ...(dto.refreshTokenTtl !== undefined ? { refreshTokenTtl: dto.refreshTokenTtl } : {}),
      },
      select: APP_PUBLIC_SELECT,
    });
    if (dto.active === false) await this.revokeAllFor(id, null);
    return app;
  }

  async rotateSecret(auth: AuthContext, id: string) {
    const existing = await this.findOwned(auth, id);
    if (existing.clientType !== "confidential") throw new ForbiddenException("Public client không có secret");
    const secret = randomToken(PREFIX.clientSecret);
    const app = await this.prisma.oAuthApplication.update({
      where: { id },
      data: { clientSecretHash: sha256(secret), secretHint: secret.slice(-4) },
      select: APP_PUBLIC_SELECT,
    });
    return { ...app, clientSecret: secret };
  }

  async revokeAppTokens(auth: AuthContext, id: string) {
    await this.findOwned(auth, id);
    await this.revokeAllFor(id, null);
    return { revoked: true };
  }

  async removeApp(auth: AuthContext, id: string) {
    await this.findOwned(auth, id);
    await this.prisma.oAuthApplication.delete({ where: { id } });
    return { id, deleted: true };
  }
}
