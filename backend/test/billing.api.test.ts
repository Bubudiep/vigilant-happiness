import * as assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { after, before, test } from "node:test";
import { PrismaClient } from "@prisma/client";

/**
 * Test tích hợp Trang điều hành: gói dịch vụ, voucher nền tảng, cấu hình app khách (đổi chủ / gói store).
 * Không có server thì bỏ qua; dữ liệu tiền tố "t_" / "T-" được dọn sau khi chạy.
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

async function call(path: string, init: RequestInit & { headers?: Record<string, string> } = {}) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { ...(typeof init.body === "string" ? { "Content-Type": "application/json" } : {}), ...init.headers },
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

let up = false;
let planId = "";
let customerA = "";
let customerB = "";
let storeId = "";
const CODE = "T-BILL-" + Date.now().toString(36).toUpperCase();

before(async () => {
  up = await fetch(`${API}/health`).then((r) => r.ok).catch(() => false);
  if (!up) return console.warn(`[billing.api.test] Không kết nối được ${API} — bỏ qua`);
  customerA = (await call("/customers", { method: "POST", headers: ADMIN, body: json({ name: "t_Khách gói A", phone: "0966000301" }) })).body.id;
  customerB = (await call("/customers", { method: "POST", headers: ADMIN, body: json({ name: "t_Khách gói B", phone: "0966000302" }) })).body.id;
  const p = await call("/subscriptions/plans", {
    method: "POST",
    headers: ADMIN,
    body: json({ code: "t_plan_" + Date.now(), name: "t_Gói test", priceMonthly: 500000, priceYearly: 5000000, features: ["A"] }),
  });
  assert.equal(p.status, 201, json(p.body));
  planId = p.body.id;
  const s = await call("/stores", { method: "POST", headers: ADMIN, body: json({ customerId: customerA, name: "t_Shop gói", slug: "t-bill-" + Date.now(), templateId: "fnb_cafe_01" }) });
  assert.equal(s.status, 201, json(s.body));
  storeId = s.body.id;
});

after(async () => {
  if (up) {
    await prisma.store.deleteMany({ where: { id: storeId } });
    await prisma.subscription.deleteMany({ where: { customerId: { in: [customerA, customerB] } } });
    await prisma.subscriptionPlan.deleteMany({ where: { id: planId } });
    await prisma.platformVoucher.deleteMany({ where: { code: { startsWith: "T-BILL-" } } });
    await prisma.platformCustomer.deleteMany({ where: { id: { in: [customerA, customerB] } } });
  }
  await prisma.$disconnect();
});

test("voucher nền tảng: tạo, kiểm tra, áp khi đăng ký gói, hết lượt", async () => {
  if (!up) return;
  let r = await call("/subscriptions/vouchers", { method: "POST", body: json({ code: CODE, title: "x" }) });
  assert.equal(r.status, 401, "không đăng nhập → 401");
  r = await call("/subscriptions/vouchers", { method: "POST", headers: ADMIN, body: json({ code: "a b", title: "x" }) });
  assert.equal(r.status, 400, "mã sai định dạng");
  r = await call("/subscriptions/vouchers", {
    method: "POST",
    headers: ADMIN,
    body: json({ code: CODE.toLowerCase(), title: "Giảm 20% gói năm", discountType: "percent", discountValue: 20, maxDiscount: 800000, billingCycle: "yearly", quantity: 1, planIds: [planId] }),
  });
  assert.equal(r.status, 201, json(r.body));
  assert.equal(r.body.code, CODE, "mã viết hoa");
  const vid = r.body.id;
  r = await call("/subscriptions/vouchers", { method: "POST", headers: ADMIN, body: json({ code: CODE, title: "trùng" }) });
  assert.equal(r.status, 409, "trùng mã");

  r = await call("/subscriptions/vouchers/preview", { method: "POST", headers: ADMIN, body: json({ code: CODE, planId, billingCycle: "monthly" }) });
  assert.equal(r.status, 400, "voucher chỉ áp gói năm");
  r = await call("/subscriptions/vouchers/preview", { method: "POST", headers: ADMIN, body: json({ code: CODE, planId, billingCycle: "yearly" }) });
  assert.equal(r.body.discount, 800000, "20% của 5tr = 1tr, chặn tối đa 800k");
  assert.equal(r.body.finalAmount, 4200000);

  r = await call("/subscriptions", {
    method: "POST",
    headers: ADMIN,
    body: json({ customerId: customerA, planId, billingCycle: "yearly", expiresAt: "2027-12-31", voucherCode: CODE }),
  });
  assert.equal(r.status, 201, json(r.body));
  assert.equal(r.body.pricePaid, 4200000);
  assert.equal(r.body.discountAmount, 800000);
  assert.equal(r.body.voucherCode, CODE);

  r = await call("/subscriptions", { method: "POST", headers: ADMIN, body: json({ customerId: customerA, planId, billingCycle: "yearly", expiresAt: "2027-12-31", voucherCode: CODE }) });
  assert.equal(r.status, 400, "hết lượt");
  const list = await call("/subscriptions/vouchers", { headers: ADMIN });
  assert.equal(list.body.find((v: { id: string }) => v.id === vid).usedCount, 1);

  r = await call(`/subscriptions/vouchers/${vid}`, { method: "PATCH", headers: ADMIN, body: json({ quantity: 5, active: false }) });
  assert.equal(r.body.active, false);
  r = await call(`/subscriptions/vouchers/${vid}`, { method: "DELETE", headers: ADMIN });
  assert.equal(r.status, 200);
});

test("gói đang có khách không xoá được", async () => {
  if (!up) return;
  const r = await call(`/subscriptions/plans/${planId}`, { method: "DELETE", headers: ADMIN });
  assert.equal(r.status, 409);
});

test("cấu hình app khách: đổi chủ / gắn gói store", async () => {
  if (!up) return;
  const subA = (await call(`/subscriptions?customerId=${customerA}`, { headers: ADMIN })).body[0].id;
  let r = await call(`/stores/${storeId}/config`, { method: "PATCH", headers: ADMIN, body: json({ subscriptionId: subA, phone: "0900111222" }) });
  assert.equal(r.status, 200, json(r.body));
  let list = await call("/stores", { headers: ADMIN });
  let st = list.body.find((s: { id: string }) => s.id === storeId);
  assert.equal(st.subscription?.plan?.name, "t_Gói test", "danh sách store kèm gói");
  assert.equal(st.phone, "0900111222");

  const subB = (
    await call("/subscriptions", { method: "POST", headers: ADMIN, body: json({ customerId: customerB, planId, expiresAt: "2027-01-01" }) })
  ).body.id;
  r = await call(`/stores/${storeId}/config`, { method: "PATCH", headers: ADMIN, body: json({ subscriptionId: subB }) });
  assert.equal(r.status, 409, "gói của khách khác");
  r = await call(`/stores/${storeId}/config`, { method: "PATCH", headers: ADMIN, body: json({ customerId: customerB }) });
  assert.equal(r.status, 200);
  list = await call("/stores", { headers: ADMIN });
  st = list.body.find((s: { id: string }) => s.id === storeId);
  assert.equal(st.customerId, customerB, "đã chuyển chủ");
  assert.equal(st.subscriptionId, null, "đổi chủ thì bỏ gói cũ");
});
