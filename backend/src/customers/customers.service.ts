import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { normalizeVnPhone } from "../oauth/zalo.service";
import { PrismaService } from "../prisma/prisma.service";

/**
 * SĐT lưu dạng 0xxxxxxxxx để khớp với số Zalo trả về khi khách đăng nhập Mini App
 * ("0987 654 321", "+84987654321", "84987654321" đều về cùng một dạng).
 */
const phone = (raw: string) => normalizeVnPhone(raw) ?? raw.trim();
import { CreatePlatformCustomerDto, UpdatePlatformCustomerDto, UpsertStaffDto } from "./dto/customer.dto";

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.platformCustomer.findMany({
      include: {
        _count: {
          select: {
            stores: true,
            subscriptions: true,
            staff: true,
          },
        },
        users: { select: { id: true, email: true, name: true, avatarUrl: true } },
        subscriptions: {
          where: { status: "active" },
          include: { plan: true },
          orderBy: { expiresAt: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(id: string) {
    const customer = await this.prisma.platformCustomer.findUnique({
      where: { id },
      include: {
        subscriptions: {
          include: { plan: true },
          orderBy: { createdAt: "desc" },
        },
        stores: {
          include: {
            _count: { select: { products: true, customers: true, staff: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        users: { select: { id: true, email: true, name: true, avatarUrl: true } },
        staff: {
          include: { store: { select: { id: true, name: true, slug: true } } },
          orderBy: { createdAt: "desc" },
        },
      },
    });
    if (!customer) throw new NotFoundException("Không tìm thấy khách hàng");
    return customer;
  }

  create(dto: CreatePlatformCustomerDto) {
    return this.prisma.platformCustomer.create({
      data: {
        name: dto.name.trim(),
        companyName: dto.companyName?.trim(),
        phone: phone(dto.phone),
        email: dto.email?.trim(),
        zaloUserId: dto.zaloUserId?.trim(),
        taxCode: dto.taxCode?.trim(),
        address: dto.address?.trim(),
        status: dto.status ?? "active",
        note: dto.note?.trim(),
      },
    });
  }

  async update(id: string, dto: UpdatePlatformCustomerDto) {
    await this.ensureExists(id);
    return this.prisma.platformCustomer.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        companyName: dto.companyName?.trim(),
        phone: dto.phone ? phone(dto.phone) : undefined,
        email: dto.email?.trim(),
        zaloUserId: dto.zaloUserId?.trim(),
        taxCode: dto.taxCode?.trim(),
        address: dto.address?.trim(),
        status: dto.status,
        note: dto.note?.trim(),
      },
    });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    await this.prisma.platformCustomer.delete({ where: { id } });
    return { deleted: true };
  }

  async findStoreCustomers(customerId: string) {
    await this.ensureExists(customerId);
    return this.prisma.storeCustomer.findMany({
      where: { store: { customerId } },
      include: {
        store: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async addStaff(customerId: string, dto: UpsertStaffDto) {
    await this.ensureExists(customerId);
    return this.prisma.customerStaff.create({
      data: {
        customerId,
        storeId: dto.storeId || null,
        name: dto.name.trim(),
        phone: phone(dto.phone),
        email: dto.email?.trim(),
        zaloUserId: dto.zaloUserId?.trim(),
        role: dto.role ?? "staff",
        permissions: dto.permissions as Prisma.InputJsonValue | undefined,
        active: dto.active ?? true,
      },
    });
  }

  async updateStaff(staffId: string, dto: UpsertStaffDto) {
    const existing = await this.prisma.customerStaff.findUnique({ where: { id: staffId } });
    if (!existing) throw new NotFoundException("Không tìm thấy nhân viên");
    return this.prisma.customerStaff.update({
      where: { id: staffId },
      data: {
        storeId: dto.storeId === undefined ? existing.storeId : dto.storeId || null,
        name: dto.name.trim(),
        phone: phone(dto.phone),
        email: dto.email?.trim(),
        zaloUserId: dto.zaloUserId?.trim(),
        role: dto.role ?? existing.role,
        permissions: dto.permissions as Prisma.InputJsonValue | undefined,
        active: dto.active ?? existing.active,
      },
    });
  }

  async removeStaff(staffId: string) {
    const existing = await this.prisma.customerStaff.findUnique({ where: { id: staffId } });
    if (!existing) throw new NotFoundException("Không tìm thấy nhân viên");
    await this.prisma.customerStaff.delete({ where: { id: staffId } });
    return { deleted: true };
  }

  private async ensureExists(id: string) {
    const found = await this.prisma.platformCustomer.findUnique({ where: { id }, select: { id: true } });
    if (!found) throw new NotFoundException("Không tìm thấy khách hàng");
  }
}
