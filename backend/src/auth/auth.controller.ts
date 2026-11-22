import { Body, Controller, Get, Post, Query, Req, Res, UseGuards } from "@nestjs/common";
import { Response } from "express";
import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import { AuthService } from "./auth.service";
import { AuthenticatedRequest, JwtAuthGuard } from "./jwt-auth.guard";

class RegisterSellerDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  companyName?: string;

  @IsString()
  @MaxLength(30)
  phone!: string;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

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
      const url = this.authService.getGoogleAuthUrl(redirect || "/admin", loginHint);
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

  /** Chủ shop gửi đăng ký người bán (chờ quản trị viên kích hoạt) */
  @Post("register-seller")
  @UseGuards(JwtAuthGuard)
  registerSeller(@Req() req: AuthenticatedRequest, @Body() dto: RegisterSellerDto) {
    return this.authService.registerSeller(req.user!.sub, dto);
  }
}
