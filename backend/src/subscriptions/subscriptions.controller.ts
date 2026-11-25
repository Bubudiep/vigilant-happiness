import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AuditService } from "../audit/audit.service";
import { AdminOnly, AppAuthGuard, type AppRequest } from "../common/guards/app-auth.guard";
import { CreateSubscriptionDto, UpdateSubscriptionDto, UpsertPlanDto } from "./dto/subscription.dto";
import type { PlatformVoucherInput } from "./platform-vouchers";
import { SubscriptionsService } from "./subscriptions.service";

@ApiTags("subscriptions")
@Controller("subscriptions")
export class SubscriptionsController {
  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly audit: AuditService,
  ) {}

  @Get("plans")
  findPlans() {
    return this.subscriptionsService.findPlans();
  }

  @Post("plans")
  @UseGuards(AppAuthGuard)
  @AdminOnly()
  @ApiBearerAuth()
  async createPlan(@Req() req: AppRequest, @Body() dto: UpsertPlanDto) {
    const p = await this.subscriptionsService.createPlan(dto);
    void this.audit.record(req, "plan.create", { type: "plan", id: p.id }, { code: p.code, name: p.name, priceMonthly: p.priceMonthly, priceYearly: p.priceYearly, storageQuotaMb: p.storageQuotaMb });
    return p;
  }

  @Patch("plans/:id")
  @UseGuards(AppAuthGuard)
  @AdminOnly()
  @ApiBearerAuth()
  async updatePlan(@Req() req: AppRequest, @Param("id") id: string, @Body() dto: UpsertPlanDto) {
    const before = await this.subscriptionsService.findPlan(id);
    const p = await this.subscriptionsService.updatePlan(id, dto);
    void this.audit.record(req, "plan.update", { type: "plan", id }, { code: p.code, name: p.name, priceMonthly: p.priceMonthly, priceYearly: p.priceYearly, isActive: p.isActive });
    // Đổi hạn mức dung lượng ảnh của gói ảnh hưởng mọi gian hàng thuộc gói → ghi riêng để dễ tra
    if (before.storageQuotaMb !== p.storageQuotaMb) {
      void this.audit.record(req, "plan.storage_quota", { type: "plan", id }, { name: p.name, fromMb: before.storageQuotaMb, toMb: p.storageQuotaMb });
    }
    return p;
  }

  @Delete("plans/:id")
  @UseGuards(AppAuthGuard)
  @AdminOnly()
  @ApiBearerAuth()
  async removePlan(@Req() req: AppRequest, @Param("id") id: string) {
    const before = await this.subscriptionsService.findPlan(id);
    const r = await this.subscriptionsService.removePlan(id);
    void this.audit.record(req, "plan.delete", { type: "plan", id }, { code: before.code, name: before.name });
    return r;
  }

  // Voucher nền tảng (giảm giá khi khách mua / gia hạn gói)
  @Get("vouchers")
  @UseGuards(AppAuthGuard)
  @AdminOnly()
  @ApiBearerAuth()
  findVouchers() {
    return this.subscriptionsService.findVouchers();
  }

  @Post("vouchers")
  @UseGuards(AppAuthGuard)
  @AdminOnly()
  @ApiBearerAuth()
  async createVoucher(@Req() req: AppRequest, @Body() body: PlatformVoucherInput) {
    const v = await this.subscriptionsService.createVoucher(body ?? {});
    void this.audit.record(req, "plan_voucher.create", { type: "plan_voucher", id: v.id }, { code: v.code, discountType: v.discountType, discountValue: v.discountValue, quantity: v.quantity });
    return v;
  }

  @Post("vouchers/preview")
  @UseGuards(AppAuthGuard)
  @AdminOnly()
  @ApiBearerAuth()
  previewVoucher(@Body() body: { code?: string; planId?: string; billingCycle?: string }) {
    return this.subscriptionsService.previewVoucher(body ?? {});
  }

  @Patch("vouchers/:id")
  @UseGuards(AppAuthGuard)
  @AdminOnly()
  @ApiBearerAuth()
  async updateVoucher(@Req() req: AppRequest, @Param("id") id: string, @Body() body: PlatformVoucherInput) {
    const v = await this.subscriptionsService.updateVoucher(id, body ?? {});
    void this.audit.record(req, "plan_voucher.update", { type: "plan_voucher", id }, { code: v.code, fields: Object.keys(body ?? {}), active: v.active });
    return v;
  }

  @Delete("vouchers/:id")
  @UseGuards(AppAuthGuard)
  @AdminOnly()
  @ApiBearerAuth()
  async removeVoucher(@Req() req: AppRequest, @Param("id") id: string) {
    const r = await this.subscriptionsService.removeVoucher(id);
    void this.audit.record(req, "plan_voucher.delete", { type: "plan_voucher", id });
    return r;
  }

  @Get()
  @UseGuards(AppAuthGuard)
  @AdminOnly()
  @ApiBearerAuth()
  findSubscriptions(@Query("customerId") customerId?: string) {
    return this.subscriptionsService.findSubscriptions(customerId);
  }

  @Post()
  @UseGuards(AppAuthGuard)
  @AdminOnly()
  @ApiBearerAuth()
  async createSubscription(@Req() req: AppRequest, @Body() dto: CreateSubscriptionDto) {
    const sub = await this.subscriptionsService.createSubscription(dto);
    void this.audit.record(req, "subscription.create", { type: "subscription", id: sub.id }, { customerId: dto.customerId, planId: dto.planId, billingCycle: sub.billingCycle, pricePaid: sub.pricePaid, voucherCode: sub.voucherCode });
    return sub;
  }

  @Patch(":id")
  @UseGuards(AppAuthGuard)
  @AdminOnly()
  @ApiBearerAuth()
  async updateSubscription(@Req() req: AppRequest, @Param("id") id: string, @Body() dto: UpdateSubscriptionDto) {
    const sub = await this.subscriptionsService.updateSubscription(id, dto);
    void this.audit.record(req, "subscription.update", { type: "subscription", id }, { fields: Object.keys(dto), status: sub.status, planId: sub.planId });
    return sub;
  }
}
