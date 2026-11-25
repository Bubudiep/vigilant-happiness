import { Controller, Get, Param, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AppAuthGuard, RequireScopes, type AppRequest } from "../common/guards/app-auth.guard";
import { PrismaService } from "../prisma/prisma.service";
import { StoresService } from "../stores/stores.service";
import { StorageQuotaService } from "./storage-quota.service";

/** Chủ shop (và admin) xem dung lượng đã dùng / hạn mức của gian hàng mình. */
@ApiTags("storage")
@ApiBearerAuth()
@UseGuards(AppAuthGuard)
@RequireScopes("stores:read")
@Controller("stores/:id")
export class StoreStorageController {
  constructor(
    private readonly quota: StorageQuotaService,
    private readonly stores: StoresService,
    private readonly prisma: PrismaService,
  ) {}

  @Get("storage")
  @ApiOperation({ summary: "Dung lượng đã dùng / hạn mức theo gói của gian hàng" })
  async usage(@Req() req: AppRequest, @Param("id") id: string) {
    await this.stores.ensureAccess(req.auth!, id);
    return this.quota.usage(id);
  }

  /** Gói đang dùng + hạn mức cho trang Tổng quan của chủ shop */
  @Get("plan")
  @ApiOperation({ summary: "Gói dịch vụ đang dùng, hạn dùng và hạn mức (sản phẩm, nhân sự, dung lượng) của gian hàng" })
  async plan(@Req() req: AppRequest, @Param("id") id: string) {
    await this.stores.ensureAccess(req.auth!, id);
    const [store, products, staff, storage] = await Promise.all([
      this.prisma.store.findUniqueOrThrow({
        where: { id },
        select: {
          subscription: {
            select: {
              status: true,
              billingCycle: true,
              startedAt: true,
              expiresAt: true,
              autoRenew: true,
              plan: { select: { code: true, name: true, priceMonthly: true, priceYearly: true, maxProducts: true, maxStaff: true, storageQuotaMb: true, features: true } },
            },
          },
        },
      }),
      this.prisma.storeProduct.count({ where: { storeId: id } }),
      this.prisma.storeStaff.count({ where: { storeId: id, status: { not: "quit" } } }),
      this.quota.usage(id),
    ]);
    const sub = store.subscription;
    const daysLeft = sub ? Math.ceil((sub.expiresAt.getTime() - Date.now()) / 86_400_000) : null;
    return {
      subscription: sub
        ? {
            status: sub.status,
            billingCycle: sub.billingCycle,
            startedAt: sub.startedAt.toISOString(),
            expiresAt: sub.expiresAt.toISOString(),
            autoRenew: sub.autoRenew,
            daysLeft,
            plan: { ...sub.plan, features: Array.isArray(sub.plan.features) ? sub.plan.features.map(String) : [] },
          }
        : null,
      usage: {
        products,
        staff,
        usedBytes: storage.usedBytes,
        quotaBytes: storage.quotaBytes,
      },
    };
  }
}
