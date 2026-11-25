import { BadRequestException, HttpException, HttpStatus, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as fs from "fs";
import * as path from "path";
import { mediaFilePath, removeFiles } from "../common/store-files";
import { PrismaService } from "../prisma/prisma.service";
import { StorageQuotaService } from "../storage-stats/storage-quota.service";

/** Tên nơi dùng ảnh hiển thị trong thông báo 409. */
const USED_IN_LABEL: Record<string, string> = {
  logo: "logo",
  cover: "ảnh bìa",
  theme: "giao diện (theme)",
  slider: "slider trang chủ",
  design: "thiết kế Mini App",
  banner: "banner",
  product: "sản phẩm",
};

const ALLOWED_TYPES = new Set(["logo", "banner", "product", "general"]);

/**
 * Chỉ nhận ảnh raster. Đuôi file lấy theo MIME (không theo tên file người dùng gửi)
 * để không thể upload ".html" / ".svg" chứa script rồi được phục vụ tĩnh từ /uploads.
 */
const MIME_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

function looksLikeImage(buf: Buffer, mime: string): boolean {
  if (buf.length < 12) return false;
  if (mime === "image/jpeg") return buf[0] === 0xff && buf[1] === 0xd8;
  if (mime === "image/png") return buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (mime === "image/gif") return buf.subarray(0, 3).toString("ascii") === "GIF";
  if (mime === "image/webp") return buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP";
  return false;
}

@Injectable()
export class MediaService {
  private readonly log = new Logger(MediaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly quota: StorageQuotaService,
  ) {}

  private getPublicBaseUrl(): string {
    const port = this.config.get<number>("PORT") ?? 4000;
    return (this.config.get<string>("PUBLIC_API_ORIGIN") || `http://localhost:${port}`).replace(/\/+$/, "");
  }

  async saveUploadedFile(storeId: string, file: Express.Multer.File, rawType = "general", alt?: string, opts: { skipQuota?: boolean } = {}) {
    if (!file) {
      throw new BadRequestException("Không tìm thấy file ảnh tải lên");
    }
    const ext = MIME_EXT[file.mimetype];
    if (!ext || !looksLikeImage(file.buffer, file.mimetype)) {
      throw new BadRequestException("Chỉ chấp nhận ảnh JPG, PNG, WebP hoặc GIF");
    }

    const store = await this.prisma.store.findUnique({ where: { id: storeId }, select: { id: true } });
    if (!store) {
      throw new NotFoundException("Không tìm thấy Store");
    }

    // Hạn mức dung lượng theo gói (413 nếu vượt) — kiểm tra trước khi ghi file
    if (!opts.skipQuota) await this.quota.assertCanUpload(storeId, file.size);

    const mediaType = ALLOWED_TYPES.has(rawType) ? rawType : "general";
    const safeName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
    const relDir = path.join("stores", storeId, mediaType);
    const absDir = path.join(process.cwd(), "uploads", relDir);
    fs.mkdirSync(absDir, { recursive: true });

    const absPath = path.join(absDir, safeName);
    fs.writeFileSync(absPath, file.buffer);

    const storageKey = `${relDir.replace(/\\/g, "/")}/${safeName}`;
    const url = `${this.getPublicBaseUrl()}/uploads/${storageKey}`;

    const media = await this.prisma.storeMedia.create({
      data: {
        storeId,
        type: mediaType,
        fileName: file.originalname || safeName,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        url,
        storageKey,
        alt: alt?.trim() || null,
      },
    });

    // Nếu là ảnh logo, tự động cập nhật logoUrl của Store
    if (mediaType === "logo") {
      await this.prisma.store.update({
        where: { id: storeId },
        data: { logoUrl: url },
      });
      await this.removeUnusedOldLogos(storeId, media.id).catch((e) => this.log.warn(`Dọn logo cũ lỗi: ${e instanceof Error ? e.message : e}`));
    }

    return media;
  }

  /**
   * Những nơi của store có thể tham chiếu ảnh (theo URL hoặc storageKey), đã chuyển thành chuỗi để dò.
   * Giá trị `tag` trả cho frontend: logo | cover | theme | slider | design | banner | product.
   */
  private async referenceSources(storeId: string): Promise<{ tag: string; text: string }[]> {
    const [st, banners, products] = await Promise.all([
      this.prisma.store.findUnique({ where: { id: storeId }, select: { logoUrl: true, coverUrl: true, theme: true, sliders: true, builderSchema: true } }),
      this.prisma.storeBanner.findMany({ where: { storeId }, select: { imageUrl: true } }),
      this.prisma.storeProduct.findMany({ where: { storeId }, select: { imageUrl: true, gallery: true } }),
    ]);
    const j = (v: unknown) => (v == null ? "" : JSON.stringify(v));
    return [
      { tag: "logo", text: j(st?.logoUrl) },
      { tag: "cover", text: j(st?.coverUrl) },
      { tag: "theme", text: j(st?.theme) },
      { tag: "slider", text: j(st?.sliders) },
      { tag: "design", text: j(st?.builderSchema) },
      { tag: "banner", text: j(banners) },
      { tag: "product", text: j(products) },
    ];
  }

  private usedIn(sources: { tag: string; text: string }[], m: { url: string; storageKey: string }): string[] {
    return sources.filter((s) => s.text && (s.text.includes(m.url) || s.text.includes(m.storageKey))).map((s) => s.tag);
  }

  /**
   * Đổi logo → xoá các logo cũ (StoreMedia type "logo") không còn được tham chiếu ở đâu
   * (cùng logic với `inUse` của danh sách media). Logo cũ còn dùng ở đâu đó (VD đã dán vào thiết kế) thì giữ lại.
   */
  private async removeUnusedOldLogos(storeId: string, keepId: string) {
    const olds = await this.prisma.storeMedia.findMany({ where: { storeId, type: "logo", id: { not: keepId } } });
    if (!olds.length) return;
    const sources = await this.referenceSources(storeId);
    for (const old of olds) {
      if (this.usedIn(sources, old).length) continue;
      await this.prisma.storeMedia.delete({ where: { id: old.id } });
      await removeFiles([mediaFilePath(old.storageKey)]);
    }
  }

  /** Danh sách media kèm `inUse` / `usedIn` (tính ở server từ mọi nơi tham chiếu ảnh). */
  async findByStore(storeId: string, type?: string) {
    const [list, sources] = await Promise.all([
      this.prisma.storeMedia.findMany({
        where: { storeId, ...(type && ALLOWED_TYPES.has(type) ? { type } : {}) },
        orderBy: { createdAt: "desc" },
      }),
      this.referenceSources(storeId),
    ]);
    return list.map((m) => {
      const usedIn = this.usedIn(sources, m);
      return { ...m, inUse: usedIn.length > 0, usedIn };
    });
  }

  /** storeId của một media (để controller kiểm tra quyền trước khi xoá). */
  async findStoreIdOfMedia(mediaId: string): Promise<string> {
    const media = await this.prisma.storeMedia.findUnique({ where: { id: mediaId }, select: { storeId: true } });
    if (!media) throw new NotFoundException("Không tìm thấy tệp media");
    return media.storeId;
  }

  async remove(mediaId: string, opts: { force?: boolean } = {}) {
    const media = await this.prisma.storeMedia.findUnique({ where: { id: mediaId } });
    if (!media) {
      throw new NotFoundException("Không tìm thấy tệp media");
    }
    // Ảnh đang được dùng (logo, sản phẩm, thiết kế...) → 409, trừ khi ?force=1
    const usedIn = this.usedIn(await this.referenceSources(media.storeId), media);
    if (usedIn.length && !opts.force) {
      throw new HttpException(
        { message: `Ảnh đang được dùng ở: ${usedIn.map((t) => USED_IN_LABEL[t] ?? t).join(", ")}`, usedIn },
        HttpStatus.CONFLICT,
      );
    }
    await this.prisma.storeMedia.delete({ where: { id: mediaId } });
    // Xoá DB trước, rồi xoá file; lỗi xoá file chỉ ghi log (storage:orphans dọn phần sót)
    await removeFiles([mediaFilePath(media.storageKey)]);
    return { deleted: true, usedIn };
  }
}
