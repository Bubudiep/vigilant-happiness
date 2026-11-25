import * as assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { after, before, test } from "node:test";
import { PrismaClient } from "@prisma/client";

/** T44: GET /stores/:id/media trả inUse + usedIn (logo|cover|theme|slider|design|banner|product) tính ở server. */
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
  const res = await fetch(`${API}${path}`, { ...init, headers: { ...(typeof init.body === "string" ? { "Content-Type": "application/json" } : {}), ...init.headers } });
  return { status: res.status, body: await res.json().catch(() => null) };
}
const fakePng = (n: number) => Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), randomBytes(n - 8)]);
const uploadMedia = (storeId: string, type: string, headers: Record<string, string>) => {
  const fd = new FormData();
  fd.append("type", type);
  fd.append("file", new Blob([new Uint8Array(fakePng(2000))], { type: "image/png" }), `t_${type}.png`);
  return call(`/stores/${storeId}/media/upload`, { method: "POST", headers, body: fd });
};

let up = false;
const stamp = Date.now();
const customers: string[] = [];
const stores: string[] = [];
let token = "";
let userId = "";

before(async () => {
  up = await fetch(`${API}/health`).then((r) => r.ok).catch(() => false);
  if (!up) return console.warn(`[media-usage.api.test] Không kết nối được ${API} — bỏ qua`);
  for (const [i, phone] of ["0966000901", "0966000902"].entries()) {
    const c = await call("/customers", { method: "POST", headers: ADMIN, body: json({ name: `t_Khách media ${i}`, phone }) });
    customers.push(c.body.id);
    const s = await call("/stores", { method: "POST", headers: ADMIN, body: json({ customerId: c.body.id, name: `t_Shop media ${i}`, slug: `t-media-${stamp}-${i}`, templateId: "fnb_cafe_01" }) });
    stores.push(s.body.id);
  }
  const app = await prisma.oAuthApplication.findUniqueOrThrow({ where: { clientId: "remini-zalo-miniapp" } });
  const user = await prisma.user.upsert({
    where: { provider_providerId: { provider: "zalo", providerId: "t_user_media" } },
    update: { customerId: customers[0] },
    create: { provider: "zalo", providerId: "t_user_media", name: "t_Chủ media", role: "member", phone: "0966000901", customerId: customers[0] },
  });
  userId = user.id;
  token = "rma_t_" + randomBytes(8).toString("hex");
  await prisma.oAuthAccessToken.create({ data: { tokenHash: sha(token), applicationId: app.id, userId, scope: "profile stores:read stores:write", expiresAt: new Date(Date.now() + 3600e3) } });
});

after(async () => {
  if (up) {
    for (const id of stores) rmSync(join(process.cwd(), "uploads", "stores", id), { recursive: true, force: true });
    await prisma.store.deleteMany({ where: { id: { in: stores } } });
    await prisma.user.deleteMany({ where: { providerId: { in: ["t_user_media", "t_user_media2"] } } });
    await prisma.platformCustomer.deleteMany({ where: { id: { in: customers } } });
    await prisma.auditLog.deleteMany({ where: { OR: [{ actorLabel: "x-admin-key" }, { actorId: userId }], createdAt: { gte: new Date(Date.now() - 600e3) } } });
  }
  await prisma.$disconnect();
});

const t = (name: string, fn: () => Promise<void>) => test(name, async (ctx) => (up ? fn() : ctx.skip("backend không chạy")));

t("media trả inUse + usedIn theo mọi nơi tham chiếu (logo, cover, theme, slider, design, banner, product)", async () => {
  const [storeId] = stores;
  const h = { Authorization: `Bearer ${token}` };
  const mk = async (type: string) => (await uploadMedia(storeId, type, h)).body as { id: string; url: string; storageKey: string };
  const unused = await mk("general");
  const logo = await mk("logo"); // upload type logo → Store.logoUrl
  const cover = await mk("general");
  const theme = await mk("general");
  const slider = await mk("banner");
  const design = await mk("general");
  const banner = await mk("banner");
  const product = await mk("product");
  const multi = await mk("general"); // dùng ở 2 nơi: sản phẩm + thiết kế

  await prisma.store.update({
    where: { id: storeId },
    data: {
      coverUrl: cover.url,
      theme: { primary: "#e11d48", heroImage: theme.url },
      sliders: [{ title: "x", imageUrl: slider.url }],
      // thiết kế có thể chỉ giữ storageKey / URL cũ khác origin → vẫn nhận ra
      builderSchema: { pages: [{ blocks: [{ image: `https://khac-origin.example/uploads/${design.storageKey}` }, { image: multi.url }] }] },
    },
  });
  await prisma.storeBanner.create({ data: { storeId, imageUrl: banner.url } });
  assert.equal((await call(`/stores/${storeId}/products`, { method: "POST", headers: h, body: json({ name: "t_SP", price: 1, imageUrl: product.url }) })).status, 201);
  assert.equal((await call(`/stores/${storeId}/products`, { method: "POST", headers: h, body: json({ name: "t_SP2", price: 1, imageUrl: multi.url }) })).status, 201);

  const r = await call(`/stores/${storeId}/media`, { headers: h });
  assert.equal(r.status, 200, json(r.body));
  const by = (id: string) => r.body.find((m: { id: string }) => m.id === id);
  const expectUse = (m: { id: string }, tags: string[]) => {
    assert.deepEqual([...by(m.id).usedIn].sort(), [...tags].sort(), m.id);
    assert.equal(by(m.id).inUse, tags.length > 0);
  };
  expectUse(unused, []);
  expectUse(logo, ["logo"]);
  expectUse(cover, ["cover"]);
  expectUse(theme, ["theme"]);
  expectUse(slider, ["slider"]);
  expectUse(design, ["design"]);
  expectUse(banner, ["banner"]);
  expectUse(product, ["product"]);
  expectUse(multi, ["design", "product"]);
  assert.equal(by(unused.id).fileName, "t_general.png", "vẫn trả đủ trường cũ của media");

  // lọc theo type vẫn kèm inUse
  const onlyLogo = await call(`/stores/${storeId}/media?type=logo`, { headers: h });
  assert.equal(onlyLogo.body.length, 1);
  assert.deepEqual(onlyLogo.body[0].usedIn, ["logo"]);

  // bỏ tham chiếu → hết "đang dùng"
  await prisma.store.update({ where: { id: storeId }, data: { coverUrl: null } });
  const r2 = await call(`/stores/${storeId}/media`, { headers: h });
  assert.equal(r2.body.find((m: { id: string }) => m.id === cover.id).inUse, false);
});

t("shop khác không xem được media của shop A; chưa đăng nhập → 401", async () => {
  const [, storeB] = stores;
  const h = { Authorization: `Bearer ${token}` };
  assert.equal((await call(`/stores/${storeB}/media`, { headers: h })).status, 404);
  assert.equal((await call(`/stores/${storeB}/media`)).status, 401);
  assert.equal((await call(`/stores/${storeB}/media`, { headers: ADMIN })).status, 200, "admin xem được");
});

t("xoá ảnh đang dùng → 409 { message, usedIn }; ?force=1 xoá như cũ; ảnh không dùng → 200; có audit", async () => {
  const [storeId] = stores;
  const h = { Authorization: `Bearer ${token}` };
  const mk = async (type: string) => (await uploadMedia(storeId, type, h)).body as { id: string; url: string; storageKey: string };
  const used = await mk("product");
  const free = await mk("general");
  await prisma.store.update({ where: { id: storeId }, data: { builderSchema: { image: used.url } } });
  assert.equal((await call(`/stores/${storeId}/products`, { method: "POST", headers: h, body: json({ name: "t_SP409", price: 1, imageUrl: used.url }) })).status, 201);

  const r = await call(`/stores/media/${used.id}`, { method: "DELETE", headers: h });
  assert.equal(r.status, 409, json(r.body));
  assert.deepEqual([...r.body.usedIn].sort(), ["design", "product"]);
  assert.equal(r.body.message, "Ảnh đang được dùng ở: thiết kế Mini App, sản phẩm");
  assert.equal(await prisma.storeMedia.count({ where: { id: used.id } }), 1, "409 thì chưa xoá gì");
  assert.ok(existsSync(join(process.cwd(), "uploads", used.storageKey)));

  const ok = await call(`/stores/media/${free.id}`, { method: "DELETE", headers: h });
  assert.equal(ok.status, 200, json(ok.body));
  assert.ok(!existsSync(join(process.cwd(), "uploads", free.storageKey)));

  const forced = await call(`/stores/media/${used.id}?force=1`, { method: "DELETE", headers: h });
  assert.equal(forced.status, 200, json(forced.body));
  assert.equal(await prisma.storeMedia.count({ where: { id: used.id } }), 0);
  assert.ok(!existsSync(join(process.cwd(), "uploads", used.storageKey)), "force=1 xoá cả file");

  await new Promise((res) => setTimeout(res, 300));
  const logs = await prisma.auditLog.findMany({ where: { action: "store.media.delete", targetId: storeId }, orderBy: { createdAt: "asc" } });
  const mine = logs.filter((l) => [used.id, free.id].includes((l.meta as { mediaId: string }).mediaId));
  assert.equal(mine.length, 2, "409 không ghi log; xoá thường + force đều ghi");
  assert.deepEqual(mine.map((l) => l.meta), [
    { mediaId: free.id, usedIn: [], force: false },
    { mediaId: used.id, usedIn: ["design", "product"], force: true },
  ]);

  // shop khác không xoá được ảnh của shop A
  const other = await mk("general");
  const tok2 = "rma_t_" + randomBytes(8).toString("hex");
  const app = await prisma.oAuthApplication.findUniqueOrThrow({ where: { clientId: "remini-zalo-miniapp" } });
  const u2 = await prisma.user.upsert({
    where: { provider_providerId: { provider: "zalo", providerId: "t_user_media2" } },
    update: { customerId: customers[1] },
    create: { provider: "zalo", providerId: "t_user_media2", name: "t_Chủ media 2", role: "member", phone: "0966000902", customerId: customers[1] },
  });
  await prisma.oAuthAccessToken.create({ data: { tokenHash: sha(tok2), applicationId: app.id, userId: u2.id, scope: "profile stores:read stores:write", expiresAt: new Date(Date.now() + 3600e3) } });
  assert.equal((await call(`/stores/media/${other.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${tok2}` } })).status, 404);
  assert.equal(await prisma.storeMedia.count({ where: { id: other.id } }), 1);
});
