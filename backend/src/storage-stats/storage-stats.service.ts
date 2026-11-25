import { Injectable } from "@nestjs/common";
import * as fs from "fs";
import * as path from "path";
import { PrismaService } from "../prisma/prisma.service";

const WALK_TTL_MS = 5 * 60 * 1000;

async function dirSize(dir: string): Promise<{ bytes: number; files: number }> {
  let bytes = 0;
  let files = 0;
  const entries = await fs.promises.readdir(dir, { withFileTypes: true }).catch(() => []);
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      const sub = await dirSize(p);
      bytes += sub.bytes;
      files += sub.files;
    } else if (e.isFile()) {
      const st = await fs.promises.stat(p).catch(() => null);
      if (st) {
        bytes += st.size;
        files += 1;
      }
    }
  }
  return { bytes, files };
}

/** Thống kê dung lượng: ổ đĩa server, DB, và ảnh theo từng gian hàng (cộng từ DB, không quét ổ). */
@Injectable()
export class StorageStatsService {
  private walkCache: { at: number; value: Record<string, { bytes: number; files: number }> } | null = null;

  constructor(private readonly prisma: PrismaService) {}

  private async disk() {
    const s = await fs.promises.statfs(process.cwd());
    const total = Number(s.blocks) * Number(s.bsize);
    const free = Number(s.bavail) * Number(s.bsize);
    return { total, free, used: total - free };
  }

  /** Quét thư mục thật trên ổ (cache 5 phút vì tốn I/O). Dùng để đối chiếu với số trong DB. */
  private async folders() {
    if (this.walkCache && Date.now() - this.walkCache.at < WALK_TTL_MS) return this.walkCache.value;
    const root = process.cwd();
    const [uploads, privateAll] = await Promise.all([dirSize(path.join(root, "uploads")), dirSize(path.join(root, "uploads-private"))]);
    const value = { uploads, uploadsPrivate: privateAll };
    this.walkCache = { at: Date.now(), value };
    return value;
  }

  private async dbSize(): Promise<number | null> {
    try {
      const r = await this.prisma.$queryRaw<{ s: bigint }[]>`SELECT pg_database_size(current_database()) AS s`;
      return Number(r[0]?.s ?? 0);
    } catch {
      return null;
    }
  }

  async overview() {
    const [disk, folders, dbBytes, albums, media, attach, stores] = await Promise.all([
      this.disk().catch(() => null),
      this.folders(),
      this.dbSize(),
      this.prisma.storeAlbumPhoto.groupBy({ by: ["storeId"], _sum: { size: true }, _count: { _all: true } }),
      this.prisma.storeMedia.groupBy({ by: ["storeId"], _sum: { sizeBytes: true }, _count: { _all: true } }),
      this.prisma.attachment.aggregate({ _sum: { size: true }, _count: { _all: true } }),
      this.prisma.store.findMany({ select: { id: true, name: true, slug: true, customer: { select: { name: true, companyName: true } } } }),
    ]);

    const rows = new Map(
      stores.map((s) => [
        s.id,
        {
          storeId: s.id,
          name: s.name,
          slug: s.slug,
          customer: s.customer?.companyName || s.customer?.name || null,
          albumBytes: 0,
          albumPhotos: 0,
          mediaBytes: 0,
          mediaFiles: 0,
          totalBytes: 0,
        },
      ]),
    );
    for (const a of albums) {
      const r = rows.get(a.storeId);
      if (r) {
        r.albumBytes = a._sum.size ?? 0;
        r.albumPhotos = a._count._all;
      }
    }
    for (const m of media) {
      const r = rows.get(m.storeId);
      if (r) {
        r.mediaBytes = m._sum.sizeBytes ?? 0;
        r.mediaFiles = m._count._all;
      }
    }
    const list = [...rows.values()].map((r) => ({ ...r, totalBytes: r.albumBytes + r.mediaBytes })).sort((a, b) => b.totalBytes - a.totalBytes);

    const storesBytes = list.reduce((n, r) => n + r.totalBytes, 0);
    const inboxBytes = attach._sum.size ?? 0;
    return {
      disk,
      db: dbBytes,
      files: {
        /** Tổng theo DB */
        stores: storesBytes,
        inbox: { bytes: inboxBytes, files: attach._count._all },
        total: storesBytes + inboxBytes,
        /** Đo thật trên ổ (gồm thumbnail, file mồ côi) */
        onDisk: { uploads: folders.uploads, uploadsPrivate: folders.uploadsPrivate },
      },
      stores: list,
      generatedAt: new Date().toISOString(),
    };
  }
}
