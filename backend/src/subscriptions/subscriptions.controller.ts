import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AdminOnly, AppAuthGuard } from "../common/guards/app-auth.guard";
import { CreateSubscriptionDto, UpdateSubscriptionDto, UpsertPlanDto } from "./dto/subscription.dto";
import type { PlatformVoucherInput } from "./platform-vouchers";
import { SubscriptionsService } from "./subscriptions.service";

@ApiTags("subscriptions")
@Controller("subscriptions")
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get("plans")
  findPlans() {
    return this.subscriptionsService.findPlans();
  }

  @Post("plans")
  @UseGuards(AppAuthGuard)
  @AdminOnly()
  @ApiBearerAuth()
  createPlan(@Body() dto: UpsertPlanDto) {
    return this.subscriptionsService.createPlan(dto);
  }

  @Patch("plans/:id")
  @UseGuards(AppAuthGuard)
  @AdminOnly()
  @ApiBearerAuth()
  updatePlan(@Param("id") id: string, @Body() dto: UpsertPlanDto) {
    return this.subscriptionsService.updatePlan(id, dto);
  }

  @Delete("plans/:id")
  @UseGuards(AppAuthGuard)
  @AdminOnly()
  @ApiBearerAuth()
  removePlan(@Param("id") id: string) {
    return this.subscriptionsService.removePlan(id);
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
  createVoucher(@Body() body: PlatformVoucherInput) {
    return this.subscriptionsService.createVoucher(body ?? {});
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
  updateVoucher(@Param("id") id: string, @Body() body: PlatformVoucherInput) {
    return this.subscriptionsService.updateVoucher(id, body ?? {});
  }

  @Delete("vouchers/:id")
  @UseGuards(AppAuthGuard)
  @AdminOnly()
  @ApiBearerAuth()
  removeVoucher(@Param("id") id: string) {
    return this.subscriptionsService.removeVoucher(id);
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
  createSubscription(@Body() dto: CreateSubscriptionDto) {
    return this.subscriptionsService.createSubscription(dto);
  }

  @Patch(":id")
  @UseGuards(AppAuthGuard)
  @AdminOnly()
  @ApiBearerAuth()
  updateSubscription(@Param("id") id: string, @Body() dto: UpdateSubscriptionDto) {
    return this.subscriptionsService.updateSubscription(id, dto);
  }
}
