import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AdminOnly, AppAuthGuard } from "../common/guards/app-auth.guard";
import { StorageStatsService } from "./storage-stats.service";

@ApiTags("storage")
@ApiBearerAuth()
@UseGuards(AppAuthGuard)
@AdminOnly()
@Controller("admin/storage")
export class StorageStatsController {
  constructor(private readonly stats: StorageStatsService) {}

  @Get()
  @ApiOperation({ summary: "Dung lượng: ổ đĩa server, DB, ảnh theo từng gian hàng và tổng" })
  overview() {
    return this.stats.overview();
  }
}
