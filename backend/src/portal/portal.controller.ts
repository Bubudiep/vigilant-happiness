import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AntiSpamService, clientIp } from "../antispam/antispam.service";
import { AuditService } from "../audit/audit.service";
import { AdminOnly, AppAuthGuard, RequireScopes, type AppRequest } from "../common/guards/app-auth.guard";
import { RateLimit, RateLimitGuard } from "../common/guards/rate-limit.guard";
import { PrismaService } from "../prisma/prisma.service";
import {
  AdminUpdateTicketDto,
  CreateMilestoneDto,
  CreateProjectDto,
  CreateTicketDto,
  StaffReplyDto,
  TicketReplyDto,
  UpdateMilestoneDto,
  UpdateProjectDto,
} from "./portal.dto";
import { PortalService } from "./portal.service";

/** Cổng khách hàng trong Mini App (đăng nhập Zalo). */
@ApiTags("portal")
@ApiBearerAuth()
@UseGuards(AppAuthGuard)
@RequireScopes("profile")
@Controller("me")
export class PortalController {
  constructor(
    private readonly portal: PortalService,
    private readonly antispam: AntiSpamService,
    private readonly prisma: PrismaService,
  ) {}

  private async authorName(req: AppRequest) {
    if (!req.auth?.userId) return "Khách hàng";
    const u = await this.prisma.user.findUnique({ where: { id: req.auth.userId }, select: { name: true } });
    return u?.name ?? "Khách hàng";
  }

  @Get("overview")
  @ApiOperation({ summary: "Mini App đã đăng, gói dịch vụ, tiến độ dự án, ticket của khách đang đăng nhập" })
  overview(@Req() req: AppRequest) {
    return this.portal.overview(req.auth!);
  }

  @Get("tickets/:id")
  ticket(@Req() req: AppRequest, @Param("id") id: string) {
    return this.portal.getMyTicket(req.auth!, id);
  }

  @Post("tickets")
  @RequireScopes("tickets:write")
  @UseGuards(RateLimitGuard)
  @RateLimit(10, 3600)
  @ApiOperation({ summary: "Tạo ticket hỗ trợ" })
  async createTicket(@Req() req: AppRequest, @Body() dto: CreateTicketDto) {
    await this.antispam.enforce({
      route: "portal.ticket",
      ip: clientIp(req),
      userId: req.auth!.userId,
      trusted: true, // đã đăng nhập Zalo + gắn hợp đồng → không đòi form token
      texts: [dto.subject, dto.body],
      honeypot: dto.website,
    });
    return this.portal.createTicket(req.auth!, dto, await this.authorName(req));
  }

  @Post("tickets/:id/messages")
  @RequireScopes("tickets:write")
  @UseGuards(RateLimitGuard)
  @RateLimit(30, 3600)
  async reply(@Req() req: AppRequest, @Param("id") id: string, @Body() dto: TicketReplyDto) {
    await this.antispam.enforce({
      route: "portal.reply",
      ip: clientIp(req),
      userId: req.auth!.userId,
      trusted: true,
      texts: [dto.body],
      honeypot: dto.website,
    });
    return this.portal.customerReply(req.auth!, id, dto.body, await this.authorName(req));
  }

  @Post("tickets/:id/close")
  @RequireScopes("tickets:write")
  async close(@Req() req: AppRequest, @Param("id") id: string) {
    return this.portal.customerClose(req.auth!, id, await this.authorName(req));
  }
}

/** Quản trị dự án & ticket (nhân viên reMini). */
@ApiTags("portal-admin")
@ApiBearerAuth()
@UseGuards(AppAuthGuard)
@AdminOnly()
@Controller("admin")
export class PortalAdminController {
  constructor(
    private readonly portal: PortalService,
    private readonly audit: AuditService,
  ) {}

  @Get("projects")
  projects(@Query("customerId") customerId?: string) {
    return this.portal.listProjects(customerId);
  }

  @Post("projects")
  async createProject(@Req() req: AppRequest, @Body() dto: CreateProjectDto) {
    const p = await this.portal.createProject(dto);
    void this.audit.record(req, "project.create", { type: "project", id: p.id }, { name: dto.name, customerId: dto.customerId });
    return p;
  }

  @Patch("projects/:id")
  async updateProject(@Req() req: AppRequest, @Param("id") id: string, @Body() dto: UpdateProjectDto) {
    const p = await this.portal.updateProject(id, dto);
    void this.audit.record(req, "project.update", { type: "project", id }, { fields: Object.keys(dto), status: dto.status, progress: dto.progress });
    return p;
  }

  @Delete("projects/:id")
  async removeProject(@Req() req: AppRequest, @Param("id") id: string) {
    const p = await this.portal.removeProject(id);
    void this.audit.record(req, "project.delete", { type: "project", id }, { name: p.name });
    return p;
  }

  @Post("projects/:id/milestones")
  addMilestone(@Param("id") id: string, @Body() dto: CreateMilestoneDto) {
    return this.portal.addMilestone(id, dto);
  }

  @Patch("milestones/:id")
  updateMilestone(@Param("id") id: string, @Body() dto: UpdateMilestoneDto) {
    return this.portal.updateMilestone(id, dto);
  }

  @Delete("milestones/:id")
  removeMilestone(@Param("id") id: string) {
    return this.portal.removeMilestone(id);
  }

  @Get("tickets")
  tickets(@Query("status") status?: string) {
    return this.portal.listTickets(status);
  }

  @Get("tickets/:id")
  ticket(@Param("id") id: string) {
    return this.portal.getTicket(id);
  }

  @Patch("tickets/:id")
  async updateTicket(@Req() req: AppRequest, @Param("id") id: string, @Body() dto: AdminUpdateTicketDto) {
    const t = await this.portal.updateTicket(id, dto);
    void this.audit.record(req, "ticket.update", { type: "ticket", id }, { ...dto });
    return t;
  }

  @Post("tickets/:id/messages")
  reply(@Req() req: AppRequest, @Param("id") id: string, @Body() dto: StaffReplyDto) {
    return this.portal.staffReply(id, dto, req.auth!);
  }
}
