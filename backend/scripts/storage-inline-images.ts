/**
 * Chuyển ảnh base64 nằm sẵn trong thiết kế gian hàng (Store.builderSchema, Store.sliders) thành file thật.
 *
 *   npm run storage:inline-images            # dry-run: đếm số store / ảnh / byte sẽ chuyển
 *   npm run storage:inline-images -- --apply # ghi file vào uploads/ + tạo StoreMedia + thay chuỗi bằng URL công khai
 *
 * - Chỉ nhận ảnh JPG/PNG/WebP/GIF theo magic bytes (như MediaService); SVG hoặc dữ liệu hỏng bị bỏ qua, giữ nguyên chuỗi.
 * - Cùng một ảnh lặp nhiều lần trong 1 store chỉ lưu 1 file.
 * - Không kiểm tra hạn mức gói (ảnh vốn đã nằm trong DB; chuyển sang file sẽ được tính vào dung lượng store).
 * - Cần PUBLIC_API_ORIGIN trong .env (URL ghi vào thiết kế). Thiếu → từ chối --apply (thêm --allow-localhost để ép).
 * - Ghi lại store có điều kiện `updatedAt` không đổi: nếu chủ shop vừa lưu thiết kế trong lúc chạy thì bỏ qua store đó
 *   (và dọn file vừa tạo); chạy lại sau.
 */
import { ConfigService } from "@nestjs/config";
import { createHash } from "crypto";
import * as fs from "fs";
import * as path from "path";
import { sniffImageMime } from "../src/inbox/files.service";
import { MediaService } from "../src/media/media.service";
import { PrismaService } from "../src/prisma/prisma.service";
import { StorageQuotaService } from "../src/storage-stats/storage-quota.service";
import { fmt, hasFlag, UPLOADS } from "./_common";

const DATA_URI = /data:image\/(?:png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+/g;
const MAX_BYTES = 10 * 1024 * 1024;
const FIELDS = ["builderSchema", "sliders"] as const;
type Field = (typeof FIELDS)[number];

/** Gom mọi data URI trong cây JSON (cả khi nằm lẫn trong chuỗi, VD css url(...)). */
function collect(node: unknown, out: Set<string>) {
  if (typeof node === "string") node.match(DATA_URI)?.forEach((m) => out.add(m));
  else if (Array.isArray(node)) node.forEach((n) => collect(n, out));
  else if (node && typeof node === "object") Object.values(node).forEach((n) => collect(n, out));
}

function replaceAll(node: unknown, map: Map<string, string>): unknown {
  if (typeof node === "string") return node.replace(DATA_URI, (m) => map.get(m) ?? m);
  if (Array.isArray(node)) return node.map((n) => replaceAll(n, map));
  if (node && typeof node === "object") return Object.fromEntries(Object.entries(node).map(([k, v]) => [k, replaceAll(v, map)]));
  return node;
}

function decode(uri: string): { buf: Buffer; mime: string } | null {
  const buf = Buffer.from(uri.slice(uri.indexOf(",") + 1), "base64");
  if (!buf.length || buf.length > MAX_BYTES) return null;
  const mime = sniffImageMime(buf);
  return mime ? { buf, mime } : null;
}

async function main() {
  const apply = hasFlag("--apply");
  const config = new ConfigService();
  if (apply && !config.get<string>("PUBLIC_API_ORIGIN") && !hasFlag("--allow-localhost")) {
    console.error("Thiếu PUBLIC_API_ORIGIN trong .env — URL ảnh sẽ là localhost. Đặt biến này (hoặc thêm --allow-localhost) rồi chạy lại.");
    process.exit(1);
  }
  const prisma = new PrismaService();
  await prisma.$connect();
  const media = new MediaService(prisma, config, new StorageQuotaService(prisma));
  console.log(apply ? "CHẾ ĐỘ GHI (--apply)\n" : "DRY-RUN (thêm --apply để ghi thật)\n");

  const ids = (await prisma.store.findMany({ select: { id: true, slug: true } }));
  let stores = 0;
  let images = 0;
  let bytes = 0;
  let skipped = 0;
  let conflicts = 0;

  for (const { id, slug } of ids) {
    const st = await prisma.store.findUnique({ where: { id }, select: { updatedAt: true, builderSchema: true, sliders: true } });
    if (!st) continue;
    const uris = new Set<string>();
    for (const f of FIELDS) collect(st[f], uris);
    if (!uris.size) continue;

    const good = [...uris].map((u) => ({ uri: u, d: decode(u) }));
    const valid = good.filter((g) => g.d);
    skipped += good.length - valid.length;
    if (!valid.length) continue;
    const storeBytes = valid.reduce((n, g) => n + g.d!.buf.length, 0);
    stores++;
    images += valid.length;
    bytes += storeBytes;
    console.log(`  ${slug}: ${valid.length} ảnh, ${fmt(storeBytes)}${good.length > valid.length ? ` (bỏ qua ${good.length - valid.length} chuỗi không hợp lệ)` : ""}`);
    if (!apply) continue;

    const map = new Map<string, string>();
    const created: { id: string; storageKey: string }[] = [];
    const seen = new Map<string, string>(); // sha256 → url (cùng ảnh khác chuỗi, hiếm)
    try {
      for (const g of valid) {
        const sha = createHash("sha256").update(g.d!.buf).digest("hex");
        let url = seen.get(sha);
        if (!url) {
          const ext = g.d!.mime === "image/jpeg" ? "jpg" : g.d!.mime.split("/")[1];
          const m = await media.saveUploadedFile(
            id,
            { buffer: g.d!.buf, mimetype: g.d!.mime, size: g.d!.buf.length, originalname: `thiet-ke-${sha.slice(0, 8)}.${ext}` } as Express.Multer.File,
            "general",
            "Chuyển từ ảnh nhúng trong thiết kế",
            { skipQuota: true },
          );
          created.push({ id: m.id, storageKey: m.storageKey });
          url = m.url;
          seen.set(sha, url);
        }
        map.set(g.uri, url);
      }
      const data: Record<string, unknown> = {};
      for (const f of FIELDS) if (st[f] != null) data[f as Field] = replaceAll(st[f], map);
      const res = await prisma.store.updateMany({ where: { id, updatedAt: st.updatedAt }, data: data as never });
      if (!res.count) throw new Error("CONFLICT");
    } catch (e) {
      // hoàn tác file đã tạo cho store này để lần sau chạy lại không bị trùng
      for (const c of created) {
        await prisma.storeMedia.delete({ where: { id: c.id } }).catch(() => undefined);
        await fs.promises.unlink(path.join(UPLOADS, c.storageKey)).catch(() => undefined);
      }
      if (e instanceof Error && e.message === "CONFLICT") {
        conflicts++;
        console.warn(`  ! ${slug}: thiết kế vừa được sửa trong lúc chạy — bỏ qua, chạy lại sau`);
      } else {
        console.warn(`  ! ${slug}: ${e instanceof Error ? e.message : e}`);
      }
    }
  }

  console.log(`\n${apply ? "Đã chuyển" : "Sẽ chuyển"}: ${stores} store, ${images} ảnh, ${fmt(bytes)}.${skipped ? ` Bỏ qua ${skipped} chuỗi không phải ảnh hợp lệ.` : ""}${conflicts ? ` ${conflicts} store bị bỏ qua do xung đột.` : ""}`);
  if (!apply && stores) console.log("Chưa ghi gì. Chạy lại với --apply (nên sao lưu DB trước).");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
