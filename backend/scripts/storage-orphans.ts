/**
 * Tìm (và tuỳ chọn xoá) file mồ côi & bản ghi mất file.
 *
 *   npm run storage:orphans              # dry-run: chỉ liệt kê
 *   npm run storage:orphans -- --delete  # xoá file mồ côi + bản ghi mất file
 *
 * - File mồ côi: có trong uploads/, uploads-private/ (inbox), albums/, albums/thumbs/ nhưng không có bản ghi DB.
 *   Bỏ qua file mới hơn 60 phút (có thể đang được tải lên, bản ghi chưa kịp tạo).
 * - Bản ghi mất file: StoreMedia / StoreAlbumPhoto / Attachment trỏ tới file không còn trên ổ.
 *   Xoá bản ghi → dung lượng store giảm; ảnh hiển thị lỗi sẽ biến mất khỏi album.
 */
import * as fs from "fs";
import * as path from "path";
import { ALBUMS, fmt, hasFlag, listFiles, newPrisma, PRIVATE, THUMBS, UPLOADS, walkFiles } from "./_common";

const MIN_AGE_MS = 60 * 60 * 1000;

async function main() {
  const doDelete = hasFlag("--delete");
  const prisma = newPrisma();
  const now = Date.now();
  console.log(doDelete ? "CHẾ ĐỘ XOÁ (--delete)" : "DRY-RUN (thêm --delete để xoá thật)", "\n");

  const [media, photos, attachments] = await Promise.all([
    prisma.storeMedia.findMany({ select: { id: true, storeId: true, storageKey: true, sizeBytes: true } }),
    prisma.storeAlbumPhoto.findMany({ select: { id: true, storeId: true, storageKey: true, size: true } }),
    prisma.attachment.findMany({ select: { id: true, storageKey: true, size: true } }),
  ]);

  // ───── File mồ côi ─────
  const mediaKeys = new Set(media.map((m) => m.storageKey));
  const photoKeys = new Set(photos.map((p) => path.basename(p.storageKey)));
  const attachKeys = new Set(attachments.map((a) => path.basename(a.storageKey)));

  const orphanFiles: { abs: string; label: string; size: number; young: boolean }[] = [];
  const add = (abs: string, label: string, size: number, mtimeMs: number) => orphanFiles.push({ abs, label, size, young: now - mtimeMs < MIN_AGE_MS });
  for (const f of await walkFiles(UPLOADS)) if (!mediaKeys.has(f.rel)) add(f.abs, `uploads/${f.rel}`, f.size, f.mtimeMs);
  for (const f of await listFiles(PRIVATE)) if (!attachKeys.has(f.name)) add(f.abs, `uploads-private/${f.name}`, f.size, f.mtimeMs);
  for (const f of await listFiles(ALBUMS)) if (!photoKeys.has(f.name)) add(f.abs, `uploads-private/albums/${f.name}`, f.size, f.mtimeMs);
  for (const f of await listFiles(THUMBS)) {
    if (!photoKeys.has(f.name.replace(/\.webp$/, ""))) add(f.abs, `uploads-private/albums/thumbs/${f.name}`, f.size, f.mtimeMs);
  }

  const young = orphanFiles.filter((f) => f.young);
  const old = orphanFiles.filter((f) => !f.young);
  const oldBytes = old.reduce((n, f) => n + f.size, 0);
  console.log(`File mồ côi (không có bản ghi DB): ${old.length} file, ${fmt(oldBytes)}`);
  old.slice(0, 50).forEach((f) => console.log(`  - ${f.label} (${fmt(f.size)})`));
  if (old.length > 50) console.log(`  … và ${old.length - 50} file nữa`);
  if (young.length) console.log(`Bỏ qua ${young.length} file mới hơn 60 phút (có thể đang tải lên).`);

  // ───── Bản ghi mất file ─────
  const missMedia = media.filter((m) => !fs.existsSync(path.join(UPLOADS, m.storageKey)));
  const missPhotos = photos.filter((p) => !fs.existsSync(path.join(ALBUMS, path.basename(p.storageKey))));
  const missAttach = attachments.filter((a) => !fs.existsSync(path.join(PRIVATE, path.basename(a.storageKey))));
  console.log(`\nBản ghi mất file: StoreMedia ${missMedia.length} · StoreAlbumPhoto ${missPhotos.length} · Attachment ${missAttach.length}`);
  missMedia.slice(0, 20).forEach((m) => console.log(`  - StoreMedia ${m.id} (store ${m.storeId}): ${m.storageKey}`));
  missPhotos.slice(0, 20).forEach((p) => console.log(`  - StoreAlbumPhoto ${p.id} (store ${p.storeId}): ${p.storageKey}`));
  missAttach.slice(0, 20).forEach((a) => console.log(`  - Attachment ${a.id}: ${a.storageKey}`));

  if (!doDelete) {
    console.log("\nDry-run: chưa xoá gì. Chạy lại với --delete để dọn.");
    await prisma.$disconnect();
    return;
  }

  let removedFiles = 0;
  for (const f of old) await fs.promises.unlink(f.abs).then(() => removedFiles++).catch(() => undefined);
  const m = missMedia.length ? await prisma.storeMedia.deleteMany({ where: { id: { in: missMedia.map((x) => x.id) } } }) : { count: 0 };
  const ph = missPhotos.length ? await prisma.storeAlbumPhoto.deleteMany({ where: { id: { in: missPhotos.map((x) => x.id) } } }) : { count: 0 };
  if (missPhotos.length) {
    // ảnh bìa trỏ tới ảnh đã xoá → bỏ ảnh bìa (giao diện tự lấy ảnh đầu)
    await prisma.storeAlbum.updateMany({ where: { coverPhotoId: { in: missPhotos.map((x) => x.id) } }, data: { coverPhotoId: null } });
  }
  const at = missAttach.length ? await prisma.attachment.deleteMany({ where: { id: { in: missAttach.map((x) => x.id) } } }) : { count: 0 };
  console.log(`\nĐã xoá ${removedFiles} file (${fmt(oldBytes)}), ${m.count} StoreMedia, ${ph.count} StoreAlbumPhoto, ${at.count} Attachment.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
