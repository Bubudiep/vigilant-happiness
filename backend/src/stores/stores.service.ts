import { ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { AuthContext } from "../common/guards/app-auth.guard";
import { AuthService } from "../auth/auth.service";
import { openSecret, sealSecret } from "../common/secret-box";
import { PrismaService } from "../prisma/prisma.service";
import { DEFAULT_TIERS } from "./store-data";
import {
  CreateStoreDto,
  UpdateProductDto,
  UpdateStoreConfigDto,
  UpdateStoreCustomerDto,
  UpsertCustomerDto,
  UpsertProductDto,
} from "./dto/store.dto";

const defaultTheme = {
  primary: "#1657f3",
  accent: "#f59e0b",
  bg: "#f5f6f8",
  headerVariant: "pastel",
  bannerVariant: "editorial",
  productCardVariant: "editorial",
};

@Injectable()
export class StoresService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
  ) {}

  /** Không bao giờ trả App Secret (dù đã mã hoá) ra ngoài — chỉ báo đã cấu hình hay chưa. */
  private redact<T extends { zaloAppSecretEnc?: string | null }>(store: T) {
    const { zaloAppSecretEnc, ...rest } = store;
    return { ...rest, hasZaloAppSecret: !!zaloAppSecretEnc };
  }

  /** App Secret Mini App riêng của store (giải mã), dùng khi khách đăng nhập Zalo để lấy SĐT. */
  async getZaloAppSecret(storeId: string): Promise<string | null> {
    const s = await this.prisma.store.findUnique({ where: { id: storeId }, select: { zaloAppSecretEnc: true } });
    return openSecret(s?.zaloAppSecretEnc, this.auth.getServerSecret());
  }

  /** Điều kiện lọc store theo quyền: admin thấy tất cả, chủ shop chỉ thấy store của mình. */
  private scope(auth: AuthContext): Prisma.StoreWhereInput {
    if (auth.isAdmin) return {};
    if (!auth.customerId) return { id: "__none__" };
    return { customerId: auth.customerId };
  }

  /** Ném 404 nếu store không tồn tại hoặc không thuộc quyền của người gọi. */
  private async assertAccess(auth: AuthContext, id: string) {
    const store = await this.prisma.store.findFirst({ where: { id, ...this.scope(auth) }, select: { id: true } });
    if (!store) throw new NotFoundException("Không tìm thấy store");
  }

  /** Dùng chung cho module khác (media...) để kiểm tra quyền trên store. */
  ensureAccess(auth: AuthContext, storeId: string) {
    return this.assertAccess(auth, storeId);
  }

  async findAll(auth: AuthContext) {
    // Danh sách tóm tắt (không kèm thiết kế / slider — có thể rất lớn); chi tiết lấy ở GET /stores/:id
    const list = await this.prisma.store.findMany({
      where: this.scope(auth),
      select: {
        id: true,
        slug: true,
        name: true,
        subtitle: true,
        logoUrl: true,
        templateId: true,
        zaloAppId: true,
        zaloAppSecretEnc: true,
        active: true,
        theme: true,
        customerId: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { products: true, customers: true } },
        customer: { select: { id: true, name: true, companyName: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return list.map((s) => this.redact(s));
  }

  async findOne(auth: AuthContext, id: string) {
    await this.assertAccess(auth, id);
    const store = await this.prisma.store.findUniqueOrThrow({
      where: { id },
      include: {
        products: { orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] },
        customers: { orderBy: { createdAt: "desc" } },
        customer: { select: { id: true, name: true, companyName: true } },
      },
    });
    return this.redact(store);
  }

  /** Cấu hình công khai cho Mini App: chỉ store đang hoạt động, không lộ khách hàng / gói cước. */
  async findPublicBySlug(slug: string) {
    const store = await this.prisma.store.findFirst({
      where: { slug, active: true },
      select: {
        id: true,
        slug: true,
        name: true,
        subtitle: true,
        logoUrl: true,
        coverUrl: true,
        templateId: true,
        zaloAppId: true,
        zaloOaId: true,
        phone: true,
        address: true,
        theme: true,
        sliders: true,
        builderSchema: true,
        updatedAt: true,
        products: {
          where: { active: true },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
          select: {
            id: true,
            name: true,
            category: true,
            description: true,
            price: true,
            salePrice: true,
            unit: true,
            tag: true,
            imageUrl: true,
            gallery: true,
          },
        },
      },
    });
    if (!store) throw new NotFoundException("Không tìm thấy Mini App store");
    return store;
  }

  /**
   * Tạo store. Chủ shop tự tạo thì store gắn vào PlatformCustomer của họ (tài khoản người bán
   * phải đã được kích hoạt) — không được chỉ định customerId / subscriptionId khác.
   */
  async create(auth: AuthContext, dto: CreateStoreDto) {
    let customerId = dto.customerId || null;
    let subscriptionId = dto.subscriptionId || null;

    if (!auth.isAdmin) {
      subscriptionId = null;
      customerId = auth.customerId ?? null;
      if (!customerId) throw new ForbiddenException("Tài khoản người bán chưa được kích hoạt");
    }

    const exists = await this.prisma.store.findUnique({ where: { slug: dto.slug }, select: { id: true } });
    if (exists) throw new ConflictException(`Slug "${dto.slug}" đã được dùng`);

    const created = await this.prisma.store.create({
      data: {
        customerId,
        subscriptionId,
        name: dto.name,
        slug: dto.slug,
        subtitle: dto.subtitle,
        templateId: dto.templateId,
        zaloAppId: dto.zaloAppId,
        zaloOaId: dto.zaloOaId,
        phone: dto.phone,
        address: dto.address,
        logoUrl: dto.logoUrl,
        coverUrl: dto.coverUrl,
        theme: (dto.theme ?? defaultTheme) as Prisma.InputJsonValue,
        sliders: (dto.sliders ?? []) as Prisma.InputJsonValue,
        ...(dto.builderSchema ? { builderSchema: dto.builderSchema as Prisma.InputJsonValue } : {}),
        memberTiers: { create: DEFAULT_TIERS },
      },
      include: { products: true, customers: true },
    });
    return this.redact(created);
  }

  async updateConfig(auth: AuthContext, id: string, dto: UpdateStoreConfigDto) {
    await this.assertAccess(auth, id);
    const secret = dto.zaloAppSecret?.trim();
    const updated = await this.prisma.store.update({
      where: { id },
      data: {
        ...(dto.zaloAppSecret !== undefined
          ? { zaloAppSecretEnc: secret ? sealSecret(secret, this.auth.getServerSecret()) : null }
          : {}),
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.subtitle !== undefined ? { subtitle: dto.subtitle } : {}),
        ...(dto.logoUrl !== undefined ? { logoUrl: dto.logoUrl } : {}),
        ...(dto.coverUrl !== undefined ? { coverUrl: dto.coverUrl } : {}),
        ...(dto.templateId !== undefined ? { templateId: dto.templateId } : {}),
        ...(dto.zaloAppId !== undefined ? { zaloAppId: dto.zaloAppId } : {}),
        ...(dto.zaloOaId !== undefined ? { zaloOaId: dto.zaloOaId } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
        ...(dto.address !== undefined ? { address: dto.address } : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
        ...(dto.theme !== undefined ? { theme: dto.theme as Prisma.InputJsonValue } : {}),
        ...(dto.sliders !== undefined ? { sliders: dto.sliders as Prisma.InputJsonValue } : {}),
        ...(dto.builderSchema !== undefined ? { builderSchema: dto.builderSchema as Prisma.InputJsonValue } : {}),
      },
    });
    return this.redact(updated);
  }

  async addProduct(auth: AuthContext, storeId: string, dto: UpsertProductDto) {
    await this.assertAccess(auth, storeId);
    return this.prisma.storeProduct.create({ data: { storeId, ...dto } });
  }

  /** Luôn lọc theo storeId để không sửa / xoá được sản phẩm của store khác. */
  async updateProduct(auth: AuthContext, storeId: string, productId: string, dto: UpdateProductDto) {
    await this.assertAccess(auth, storeId);
    const res = await this.prisma.storeProduct.updateMany({ where: { id: productId, storeId }, data: dto });
    if (!res.count) throw new NotFoundException("Không tìm thấy sản phẩm");
    return this.prisma.storeProduct.findUniqueOrThrow({ where: { id: productId } });
  }

  async removeProduct(auth: AuthContext, storeId: string, productId: string) {
    await this.assertAccess(auth, storeId);
    const res = await this.prisma.storeProduct.deleteMany({ where: { id: productId, storeId } });
    if (!res.count) throw new NotFoundException("Không tìm thấy sản phẩm");
    return { id: productId, deleted: true };
  }

  async addCustomer(auth: AuthContext, storeId: string, dto: UpsertCustomerDto) {
    await this.assertAccess(auth, storeId);
    return this.prisma.storeCustomer.create({ data: { storeId, ...dto } });
  }

  async updateCustomer(auth: AuthContext, storeId: string, customerId: string, dto: UpdateStoreCustomerDto) {
    await this.assertAccess(auth, storeId);
    const res = await this.prisma.storeCustomer.updateMany({ where: { id: customerId, storeId }, data: dto });
    if (!res.count) throw new NotFoundException("Không tìm thấy khách hàng");
    return this.prisma.storeCustomer.findUniqueOrThrow({ where: { id: customerId } });
  }

  async removeCustomer(auth: AuthContext, storeId: string, customerId: string) {
    await this.assertAccess(auth, storeId);
    const res = await this.prisma.storeCustomer.deleteMany({ where: { id: customerId, storeId } });
    if (!res.count) throw new NotFoundException("Không tìm thấy khách hàng");
    return { id: customerId, deleted: true };
  }
}
