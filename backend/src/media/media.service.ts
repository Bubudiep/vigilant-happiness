import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as fs from "fs";
import * as path from "path";
import { PrismaService } from "../prisma/prisma.service";

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
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private getPublicBaseUrl(): string {
    const port = this.config.get<number>("PORT") ?? 4000;
    return (this.config.get<string>("PUBLIC_API_ORIGIN") || `http://localhost:${port}`).replace(/\/+$/, "");
  }

  async saveUploadedFile(storeId: string, file: Express.Multer.File, rawType = "general", alt?: string) {
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
    }

    return media;
  }

  findByStore(storeId: string, type?: string) {
    return this.prisma.storeMedia.findMany({
      where: {
        storeId,
        ...(type && ALLOWED_TYPES.has(type) ? { type } : {}),
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /** storeId của một media (để controller kiểm tra quyền trước khi xoá). */
  async findStoreIdOfMedia(mediaId: string): Promise<string> {
    const media = await this.prisma.storeMedia.findUnique({ where: { id: mediaId }, select: { storeId: true } });
    if (!media) throw new NotFoundException("Không tìm thấy tệp media");
    return media.storeId;
  }

  async remove(mediaId: string) {
    const media = await this.prisma.storeMedia.findUnique({ where: { id: mediaId } });
    if (!media) {
      throw new NotFoundException("Không tìm thấy tệp media");
    }
    const absPath = path.join(process.cwd(), "uploads", media.storageKey);
    if (fs.existsSync(absPath)) {
      fs.unlinkSync(absPath);
    }
    await this.prisma.storeMedia.delete({ where: { id: mediaId } });
    return { deleted: true };
  }
}
