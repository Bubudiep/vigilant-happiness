import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateSubscriptionDto, UpdateSubscriptionDto, UpsertPlanDto } from "./dto/subscription.dto";

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  findPlans() {
    return this.prisma.subscriptionPlan.findMany({
      include: { _count: { select: { subscriptions: true } } },
      orderBy: [{ sortOrder: "asc" }, { priceMonthly: "asc" }],
    });
  }

  createPlan(dto: UpsertPlanDto) {
    return this.prisma.subscriptionPlan.create({
      data: {
        code: dto.code.trim().toLowerCase(),
        name: dto.name.trim(),
        description: dto.description?.trim(),
        priceMonthly: dto.priceMonthly,
        priceYearly: dto.priceYearly,
        maxStores: dto.maxStores ?? 1,
        maxProducts: dto.maxProducts ?? 100,
        maxStaff: dto.maxStaff ?? 5,
        features: (dto.features ?? []) as Prisma.InputJsonValue,
        isActive: dto.isActive ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async updatePlan(id: string, dto: UpsertPlanDto) {
    const existing = await this.prisma.subscriptionPlan.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Không tìm thấy gói đăng ký");
    return this.prisma.subscriptionPlan.update({
      where: { id },
      data: {
        code: dto.code.trim().toLowerCase(),
        name: dto.name.trim(),
        description: dto.description?.trim(),
        priceMonthly: dto.priceMonthly,
        priceYearly: dto.priceYearly,
        maxStores: dto.maxStores ?? existing.maxStores,
        maxProducts: dto.maxProducts ?? existing.maxProducts,
        maxStaff: dto.maxStaff ?? existing.maxStaff,
        features: (dto.features ?? existing.features) as Prisma.InputJsonValue,
        isActive: dto.isActive ?? existing.isActive,
        sortOrder: dto.sortOrder ?? existing.sortOrder,
      },
    });
  }

  findSubscriptions(customerId?: string) {
    return this.prisma.subscription.findMany({
      where: customerId ? { customerId } : undefined,
      include: {
        customer: { select: { id: true, name: true, companyName: true, phone: true } },
        plan: true,
        _count: { select: { stores: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async createSubscription(dto: CreateSubscriptionDto) {
    const [customer, plan] = await Promise.all([
      this.prisma.platformCustomer.findUnique({ where: { id: dto.customerId }, select: { id: true } }),
      this.prisma.subscriptionPlan.findUnique({ where: { id: dto.planId } }),
    ]);
    if (!customer) throw new NotFoundException("Không tìm thấy khách hàng");
    if (!plan) throw new NotFoundException("Không tìm thấy gói đăng ký");

    const billingCycle = dto.billingCycle ?? "monthly";
    const defaultPrice = billingCycle === "yearly" ? plan.priceYearly : plan.priceMonthly;

    return this.prisma.subscription.create({
      data: {
        customerId: dto.customerId,
        planId: dto.planId,
        billingCycle,
        pricePaid: dto.pricePaid ?? defaultPrice,
        status: dto.status ?? "active",
        startedAt: dto.startedAt ? new Date(dto.startedAt) : new Date(),
        expiresAt: new Date(dto.expiresAt),
        autoRenew: dto.autoRenew ?? false,
        note: dto.note?.trim(),
      },
      include: { customer: true, plan: true },
    });
  }

  async updateSubscription(id: string, dto: UpdateSubscriptionDto) {
    const existing = await this.prisma.subscription.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Không tìm thấy bản ghi đăng ký gói");
    return this.prisma.subscription.update({
      where: { id },
      data: {
        planId: dto.planId,
        billingCycle: dto.billingCycle,
        pricePaid: dto.pricePaid,
        status: dto.status,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        autoRenew: dto.autoRenew,
        note: dto.note?.trim(),
      },
      include: { customer: true, plan: true },
    });
  }
}
