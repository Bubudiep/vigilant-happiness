import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AdminOnly, AppAuthGuard } from "../common/guards/app-auth.guard";
import { CreateSubscriptionDto, UpdateSubscriptionDto, UpsertPlanDto } from "./dto/subscription.dto";
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
