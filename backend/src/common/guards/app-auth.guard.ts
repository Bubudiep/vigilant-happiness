import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import { timingSafeEqual } from "crypto";
import { AuthService } from "../../auth/auth.service";
import { OAuthService } from "../../oauth/oauth.service";
import { PrismaService } from "../../prisma/prisma.service";

/** Thông tin người gọi API sau khi qua AppAuthGuard. */
export interface AuthContext {
  /** Quản trị nền tảng (x-admin-key, role=admin hoặc email nằm trong ADMIN_EMAILS) */
  isAdmin: boolean;
  userId?: string;
  email?: string | null;
  /** PlatformCustomer mà tài khoản đang thuộc về (chủ shop) */
  customerId?: string | null;
  /** Gọi bằng access token OAuth của một kênh (client_credentials / zalo_mini_app) */
  clientId?: string;
  channel?: string;
  scopes?: string[];
}

export interface AppRequest extends Request {
  auth?: AuthContext;
}

export const REQUIRE_SCOPES = "app_auth_scopes";
/**
 * Route yêu cầu scope. Chỉ áp dụng khi gọi bằng token OAuth của một kênh (Mini App, POS, website...).
 * Đăng nhập Google ở web quản trị và x-admin-key không bị ràng buộc scope.
 */
export const RequireScopes = (...scopes: string[]) => SetMetadata(REQUIRE_SCOPES, scopes);

export const ADMIN_ONLY = "app_auth_admin_only";
/** Chỉ quản trị nền tảng được gọi route này. */
export const AdminOnly = () => SetMetadata(ADMIN_ONLY, true);

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/**
 * Chấp nhận 1 trong 3:
 *  - Header `x-admin-key` khớp ADMIN_API_KEY          → quản trị nền tảng
 *  - `Authorization: Bearer rma_...` (OAuth token)    → kênh của khách / người dùng Mini App
 *  - `Authorization: Bearer <JWT>`                    → đăng nhập Google ở trang quản trị
 */
@Injectable()
export class AppAuthGuard implements CanActivate {
  constructor(
    private readonly config: ConfigService,
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
    private readonly oauth: OAuthService,
  ) {}

  private adminEmails(): string[] {
    return (this.config.get<string>("ADMIN_EMAILS") ?? "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
  }

  private isAdminUser(user: { role: string; email: string | null }): boolean {
    return user.role === "admin" || (!!user.email && this.adminEmails().includes(user.email.toLowerCase()));
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AppRequest>();
    const adminOnly = this.reflector.getAllAndOverride<boolean>(ADMIN_ONLY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const providedKey = req.headers["x-admin-key"];
    const expectedKey = this.config.get<string>("ADMIN_API_KEY");
    if (typeof providedKey === "string" && expectedKey && safeEqual(providedKey, expectedKey)) {
      req.auth = { isAdmin: true };
      return true;
    }

    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Vui lòng đăng nhập để tiếp tục");
    }
    const raw = header.slice(7).trim();

    // 1) Access token OAuth (opaque, tiền tố rma_)
    if (raw.startsWith("rma_")) {
      const resolved = await this.oauth.resolveAccessToken(raw);
      if (!resolved) throw new UnauthorizedException("Access token không hợp lệ, đã hết hạn hoặc bị thu hồi");
      const { application, user, scopes } = resolved;
      const isAdmin = user ? this.isAdminUser(user) : false;
      if (adminOnly && !isAdmin) throw new ForbiddenException("Chỉ quản trị viên nền tảng được thực hiện thao tác này");
      const needed = this.reflector.getAllAndOverride<string[] | undefined>(REQUIRE_SCOPES, [context.getHandler(), context.getClass()]);
      const missing = (needed ?? []).filter((s) => !scopes.includes(s));
      if (missing.length) {
        throw new ForbiddenException(`Token thiếu quyền (scope): ${missing.join(", ")}`);
      }
      req.auth = {
        isAdmin,
        userId: user?.id,
        email: user?.email,
        // Token của kênh (không gắn user) hành động thay mặt khách sở hữu kênh
        customerId: user ? user.customerId : application.customerId,
        clientId: application.clientId,
        channel: application.channel,
        scopes,
      };
      return true;
    }

    // 2) JWT của trang quản trị (đăng nhập Google)
    const payload = this.authService.verifyToken(raw);
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, customerId: true, customer: { select: { status: true } } },
    });
    if (!user) throw new UnauthorizedException("Tài khoản không còn tồn tại");

    const isAdmin = this.isAdminUser(user);
    if (adminOnly && !isAdmin) {
      throw new ForbiddenException("Chỉ quản trị viên nền tảng được thực hiện thao tác này");
    }
    // Chủ shop chỉ quản lý store của mình khi tài khoản người bán đã được kích hoạt
    const customerId = !isAdmin && user.customer?.status !== "active" ? null : user.customerId;
    req.auth = { isAdmin, userId: user.id, email: user.email, customerId };
    return true;
  }
}
