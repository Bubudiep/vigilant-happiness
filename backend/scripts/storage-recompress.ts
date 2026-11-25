/**
 * Nén lại ảnh album cũ chưa phải .webp (≤ 2048px, WebP q80) + tạo thumbnail còn thiếu.
 *
 *   npm run storage:recompress              # chạy thật, tuần tự
 *   npm run storage:recompress -- --dry-run # chỉ đếm
 *
 * Dùng lại AlbumStorageService.write (cùng logic nén như lúc tải lên). Với mỗi ảnh: ghi file mới →
 * cập nhật DB (size/mime/width/height/storageKey/filename) → xoá file cũ. Lỗi một ảnh không dừng cả lô.
 * GIF giữ nguyên (có thể động). Chỉ thay khi file mới NHỎ HƠN file cũ.
 * Dung lượng dùng của store tính từ DB nên tự giảm theo.
 */
import { ConfigService } from "@nestjs/config";
import * as fs from "fs";
import { AlbumStorageService } from "../src/albums/album-storage.service";
import { fmt, hasFlag, newPrisma } from "./_common";

async function main() {
  const dry = hasFlag("--dry-run");
  const prisma = newPrisma();
  const storage = new AlbumStorageService(new ConfigService());

  const sumBefore = (await prisma.storeAlbumPhoto.aggregate({ _sum: { size: true } }))._sum.size ?? 0;
  const todo = await prisma.storeAlbumPhoto.findMany({
    where: { mime: { in: ["image/jpeg", "image/png"] } },
    select: { id: true, filename: true, storageKey: true, size: true },
    orderBy: { createdAt: "asc" },
  });
  console.log(`${dry ? "DRY-RUN: " : ""}${todo.length} ảnh JPEG/PNG cần nén lại (${fmt(todo.reduce((n, p) => n + p.size, 0))})`);

  let done = 0;
  let failed = 0;
  if (!dry) {
    for (const [i, p] of todo.entries()) {
      try {
        const buf = await fs.promises.readFile(storage.pathOf(p.storageKey));
        const out = await storage.write(buf);
        if (out.size >= p.size) {
          // không nhỏ hơn → giữ ảnh cũ, bỏ bản mới (vẫn đảm bảo ảnh cũ có thumbnail)
          await storage.unlink(out.storageKey);
          await storage.ensureThumb(p.storageKey);
          continue;
        }
        await prisma.storeAlbumPhoto.update({
          where: { id: p.id },
          data: {
            mime: out.mime,
            size: out.size,
            width: out.width ?? null,
            height: out.height ?? null,
            storageKey: out.storageKey,
            filename: p.filename.replace(/\.[^.]+$/, "") + ".webp",
          },
        });
        await storage.unlink(p.storageKey);
        done++;
      } catch (e) {
        failed++;
        console.warn(`  ! ${p.id}: ${e instanceof Error ? e.message : e}`);
      }
      if ((i + 1) % 50 === 0) console.log(`  … ${i + 1}/${todo.length}`);
    }
  }

  // Thumbnail còn thiếu (ảnh .webp cũ, GIF…)
  const all = await prisma.storeAlbumPhoto.findMany({ select: { storageKey: true } });
  let thumbs = 0;
  for (const p of all) {
    if (dry) {
      if (!fs.existsSync(storage.thumbPathOf(p.storageKey))) thumbs++;
    } else if (await storage.ensureThumb(p.storageKey)) thumbs++;
  }

  const sumAfter = (await prisma.storeAlbumPhoto.aggregate({ _sum: { size: true } }))._sum.size ?? 0;
  console.log(`\n${dry ? "Sẽ nén" : "Đã nén"} ${dry ? todo.length : done} ảnh, lỗi ${failed}.`);
  console.log(`Tổng dung lượng ảnh album (DB): trước ${fmt(sumBefore)} → sau ${fmt(sumAfter)} (giảm ${fmt(sumBefore - sumAfter)}).`);
  console.log(`${dry ? "Đang thiếu" : "Đã tạo"} ${thumbs} thumbnail.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
