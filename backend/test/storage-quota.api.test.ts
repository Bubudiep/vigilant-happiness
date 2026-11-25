import * as assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { after, before, test } from "node:test";
import { PrismaClient } from "@prisma/client";
import sharp = require("sharp");

/**
 * Test tích hợp hạn mức dung lượng theo gói (T31): plan.storageQuotaMb, chặn tải lên 413,
 * GET /stores/:id/storage, GET /admin/storage (quotaBytes/planName), cách ly giữa các shop.
 * Không có server thì bỏ qua; dữ liệu "t_" được dọn sau khi chạy.
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

async function call(path: string, init: RequestInit & { headers?: Record<string, string> } = {}) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { ...(typeof init.body === "string" ? { "Content-Type": "application/json" } : {}), ...init.headers },
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

/** PNG giả đủ header (media chỉ kiểm tra chữ ký) với kích thước byte tuỳ ý. */
const fakePng = (bytes: number) => Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), randomBytes(bytes - 8)]);
const upload = (path: string, field: string, buf: Buffer, mime: string, headers: Record<string, string>, extra: Record<string, string> = {}) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(extra)) fd.append(k, v);
  fd.append(field, new Blob([new Uint8Array(buf)], { type: mime }), "t_anh." + (mime === "image/png" ? "png" : "jpg"));
  return call(path, { method: "POST", headers, body: fd });
};

let up = false;
let planId = "";
let customerA = "";
let customerB = "";
let storeA = "";
let storeB = "";
let albumId = "";
let token = "";
let userId = "";

before(async () => {
  up = await fetch(`${API}/health`).then((r) => r.ok).catch(() => false);
  if (!up) return console.warn(`[storage-quota.api.test] Không kết nối được ${API} — bỏ qua`);
  const mk = async (name: string, phone: string) => (await call("/customers", { method: "POST", headers: ADMIN, body: json({ name, phone }) })).body.id as string;
  customerA = await mk("t_Khách dung lượng A", "0966000401");
  customerB = await mk("t_Khách dung lượng B", "0966000402");
  const p = await call("/subscriptions/plans", {
    method: "POST",
    headers: ADMIN,
    body: json({ code: "t_quota_" + Date.now(), name: "t_Gói 1MB", priceMonthly: 1, priceYearly: 1, storageQuotaMb: 1 }),
  });
  assert.equal(p.status, 201, json(p.body));
  planId = p.body.id;
  const stamp = Date.now();
  storeA = (await call("/stores", { method: "POST", headers: ADMIN, body: json({ customerId: customerA, name: "t_Shop DL A", slug: `t-dl-a-${stamp}`, templateId: "fnb_cafe_01" }) })).body.id;
  storeB = (await call("/stores", { method: "POST", headers: ADMIN, body: json({ customerId: customerB, name: "t_Shop DL B", slug: `t-dl-b-${stamp}`, templateId: "fnb_cafe_01" }) })).body.id;
  const sub = await call("/subscriptions", { method: "POST", headers: ADMIN, body: json({ customerId: customerA, planId, expiresAt: "2030-12-31" }) });
  assert.equal(sub.status, 201, json(sub.body));
  const cfg = await call(`/stores/${storeA}/config`, { method: "PATCH", headers: ADMIN, body: json({ subscriptionId: sub.body.id }) });
  assert.equal(cfg.status, 200, json(cfg.body));
  const sc = await prisma.storeCustomer.create({ data: { storeId: storeA, name: "t_Khách album", phone: "0966000403" } });
  albumId = (await call(`/stores/${storeA}/albums`, { method: "POST", headers: ADMIN, body: json({ customerId: sc.id }) })).body.id;

  // chủ shop A (không phải admin)
  const app = await prisma.oAuthApplication.findUniqueOrThrow({ where: { clientId: "remini-zalo-miniapp" } });
  const user = await prisma.user.upsert({
    where: { provider_providerId: { provider: "zalo", providerId: "t_user_quota" } },
    update: { customerId: customerA },
    create: { provider: "zalo", providerId: "t_user_quota", name: "t_Chủ DL", role: "member", phone: "0966000401", customerId: customerA },
  });
  userId = user.id;
  token = "rma_t_" + randomBytes(8).toString("hex");
  await prisma.oAuthAccessToken.create({
    data: { tokenHash: sha(token), applicationId: app.id, userId, scope: "profile stores:read stores:write", expiresAt: new Date(Date.now() + 3600e3) },
  });
});

after(async () => {
  if (up) {
    // xoá file thật trước (xoá store chỉ xoá bản ghi, file sẽ thành mồ côi)
    const photos = await prisma.storeAlbumPhoto.findMany({ where: { storeId: { in: [storeA, storeB] } }, select: { storageKey: true } });
    for (const p of photos) {
      rmSync(join(process.cwd(), "uploads-private", "albums", p.storageKey), { force: true });
      rmSync(join(process.cwd(), "uploads-private", "albums", "thumbs", p.storageKey + ".webp"), { force: true });
    }
    for (const id of [storeA, storeB]) rmSync(join(process.cwd(), "uploads", "stores", id), { recursive: true, force: true });
    await prisma.store.deleteMany({ where: { id: { in: [storeA, storeB] } } });
    await prisma.user.deleteMany({ where: { providerId: "t_user_quota" } });
    await prisma.subscription.deleteMany({ where: { customerId: { in: [customerA, customerB] } } });
    await prisma.subscriptionPlan.deleteMany({ where: { id: planId } });
    await prisma.platformCustomer.deleteMany({ where: { id: { in: [customerA, customerB] } } });
  }
  await prisma.$disconnect();
});

const t = (name: string, fn: () => Promise<void>) => test(name, async (ctx) => (up ? fn() : ctx.skip("backend không chạy")));

t("gói nhận & trả storageQuotaMb (đặt, giữ nguyên, bỏ giới hạn)", async () => {
  const list = await call("/subscriptions/plans", { headers: ADMIN });
  assert.equal(list.body.find((x: { id: string }) => x.id === planId).storageQuotaMb, 1);
  const base = { code: "t_quota_x" + Date.now(), name: "t_Gói 1MB", priceMonthly: 1, priceYearly: 1 };
  let r = await call(`/subscriptions/plans/${planId}`, { method: "PATCH", headers: ADMIN, body: json({ ...base, storageQuotaMb: 0 }) });
  assert.equal(r.status, 400, "hạn mức phải ≥ 1");
  r = await call(`/subscriptions/plans/${planId}`, { method: "PATCH", headers: ADMIN, body: json(base) });
  assert.equal(r.body.storageQuotaMb, 1, "không gửi trường → giữ nguyên");
  r = await call(`/subscriptions/plans/${planId}`, { method: "PATCH", headers: ADMIN, body: json({ ...base, storageQuotaMb: null }) });
  assert.equal(r.body.storageQuotaMb, null, "null = không giới hạn");
  r = await call(`/subscriptions/plans/${planId}`, { method: "PATCH", headers: ADMIN, body: json({ ...base, storageQuotaMb: 1 }) });
  assert.equal(r.body.storageQuotaMb, 1);
});

t("vượt hạn mức → 413 (media + album); ảnh trong hạn mức vẫn tải được", async () => {
  const h = { Authorization: `Bearer ${token}` };
  let s = await call(`/stores/${storeA}/storage`, { headers: h });
  assert.equal(s.status, 200, json(s.body));
  assert.deepEqual(s.body, { usedBytes: 0, quotaBytes: 1048576, albumBytes: 0, albumPhotos: 0, mediaBytes: 0, mediaFiles: 0, planName: "t_Gói 1MB" });

  let r = await upload(`/stores/${storeA}/media/upload`, "file", fakePng(600_000), "image/png", h, { type: "product" });
  assert.equal(r.status, 201, json(r.body));
  r = await upload(`/stores/${storeA}/media/upload`, "file", fakePng(600_000), "image/png", h, { type: "product" });
  assert.equal(r.status, 413, json(r.body));
  assert.equal(r.body.usedBytes, 600_000);
  assert.equal(r.body.quotaBytes, 1048576);
  assert.match(r.body.message, /Gian hàng đã dùng hết dung lượng \(đã dùng .+ \/ .+\)/);

  // ảnh album nhiễu (nén WebP vẫn > 448KB còn lại) → 413, không lưu gì
  const noise = await sharp(randomBytes(900 * 900 * 3), { raw: { width: 900, height: 900, channels: 3 } }).jpeg({ quality: 95 }).toBuffer();
  r = await upload(`/stores/${storeA}/albums/${albumId}/photos`, "files", noise, "image/jpeg", h);
  assert.equal(r.status, 413, json(r.body));
  assert.equal(r.body.quotaBytes, 1048576);
  s = await call(`/stores/${storeA}/storage`, { headers: h });
  assert.equal(s.body.albumPhotos, 0, "ảnh bị chặn không được lưu");
  assert.equal(s.body.mediaFiles, 1);
  assert.equal(s.body.usedBytes, 600_000);

  // ảnh nhỏ vẫn còn chỗ → tải được
  const small = await sharp({ create: { width: 200, height: 200, channels: 3, background: "#e11d48" } }).jpeg().toBuffer();
  r = await upload(`/stores/${storeA}/albums/${albumId}/photos`, "files", small, "image/jpeg", h);
  assert.equal(r.status, 201, json(r.body));
  assert.equal(r.body.added.length, 1);
  assert.equal(r.body.quotaExceeded, false);
  s = await call(`/stores/${storeA}/storage`, { headers: h });
  assert.equal(s.body.albumPhotos, 1);
  assert.equal(s.body.usedBytes, 600_000 + s.body.albumBytes);
});

t("shop không gói → tải bình thường, quotaBytes null", async () => {
  const r = await upload(`/stores/${storeB}/media/upload`, "file", fakePng(1_500_000), "image/png", ADMIN, { type: "product" });
  assert.equal(r.status, 201, json(r.body));
  const s = await call(`/stores/${storeB}/storage`, { headers: ADMIN });
  assert.equal(s.body.quotaBytes, null);
  assert.equal(s.body.planName, null);
  assert.equal(s.body.mediaBytes, 1_500_000);
});

t("chủ shop A không đọc/ghi được storage của shop B; chưa đăng nhập → 401", async () => {
  const h = { Authorization: `Bearer ${token}` };
  assert.equal((await call(`/stores/${storeB}/storage`, { headers: h })).status, 404);
  assert.equal((await call(`/stores/${storeB}/storage`)).status, 401);
  const r = await upload(`/stores/${storeB}/media/upload`, "file", fakePng(1000), "image/png", h);
  assert.equal(r.status, 404);
});

t("GET /admin/storage: mỗi shop có quotaBytes + planName; chủ shop không gọi được", async () => {
  const r = await call("/admin/storage", { headers: ADMIN });
  assert.equal(r.status, 200);
  const a = r.body.stores.find((s: { storeId: string }) => s.storeId === storeA);
  const b = r.body.stores.find((s: { storeId: string }) => s.storeId === storeB);
  assert.equal(a.quotaBytes, 1048576);
  assert.equal(a.planName, "t_Gói 1MB");
  assert.equal(b.quotaBytes, null);
  assert.equal(b.planName, null);
  assert.equal((await call("/admin/storage", { headers: { Authorization: `Bearer ${token}` } })).status, 403);
});
