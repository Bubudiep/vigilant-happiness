import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuditService } from "../audit/audit.service";
import { AdminOnly, AppAuthGuard, RequireScopes, type AppRequest } from "../common/guards/app-auth.guard";
import { RateLimit, RateLimitGuard } from "../common/guards/rate-limit.guard";
import { StoresService } from "../stores/stores.service";
import { CreateBuildDto, ReviewBuildDto } from "./builds.dto";
import { BuildsService } from "./builds.service";

/** Chủ shop: gửi & theo dõi yêu cầu build Mini App riêng — /stores/:id/build-requests */
@ApiTags("builds")
@ApiBearerAuth()
@UseGuards(AppAuthGuard)
@RequireScopes("stores:write")
@Controller("stores/:id/build-requests")
export class StoreBuildsController {
  constructor(
    private readonly builds: BuildsService,
    private readonly stores: StoresService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  async list(@Req() req: AppRequest, @Param("id") id: string) {
    await this.stores.ensureSection(req.auth!, id, "settings");
    return this.builds.listForStore(id);
  }

  @Post()
  @UseGuards(RateLimitGuard)
  @RateLimit(10, 3600)
  @ApiOperation({ summary: "Gửi yêu cầu build Mini App riêng (lưu bản chụp cấu hình gian hàng, chờ reMini duyệt)" })
  async create(@Req() req: AppRequest, @Param("id") id: string, @Body() dto: CreateBuildDto) {
    await this.stores.ensureSection(req.auth!, id, "settings");
    const r = await this.builds.create(id, dto, req.auth?.email ?? undefined);
    void this.audit.record(req, "build.request", { type: "build", id: r.id }, { storeId: id });
    return r;
  }

  @Post(":rid/cancel")
  async cancel(@Req() req: AppRequest, @Param("id") id: string, @Param("rid") rid: string) {
    await this.stores.ensureSection(req.auth!, id, "settings");
    const r = await this.builds.cancel(id, rid);
    void this.audit.record(req, "build.cancel", { type: "build", id: rid });
    return r;
  }
}

/** Quản trị reMini: duyệt yêu cầu build — /admin/build-requests */
@ApiTags("builds")
@ApiBearerAuth()
@UseGuards(AppAuthGuard)
@AdminOnly()
@Controller("admin/build-requests")
export class AdminBuildsController {
  constructor(
    private readonly builds: BuildsService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  list(@Query("status") status?: string) {
    return this.builds.list(status);
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.builds.get(id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Duyệt (approve) → chờ Zalo duyệt · phát hành (publish) · từ chối (reject, cần lý do)" })
  async review(@Req() req: AppRequest, @Param("id") id: string, @Body() dto: ReviewBuildDto) {
    const r = await this.builds.review(id, dto);
    void this.audit.record(req, `build.${dto.action}`, { type: "build", id }, { status: r.status });
    return r;
  }
}
