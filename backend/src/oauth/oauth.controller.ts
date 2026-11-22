import { Body, Controller, Delete, Get, Headers, HttpCode, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AppAuthGuard, type AppRequest } from "../common/guards/app-auth.guard";
import { RateLimit, RateLimitGuard } from "../common/guards/rate-limit.guard";
import { AuditService } from "../audit/audit.service";
import {
  CreateOAuthAppDto,
  IntrospectRequestDto,
  RevokeRequestDto,
  TokenRequestDto,
  UpdateOAuthAppDto,
} from "./dto/oauth.dto";
import { ClientCredentials, GRANT, OAuthError, OAuthService } from "./oauth.service";

/** Lấy client_id/secret từ header `Authorization: Basic base64(id:secret)` hoặc từ body. */
function readClient(authorization: string | undefined, body: { client_id?: string; client_secret?: string }): ClientCredentials {
  if (authorization?.startsWith("Basic ")) {
    const decoded = Buffer.from(authorization.slice(6), "base64").toString("utf8");
    const idx = decoded.indexOf(":");
    if (idx > 0) {
      return {
        clientId: decodeURIComponent(decoded.slice(0, idx)),
        clientSecret: decodeURIComponent(decoded.slice(idx + 1)),
      };
    }
  }
  return { clientId: body.client_id, clientSecret: body.client_secret };
}

@ApiTags("oauth")
@Controller("oauth")
export class OAuthController {
  constructor(private readonly oauth: OAuthService) {}

  @Post("token")
  @HttpCode(200)
  @UseGuards(RateLimitGuard)
  @RateLimit(30, 60)
  @ApiOperation({
    summary: "Cấp token (OAuth 2.0)",
    description:
      "grant_type: client_credentials (máy chủ ↔ máy chủ) · refresh_token (xoay vòng) · zalo_mini_app (đăng nhập Zalo trong Mini App, kèm zalo_access_token + phone_token)",
  })
  token(@Headers("authorization") authorization: string | undefined, @Body() body: TokenRequestDto) {
    const client = readClient(authorization, body);
    switch (body.grant_type) {
      case GRANT.clientCredentials:
        return this.oauth.clientCredentials(client, body.scope);
      case GRANT.refreshToken:
        return this.oauth.refresh(client, body.refresh_token, body.scope);
      case GRANT.zaloMiniApp:
        return this.oauth.zaloMiniApp(client, body.zalo_access_token, body.phone_token, body.scope);
      default:
        throw new OAuthError("unsupported_grant_type", `grant_type=${body.grant_type} không được hỗ trợ`);
    }
  }

  @Post("revoke")
  @HttpCode(200)
  @ApiOperation({ summary: "Thu hồi access / refresh token (RFC 7009) — dùng khi đăng xuất" })
  revoke(@Headers("authorization") authorization: string | undefined, @Body() body: RevokeRequestDto) {
    return this.oauth.revoke(readClient(authorization, body), body.token, body.token_type_hint);
  }

  @Post("introspect")
  @HttpCode(200)
  @ApiOperation({ summary: "Kiểm tra token còn hiệu lực (RFC 7662) — chỉ confidential client" })
  introspect(@Headers("authorization") authorization: string | undefined, @Body() body: IntrospectRequestDto) {
    return this.oauth.introspect(readClient(authorization, body), body.token);
  }
}

/** Quản lý kênh kết nối (client_id / secret) — chủ shop quản lý kênh của mình, admin quản lý tất cả. */
@ApiTags("oauth")
@ApiBearerAuth()
@UseGuards(AppAuthGuard)
@Controller("oauth/applications")
export class OAuthApplicationsController {
  constructor(
    private readonly oauth: OAuthService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @ApiOperation({ summary: "Danh sách kênh kết nối" })
  list(@Req() req: AppRequest, @Query("customerId") customerId?: string) {
    return this.oauth.listApps(req.auth!, customerId);
  }

  @Post()
  @ApiOperation({ summary: "Tạo kênh mới — client_secret chỉ hiển thị 1 lần trong response" })
  async create(@Req() req: AppRequest, @Body() dto: CreateOAuthAppDto) {
    const app = await this.oauth.createApp(req.auth!, dto);
    void this.audit.record(req, "oauth.app.create", { type: "oauth_app", id: app.id }, { name: app.name, channel: app.channel, clientId: app.clientId });
    return app;
  }

  @Patch(":id")
  @ApiOperation({ summary: "Sửa kênh (tắt kênh sẽ thu hồi toàn bộ token)" })
  async update(@Req() req: AppRequest, @Param("id") id: string, @Body() dto: UpdateOAuthAppDto) {
    const app = await this.oauth.updateApp(req.auth!, id, dto);
    void this.audit.record(req, dto.active === false ? "oauth.app.disable" : "oauth.app.update", { type: "oauth_app", id }, { fields: Object.keys(dto) });
    return app;
  }

  @Post(":id/rotate-secret")
  @ApiOperation({ summary: "Tạo client_secret mới (secret cũ hết hiệu lực ngay)" })
  async rotate(@Req() req: AppRequest, @Param("id") id: string) {
    const app = await this.oauth.rotateSecret(req.auth!, id);
    void this.audit.record(req, "oauth.app.rotate_secret", { type: "oauth_app", id });
    return app;
  }

  @Post(":id/revoke-tokens")
  @ApiOperation({ summary: "Đăng xuất mọi phiên / thu hồi mọi token của kênh" })
  async revokeTokens(@Req() req: AppRequest, @Param("id") id: string) {
    const res = await this.oauth.revokeAppTokens(req.auth!, id);
    void this.audit.record(req, "oauth.app.revoke_tokens", { type: "oauth_app", id });
    return res;
  }

  @Delete(":id")
  @ApiOperation({ summary: "Xoá kênh" })
  async remove(@Req() req: AppRequest, @Param("id") id: string) {
    const res = await this.oauth.removeApp(req.auth!, id);
    void this.audit.record(req, "oauth.app.delete", { type: "oauth_app", id });
    return res;
  }
}
