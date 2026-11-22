import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Patch, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuditService } from "../audit/audit.service";
import { AdminOnly, AppAuthGuard, type AppRequest } from "../common/guards/app-auth.guard";
import { PrismaService } from "../prisma/prisma.service";
import { AuthService } from "./auth.service";

/**
 * Tài khoản đăng nhập web quản trị (Google). Quản trị viên nền tảng đánh dấu tài khoản nào là
 * "Quản trị nền tảng" (User.role = admin). ADMIN_EMAILS trong .env chỉ để tạo quản trị viên đầu tiên.
 */
@ApiTags("admin")
@ApiBearerAuth()
@UseGuards(AppAuthGuard)
@AdminOnly()
@Controller("admin/accounts")
export class AccountsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @ApiOperation({ summary: "Danh sách tài khoản Google đăng nhập web quản trị" })
  async list() {
    const users = await this.prisma.user.findMany({
      where: { provider: "google" },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        role: true,
        lastLoginAt: true,
        createdAt: true,
        customer: { select: { id: true, name: true, companyName: true, status: true } },
      },
      orderBy: { lastLoginAt: "desc" },
      take: 500,
    });
    return users.map((u) => ({
      ...u,
      isAdmin: this.auth.isAdminUser(u),
      /** Là quản trị nhờ ADMIN_EMAILS (không gỡ được ở giao diện) */
      adminViaEnv: u.role !== "admin" && this.auth.isAdminUser(u),
    }));
  }

  @Patch(":id")
  @ApiOperation({ summary: "Đánh dấu / bỏ đánh dấu quản trị nền tảng (role: admin | owner)" })
  async setRole(@Req() req: AppRequest, @Param("id") id: string, @Body() body: { role?: string }) {
    const role = body?.role;
    if (role !== "admin" && role !== "owner") throw new BadRequestException("role phải là admin hoặc owner");
    if (id === req.auth?.userId && role !== "admin") {
      throw new BadRequestException("Không thể tự gỡ quyền quản trị của chính mình");
    }
    const user = await this.prisma.user.findFirst({ where: { id, provider: "google" }, select: { id: true } });
    if (!user) throw new NotFoundException("Không tìm thấy tài khoản");
    const updated = await this.prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, email: true, role: true },
    });
    void this.audit.record(req, "account.role", { type: "user", id }, { role });
    return updated;
  }
}
