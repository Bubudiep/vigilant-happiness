import * as assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import { after, before, test } from "node:test";
import { PrismaClient } from "@prisma/client";
import sharp = require("sharp");

/**
 * Test các script bảo trì dung lượng (T32): storage:inline-images, storage:recompress, storage:orphans.
 * Cần DB (không cần server). Dữ liệu "t_" được dọn sau khi chạy. Bước --delete của orphans chỉ chạy
 * khi dry-run cho thấy đúng 1 file mồ côi + 1 bản ghi mất file (= dữ liệu của test), để không đụng dữ liệu thật.
 */
const prisma = new PrismaClient();
const ROOT = process.cwd();
const stamp = Date.now().toString(36);
let customerId = "";
let storeId = "";
let up = false;
const tmpFiles: string[] = [];

function run(script: string, ...args: string[]) {
  const r = spawnSync(process.execPath, ["-r", "ts-node/register/transpile-only", path.join("scripts", script), ...args], { cwd: ROOT, encoding: "utf8", timeout: 120_000 });
  return { code: r.status, out: (r.stdout ?? "") + (r.stderr ?? "") };
}

before(async () => {
  up = await prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false);
  if (!up) return console.warn("[storage-scripts.test] Không kết nối được DB — bỏ qua");
  customerId = (await prisma.platformCustomer.create({ data: { name: "t_Khách script", phone: "0966000601" } })).id;
  storeId = (await prisma.store.create({ data: { customerId, name: "t_Shop script", slug: `t-script-${stamp}`, templateId: "fnb_cafe_01", theme: {}, sliders: [] } })).id;
});

after(async () => {
  if (up) {
    await prisma.store.deleteMany({ where: { id: storeId } });
    await prisma.platformCustomer.deleteMany({ where: { id: customerId } });
    await fs.promises.rm(path.join(ROOT, "uploads", "stores", storeId), { recursive: true, force: true });
    for (const f of tmpFiles) await fs.promises.rm(f, { force: true });
  }
  await prisma.$disconnect();
});

const t = (name: string, fn: () => Promise<void>) => test(name, async (ctx) => (up ? fn() : ctx.skip("không có DB")));

t("inline-images: dry-run không ghi; --apply đổi base64 thành URL + StoreMedia + file", async () => {
  const png = await sharp({ create: { width: 16, height: 16, channels: 3, background: "#0ea5e9" } }).png().toBuffer();
  const uri = `data:image/png;base64,${png.toString("base64")}`;
  const schema = { pages: [{ blocks: [{ image: uri }, { image: uri, css: `url(${uri})` }, { svg: "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=" }, { bad: "data:image/png;base64,AAAA" }] }] };
  await prisma.store.update({ where: { id: storeId }, data: { builderSchema: schema } });

  let r = run("storage-inline-images.ts");
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, new RegExp(`t-script-${stamp}: 1 ảnh`));
  assert.ok(JSON.stringify((await prisma.store.findUniqueOrThrow({ where: { id: storeId } })).builderSchema).includes("data:image/png;base64,iVBOR"), "dry-run không đổi thiết kế");
  assert.equal(await prisma.storeMedia.count({ where: { storeId } }), 0);

  r = run("storage-inline-images.ts", "--apply", "--allow-localhost");
  assert.equal(r.code, 0, r.out);
  const st = await prisma.store.findUniqueOrThrow({ where: { id: storeId } });
  const text = JSON.stringify(st.builderSchema);
  assert.ok(!text.includes("data:image/png;base64,iVBOR"), "ảnh PNG hợp lệ đã được thay");
  assert.ok(text.includes("data:image/svg+xml"), "SVG giữ nguyên");
  assert.ok(text.includes("data:image/png;base64,AAAA"), "chuỗi hỏng giữ nguyên");
  const media = await prisma.storeMedia.findMany({ where: { storeId } });
  assert.equal(media.length, 1, "cùng 1 ảnh lặp lại chỉ lưu 1 file");
  assert.ok(text.includes(media[0].url));
  assert.ok(fs.existsSync(path.join(ROOT, "uploads", media[0].storageKey)));
  assert.equal(media[0].sizeBytes, png.length);

  r = run("storage-inline-images.ts", "--apply", "--allow-localhost");
  assert.match(r.out, /0 store, 0 ảnh/, "chạy lại không làm gì thêm");
});

t("recompress: JPEG album → webp + thumbnail, cập nhật DB, xoá file cũ", async () => {
  const sc = await prisma.storeCustomer.create({ data: { storeId, name: "t_KH", phone: "0966000602" } });
  const album = await prisma.storeAlbum.create({ data: { storeId, customerId: sc.id, title: "t_album", kind: "other" } });
  const jpg = await sharp(randomBytes(1200 * 800 * 3), { raw: { width: 1200, height: 800, channels: 3 } }).jpeg({ quality: 92 }).toBuffer();
  const key = `t_${stamp}.jpg`;
  const abs = path.join(ROOT, "uploads-private", "albums", key);
  fs.writeFileSync(abs, jpg);
  tmpFiles.push(abs);
  const photo = await prisma.storeAlbumPhoto.create({ data: { albumId: album.id, storeId, filename: "cuoi.jpg", mime: "image/jpeg", size: jpg.length, storageKey: key } });

  let r = run("storage-recompress.ts", "--dry-run");
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /cần nén lại/);
  assert.equal((await prisma.storeAlbumPhoto.findUniqueOrThrow({ where: { id: photo.id } })).mime, "image/jpeg", "dry-run không đổi");

  r = run("storage-recompress.ts");
  assert.equal(r.code, 0, r.out);
  const after = await prisma.storeAlbumPhoto.findUniqueOrThrow({ where: { id: photo.id } });
  assert.equal(after.mime, "image/webp");
  assert.ok(after.storageKey.endsWith(".webp"));
  assert.equal(after.filename, "cuoi.webp");
  assert.equal(after.width, 1200);
  assert.equal(after.height, 800);
  const newAbs = path.join(ROOT, "uploads-private", "albums", after.storageKey);
  tmpFiles.push(newAbs, path.join(ROOT, "uploads-private", "albums", "thumbs", after.storageKey + ".webp"));
  assert.equal(fs.statSync(newAbs).size, after.size);
  assert.ok(after.size < jpg.length, "file mới nhỏ hơn");
  assert.ok(fs.existsSync(path.join(ROOT, "uploads-private", "albums", "thumbs", after.storageKey + ".webp")), "có thumbnail");
  assert.ok(!fs.existsSync(abs), "file cũ đã xoá");
});

t("orphans: dry-run liệt kê file mồ côi + bản ghi mất file; --delete dọn (chỉ khi đúng dữ liệu của test)", async () => {
  const orphanDir = path.join(ROOT, "uploads", "stores", storeId, "general");
  fs.mkdirSync(orphanDir, { recursive: true });
  const orphan = path.join(orphanDir, "mocoi.png");
  fs.writeFileSync(orphan, randomBytes(2048));
  const old = new Date(Date.now() - 3 * 3600e3);
  fs.utimesSync(orphan, old, old);
  const young = path.join(orphanDir, "moi.png");
  fs.writeFileSync(young, randomBytes(100));
  const ghost = await prisma.storeMedia.create({ data: { storeId, fileName: "mat.png", mimeType: "image/png", sizeBytes: 10, url: "http://x/mat.png", storageKey: `stores/${storeId}/general/mat.png` } });

  const r = run("storage-orphans.ts");
  assert.equal(r.code, 0, r.out);
  assert.ok(r.out.includes(`uploads/stores/${storeId}/general/mocoi.png`), "liệt kê file mồ côi");
  assert.ok(!r.out.includes("general/moi.png"), "file mới (< 60 phút) không bị liệt kê");
  assert.ok(r.out.includes(`StoreMedia ${ghost.id}`), "liệt kê bản ghi mất file");
  assert.ok(fs.existsSync(orphan), "dry-run không xoá");

  const onlyMine = /: 1 file,/.test(r.out) && /StoreMedia 1 · StoreAlbumPhoto 0 · Attachment 0/.test(r.out);
  if (!onlyMine) return console.warn("[storage-scripts.test] DB có dữ liệu mồ côi khác — bỏ qua bước --delete");
  const d = run("storage-orphans.ts", "--delete");
  assert.equal(d.code, 0, d.out);
  assert.ok(!fs.existsSync(orphan), "file mồ côi đã xoá");
  assert.ok(fs.existsSync(young), "file mới còn nguyên");
  assert.equal(await prisma.storeMedia.count({ where: { id: ghost.id } }), 0, "bản ghi mất file đã xoá");
});
