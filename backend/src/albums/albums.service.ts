import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, StoreAlbum, StoreAlbumPhoto } from "@prisma/client";
import { cleanFilename } from "../inbox/files.service";
import { PrismaService } from "../prisma/prisma.service";
import { AlbumStorageService } from "./album-storage.service";

export const ALBUM_KINDS = ["today", "wedding", "engagement", "other"] as const;
const KIND_LABEL: Record<string, string> = { today: "Album hôm nay", wedding: "Album ảnh cưới", engagement: "Album ảnh đám hỏi", other: "Album ảnh" };

export interface AlbumLink {
  label: string;
  url: string;
}

export interface AlbumInput {
  customerId?: string;
  title?: string;
  kind?: string;
  eventDate?: string | null;
  note?: string | null;
  links?: AlbumLink[];
  coverPhotoId?: string | null;
}

/** Nhận diện dịch vụ lưu ảnh gốc để hiện biểu tượng phù hợp. */
export function linkProvider(url: string): string {
  const h = (() => {
    try {
      return new URL(url).hostname.toLowerCase();
    } catch {
      return "";
    }
  })();
  if (h.endsWith("drive.google.com") || h.endsWith("docs.google.com")) return "google_drive";
  if (h.endsWith("photos.google.com") || h.endsWith("photos.app.goo.gl")) return "google_photos";
  if (h.endsWith("onedrive.live.com") || h.endsWith("1drv.ms") || h.endsWith("sharepoint.com")) return "onedrive";
  if (h.endsWith("dropbox.com")) return "dropbox";
  if (h.endsWith("icloud.com")) return "icloud";
  if (h.endsWith("fshare.vn")) return "fshare";
  return "link";
}

function cleanLinks(raw: unknown): AlbumLink[] {
  if (!Array.isArray(raw)) throw new BadRequestException("links phải là danh sách");
  if (raw.length > 20) throw new BadRequestException("Tối đa 20 link");
  return raw.map((l) => {
    const url = String((l as AlbumLink)?.url ?? "").trim();
    let u: URL;
    try {
      u = new URL(url);
    } catch {
      throw new BadRequestException(`Link không hợp lệ: ${url.slice(0, 60)}`);
    }
    if (u.protocol !== "https:" && u.protocol !== "http:") throw new BadRequestException("Chỉ nhận link http(s)");
    const label = String((l as AlbumLink)?.label ?? "").trim().slice(0, 80) || "Ảnh gốc";
    return { label, url: u.toString().slice(0, 1000) };
  });
}

/**
 * Album ảnh của khách tại từng gian hàng. Mọi thao tác đều lọc theo storeId
 * (quyền trên store đã kiểm tra ở controller).
 */
@Injectable()
export class AlbumsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: AlbumStorageService,
  ) {}

  private photo(p: StoreAlbumPhoto) {
    const { storageKey: _k, ...rest } = p;
    return { ...rest, url: this.storage.signedUrl(p.id) };
  }

  private summary(a: StoreAlbum & { _count?: { photos: number }; photos?: StoreAlbumPhoto[]; customer?: { id: string; name: string; phone: string } }) {
    const cover = a.photos?.find((p) => p.id === a.coverPhotoId) ?? a.photos?.[0];
    const links = (a.links as unknown as AlbumLink[]) ?? [];
    return {
      id: a.id,
      customerId: a.customerId,
      customer: a.customer,
      title: a.title,
      kind: a.kind,
      eventDate: a.eventDate ? a.eventDate.toISOString().slice(0, 10) : null,
      note: a.note,
      links: links.map((l) => ({ ...l, provider: linkProvider(l.url) })),
      coverPhotoId: a.coverPhotoId,
      coverUrl: cover ? this.storage.signedUrl(cover.id) : null,
      photoCount: a._count?.photos ?? a.photos?.length ?? 0,
      status: a.status,
      publishedAt: a.publishedAt,
      viewedAt: a.viewedAt,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    };
  }

  private async find(storeId: string, id: string, customerId?: string) {
    const a = await this.prisma.storeAlbum.findFirst({
      where: { id, storeId, ...(customerId ? { customerId, status: "published" } : {}) },
      include: {
        photos: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
        customer: { select: { id: true, name: true, phone: true } },
      },
    });
    if (!a) throw new NotFoundException("Không tìm thấy album");
    return a;
  }

  // ───────────── Chủ shop ─────────────

  async list(storeId: string, filter: { customerId?: string; kind?: string } = {}) {
    const list = await this.prisma.storeAlbum.findMany({
      where: { storeId, ...(filter.customerId ? { customerId: filter.customerId } : {}), ...(filter.kind ? { kind: filter.kind } : {}) },
      include: {
        _count: { select: { photos: true } },
        photos: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], take: 1 },
        customer: { select: { id: true, name: true, phone: true } },
      },
      orderBy: [{ eventDate: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
      take: 300,
    });
    // ảnh bìa có thể không phải ảnh đầu tiên
    const coverIds = list.map((a) => a.coverPhotoId).filter((x): x is string => !!x);
    const covers = coverIds.length ? await this.prisma.storeAlbumPhoto.findMany({ where: { id: { in: coverIds } } }) : [];
    return list.map((a) => this.summary({ ...a, photos: [...covers.filter((c) => c.albumId === a.id), ...a.photos] }));
  }

  async detail(storeId: string, id: string) {
    const a = await this.find(storeId, id);
    return { ...this.summary(a), photos: a.photos.map((p) => this.photo(p)) };
  }

  async create(storeId: string, dto: AlbumInput) {
    if (!dto.customerId) throw new BadRequestException("Chọn khách hàng");
    const customer = await this.prisma.storeCustomer.findFirst({ where: { id: dto.customerId, storeId }, select: { id: true } });
    if (!customer) throw new BadRequestException("Khách hàng không thuộc cửa hàng này");
    const kind = (ALBUM_KINDS as readonly string[]).includes(dto.kind ?? "") ? dto.kind! : "other";
    const eventDate = dto.eventDate ? new Date(dto.eventDate) : null;
    if (eventDate && Number.isNaN(eventDate.getTime())) throw new BadRequestException("Ngày chụp không hợp lệ");
    const a = await this.prisma.storeAlbum.create({
      data: {
        storeId,
        customerId: customer.id,
        kind,
        title: dto.title?.trim().slice(0, 120) || KIND_LABEL[kind],
        eventDate,
        note: dto.note?.trim().slice(0, 1000) || null,
        links: (dto.links ? cleanLinks(dto.links) : []) as unknown as Prisma.InputJsonValue,
      },
    });
    return this.detail(storeId, a.id);
  }

  async update(storeId: string, id: string, dto: AlbumInput) {
    const a = await this.find(storeId, id);
    if (dto.coverPhotoId && !a.photos.some((p) => p.id === dto.coverPhotoId)) throw new BadRequestException("Ảnh bìa không thuộc album");
    const eventDate = dto.eventDate === undefined ? undefined : dto.eventDate ? new Date(dto.eventDate) : null;
    if (eventDate && Number.isNaN(eventDate.getTime())) throw new BadRequestException("Ngày chụp không hợp lệ");
    await this.prisma.storeAlbum.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim().slice(0, 120) || a.title } : {}),
        ...(dto.kind !== undefined && (ALBUM_KINDS as readonly string[]).includes(dto.kind) ? { kind: dto.kind } : {}),
        ...(eventDate !== undefined ? { eventDate } : {}),
        ...(dto.note !== undefined ? { note: dto.note?.trim().slice(0, 1000) || null } : {}),
        ...(dto.links !== undefined ? { links: cleanLinks(dto.links) as unknown as Prisma.InputJsonValue } : {}),
        ...(dto.coverPhotoId !== undefined ? { coverPhotoId: dto.coverPhotoId } : {}),
      },
    });
    return this.detail(storeId, id);
  }

  async remove(storeId: string, id: string) {
    const a = await this.find(storeId, id);
    await this.prisma.storeAlbum.delete({ where: { id } });
    await Promise.all(a.photos.map((p) => this.storage.unlink(p.storageKey)));
    return { id, deleted: true };
  }

  async addPhotos(storeId: string, id: string, files: Express.Multer.File[]) {
    const a = await this.find(storeId, id);
    if (!files?.length) throw new BadRequestException("Chưa chọn ảnh");
    if (a.photos.length + files.length > 500) throw new BadRequestException("Mỗi album tối đa 500 ảnh xem trước");
    let order = a.photos.reduce((m, p) => Math.max(m, p.sortOrder), 0);
    const created: StoreAlbumPhoto[] = [];
    const errors: string[] = [];
    for (const f of files) {
      try {
        const saved = await this.storage.write(f.buffer);
        created.push(
          await this.prisma.storeAlbumPhoto.create({
            data: {
              albumId: id,
              storeId,
              filename: cleanFilename(f.originalname, "anh"),
              mime: saved.mime,
              size: saved.size,
              width: saved.width ?? null,
              height: saved.height ?? null,
              storageKey: saved.storageKey,
              sortOrder: ++order,
            },
          }),
        );
      } catch (e) {
        errors.push(`${f.originalname}: ${e instanceof Error ? e.message : "lỗi"}`);
      }
    }
    if (!a.coverPhotoId && created[0]) await this.prisma.storeAlbum.update({ where: { id }, data: { coverPhotoId: created[0].id } });
    return { added: created.map((p) => this.photo(p)), errors };
  }

  async removePhoto(storeId: string, id: string, photoId: string) {
    const p = await this.prisma.storeAlbumPhoto.findFirst({ where: { id: photoId, albumId: id, storeId } });
    if (!p) throw new NotFoundException("Không tìm thấy ảnh");
    await this.prisma.storeAlbumPhoto.delete({ where: { id: photoId } });
    await this.storage.unlink(p.storageKey);
    await this.prisma.storeAlbum.updateMany({ where: { id, coverPhotoId: photoId }, data: { coverPhotoId: null } });
    return { id: photoId, deleted: true };
  }

  /** Gửi album cho khách: đánh dấu đã gửi + tin nhắn vào hộp thư của khách tại store. */
  async publish(storeId: string, id: string, message?: string) {
    const a = await this.find(storeId, id);
    if (!a.photos.length && !((a.links as unknown as AlbumLink[]) ?? []).length) {
      throw new BadRequestException("Album chưa có ảnh hoặc link ảnh gốc");
    }
    const body =
      message?.trim().slice(0, 2000) ||
      `${a.title} của bạn đã sẵn sàng 🎉 Mở mục "Album ảnh" để xem${(a.links as unknown as AlbumLink[])?.length ? " và tải ảnh gốc" : ""}.`;
    await this.prisma.$transaction([
      this.prisma.storeAlbum.update({ where: { id }, data: { status: "published", publishedAt: new Date(), viewedAt: null } }),
      this.prisma.storeMessage.create({ data: { storeId, customerId: a.customerId, direction: "out", body, albumId: id } }),
    ]);
    return this.detail(storeId, id);
  }

  async unpublish(storeId: string, id: string) {
    await this.find(storeId, id);
    await this.prisma.storeAlbum.update({ where: { id }, data: { status: "draft" } });
    return this.detail(storeId, id);
  }

  // ───────────── Tin nhắn store ↔ khách ─────────────

  async thread(storeId: string, customerId: string, markReadDirection: "in" | "out") {
    const messages = await this.prisma.storeMessage.findMany({
      where: { storeId, customerId },
      orderBy: { createdAt: "asc" },
      take: 300,
    });
    await this.prisma.storeMessage.updateMany({
      where: { storeId, customerId, direction: markReadDirection, readAt: null },
      data: { readAt: new Date() },
    });
    return messages;
  }

  async send(storeId: string, customerId: string, direction: "in" | "out", body: string) {
    const text = String(body ?? "").trim();
    if (!text) throw new BadRequestException("Nhập nội dung tin nhắn");
    const c = await this.prisma.storeCustomer.findFirst({ where: { id: customerId, storeId }, select: { id: true } });
    if (!c) throw new NotFoundException("Không tìm thấy khách hàng");
    return this.prisma.storeMessage.create({ data: { storeId, customerId, direction, body: text.slice(0, 2000) } });
  }

  /** Hội thoại của store kiểu Zalo: tin cuối cùng + số tin chưa đọc theo từng khách. */
  async conversations(storeId: string) {
    const [last, unread] = await Promise.all([
      this.prisma.storeMessage.findMany({
        where: { storeId },
        orderBy: { createdAt: "desc" },
        distinct: ["customerId"],
        select: { customerId: true, body: true, direction: true, createdAt: true, readAt: true },
      }),
      this.unreadByCustomer(storeId),
    ]);
    return last.map((m) => ({
      customerId: m.customerId,
      lastBody: m.body.slice(0, 120),
      lastDirection: m.direction,
      lastAt: m.createdAt.toISOString(),
      lastReadAt: m.readAt?.toISOString() ?? null,
      unread: unread[m.customerId] ?? 0,
    }));
  }

  /** Số tin khách gửi chưa đọc theo từng khách (cho chủ shop). */
  async unreadByCustomer(storeId: string) {
    const rows = await this.prisma.storeMessage.groupBy({
      by: ["customerId"],
      where: { storeId, direction: "in", readAt: null },
      _count: { _all: true },
    });
    return Object.fromEntries(rows.map((r) => [r.customerId, r._count._all]));
  }

  // ───────────── Khách của store ─────────────

  async customerAlbums(storeId: string, customerId: string) {
    const list = await this.prisma.storeAlbum.findMany({
      where: { storeId, customerId, status: "published" },
      include: { _count: { select: { photos: true } }, photos: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], take: 1 } },
      orderBy: { publishedAt: "desc" },
    });
    return list.map((a) => ({ ...this.summary(a), isNew: !a.viewedAt }));
  }

  async customerAlbum(storeId: string, customerId: string, id: string) {
    const a = await this.find(storeId, id, customerId);
    if (!a.viewedAt) await this.prisma.storeAlbum.update({ where: { id }, data: { viewedAt: new Date() } });
    const { customer: _c, ...rest } = this.summary(a);
    return { ...rest, photos: a.photos.map((p) => this.photo(p)) };
  }

  async customerUnread(storeId: string, customerId: string) {
    const [messages, albums] = await Promise.all([
      this.prisma.storeMessage.count({ where: { storeId, customerId, direction: "out", readAt: null } }),
      this.prisma.storeAlbum.count({ where: { storeId, customerId, status: "published", viewedAt: null } }),
    ]);
    return { messages, albums };
  }

  async readPhoto(id: string) {
    const p = await this.prisma.storeAlbumPhoto.findUnique({ where: { id } });
    if (!p) throw new NotFoundException("Không tìm thấy ảnh");
    return { stream: this.storage.stream(p.storageKey), mime: p.mime, size: p.size, filename: p.filename };
  }
}
