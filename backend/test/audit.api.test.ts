import * as assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { after, before, test } from "node:test";
import { PrismaClient } from "@prisma/client";

/**
 * T8: audit log đã gắn cho CRUD khách hàng/nhân sự, gói cước (+ đổi hạn mức dung lượng), voucher gói, gói đăng ký,
 * sản phẩm/khách của store; và đổi logo xoá logo cũ không còn dùng. Dữ liệu "t_" được dọn sau khi chạy.
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
  const res = await fetch(`${API}${path}`, { ...init, headers: { ...(typeof init.body === "string" ? { "Content-Type": "application/json" } : {}), ...init.headers } });
  return { status: res.status, body: await res.json().catch(() => null) };
}
const fakePng = (n: number) => Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), randomBytes(n - 8)]);
const uploadMedia = (storeId: string, type: string, headers: Record<string, string>) => {
  const fd = new FormData();
  fd.append("type", type);
  fd.append("file", new Blob([new Uint8Array(fakePng(3000))], { type: "image/png" }), `t_${type}.png`);
  return call(`/stores/${storeId}/media/upload`, { method: "POST", headers, body: fd });
};

let up = false;
const stamp = Date.now();
let customerId = "";
let storeId = "";
let token = "";
const planIds: string[] = [];
let userId = "";
const t0 = new Date();

before(async () => {
  up = await fetch(`${API}/health`).then((r) => r.ok).catch(() => false);
  if (!up) return console.warn(`[audit.api.test] Không kết nối được ${API} — bỏ qua`);
  customerId = (await call("/customers", { method: "POST", headers: ADMIN, body: json({ name: "t_Khách audit", phone: "0966000801" }) })).body.id;
  storeId = (await call("/stores", { method: "POST", headers: ADMIN, body: json({ customerId, name: "t_Shop audit", slug: `t-audit-${stamp}`, templateId: "fnb_cafe_01" }) })).body.id;
  const app = await prisma.oAuthApplication.findUniqueOrThrow({ where: { clientId: "remini-zalo-miniapp" } });
  const user = await prisma.user.upsert({
    where: { provider_providerId: { provider: "zalo", providerId: "t_user_audit" } },
    update: { customerId },
    create: { provider: "zalo", providerId: "t_user_audit", name: "t_Chủ audit", role: "member", phone: "0966000801", customerId },
  });
  userId = user.id;
  token = "rma_t_" + randomBytes(8).toString("hex");
  await prisma.oAuthAccessToken.create({ data: { tokenHash: sha(token), applicationId: app.id, userId: user.id, scope: "profile stores:read stores:write", expiresAt: new Date(Date.now() + 3600e3) } });
});

after(async () => {
  if (up) {
    const medias = await prisma.storeMedia.findMany({ where: { storeId }, select: { storageKey: true } });
    medias.forEach((m) => rmSync(join(process.cwd(), "uploads", m.storageKey), { force: true }));
    rmSync(join(process.cwd(), "uploads", "stores", storeId), { recursive: true, force: true });
    await prisma.store.deleteMany({ where: { id: storeId } });
    await prisma.user.deleteMany({ where: { providerId: "t_user_audit" } });
    await prisma.subscription.deleteMany({ where: { customerId } });
    await prisma.subscriptionPlan.deleteMany({ where: { id: { in: planIds } } });
    await prisma.platformVoucher.deleteMany({ where: { code: { startsWith: "T-AUD-" } } });
    await prisma.platformCustomer.deleteMany({ where: { name: { startsWith: "t_Khách audit" } } });
    // dọn nhật ký do test tạo (thao tác bằng x-admin-key hoặc user t_)
    await prisma.auditLog.deleteMany({ where: { createdAt: { gte: t0 }, OR: [{ actorLabel: "x-admin-key" }, { actorId: userId }] } });
  }
  await prisma.$disconnect();
});

const t = (name: string, fn: () => Promise<void>) => test(name, async (ctx) => (up ? fn() : ctx.skip("backend không chạy")));
const actions = (prefix: string) => prisma.auditLog.findMany({ where: { createdAt: { gte: t0 }, action: { startsWith: prefix } }, orderBy: { createdAt: "asc" } });
/** audit ghi bằng `void` (không chờ) nên đợi một nhịp cho chắc */
const settle = () => new Promise((r) => setTimeout(r, 300));

t("audit: khách hàng nền tảng + nhân sự", async () => {
  const c = await call("/customers", { method: "POST", headers: ADMIN, body: json({ name: "t_Khách audit 2", phone: "0966000802" }) });
  assert.equal(c.status, 201);
  assert.equal((await call(`/customers/${c.body.id}`, { method: "PATCH", headers: ADMIN, body: json({ note: "x" }) })).status, 200);
  const st = await call(`/customers/${c.body.id}/staff`, { method: "POST", headers: ADMIN, body: json({ name: "t_NV", phone: "0966000803" }) });
  assert.equal(st.status, 201, json(st.body));
  assert.equal((await call(`/customers/staff/${st.body.id}`, { method: "PATCH", headers: ADMIN, body: json({ name: "t_NV2", phone: "0966000803" }) })).status, 200);
  assert.equal((await call(`/customers/staff/${st.body.id}`, { method: "DELETE", headers: ADMIN })).status, 200);
  assert.equal((await call(`/customers/${c.body.id}`, { method: "DELETE", headers: ADMIN })).status, 200);
  await settle();
  const got = (await actions("customer.")).filter((a) => a.targetId === c.body.id || a.targetId === st.body.id).map((a) => a.action);
  assert.deepEqual(got, ["customer.create", "customer.update", "customer.staff.add", "customer.staff.update", "customer.staff.remove", "customer.delete"]);
});

t("audit: gói cước, hạn mức dung lượng, voucher, gói đăng ký", async () => {
  const code = "t_aud_" + stamp;
  const p = await call("/subscriptions/plans", { method: "POST", headers: ADMIN, body: json({ code, name: "t_Gói audit", priceMonthly: 1, priceYearly: 1, storageQuotaMb: 100 }) });
  assert.equal(p.status, 201);
  planIds.push(p.body.id);
  const base = { code, name: "t_Gói audit", priceMonthly: 1, priceYearly: 1 };
  await call(`/subscriptions/plans/${p.body.id}`, { method: "PATCH", headers: ADMIN, body: json({ ...base, description: "đổi mô tả, giữ hạn mức" }) });
  await call(`/subscriptions/plans/${p.body.id}`, { method: "PATCH", headers: ADMIN, body: json({ ...base, storageQuotaMb: 500 }) });
  const v = await call("/subscriptions/vouchers", { method: "POST", headers: ADMIN, body: json({ code: "T-AUD-" + stamp, title: "t" }) });
  assert.equal(v.status, 201, json(v.body));
  await call(`/subscriptions/vouchers/${v.body.id}`, { method: "PATCH", headers: ADMIN, body: json({ active: false }) });
  await call(`/subscriptions/vouchers/${v.body.id}`, { method: "DELETE", headers: ADMIN });
  const sub = await call("/subscriptions", { method: "POST", headers: ADMIN, body: json({ customerId, planId: p.body.id, expiresAt: "2030-01-01" }) });
  assert.equal(sub.status, 201, json(sub.body));
  await call(`/subscriptions/${sub.body.id}`, { method: "PATCH", headers: ADMIN, body: json({ status: "cancelled" }) });
  await prisma.subscription.deleteMany({ where: { id: sub.body.id } });
  assert.equal((await call(`/subscriptions/plans/${p.body.id}`, { method: "DELETE", headers: ADMIN })).status, 200);
  await settle();

  const plan = (await actions("plan.")).filter((a) => a.targetId === p.body.id);
  assert.deepEqual(
    plan.map((a) => a.action).sort(),
    ["plan.create", "plan.delete", "plan.storage_quota", "plan.update", "plan.update"],
    "chỉ lần đổi hạn mức mới có plan.storage_quota",
  );
  const q = plan.find((a) => a.action === "plan.storage_quota")!;
  assert.deepEqual(q.meta, { name: "t_Gói audit", fromMb: 100, toMb: 500 });
  const voucher = (await actions("plan_voucher.")).filter((a) => a.targetId === v.body.id).map((a) => a.action);
  assert.deepEqual(voucher, ["plan_voucher.create", "plan_voucher.update", "plan_voucher.delete"]);
  const subs = (await actions("subscription.")).filter((a) => a.targetId === sub.body.id).map((a) => a.action);
  assert.deepEqual(subs, ["subscription.create", "subscription.update"]);
});

t("audit: sản phẩm / khách của store (chủ shop thao tác, ghi đúng người)", async () => {
  const h = { Authorization: `Bearer ${token}` };
  const p = await call(`/stores/${storeId}/products`, { method: "POST", headers: h, body: json({ name: "t_Sản phẩm", price: 1000 }) });
  assert.equal(p.status, 201, json(p.body));
  assert.equal((await call(`/stores/${storeId}/products/${p.body.id}`, { method: "PATCH", headers: h, body: json({ price: 2000 }) })).status, 200);
  assert.equal((await call(`/stores/${storeId}/products/${p.body.id}`, { method: "DELETE", headers: h })).status, 200);
  const c = await call(`/stores/${storeId}/customers`, { method: "POST", headers: h, body: json({ name: "t_KH", phone: "0966000804" }) });
  assert.equal(c.status, 201, json(c.body));
  assert.equal((await call(`/stores/${storeId}/customers/${c.body.id}`, { method: "PATCH", headers: h, body: json({ note: "x" }) })).status, 200);
  assert.equal((await call(`/stores/${storeId}/customers/${c.body.id}`, { method: "DELETE", headers: h })).status, 200);
  await settle();
  const list = (await actions("store.")).filter((a) => a.targetId === storeId);
  assert.deepEqual(
    list.map((a) => a.action).filter((a) => /\.(product|customer)\./.test(a)),
    ["store.product.add", "store.product.update", "store.product.remove", "store.customer.add", "store.customer.update", "store.customer.remove"],
  );
  const me = await prisma.user.findFirstOrThrow({ where: { providerId: "t_user_audit" } });
  assert.ok(list.every((a) => a.actorId === me.id), "ghi đúng người thao tác (actorId)");
  // thao tác bị từ chối (store không thuộc mình / không tồn tại) không để lại log
  const count = () => prisma.auditLog.count({ where: { createdAt: { gte: t0 } } });
  const n0 = await count();
  const other = await call(`/stores/khong-co/products`, { method: "POST", headers: h, body: json({ name: "x", price: 1 }) });
  assert.equal(other.status, 404);
  await settle();
  assert.equal(await count(), n0);
});

t("đổi logo → logo cũ không còn dùng bị xoá (bản ghi + file); logo cũ còn được thiết kế dùng thì giữ", async () => {
  const h = { Authorization: `Bearer ${token}` };
  const a = await uploadMedia(storeId, "logo", h);
  assert.equal(a.status, 201, json(a.body));
  const aFile = join(process.cwd(), "uploads", a.body.storageKey);
  assert.ok(existsSync(aFile));

  const b = await uploadMedia(storeId, "logo", h);
  assert.equal(b.status, 201);
  assert.equal(await prisma.storeMedia.count({ where: { id: a.body.id } }), 0, "logo cũ đã xoá bản ghi");
  assert.ok(!existsSync(aFile), "logo cũ đã xoá file");
  assert.equal((await prisma.store.findUniqueOrThrow({ where: { id: storeId } })).logoUrl, b.body.url);

  // logo b được dán vào thiết kế → đổi logo tiếp thì b phải được giữ
  await prisma.store.update({ where: { id: storeId }, data: { builderSchema: { header: { image: b.body.url } } } });
  const c = await uploadMedia(storeId, "logo", h);
  assert.equal(c.status, 201);
  assert.equal(await prisma.storeMedia.count({ where: { id: b.body.id } }), 1, "logo cũ còn dùng trong thiết kế → giữ");
  assert.ok(existsSync(join(process.cwd(), "uploads", b.body.storageKey)));

  // media loại khác không bị đụng tới
  const sp = await uploadMedia(storeId, "product", h);
  await uploadMedia(storeId, "logo", h);
  assert.equal(await prisma.storeMedia.count({ where: { id: sp.body.id } }), 1);
});
