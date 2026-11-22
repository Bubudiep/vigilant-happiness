import { Body, Controller, Get, Headers, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import { LeadStatus } from "@prisma/client";
import type { Request } from "express";
import { AntiSpamService, clientIp } from "../antispam/antispam.service";
import { AdminOnly, AppAuthGuard } from "../common/guards/app-auth.guard";
import { RateLimit, RateLimitGuard } from "../common/guards/rate-limit.guard";
import { NotifyService } from "../notify/notify.service";
import { OAuthService } from "../oauth/oauth.service";
import { CALLBACK_SLOTS, CreateLeadDto } from "./dto/create-lead.dto";
import { UpdateLeadDto, UpdateLeadStatusDto } from "./dto/update-lead-status.dto";
import { LeadsService } from "./leads.service";

@ApiTags("leads")
@Controller("leads")
export class LeadsController {
  constructor(
    private readonly leadsService: LeadsService,
    private readonly oauth: OAuthService,
    private readonly antispam: AntiSpamService,
    private readonly notifier: NotifyService,
  ) {}

  @Post()
  @UseGuards(RateLimitGuard)
  @RateLimit(5, 600)
  @ApiOperation({
    summary: "Gửi yêu cầu tư vấn / đặt lịch gọi lại (Public)",
    description:
      "Không bắt buộc đăng nhập. Gửi kèm `Authorization: Bearer rma_...` của người dùng Zalo thì yêu cầu được gắn tài khoản và đánh dấu SĐT đã xác minh khi trùng SĐT Zalo.",
  })
  async create(@Req() req: Request, @Body() dto: CreateLeadDto, @Headers("authorization") authorization?: string) {
    let userId: string | undefined;
    let trusted = false;
    if (authorization?.startsWith("Bearer ")) {
      const resolved = await this.oauth.resolveAccessToken(authorization.slice(7).trim());
      userId = resolved?.user?.id;
      if (userId) {
        const u = await this.oauth.userPhone(userId);
        trusted = !!u && u === dto.phone;
      }
    }
    const ip = clientIp(req);
    const verdict = await this.antispam.enforce({
      route: "leads.create",
      ip,
      phone: dto.phone,
      userId,
      trusted,
      name: dto.name,
      texts: [dto.note, dto.industry],
      honeypot: dto.website,
      formToken: dto.formToken,
    });
    // Bot dính bẫy: trả về như thành công để không biết đã bị phát hiện
    if (verdict.silent) {
      return { id: "accepted", requestType: dto.requestType ?? "consultation", status: "NEW", createdAt: new Date() };
    }
    const lead = await this.leadsService.create(dto, userId, { spamScore: verdict.score, ip });
    // Chỉ báo nhân viên với yêu cầu mới và không nghi spam (gửi lặp trả về bản cũ → không báo lại)
    if (!(lead as { duplicate?: boolean }).duplicate && verdict.score < 40) {
      if (lead.requestType === "callback") {
        this.notifier.notify({
          type: "callback.created",
          name: dto.name,
          phone: dto.phone,
          verified: trusted,
          date: dto.callbackDate ?? "",
          slot: dto.callbackSlot ?? "",
          note: dto.note,
        });
      } else {
        this.notifier.notify({
          type: "lead.created",
          name: dto.name,
          phone: dto.phone,
          verified: trusted,
          industry: dto.industry,
          templateId: dto.templateId,
          note: dto.note,
        });
      }
    }
    return lead;
  }

  @Get("callback-slots")
  @ApiOperation({ summary: "Các khung giờ có thể chọn khi đặt lịch gọi lại" })
  slots() {
    return CALLBACK_SLOTS;
  }

  @Get()
  @UseGuards(AppAuthGuard)
  @AdminOnly()
  @ApiBearerAuth()
  @ApiHeader({ name: "x-admin-key", required: false })
  @ApiQuery({ name: "status", enum: LeadStatus, required: false })
  @ApiQuery({ name: "requestType", enum: ["consultation", "callback"], required: false })
  @ApiQuery({ name: "from", required: false, description: "YYYY-MM-DD (lọc theo ngày gọi lại)" })
  @ApiQuery({ name: "to", required: false })
  @ApiQuery({ name: "spam", enum: ["only", "all"], required: false, description: "Mặc định ẩn yêu cầu nghi spam" })
  @ApiOperation({ summary: "Danh sách yêu cầu tư vấn & lịch gọi lại (Admin)" })
  findAll(
    @Query("status") status?: LeadStatus,
    @Query("requestType") requestType?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("spam") spam?: "only" | "all",
  ) {
    return this.leadsService.findAll({ status, requestType, from, to, spam });
  }

  @Patch(":id")
  @UseGuards(AppAuthGuard)
  @AdminOnly()
  @ApiBearerAuth()
  @ApiOperation({ summary: "Cập nhật trạng thái + ghi chú gọi lại (Admin)" })
  update(@Param("id") id: string, @Body() dto: UpdateLeadDto) {
    return this.leadsService.update(id, dto);
  }

  @Patch(":id/status")
  @UseGuards(AppAuthGuard)
  @AdminOnly()
  @ApiBearerAuth()
  @ApiOperation({ summary: "Cập nhật trạng thái xử lý lead (Admin)" })
  updateStatus(@Param("id") id: string, @Body() dto: UpdateLeadStatusDto) {
    return this.leadsService.updateStatus(id, dto.status);
  }
}
