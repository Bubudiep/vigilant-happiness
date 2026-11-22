import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { NotifyService } from "../notify/notify.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateBuildDto, ReviewBuildDto } from "./builds.dto";

export const OPEN_STATUSES = ["pending_admin", "pending_zalo"];

const APP_ID_RE = /^\d{6,25}$/;

/**
 * Yêu cầu build Mini App riêng cho gian hàng. Luồng:
 * pending_admin (chờ reMini duyệt) → pending_zalo (chờ Zalo duyệt) → published (đã phát hành); có thể rejected / cancelled.
 * Lúc gửi lưu `snapshot` cấu hình gian hàng để người build làm đúng bản đã yêu cầu.
 */
@Injectable()
export class BuildsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notify: NotifyService,
  ) {}

  listForStore(storeId: string) {
    return this.prisma.storeBuildRequest.findMany({
      where: { storeId },
      select: { id: true, status: true, appName: true, appId: true, note: true, adminNote: true, publishedUrl: true, approvedAt: true, publishedAt: true, closedAt: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  private async snapshot(storeId: string) {
    const s = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: {
        name: true,
        subtitle: true,
        slug: true,
        templateId: true,
        logoUrl: true,
        coverUrl: true,
        phone: true,
        address: true,
        zaloAppId: true,
        zaloOaId: true,
        theme: true,
        sliders: true,
        builderSchema: true,
        products: { where: { active: true }, select: { name: true, category: true, price: true, salePrice: true, imageUrl: true }, orderBy: { sortOrder: "asc" }, take: 200 },
        banners: { where: { active: true }, select: { title: true, imageUrl: true, linkUrl: true }, orderBy: { sortOrder: "asc" }, take: 20 },
        media: { select: { type: true, url: true, fileName: true }, orderBy: { createdAt: "desc" }, take: 200 },
      },
    });
    if (!s) throw new NotFoundException("Không tìm thấy gian hàng");
    return s;
  }

  async create(storeId: string, dto: CreateBuildDto, by?: string) {
    const open = await this.prisma.storeBuildRequest.findFirst({ where: { storeId, status: { in: OPEN_STATUSES } }, select: { id: true } });
    if (open) throw new ConflictException("Gian hàng đang có một yêu cầu build chưa hoàn tất");
    const appId = dto.appId?.trim();
    if (appId && !APP_ID_RE.test(appId)) throw new BadRequestException("Mini App ID chỉ gồm chữ số");
    const snapshot = await this.snapshot(storeId);
    const row = await this.prisma.storeBuildRequest.create({
      data: {
        storeId,
        appName: dto.appName?.trim() || snapshot.name,
        appId: appId || null,
        note: dto.note?.trim() || null,
        snapshot: snapshot as unknown as Prisma.InputJsonValue,
        requestedBy: by ?? null,
      },
    });
    const owner = await this.prisma.store.findUnique({ where: { id: storeId }, select: { name: true, customer: { select: { name: true, companyName: true } } } });
    this.notify.notify({
      type: "build.requested",
      store: owner?.name ?? storeId,
      customer: owner?.customer?.companyName || owner?.customer?.name || "—",
      appName: row.appName,
    });
    return row;
  }

  async cancel(storeId: string, id: string) {
    const r = await this.prisma.storeBuildRequest.findFirst({ where: { id, storeId } });
    if (!r) throw new NotFoundException("Không tìm thấy yêu cầu");
    if (r.status !== "pending_admin") throw new BadRequestException("Chỉ huỷ được khi reMini chưa duyệt");
    return this.prisma.storeBuildRequest.update({ where: { id }, data: { status: "cancelled", closedAt: new Date() } });
  }

  // ── quản trị reMini ──

  list(status?: string) {
    return this.prisma.storeBuildRequest.findMany({
      where: status === "open" ? { status: { in: OPEN_STATUSES } } : status ? { status } : {},
      select: {
        id: true,
        status: true,
        appName: true,
        appId: true,
        note: true,
        adminNote: true,
        publishedUrl: true,
        approvedAt: true,
        publishedAt: true,
        closedAt: true,
        createdAt: true,
        store: { select: { id: true, name: true, slug: true, templateId: true, customer: { select: { id: true, name: true, companyName: true, phone: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  }

  async get(id: string) {
    const r = await this.prisma.storeBuildRequest.findUnique({
      where: { id },
      include: { store: { select: { id: true, name: true, slug: true, customer: { select: { id: true, name: true, companyName: true, phone: true } } } } },
    });
    if (!r) throw new NotFoundException("Không tìm thấy yêu cầu");
    return r;
  }

  async review(id: string, dto: ReviewBuildDto) {
    const r = await this.prisma.storeBuildRequest.findUnique({ where: { id } });
    if (!r) throw new NotFoundException("Không tìm thấy yêu cầu");
    const note = dto.adminNote?.trim() || undefined;
    const now = new Date();

    if (dto.action === "approve") {
      if (r.status !== "pending_admin") throw new BadRequestException("Yêu cầu không ở trạng thái chờ duyệt");
      return this.prisma.storeBuildRequest.update({ where: { id }, data: { status: "pending_zalo", approvedAt: now, adminNote: note ?? r.adminNote } });
    }
    if (dto.action === "reject") {
      if (!OPEN_STATUSES.includes(r.status)) throw new BadRequestException("Yêu cầu đã kết thúc");
      if (!note) throw new BadRequestException("Nhập lý do từ chối để gian hàng biết");
      return this.prisma.storeBuildRequest.update({ where: { id }, data: { status: "rejected", closedAt: now, adminNote: note } });
    }
    // publish
    if (r.status !== "pending_zalo") throw new BadRequestException("Chỉ phát hành được yêu cầu đang chờ Zalo duyệt");
    const appId = dto.appId?.trim() || r.appId || undefined;
    if (appId && !APP_ID_RE.test(appId)) throw new BadRequestException("Mini App ID chỉ gồm chữ số");
    const publishedUrl = dto.publishedUrl?.trim() || (appId ? `https://zalo.me/s/${appId}/` : null);
    const [updated] = await this.prisma.$transaction([
      this.prisma.storeBuildRequest.update({
        where: { id },
        data: { status: "published", publishedAt: now, closedAt: now, appId: appId ?? null, publishedUrl, adminNote: note ?? r.adminNote },
      }),
      ...(appId ? [this.prisma.store.update({ where: { id: r.storeId }, data: { zaloAppId: appId } })] : []),
    ]);
    return updated;
  }
}
