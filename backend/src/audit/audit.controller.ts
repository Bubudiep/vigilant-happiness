import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AdminOnly, AppAuthGuard } from "../common/guards/app-auth.guard";
import { AuditService } from "./audit.service";

@ApiTags("audit")
@ApiBearerAuth()
@UseGuards(AppAuthGuard)
@AdminOnly()
@Controller("admin/audit")
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  @ApiOperation({ summary: "Nhật ký thao tác quản trị (mới nhất trước)" })
  list(@Query("action") action?: string, @Query("take") take?: string) {
    return this.audit.list({ action, take: take ? Number(take) : undefined });
  }
}
