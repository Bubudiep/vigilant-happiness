import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { randomBytes } from "crypto";
import * as jwt from "jsonwebtoken";
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
  private safeRedirectPath(path: string | undefined, fallback = "/admin/overview"): string {
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

  getGoogleAuthUrl(redirectPath = "/admin/overview", loginHint?: string): string {
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
    if (!state) return "/admin/overview";
    try {
      const parsed = JSON.parse(Buffer.from(state, "base64url").toString("utf8")) as { redirect?: string };
      return this.safeRedirectPath(parsed.redirect);
    } catch {
      // ignore invalid state
    }
    return "/admin/overview";
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
      },
    });
    if (!user) {
      throw new UnauthorizedException("Không tìm thấy tài khoản người dùng");
    }
    return user;
  }
}
