import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { normalizeVnPhone, ZaloService } from "../oauth/zalo.service";
import { readStampProgram } from "../stores/stamps";
import { loadWithIngredients, unitCostOf } from "../stores/inventory";
import { applyOptions, readOptions, type OptionSelection } from "../stores/options";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { makeCode, serializeBooking, serializeOrder, serializeVoucher } from "../stores/store-data";
import { StoresService } from "../stores/stores.service";
import { markVoucherUsed, quoteVoucher } from "../stores/voucher-redeem";
import { SHOP_SCOPE } from "./shop-auth.guard";

const TOKEN_TTL_SEC = 30 * 24 * 3600;

/**
 * Tài khoản & dữ liệu của khách trong Mini App của từng gian hàng.
 * Mỗi store có tệp khách riêng (StoreCustomer) — cùng một người Zalo ở 2 store là 2 tài khoản tách biệt.
 */
@Injectable()
export class ShopService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
    private readonly zalo: ZaloService,
    private readonly stores: StoresService,
  ) {}

  private async activeStore(slug: string) {
    const store = await this.prisma.store.findFirst({ where: { slug, active: true }, select: { id: true, name: true } });
    if (!store) throw new NotFoundException("Không tìm thấy cửa hàng");
    return store;
  }

  /**
   * Đăng nhập Zalo: tìm khách theo Zalo user id trong store; chưa có thì gắn với khách tạo tại quầy
   * cùng SĐT (nếu lấy được SĐT), không thì tạo tài khoản mới.
   */
  async loginWithZalo(slug: string, accessToken: string, phoneToken?: string) {
    if (!accessToken) throw new BadRequestException("Thiếu accessToken Zalo");
    const store = await this.activeStore(slug);
    const profile = await this.zalo.getProfile(accessToken);
    const phone = phoneToken
      ? await this.zalo.getPhoneNumber(accessToken, phoneToken, await this.stores.getZaloAppSecret(store.id)).catch(() => null)
      : null;

    let customer = await this.prisma.storeCustomer.findUnique({
      where: { storeId_zaloUserId: { storeId: store.id, zaloUserId: profile.id } },
    });
    if (!customer && phone) {
      const byPhone = await this.prisma.storeCustomer.findFirst({ where: { storeId: store.id, phone, zaloUserId: null } });
      if (byPhone) customer = await this.prisma.storeCustomer.update({ where: { id: byPhone.id }, data: { zaloUserId: profile.id } });
    }
    const now = new Date();
    if (customer) {
      customer = await this.prisma.storeCustomer.update({
        where: { id: customer.id },
        data: {
          lastLoginAt: now,
          avatarUrl: profile.avatarUrl ?? customer.avatarUrl,
          ...(phone && !customer.phone ? { phone } : {}),
        },
      });
    } else {
      customer = await this.prisma.storeCustomer.create({
        data: {
          storeId: store.id,
          zaloUserId: profile.id,
          name: profile.name,
          avatarUrl: profile.avatarUrl,
          phone: phone ?? "",
          lastLoginAt: now,
        },
      });
    }

    const token = this.auth.signScoped(SHOP_SCOPE, { sub: customer.id, sid: store.id }, TOKEN_TTL_SEC);
    return { access_token: token, token_type: "Bearer", expires_in: TOKEN_TTL_SEC, customer: await this.me(customer.id) };
  }

  /** Hồ sơ khách + hạng + voucher dùng được (chỉ dữ liệu của store này). */
  async me(customerId: string) {
    const c = await this.prisma.storeCustomer.findUniqueOrThrow({ where: { id: customerId } });
    const now = new Date();
    const [tiers, vouchers, store] = await Promise.all([
      this.prisma.storeMemberTier.findMany({ where: { storeId: c.storeId }, orderBy: { minSpent: "asc" } }),
      this.prisma.storeVoucher.findMany({
        where: { storeId: c.storeId, active: true, startDate: { lte: now }, endDate: { gte: now } },
        orderBy: { endDate: "asc" },
      }),
      this.prisma.store.findUnique({ where: { id: c.storeId }, select: { stampProgram: true } }),
    ]);
    const program = readStampProgram(store?.stampProgram);
    const tierIdx = tiers.findIndex((t) => t.name === c.tier);
    const tier = tiers[tierIdx] ?? null;
    const nextTier = tierIdx >= 0 ? (tiers[tierIdx + 1] ?? null) : (tiers[0] ?? null);
    return {
      id: c.id,
      name: c.name,
      phone: c.phone || null,
      avatarUrl: c.avatarUrl,
      address: c.address,
      tier: c.tier,
      points: c.points,
      totalOrders: c.totalOrders,
      totalSpent: c.totalSpent,
      // Thẻ tích tem: số tem hiện có / cần để đổi quà
      stamps: program?.enabled ? { count: c.stamps, required: program.required, reward: program.reward, icon: program.icon, redeemed: c.stampRewards } : null,
      tierInfo: tier && { code: tier.code, name: tier.name, color: tier.color, discountPercent: tier.discountPercent, benefits: tier.benefits },
      nextTier: nextTier && { name: nextTier.name, minSpent: nextTier.minSpent, remaining: Math.max(0, nextTier.minSpent - c.totalSpent) },
      vouchers: vouchers
        .filter((v) => v.usedCount < v.quantity && (!v.tierCode || v.tierCode === tier?.code))
        .map(serializeVoucher),
      createdAt: c.createdAt,
    };
  }

  async updateMe(customerId: string, dto: { name?: string; address?: string; phone?: string }) {
    const phone = dto.phone !== undefined ? normalizeVnPhone(dto.phone) : undefined;
    if (dto.phone !== undefined && !phone) throw new BadRequestException("Số điện thoại không hợp lệ");
    await this.prisma.storeCustomer.update({
      where: { id: customerId },
      data: {
        ...(dto.name?.trim() ? { name: dto.name.trim() } : {}),
        ...(dto.address !== undefined ? { address: dto.address.trim() || null } : {}),
        ...(phone ? { phone } : {}),
      },
    });
    return this.me(customerId);
  }

  async myOrders(customerId: string) {
    const list = await this.prisma.storeOrder.findMany({
      where: { customerId },
      include: { items: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return list.map(serializeOrder);
  }

  /** Giá tính lại từ DB (không tin giá client gửi), chỉ sản phẩm đang bán của đúng store. */
  async createOrder(
    storeId: string,
    customerId: string,
    dto: {
      /** options: lựa chọn size / topping… [{ groupId, choiceIds }] — giá cộng thêm tính lại theo cấu hình món */
      items?: { productId: string; quantity: number; options?: OptionSelection[] }[];
      address?: string;
      note?: string;
      phone?: string;
      paymentMethod?: string;
      voucherCode?: string;
    },
  ) {
    const items = (dto.items ?? []).filter((i) => i && typeof i.productId === "string");
    if (!items.length || items.length > 50) throw new BadRequestException("Giỏ hàng trống hoặc quá nhiều sản phẩm");
    // Sản phẩm + nguyên liệu (BOM món & BOM lựa chọn) để chốt giá vốn tại thời điểm đặt
    const byId = await loadWithIngredients(this.prisma, storeId, [...new Set(items.map((i) => i.productId))]);
    const lines = items.map((i) => {
      const p = byId.get(i.productId) as Prisma.StoreProductGetPayload<object> | undefined;
      if (!p || !p.active || p.kind === "material") throw new BadRequestException("Có sản phẩm không còn bán");
      const quantity = Math.min(99, Math.max(1, Math.round(Number(i.quantity) || 1)));
      const opt = applyOptions(p.name, readOptions(p.options), Array.isArray(i.options) ? i.options : undefined);
      const optCost = opt.picked.reduce((s, o) => s + (o.bom ?? []).reduce((x, l) => x + (byId.get(l.productId)?.costPrice ?? 0) * l.quantity, 0), 0);
      return {
        productId: p.id,
        productName: opt.label.slice(0, 200),
        imageUrl: p.imageUrl,
        unitPrice: (p.salePrice ?? p.price) + opt.extra,
        quantity,
        unitCost: unitCostOf(p, byId) + optCost,
        ...(opt.picked.length ? { options: opt.picked as unknown as Prisma.InputJsonValue } : {}),
      };
    });
    const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
    const customer = await this.prisma.storeCustomer.findUniqueOrThrow({ where: { id: customerId } });
    const phone = (dto.phone ? normalizeVnPhone(dto.phone) : null) ?? (customer.phone || null);
    if (!phone) throw new BadRequestException("Cần số điện thoại để cửa hàng liên hệ giao hàng");
    const address = dto.address?.trim() || customer.address;

    // Áp mã voucher (mã chung hoặc mã in trên thẻ) — kiểm tra & ghi nhận trong cùng transaction
    const order = await this.prisma.$transaction(async (tx) => {
      const quote = dto.voucherCode?.trim()
        ? await quoteVoucher(tx, storeId, dto.voucherCode, { subtotal, shippingFee: 0, tierName: customer.tier })
        : null;
      const discountAmount = quote?.discount ?? 0;
      const created = await tx.storeOrder.create({
        data: {
          storeId,
          customerId,
          code: makeCode("DH"),
          customerName: customer.name,
          phone,
          address,
          subtotal,
          discountAmount,
          voucherCode: quote?.code ?? null,
          totalAmount: subtotal - discountAmount,
          // Mini App: thu khi giao / chuyển khoản → coi như thu đủ (không tính công nợ)
          paidAmount: subtotal - discountAmount,
          paymentMethod: dto.paymentMethod === "bank_transfer" ? "bank_transfer" : "cod",
          note: dto.note?.trim().slice(0, 500) || null,
          items: { create: lines.map((l) => ({ ...l, lineTotal: l.unitPrice * l.quantity })) },
        },
        include: { items: true },
      });
      if (quote) await markVoucherUsed(tx, quote, created);
      return created;
    });
    if (!customer.phone || (address && !customer.address)) {
      await this.prisma.storeCustomer.update({
        where: { id: customerId },
        data: { ...(!customer.phone ? { phone } : {}), ...(address && !customer.address ? { address } : {}) },
      });
    }
    return serializeOrder(order);
  }

  async myBookings(customerId: string) {
    const list = await this.prisma.storeBooking.findMany({ where: { customerId }, orderBy: { bookingDate: "desc" }, take: 100 });
    return list.map(serializeBooking);
  }

  async createBooking(
    storeId: string,
    customerId: string,
    dto: { serviceName?: string; date?: string; timeSlot?: string; note?: string; phone?: string },
  ) {
    const serviceName = dto.serviceName?.trim();
    const timeSlot = dto.timeSlot?.trim();
    const date = dto.date ? new Date(dto.date) : null;
    if (!serviceName || !timeSlot || !date || Number.isNaN(date.getTime())) {
      throw new BadRequestException("Cần dịch vụ, ngày và khung giờ");
    }
    if (date.getTime() < Date.now() - 24 * 3600 * 1000) throw new BadRequestException("Ngày hẹn đã qua");
    const customer = await this.prisma.storeCustomer.findUniqueOrThrow({ where: { id: customerId } });
    const phone = (dto.phone ? normalizeVnPhone(dto.phone) : null) ?? (customer.phone || null);
    if (!phone) throw new BadRequestException("Cần số điện thoại để cửa hàng xác nhận lịch hẹn");
    const b = await this.prisma.storeBooking.create({
      data: {
        storeId,
        customerId,
        code: makeCode("LH"),
        customerName: customer.name,
        phone,
        serviceName: serviceName.slice(0, 200),
        bookingDate: date,
        timeSlot: timeSlot.slice(0, 50),
        note: dto.note?.trim().slice(0, 500) || null,
      },
    });
    if (!customer.phone) await this.prisma.storeCustomer.update({ where: { id: customerId }, data: { phone } });
    return serializeBooking(b);
  }
}
