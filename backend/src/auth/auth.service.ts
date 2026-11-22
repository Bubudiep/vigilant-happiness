import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { randomBytes } from "crypto";
import * as jwt from "jsonwebtoken";
import { normalizeVnPhone } from "../oauth/zalo.service";
import { PrismaService } from "../prisma/prisma.service";

export interface JwtPayload {
  sub: string;
  provider: string;
  email?: string | null;
  name: string;
  role: string;
}

interface GoogleTokenResponse {
  access_token?: string;
  id_token?: string;
  error?: string;
  error_description?: string;
}

interface GoogleUserInfo {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  private devJwtSecret?: string;

  /**
   * Không dùng secret mặc định cố định (ai cũng giả mạo được token).
   * Production bắt buộc có JWT_SECRET; dev tự sinh secret ngẫu nhiên mỗi lần chạy.
   */
  private getJwtSecret(): string {
    const secret = this.config.get<string>("JWT_SECRET");
    if (secret && secret.length >= 16 && !secret.startsWith("change-this")) return secret;
    if (this.config.get<string>("NODE_ENV") === "production") {
      throw new InternalServerErrorException("Thiếu JWT_SECRET (>= 16 ký tự) trong backend/.env");
    }
    if (!this.devJwtSecret) {
      this.devJwtSecret = randomBytes(32).toString("hex");
      console.warn("[auth] Chưa cấu hình JWT_SECRET – dùng secret tạm, phiên đăng nhập sẽ mất khi restart.");
    }
    return this.devJwtSecret;
  }

  /** Chỉ cho phép đường dẫn nội bộ ("/admin/..."), chặn "//evil.com" hay "/\evil.com". */
  private safeRedirectPath(path: string | undefined, fallback = "/admin"): string {
    if (!path || !path.startsWith("/") || path.startsWith("//") || path.startsWith("/\\")) return fallback;
    return path;
  }

  getFrontendUrl(): string {
    return (this.config.get<string>("FRONTEND_URL") || "http://localhost:5173").replace(/\/+$/, "");
  }

  getGoogleClientId(): string | null {
    return this.config.get<string>("GOOGLE_CLIENT_ID") || null;
  }

  private getGoogleConfig() {
    const clientId = this.config.get<string>("GOOGLE_CLIENT_ID");
    const clientSecret = this.config.get<string>("GOOGLE_CLIENT_SECRET");
    const callbackUrl =
      this.config.get<string>("GOOGLE_CALLBACK_URL") ||
      "http://localhost:4000/api/auth/google/callback";

    if (!clientId || !clientSecret) {
      throw new InternalServerErrorException(
        "Chưa cấu hình GOOGLE_CLIENT_ID và GOOGLE_CLIENT_SECRET trong file backend/.env",
      );
    }
    return { clientId, clientSecret, callbackUrl };
  }

  getGoogleAuthUrl(redirectPath = "/admin", loginHint?: string): string {
    const { clientId, callbackUrl } = this.getGoogleConfig();
    const safeRedirect = this.safeRedirectPath(redirectPath);
    const state = Buffer.from(JSON.stringify({ redirect: safeRedirect }), "utf8").toString("base64url");

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: callbackUrl,
      response_type: "code",
      scope: "openid email profile",
      state,
    });

    if (loginHint?.trim()) {
      // Có login_hint: không truyền prompt=select_account để Google tự đăng nhập thẳng 1 chạm
      params.set("login_hint", loginHint.trim());
    } else {
      params.set("prompt", "select_account");
    }

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  parseRedirectFromState(state?: string): string {
    if (!state) return "/admin";
    try {
      const parsed = JSON.parse(Buffer.from(state, "base64url").toString("utf8")) as { redirect?: string };
      return this.safeRedirectPath(parsed.redirect);
    } catch {
      // ignore invalid state
    }
    return "/admin";
  }

  async handleGoogleCallback(code: string, state?: string) {
    if (!code) {
      throw new BadRequestException("Thiếu mã xác thực (code) từ Google");
    }

    const { clientId, clientSecret, callbackUrl } = this.getGoogleConfig();

    // 1. Đổi authorization code lấy access_token
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: callbackUrl,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = (await tokenRes.json()) as GoogleTokenResponse;
    if (!tokenRes.ok || !tokenData.access_token) {
      throw new UnauthorizedException(
        tokenData.error_description || tokenData.error || "Không thể trao đổi token với Google",
      );
    }

    // 2. Lấy thông tin người dùng từ Google UserInfo API
    const profileRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!profileRes.ok) {
      throw new UnauthorizedException("Không thể lấy thông tin tài khoản Google");
    }

    const profile = (await profileRes.json()) as GoogleUserInfo;
    if (!profile.sub) {
      throw new UnauthorizedException("Dữ liệu tài khoản Google không hợp lệ");
    }

    const displayName = profile.name?.trim() || profile.email?.split("@")[0] || "Người dùng Google";

    // 3. Lưu hoặc cập nhật User vào PostgreSQL
    const user = await this.prisma.user.upsert({
      where: {
        provider_providerId: {
          provider: "google",
          providerId: profile.sub,
        },
      },
      update: {
        email: profile.email ?? undefined,
        name: displayName,
        avatarUrl: profile.picture ?? undefined,
        lastLoginAt: new Date(),
      },
      create: {
        provider: "google",
        providerId: profile.sub,
        email: profile.email ?? null,
        name: displayName,
        avatarUrl: profile.picture ?? null,
        role: "owner",
        lastLoginAt: new Date(),
      },
    });

    // 4. Ký JWT trả về cho Frontend
    const payload: JwtPayload = {
      sub: user.id,
      provider: user.provider,
      email: user.email,
      name: user.name,
      role: user.role,
    };
    const token = jwt.sign(payload, this.getJwtSecret(), { expiresIn: "7d" });

    return {
      token,
      user,
      redirect: this.parseRedirectFromState(state),
    };
  }

  /** Xác thực Google One Tap ID Token (credential) từ Google Identity Services */
  async handleGoogleOneTap(credential: string) {
    if (!credential) {
      throw new BadRequestException("Thiếu credential token từ Google One Tap");
    }

    const clientId = this.getGoogleClientId();
    if (!clientId) {
      throw new InternalServerErrorException("Chưa cấu hình GOOGLE_CLIENT_ID trong backend/.env");
    }

    const verifyRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`,
    );
    if (!verifyRes.ok) {
      throw new UnauthorizedException("Google ID Token không hợp lệ hoặc đã hết hạn");
    }

    const profile = (await verifyRes.json()) as GoogleUserInfo & { aud?: string; exp?: string };
    if (!profile.sub || profile.aud !== clientId) {
      throw new UnauthorizedException("Google ID Token không khớp ứng dụng này");
    }

    const displayName = profile.name?.trim() || profile.email?.split("@")[0] || "Người dùng Google";

    const user = await this.prisma.user.upsert({
      where: {
        provider_providerId: {
          provider: "google",
          providerId: profile.sub,
        },
      },
      update: {
        email: profile.email ?? undefined,
        name: displayName,
        avatarUrl: profile.picture ?? undefined,
        lastLoginAt: new Date(),
      },
      create: {
        provider: "google",
        providerId: profile.sub,
        email: profile.email ?? null,
        name: displayName,
        avatarUrl: profile.picture ?? null,
        role: "owner",
        lastLoginAt: new Date(),
      },
    });

    const payload: JwtPayload = {
      sub: user.id,
      provider: user.provider,
      email: user.email,
      name: user.name,
      role: user.role,
    };
    const token = jwt.sign(payload, this.getJwtSecret(), { expiresIn: "7d" });

    return { token, user };
  }

  verifyToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, this.getJwtSecret()) as JwtPayload;
    } catch {
      throw new UnauthorizedException("Phiên đăng nhập hết hạn hoặc không hợp lệ");
    }
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        provider: true,
        email: true,
        phone: true,
        name: true,
        avatarUrl: true,
        role: true,
        customerId: true,
        lastLoginAt: true,
        customer: {
          select: { id: true, name: true, companyName: true, phone: true, address: true, status: true, createdAt: true },
        },
      },
    });
    if (!user) {
      throw new UnauthorizedException("Không tìm thấy tài khoản người dùng");
    }
    const isAdmin = this.isAdminUser(user);
    const accountStatus = isAdmin
      ? "admin"
      : !user.customer
        ? "unregistered"
        : user.customer.status === "active"
          ? "active"
          : user.customer.status === "pending"
            ? "pending"
            : "suspended";
    return { ...user, isAdmin, accountStatus };
  }

  /**
   * Token riêng cho một phạm vi (VD "shop" = khách của gian hàng). Ký bằng khoá dẫn xuất
   * `${JWT_SECRET}:${scope}` nên không dùng thay JWT trang quản trị được, và ngược lại.
   */
  signScoped(scope: string, payload: Record<string, unknown>, expiresIn: string | number) {
    return jwt.sign({ ...payload, scp: scope }, `${this.getJwtSecret()}:${scope}`, { expiresIn } as jwt.SignOptions);
  }

  verifyScoped<T extends Record<string, unknown>>(scope: string, token: string): T {
    try {
      const p = jwt.verify(token, `${this.getJwtSecret()}:${scope}`) as T & { scp?: string };
      if (p.scp !== scope) throw new Error("scope");
      return p;
    } catch {
      throw new UnauthorizedException("Phiên đăng nhập hết hạn hoặc không hợp lệ");
    }
  }

  /** Secret của server dùng để mã hoá dữ liệu nhạy cảm trong DB (secret-box). */
  getServerSecret(): string {
    const fileSecret = this.config.get<string>("FILE_SIGN_SECRET");
    return fileSecret && fileSecret.length >= 16 ? fileSecret : this.getJwtSecret();
  }

  /** Email trong ADMIN_EMAILS hoặc role = admin → quản trị nền tảng. */
  isAdminUser(user: { role: string; email: string | null }): boolean {
    const emails = (this.config.get<string>("ADMIN_EMAILS") ?? "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    return user.role === "admin" || (!!user.email && emails.includes(user.email.toLowerCase()));
  }

  /**
   * Chủ shop tự đăng ký làm người bán: tạo PlatformCustomer ở trạng thái "pending",
   * quản trị viên kích hoạt (đổi sang "active") ở trang Khách hàng reMini.
   * Gửi lại khi đang chờ duyệt thì cập nhật thông tin.
   */
  async registerSeller(
    userId: string,
    dto: { name: string; companyName?: string; phone: string; address?: string; note?: string },
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { customer: true } });
    if (!user) throw new UnauthorizedException("Không tìm thấy tài khoản người dùng");
    const phone = normalizeVnPhone(dto.phone);
    if (!phone) throw new BadRequestException("Số điện thoại không hợp lệ");
    const data = {
      name: dto.name.trim(),
      companyName: dto.companyName?.trim() || null,
      phone,
      address: dto.address?.trim() || null,
      note: dto.note?.trim() || null,
      email: user.email,
    };
    if (user.customer) {
      if (user.customer.status !== "pending") throw new ConflictException("Tài khoản đã đăng ký người bán");
      await this.prisma.platformCustomer.update({ where: { id: user.customer.id }, data });
    } else {
      const customer = await this.prisma.platformCustomer.create({ data: { ...data, status: "pending" } });
      await this.prisma.user.update({ where: { id: user.id }, data: { customerId: customer.id, phone: user.phone ?? phone } });
    }
    return this.getMe(userId);
  }
}
