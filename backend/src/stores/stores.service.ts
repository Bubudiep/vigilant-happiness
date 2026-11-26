import { parseCombo } from "./combo";
import { parseBom } from "./inventory";
import { parseOptions } from "./options";
import { readBankAccount } from "./bank-account";
import { ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { AuthContext } from "../common/guards/app-auth.guard";
import { AuthService } from "../auth/auth.service";
import { openSecret, sealSecret } from "../common/secret-box";
import { albumPhotoPaths, attachmentPath, mediaFilePath, removeFiles, removeStoreUploadsDir } from "../common/store-files";
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

const ASSET_KEYS = new Set(["image", "logoUrl", "imageUrl", "coverUrl", "url"]);

/** Đổi URL ảnh tương đối ("/stock/…", "/src/assets/templates/…" của bản cũ) thành URL đầy đủ theo FRONTEND_URL. */
export function absolutizeAssets<T>(value: T, base: string): T {
  const walk = (v: unknown, key?: string): unknown => {
    if (typeof v === "string") {
      if (!key || !ASSET_KEYS.has(key) || !v.startsWith("/") || v.startsWith("//")) return v;
      return base + v.replace(/^\/src\/assets\/templates\//, "/stock/");
    }
    if (Array.isArray(v)) return v.map((x) => walk(x, key === "gallery" ? "image" : undefined));
    if (v && typeof v === "object" && !(v instanceof Date)) {
      return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x, k)]));
    }
    return v;
  };
  return walk(value) as T;
}

@Injectable()
export class StoresService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
  ) {}

  /** Không bao giờ trả App Secret (dù đã mã hoá) ra ngoài — chỉ báo đã cấu hình hay chưa. */
  private redact<T extends { zaloAppSecretEnc?: string | null; oaSecretEnc?: string | null; tingeeSecretEnc?: string | null }>(store: T) {
    const { zaloAppSecretEnc, oaSecretEnc, tingeeSecretEnc, ...rest } = store;
    return { ...rest, hasZaloAppSecret: !!zaloAppSecretEnc, hasOaSecret: !!oaSecretEnc, hasTingee: !!tingeeSecretEnc };
  }

  /** App Secret Mini App riêng của store (giải mã), dùng khi khách đăng nhập Zalo để lấy SĐT. */
  async getZaloAppSecret(storeId: string): Promise<string | null> {
    const s = await this.prisma.store.findUnique({ where: { id: storeId }, select: { zaloAppSecretEnc: true } });
    return openSecret(s?.zaloAppSecretEnc, this.auth.getServerSecret());
  }

  /** Điều kiện lọc store theo quyền: admin thấy tất cả, chủ shop chỉ thấy store của mình. */
  private scope(auth: AuthContext): Prisma.StoreWhereInput {
    if (auth.isAdmin) return {};
    const staffIds = Object.keys(auth.staffAccess ?? {});
    const ors: Prisma.StoreWhereInput[] = [];
    if (auth.customerId) ors.push({ customerId: auth.customerId });
    if (staffIds.length) ors.push({ id: { in: staffIds } });
    if (!ors.length) return { id: "__none__" };
    return ors.length === 1 ? ors[0] : { OR: ors };
  }

  /**
   * Mục người gọi được xem ở store: null = toàn quyền (quản trị nền tảng / chủ shop),
   * còn lại là danh sách mục chủ shop cấp cho tài khoản nhân viên.
   */
  async sectionsOf(auth: AuthContext, storeId: string): Promise<string[] | null> {
    if (auth.isAdmin || !auth.staffAccess?.[storeId]) return null;
    if (auth.customerId) {
      const own = await this.prisma.store.count({ where: { id: storeId, customerId: auth.customerId } });
      if (own) return null;
    }
    return auth.staffAccess[storeId];
  }

  /** Kiểm tra quyền trên store + nhân viên phải được cấp ít nhất 1 trong các mục `sections`. */
  async ensureSection(auth: AuthContext, storeId: string, ...sections: string[]) {
    await this.assertAccess(auth, storeId);
    const mine = await this.sectionsOf(auth, storeId);
    if (mine && !sections.some((s) => mine.includes(s))) throw new ForbiddenException("Tài khoản nhân viên chưa được cấp quyền mục này");
    return mine;
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
        customer: { select: { id: true, name: true, companyName: true, phone: true } },
        zaloOaId: true,
        phone: true,
        subscriptionId: true,
        subscription: { select: { id: true, status: true, expiresAt: true, plan: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });
    // Nhân viên: kèm các mục được xem (null = toàn quyền) để web quản trị ẩn menu
    return list.map((s) => ({
      ...this.redact(s),
      access: !auth.isAdmin && auth.staffAccess?.[s.id] && s.customerId !== auth.customerId ? auth.staffAccess[s.id] : null,
    }));
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
        stampProgram: true,
        updatedAt: true,
        products: {
          where: { active: true, kind: { not: "material" } },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
          select: {
            id: true,
            kind: true,
            name: true,
            category: true,
            description: true,
            durationMin: true,
            options: true,
            price: true,
            salePrice: true,
            unit: true,
            tag: true,
            imageUrl: true,
            gallery: true,
          },
        },
        vouchers: {
          where: { active: true, endDate: { gte: new Date() } },
          orderBy: { endDate: "asc" },
          take: 30,
          select: { id: true, code: true, title: true, discountType: true, discountValue: true, minOrderValue: true, endDate: true },
        },
        documents: {
          where: { published: true },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          take: 50,
          select: { id: true, slug: true, title: true, category: true, content: true },
        },
      },
    });
    if (!store) throw new NotFoundException("Không tìm thấy Mini App store");
    // Ảnh mẫu trong thiết kế là đường dẫn tương đối của web quản trị (/stock/…, /assets/…)
    // → đổi thành URL đầy đủ để Mini App (chạy ở domain Zalo) tải được.
    const assetBase = this.auth.getFrontendUrl();
    // Tuỳ chọn món: bỏ định mức nguyên liệu (dữ liệu nội bộ của quán) trước khi trả cho Mini App
    const products = store.products.map((p) => ({
      ...p,
      options: Array.isArray(p.options)
        ? (p.options as { choices?: { bom?: unknown }[] }[]).map((g) => ({ ...g, choices: (g.choices ?? []).map(({ bom: _bom, ...c }) => c) }))
        : null,
    }));
    return absolutizeAssets({ ...store, products, assetBase }, assetBase);
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
    await this.ensureSection(auth, id, "miniapp", "settings");
    // Đổi chủ / gói: chỉ quản trị nền tảng (Trang điều hành → Cấu hình app khách)
    const owner: Prisma.StoreUncheckedUpdateInput = {};
    if (dto.customerId !== undefined || dto.subscriptionId !== undefined) {
      if (!auth.isAdmin) throw new ForbiddenException("Chỉ quản trị nền tảng được đổi chủ / gói của store");
      const cur = await this.prisma.store.findUniqueOrThrow({ where: { id }, select: { customerId: true } });
      const customerId = dto.customerId !== undefined ? dto.customerId || null : cur.customerId;
      if (dto.customerId && !(await this.prisma.platformCustomer.findUnique({ where: { id: dto.customerId }, select: { id: true } })))
        throw new NotFoundException("Không tìm thấy khách hàng");
      if (dto.subscriptionId) {
        const sub = await this.prisma.subscription.findUnique({ where: { id: dto.subscriptionId }, select: { customerId: true } });
        if (!sub) throw new NotFoundException("Không tìm thấy gói đăng ký");
        if (sub.customerId !== customerId) throw new ConflictException("Gói đăng ký không thuộc khách hàng sở hữu store");
      }
      if (dto.customerId !== undefined) owner.customerId = customerId;
      if (dto.subscriptionId !== undefined) owner.subscriptionId = dto.subscriptionId || null;
      else if (dto.customerId !== undefined && customerId !== cur.customerId) owner.subscriptionId = null;
    }
    const secret = dto.zaloAppSecret?.trim();
    const updated = await this.prisma.store.update({
      where: { id },
      data: {
        ...owner,
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
        ...(dto.bankAccount !== undefined ? { bankAccount: (readBankAccount(dto.bankAccount) as unknown as Prisma.InputJsonValue) ?? Prisma.DbNull } : {}),
      },
    });
    return this.redact(updated);
  }

  async addProduct(auth: AuthContext, storeId: string, dto: UpsertProductDto) {
    await this.ensureSection(auth, storeId, "products");
    return this.prisma.storeProduct.create({ data: { storeId, ...(await this.productData(storeId, null, dto)) } as Prisma.StoreProductUncheckedCreateInput });
  }

  /** Kiểm tra định mức BOM & tuỳ chọn; trả dữ liệu ghi vào DB */
  private async productData(storeId: string, productId: string | null, dto: UpdateProductDto) {
    // Tồn kho không sửa tay: chỉ đổi qua Nhập kho (phiếu nhập) và bán hàng; món mới bắt đầu từ 0
    const { bom, options, combo, stock: _stock, ...rest } = dto;
    const data: Record<string, unknown> = { ...rest };
    if (!productId) data.stock = 0;
    // Combo: giá = tổng giá món − giảm (máy chủ tự tính); combo không có BOM / tuỳ chọn riêng
    if (combo !== undefined) {
      const parsed = await parseCombo(this.prisma, storeId, productId, combo);
      data.combo = parsed ? (parsed.combo as unknown as Prisma.InputJsonValue) : Prisma.DbNull;
      if (parsed) {
        data.price = parsed.base;
        data.salePrice = parsed.price < parsed.base ? parsed.price : null;
        data.kind = "product";
        data.bom = Prisma.DbNull;
        data.options = Prisma.DbNull;
        return data;
      }
    }
    if (bom !== undefined) {
      const lines = await parseBom(this.prisma, storeId, productId, bom);
      data.bom = lines && lines.length ? lines : Prisma.DbNull;
    }
    if (options !== undefined) {
      const ids = new Set(
        (await this.prisma.storeProduct.findMany({ where: { storeId, kind: { not: "service" } }, select: { id: true } })).map((p) => p.id),
      );
      const groups = parseOptions(options, ids);
      data.options = groups && groups.length ? groups : Prisma.DbNull;
    }
    return data;
  }

  /** Luôn lọc theo storeId để không sửa / xoá được sản phẩm của store khác. */
  async updateProduct(auth: AuthContext, storeId: string, productId: string, dto: UpdateProductDto) {
    await this.ensureSection(auth, storeId, "products");
    const data = await this.productData(storeId, productId, dto);
    // Không còn gì để ghi (VD chỉ gửi tồn kho — bị bỏ qua) → updateMany trả 0, nên kiểm tra tồn tại riêng
    const res = Object.keys(data).length
      ? await this.prisma.storeProduct.updateMany({ where: { id: productId, storeId }, data: data as Prisma.StoreProductUpdateManyMutationInput })
      : { count: await this.prisma.storeProduct.count({ where: { id: productId, storeId } }) };
    if (!res.count) throw new NotFoundException("Không tìm thấy sản phẩm");
    return this.prisma.storeProduct.findUniqueOrThrow({ where: { id: productId } });
  }

  async removeProduct(auth: AuthContext, storeId: string, productId: string) {
    await this.ensureSection(auth, storeId, "products");
    const res = await this.prisma.storeProduct.deleteMany({ where: { id: productId, storeId } });
    if (!res.count) throw new NotFoundException("Không tìm thấy sản phẩm");
    return { id: productId, deleted: true };
  }

  async addCustomer(auth: AuthContext, storeId: string, dto: UpsertCustomerDto) {
    await this.ensureSection(auth, storeId, "customers", "pos", "orders", "bookings");
    return this.prisma.storeCustomer.create({ data: { storeId, ...dto } });
  }

  async updateCustomer(auth: AuthContext, storeId: string, customerId: string, dto: UpdateStoreCustomerDto) {
    await this.ensureSection(auth, storeId, "customers");
    const res = await this.prisma.storeCustomer.updateMany({ where: { id: customerId, storeId }, data: dto });
    if (!res.count) throw new NotFoundException("Không tìm thấy khách hàng");
    return this.prisma.storeCustomer.findUniqueOrThrow({ where: { id: customerId } });
  }

  async removeCustomer(auth: AuthContext, storeId: string, customerId: string) {
    await this.ensureSection(auth, storeId, "customers");
    // Xoá khách → cascade album + ảnh của khách đó: gom file trước, xoá DB rồi xoá file
    const photos = await this.prisma.storeAlbumPhoto.findMany({ where: { storeId, album: { customerId } }, select: { storageKey: true } });
    const res = await this.prisma.storeCustomer.deleteMany({ where: { id: customerId, storeId } });
    if (!res.count) throw new NotFoundException("Không tìm thấy khách hàng");
    await removeFiles(photos.flatMap((p) => albumPhotoPaths(p.storageKey)));
    return { id: customerId, deleted: true };
  }

  /**
   * Xoá hẳn gian hàng (chỉ quản trị — controller chặn): toàn bộ dữ liệu trong DB (cascade) và mọi file ảnh
   * trên ổ: ảnh album + thumbnail, ảnh công khai (uploads/stores/<id>/), ảnh đính kèm của hội thoại OA riêng.
   * Xoá DB trước, rồi xoá file; lỗi xoá file chỉ ghi log (npm run storage:orphans dọn phần sót).
   */
  async removeStore(storeId: string) {
    const store = await this.prisma.store.findUnique({ where: { id: storeId }, select: { id: true, name: true } });
    if (!store) throw new NotFoundException("Không tìm thấy store");
    const [photos, media, attachments] = await Promise.all([
      this.prisma.storeAlbumPhoto.findMany({ where: { storeId }, select: { storageKey: true } }),
      this.prisma.storeMedia.findMany({ where: { storeId }, select: { storageKey: true } }),
      // đính kèm của hội thoại thuộc store: Conversation bị cascade, Attachment chỉ SetNull → phải xoá riêng
      this.prisma.attachment.findMany({ where: { conversation: { storeId } }, select: { id: true, storageKey: true } }),
    ]);
    await this.prisma.$transaction([
      this.prisma.attachment.deleteMany({ where: { id: { in: attachments.map((a) => a.id) } } }),
      this.prisma.store.delete({ where: { id: storeId } }),
    ]);
    const removed = await removeFiles([
      ...photos.flatMap((p) => albumPhotoPaths(p.storageKey)),
      ...media.map((m) => mediaFilePath(m.storageKey)),
      ...attachments.map((a) => attachmentPath(a.storageKey)),
    ]);
    await removeStoreUploadsDir(storeId);
    return { id: storeId, name: store.name, deleted: true, files: removed };
  }
}
