import { Body, Controller, Get, Post, Query, Req, Res, UseGuards } from "@nestjs/common";
import { Response } from "express";
import { AuthService } from "./auth.service";
import { AuthenticatedRequest, JwtAuthGuard } from "./jwt-auth.guard";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** Trả về Google Client ID công khai cho Google One Tap trên Frontend */
  @Get("google/config")
  googleConfig() {
    return { clientId: this.authService.getGoogleClientId() };
  }

  /** Đăng nhập trực tiếp bằng Google One Tap (ID Token) */
  @Post("google/one-tap")
  googleOneTap(@Body("credential") credential: string) {
    return this.authService.handleGoogleOneTap(credential);
  }

  /** Bắt đầu luồng đăng nhập Google OAuth 2.0 */
  @Get("google")
  googleLogin(
    @Query("redirect") redirect: string | undefined,
    @Query("login_hint") loginHint: string | undefined,
    @Res() res: Response,
  ) {
    try {
      const url = this.authService.getGoogleAuthUrl(redirect || "/admin/overview", loginHint);
      return res.redirect(url);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi cấu hình Google OAuth";
      const frontendUrl = this.authService.getFrontendUrl();
      return res.redirect(`${frontendUrl}/login?auth_error=${encodeURIComponent(message)}`);
    }
  }

  /** Google OAuth 2.0 Callback */
  @Get("google/callback")
  async googleCallback(
    @Query("code") code: string | undefined,
    @Query("state") state: string | undefined,
    @Query("error") error: string | undefined,
    @Res() res: Response,
  ) {
    const frontendUrl = this.authService.getFrontendUrl();

    if (error) {
      return res.redirect(
        `${frontendUrl}/login?auth_error=${encodeURIComponent("Bạn đã hủy đăng nhập Google")}`,
      );
    }

    try {
      const result = await this.authService.handleGoogleCallback(code || "", state);
      const params = new URLSearchParams({
        token: result.token,
        redirect: result.redirect,
      });
      return res.redirect(`${frontendUrl}/login?${params.toString()}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Đăng nhập Google thất bại";
      return res.redirect(`${frontendUrl}/login?auth_error=${encodeURIComponent(message)}`);
    }
  }

  /** Lấy thông tin tài khoản hiện tại từ JWT */
  @Get("me")
  @UseGuards(JwtAuthGuard)
  me(@Req() req: AuthenticatedRequest) {
    return this.authService.getMe(req.user!.sub);
  }
}
