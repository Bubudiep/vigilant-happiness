import { Controller, Get, Param, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AppAuthGuard, RequireScopes, type AppRequest } from "../common/guards/app-auth.guard";
import { StoresService } from "../stores/stores.service";
import { StorageQuotaService } from "./storage-quota.service";

/** Chủ shop (và admin) xem dung lượng đã dùng / hạn mức của gian hàng mình. */
@ApiTags("storage")
@ApiBearerAuth()
@UseGuards(AppAuthGuard)
@RequireScopes("stores:read")
@Controller("stores/:id/storage")
export class StoreStorageController {
  constructor(
    private readonly quota: StorageQuotaService,
    private readonly stores: StoresService,
  ) {}

  @Get()
  @ApiOperation({ summary: "Dung lượng đã dùng / hạn mức theo gói của gian hàng" })
  async usage(@Req() req: AppRequest, @Param("id") id: string) {
    await this.stores.ensureAccess(req.auth!, id);
    return this.quota.usage(id);
  }
}
