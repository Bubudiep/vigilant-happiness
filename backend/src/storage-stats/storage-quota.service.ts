import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export function formatBytes(n: number): string {
  if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(2)} GB`;
  if (n >= 1024 ** 2) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  if (n >= 1024) return `${Math.round(n / 1024)} KB`;
  return `${n} B`;
}

/** Lỗi 413: gian hàng hết dung lượng theo gói. */
export class StorageQuotaExceededException extends HttpException {
  constructor(usedBytes: number, quotaBytes: number) {
    super(
      { message: `Gian hàng đã dùng hết dung lượng (đã dùng ${formatBytes(usedBytes)} / ${formatBytes(quotaBytes)})`, usedBytes, quotaBytes },
      HttpStatus.PAYLOAD_TOO_LARGE,
    );
  }
}

export interface StoreStorageUsage {
  usedBytes: number;
  /** null = không giới hạn (store không gói, hoặc gói không đặt hạn mức) */
  quotaBytes: number | null;
  albumBytes: number;
  albumPhotos: number;
  mediaBytes: number;
  mediaFiles: number;
  planName: string | null;
}

/** Dung lượng đã dùng & hạn mức theo gói của một gian hàng (đã dùng = ảnh album + ảnh media). */
@Injectable()
export class StorageQuotaService {
  constructor(private readonly prisma: PrismaService) {}

  /** Hạn mức (byte) + tên gói của store; không gói / gói không đặt hạn mức → quotaBytes null. */
  async quotaOf(storeId: string): Promise<{ quotaBytes: number | null; planName: string | null }> {
    const st = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: { subscription: { select: { plan: { select: { name: true, storageQuotaMb: true } } } } },
    });
    const plan = st?.subscription?.plan;
    return { quotaBytes: plan?.storageQuotaMb != null ? plan.storageQuotaMb * 1024 * 1024 : null, planName: plan?.name ?? null };
  }

  async usage(storeId: string, known?: { quotaBytes: number | null; planName: string | null }): Promise<StoreStorageUsage> {
    const [album, media, q] = await Promise.all([
      this.prisma.storeAlbumPhoto.aggregate({ where: { storeId }, _sum: { size: true }, _count: { _all: true } }),
      this.prisma.storeMedia.aggregate({ where: { storeId }, _sum: { sizeBytes: true }, _count: { _all: true } }),
      known ?? this.quotaOf(storeId),
    ]);
    const albumBytes = album._sum.size ?? 0;
    const mediaBytes = media._sum.sizeBytes ?? 0;
    return {
      usedBytes: albumBytes + mediaBytes,
      quotaBytes: q.quotaBytes,
      albumBytes,
      albumPhotos: album._count._all,
      mediaBytes,
      mediaFiles: media._count._all,
      planName: q.planName,
    };
  }

  /**
   * Chặn tải lên khi đã dùng + `incomingBytes` vượt hạn mức (413). Không giới hạn → bỏ qua.
   * Dùng `incomingBytes = 0` để chỉ kiểm tra "đã đầy chưa".
   */
  async assertCanUpload(storeId: string, incomingBytes: number): Promise<void> {
    const q = await this.quotaOf(storeId);
    const quotaBytes = q.quotaBytes;
    if (quotaBytes === null) return;
    const u = await this.usage(storeId, q);
    if (u.usedBytes + incomingBytes > quotaBytes || (incomingBytes === 0 && u.usedBytes >= quotaBytes)) {
      throw new StorageQuotaExceededException(u.usedBytes, quotaBytes);
    }
  }
}
