import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateSubscriptionDto, UpdateSubscriptionDto, UpsertPlanDto } from "./dto/subscription.dto";
import { cleanVoucher, PlatformVoucherInput, quotePlatformVoucher } from "./platform-vouchers";

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

  async removePlan(id: string) {
    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id }, include: { _count: { select: { subscriptions: true } } } });
    if (!plan) throw new NotFoundException("Không tìm thấy gói đăng ký");
    if (plan._count.subscriptions) throw new ConflictException("Gói đang có khách đăng ký — hãy tắt gói thay vì xoá");
    await this.prisma.subscriptionPlan.delete({ where: { id } });
    return { id, deleted: true };
  }

  // ───────────── Voucher nền tảng ─────────────

  findVouchers() {
    return this.prisma.platformVoucher.findMany({ orderBy: [{ active: "desc" }, { createdAt: "desc" }] });
  }

  async createVoucher(dto: PlatformVoucherInput) {
    const data = cleanVoucher(dto, false) as Prisma.PlatformVoucherUncheckedCreateInput;
    if (await this.prisma.platformVoucher.findUnique({ where: { code: data.code } })) throw new ConflictException(`Mã ${data.code} đã tồn tại`);
    return this.prisma.platformVoucher.create({ data });
  }

  async updateVoucher(id: string, dto: PlatformVoucherInput) {
    const v = await this.prisma.platformVoucher.findUnique({ where: { id } });
    if (!v) throw new NotFoundException("Không tìm thấy voucher");
    const data = cleanVoucher(dto, true);
    if (data.code && data.code !== v.code && (await this.prisma.platformVoucher.findUnique({ where: { code: data.code as string } })))
      throw new ConflictException(`Mã ${data.code} đã tồn tại`);
    return this.prisma.platformVoucher.update({ where: { id }, data });
  }

  async removeVoucher(id: string) {
    const v = await this.prisma.platformVoucher.findUnique({ where: { id } });
    if (!v) throw new NotFoundException("Không tìm thấy voucher");
    await this.prisma.platformVoucher.delete({ where: { id } });
    return { id, deleted: true };
  }

  /** Xem trước giá sau voucher cho gói + chu kỳ. */
  async previewVoucher(body: { code?: string; planId?: string; billingCycle?: string }) {
    const plan = body.planId ? await this.prisma.subscriptionPlan.findUnique({ where: { id: body.planId } }) : null;
    if (!plan) throw new BadRequestException("Chọn gói");
    const billingCycle = body.billingCycle === "yearly" ? "yearly" : "monthly";
    const amount = billingCycle === "yearly" ? plan.priceYearly : plan.priceMonthly;
    const v = await this.prisma.platformVoucher.findUnique({ where: { code: String(body.code ?? "").trim().toUpperCase() } });
    return { amount, ...quotePlatformVoucher(v, { planId: plan.id, billingCycle, amount }) };
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
    const code = dto.voucherCode?.trim().toUpperCase();

    return this.prisma.$transaction(async (tx) => {
      let discountAmount = 0;
      if (code) {
        const v = await tx.platformVoucher.findUnique({ where: { code } });
        const q = quotePlatformVoucher(v, { planId: plan.id, billingCycle, amount: defaultPrice });
        // Giữ lượt có điều kiện để 2 người dùng cùng lúc không vượt số lượt
        const took = await tx.platformVoucher.updateMany({ where: { id: v!.id, usedCount: { lt: v!.quantity } }, data: { usedCount: { increment: 1 } } });
        if (!took.count) throw new BadRequestException("Voucher đã hết lượt");
        discountAmount = q.discount;
      }
      return tx.subscription.create({
      data: {
        customerId: dto.customerId,
        planId: dto.planId,
        billingCycle,
        voucherCode: code || null,
        discountAmount,
        pricePaid: dto.pricePaid ?? defaultPrice - discountAmount,
        status: dto.status ?? "active",
        startedAt: dto.startedAt ? new Date(dto.startedAt) : new Date(),
        expiresAt: new Date(dto.expiresAt),
        autoRenew: dto.autoRenew ?? false,
        note: dto.note?.trim(),
      },
      include: { customer: true, plan: true },
      });
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
