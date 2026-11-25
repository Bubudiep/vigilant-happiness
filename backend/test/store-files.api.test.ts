import * as assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { after, before, test } from "node:test";
import { PrismaClient } from "@prisma/client";
import sharp = require("sharp");

/**
 * T39: xoá ảnh/khách/gian hàng thì file thật trên ổ cũng bị xoá (không để mồ côi).
 * Cần server (API_URL) + DB; dữ liệu "t_" được dọn sau khi chạy.
 */
const API = process.env.API_URL ?? "http://localhost:4000/api";
const env = Object.fromEntries(
  readFileSync(join(process.cwd(), ".env"), "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/^"|"$/g, "")]),
);
const ADMIN = { "x-admin-key": env.ADMIN_API_KEY ?? "" };
const prisma = new PrismaClient();
const json = (o: unknown) => JSON.stringify(o);
const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const UP = join(process.cwd(), "uploads");
const ALB = join(process.cwd(), "uploads-private", "albums");

async function call(path: string, init: RequestInit & { headers?: Record<string, string> } = {}) {
  const res = await fetch(`${API}${path}`, { ...init, headers: { ...(typeof init.body === "string" ? { "Content-Type": "application/json" } : {}), ...init.headers } });
  return { status: res.status, body: await res.json().catch(() => null) };
}
const upload = (path: string, field: string, buf: Buffer, mime: string, extra: Record<string, string> = {}) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(extra)) fd.append(k, v);
  fd.append(field, new Blob([new Uint8Array(buf)], { type: mime }), "t_anh." + (mime === "image/png" ? "png" : "jpg"));
  return call(path, { method: "POST", headers: ADMIN, body: fd });
};
const fakePng = (n: number) => Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), randomBytes(n - 8)]);
const photoFiles = async (storeId: string) =>
  (await prisma.storeAlbumPhoto.findMany({ where: { storeId }, select: { storageKey: true } })).flatMap((p) => [join(ALB, p.storageKey), join(ALB, "thumbs", p.storageKey + ".webp")]);

let up = false;
let customerId = "";
const stores: string[] = [];
let token = "";

before(async () => {
  up = await fetch(`${API}/health`).then((r) => r.ok).catch(() => false);
  if (!up) return console.warn(`[store-files.api.test] Không kết nối được ${API} — bỏ qua`);
  customerId = (await call("/customers", { method: "POST", headers: ADMIN, body: json({ name: "t_Khách xoá file", phone: "0966000701" }) })).body.id;
  const app = await prisma.oAuthApplication.findUniqueOrThrow({ where: { clientId: "remini-zalo-miniapp" } });
  const user = await prisma.user.upsert({
    where: { provider_providerId: { provider: "zalo", providerId: "t_user_files" } },
    update: { customerId },
    create: { provider: "zalo", providerId: "t_user_files", name: "t_Chủ xoá file", role: "member", phone: "0966000701", customerId },
  });
  token = "rma_t_" + randomBytes(8).toString("hex");
  await prisma.oAuthAccessToken.create({ data: { tokenHash: sha(token), applicationId: app.id, userId: user.id, scope: "profile stores:read stores:write", expiresAt: new Date(Date.now() + 3600e3) } });
});

after(async () => {
  if (up) {
    await prisma.store.deleteMany({ where: { id: { in: stores } } });
    await prisma.user.deleteMany({ where: { providerId: "t_user_files" } });
    await prisma.platformCustomer.deleteMany({ where: { id: customerId } });
  }
  await prisma.$disconnect();
});

const t = (name: string, fn: () => Promise<void>) => test(name, async (ctx) => (up ? fn() : ctx.skip("backend không chạy")));

async function makeStore() {
  const r = await call("/stores", { method: "POST", headers: ADMIN, body: json({ customerId, name: "t_Shop xoá file", slug: `t-files-${Date.now()}-${stores.length}`, templateId: "fnb_cafe_01" }) });
  assert.equal(r.status, 201, json(r.body));
  stores.push(r.body.id);
  const sc = await prisma.storeCustomer.create({ data: { storeId: r.body.id, name: "t_KH", phone: "0966000702" } });
  const album = await call(`/stores/${r.body.id}/albums`, { method: "POST", headers: ADMIN, body: json({ customerId: sc.id }) });
  return { storeId: r.body.id as string, storeCustomerId: sc.id, albumId: album.body.id as string };
}
const photoBuf = () => sharp({ create: { width: 64, height: 64, channels: 3, background: "#e11d48" } }).jpeg().toBuffer();

t("xoá 1 media / 1 ảnh album / 1 album → file biến mất", async () => {
  const { storeId, albumId } = await makeStore();
  const m = await upload(`/stores/${storeId}/media/upload`, "file", fakePng(3000), "image/png", { type: "product" });
  assert.equal(m.status, 201, json(m.body));
  const mediaAbs = join(UP, m.body.storageKey);
  assert.ok(existsSync(mediaAbs));
  assert.equal((await call(`/stores/media/${m.body.id}`, { method: "DELETE", headers: ADMIN })).status, 200);
  assert.ok(!existsSync(mediaAbs), "file media đã xoá");

  const p = await upload(`/stores/${storeId}/albums/${albumId}/photos`, "files", await photoBuf(), "image/jpeg");
  assert.equal(p.status, 201, json(p.body));
  const files = await photoFiles(storeId);
  assert.equal(files.length, 2);
  assert.ok(files.every(existsSync));
  const del = await call(`/stores/${storeId}/albums/${albumId}/photos/${p.body.added[0].id}`, { method: "DELETE", headers: ADMIN });
  assert.equal(del.status, 200);
  assert.ok(files.every((f) => !existsSync(f)), "ảnh + thumbnail đã xoá");

  const p2 = await upload(`/stores/${storeId}/albums/${albumId}/photos`, "files", await photoBuf(), "image/jpeg");
  const files2 = await photoFiles(storeId);
  assert.equal(p2.status, 201);
  assert.equal((await call(`/stores/${storeId}/albums/${albumId}`, { method: "DELETE", headers: ADMIN })).status, 200);
  assert.ok(files2.every((f) => !existsSync(f)), "xoá album xoá cả ảnh");
});

t("xoá khách của store → ảnh album của khách đó bị xoá file", async () => {
  const { storeId, storeCustomerId, albumId } = await makeStore();
  await upload(`/stores/${storeId}/albums/${albumId}/photos`, "files", await photoBuf(), "image/jpeg");
  const files = await photoFiles(storeId);
  assert.equal(files.length, 2);
  const r = await call(`/stores/${storeId}/customers/${storeCustomerId}`, { method: "DELETE", headers: ADMIN });
  assert.equal(r.status, 200, json(r.body));
  assert.equal(await prisma.storeAlbumPhoto.count({ where: { storeId } }), 0);
  assert.ok(files.every((f) => !existsSync(f)), "file ảnh album đã xoá cùng khách");
});

t("xoá gian hàng (chỉ quản trị) → DB + mọi file ảnh biến mất", async () => {
  const { storeId, albumId } = await makeStore();
  const m = await upload(`/stores/${storeId}/media/upload`, "file", fakePng(3000), "image/png", { type: "logo" });
  await upload(`/stores/${storeId}/albums/${albumId}/photos`, "files", await photoBuf(), "image/jpeg");
  const mediaAbs = join(UP, m.body.storageKey);
  const albumFiles = await photoFiles(storeId);
  assert.ok(existsSync(mediaAbs) && albumFiles.every(existsSync));

  const forbid = await call(`/stores/${storeId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
  assert.equal(forbid.status, 403, "chủ shop không được xoá hẳn store");
  assert.equal((await call(`/stores/${storeId}`, { method: "DELETE" })).status, 401);
  assert.ok(existsSync(mediaAbs), "chưa xoá gì khi bị từ chối");

  const r = await call(`/stores/${storeId}`, { method: "DELETE", headers: ADMIN });
  assert.equal(r.status, 200, json(r.body));
  assert.equal(r.body.deleted, true);
  assert.ok(r.body.files >= 3, `đã xoá ≥ 3 file (nhận ${r.body.files})`);
  assert.equal(await prisma.store.count({ where: { id: storeId } }), 0);
  assert.equal(await prisma.storeMedia.count({ where: { storeId } }), 0);
  assert.ok(!existsSync(mediaAbs), "ảnh công khai đã xoá");
  assert.ok(!existsSync(join(UP, "stores", storeId)), "thư mục ảnh của store đã xoá");
  assert.ok(albumFiles.every((f) => !existsSync(f)), "ảnh album + thumbnail đã xoá");
  assert.equal((await call(`/stores/${storeId}`, { method: "DELETE", headers: ADMIN })).status, 404, "xoá lần 2 → 404");
});
