import * as assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { after, before, test } from "node:test";
import { PrismaClient } from "@prisma/client";

/**
 * Test tích hợp: chạy với backend thật (mặc định http://localhost:4000/api) và DB dev.
 * Không có server thì bỏ qua. Dữ liệu tạo ra có tiền tố "t_" / SĐT 0966… và được dọn sau khi chạy.
 *
 *   API_URL=http://localhost:4000/api npm test
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
const sha = (s: string) => createHash("sha256").update(s).digest("hex");

async function call(path: string, init: RequestInit & { headers?: Record<string, string> } = {}) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { ...(init.body && typeof init.body === "string" && !init.headers?.["Content-Type"] ? { "Content-Type": "application/json" } : {}), ...init.headers },
  });
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}
const json = (o: unknown) => JSON.stringify(o);

let up = false;
const cleanup: (() => Promise<unknown>)[] = [];
const ids: { customerA?: string; customerB?: string; userA?: string; ticketB?: string } = {};
let memberToken = "";

before(async () => {
  up = await fetch(`${API}/health`).then((r) => r.ok).catch(() => false);
  if (!up) return console.warn(`[api.test] Không kết nối được ${API} — bỏ qua`);

  // Hai khách hàng, hai tài khoản Zalo, mỗi bên 1 ticket
  const mk = async (name: string, phone: string) => (await call("/customers", { method: "POST", headers: ADMIN, body: json({ name, phone }) })).body.id as string;
  ids.customerA = await mk("t_Khách A", "0966000001");
  ids.customerB = await mk("t_Khách B", "0966000002");
  const app = await prisma.oAuthApplication.findUniqueOrThrow({ where: { clientId: "remini-zalo-miniapp" } });
  const user = await prisma.user.upsert({
    where: { provider_providerId: { provider: "zalo", providerId: "t_user_a" } },
    update: { customerId: ids.customerA, phone: "0966000001" },
    create: { provider: "zalo", providerId: "t_user_a", name: "t_Chủ A", role: "member", phone: "0966000001", customerId: ids.customerA },
  });
  ids.userA = user.id;
  memberToken = "rma_t_" + randomBytes(8).toString("hex");
  await prisma.oAuthAccessToken.create({
    data: { tokenHash: sha(memberToken), applicationId: app.id, userId: user.id, scope: "profile tickets:write", expiresAt: new Date(Date.now() + 3600e3) },
  });
  const tB = await prisma.supportTicket.create({
    data: { code: "TK-TESTB" + randomBytes(2).toString("hex").toUpperCase(), customerId: ids.customerB, subject: "t_ticket của B", messages: { create: { authorType: "customer", authorName: "B", body: "nội dung bí mật của B" } } },
  });
  ids.ticketB = tB.id;
});

after(async () => {
  if (up) {
    await prisma.user.deleteMany({ where: { providerId: "t_user_a" } });
    await prisma.platformCustomer.deleteMany({ where: { name: { startsWith: "t_" } } });
    await prisma.consultationLead.deleteMany({ where: { OR: [{ source: "test" }, { phone: { startsWith: "0966" } }] } });
    await prisma.spamEvent.deleteMany({ where: { route: { in: ["leads.create"] }, sample: { contains: "t_" } } });
    for (const f of cleanup) await f().catch(() => undefined);
  }
  await prisma.$disconnect();
});

const t = (name: string, fn: () => Promise<void>) => test(name, async (ctx) => (up ? fn() : ctx.skip("backend không chạy")));

// ───────── Xác thực & phân quyền ─────────
t("API quản trị yêu cầu đăng nhập", async () => {
  for (const p of ["/stores", "/customers", "/oauth/applications", "/admin/projects", "/admin/audit", "/antispam/events"]) {
    assert.equal((await call(p)).status, 401, p);
  }
});

t("JWT giả bị từ chối", async () => {
  const r = await call("/stores", { headers: { Authorization: "Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4In0.x" } });
  assert.equal(r.status, 401);
});

t("Người dùng Zalo (member) không vào được API quản trị", async () => {
  const h = { Authorization: `Bearer ${memberToken}` };
  assert.equal((await call("/admin/projects", { headers: h })).status, 403);
  assert.equal((await call("/customers", { headers: h })).status, 403);
  assert.equal((await call("/debts", { headers: h })).status, 403);
  assert.equal((await call("/antispam/blocks", { headers: h })).status, 403);
});

t("Khách A không đọc được ticket của khách B", async () => {
  const h = { Authorization: `Bearer ${memberToken}` };
  assert.equal((await call(`/me/tickets/${ids.ticketB}`, { headers: h })).status, 404);
  const ov = await call("/me/overview", { headers: h });
  assert.equal(ov.status, 200);
  assert.equal(ov.body.customer.id, ids.customerA);
  assert.ok(!JSON.stringify(ov.body).includes("bí mật của B"));
});

t("Khách A tạo ticket → chỉ thấy ticket của mình", async () => {
  const h = { Authorization: `Bearer ${memberToken}` };
  const c = await call("/me/tickets", { method: "POST", headers: h, body: json({ subject: "t_Banner bị mờ", body: "Banner trang chủ hiển thị mờ trên iPhone" }) });
  assert.equal(c.status, 201, JSON.stringify(c.body));
  const ov = await call("/me/overview", { headers: h });
  assert.deepEqual(ov.body.tickets.map((x: { subject: string }) => x.subject), ["t_Banner bị mờ"]);
});

// ───────── OAuth ─────────
async function makeApp(scopes: string[], channel = "pos") {
  const r = await call("/oauth/applications", { method: "POST", headers: ADMIN, body: json({ name: "t_app", channel, scopes, customerId: ids.customerA }) });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  cleanup.push(() => call(`/oauth/applications/${r.body.id}`, { method: "DELETE", headers: ADMIN }));
  return r.body as { id: string; clientId: string; clientSecret: string };
}
const basic = (a: { clientId: string; clientSecret: string }) => ({ Authorization: "Basic " + Buffer.from(`${a.clientId}:${a.clientSecret}`).toString("base64") });
const form = (o: Record<string, string>) => ({ body: new URLSearchParams(o).toString(), headers: { "Content-Type": "application/x-www-form-urlencoded" } });

t("OAuth client_credentials: secret sai bị từ chối, scope vượt bị từ chối", async () => {
  const app = await makeApp(["stores:read"]);
  const bad = await call("/oauth/token", { method: "POST", ...form({ grant_type: "client_credentials", client_id: app.clientId, client_secret: "sai" }) });
  assert.equal(bad.status, 401);
  assert.equal(bad.body.error, "invalid_client");
  const over = await call("/oauth/token", { method: "POST", headers: { ...basic(app), "Content-Type": "application/x-www-form-urlencoded" }, body: "grant_type=client_credentials&scope=stores:write" });
  assert.equal(over.body.error, "invalid_scope");
});

t("OAuth: token chỉ có stores:read không ghi được store; thu hồi xong thì 401", async () => {
  const app = await makeApp(["stores:read"]);
  const tok = await call("/oauth/token", { method: "POST", headers: { ...basic(app), "Content-Type": "application/x-www-form-urlencoded" }, body: "grant_type=client_credentials" });
  assert.equal(tok.status, 200);
  const h = { Authorization: `Bearer ${tok.body.access_token}` };
  assert.equal((await call("/stores", { headers: h })).status, 200);
  const w = await call("/stores", { method: "POST", headers: h, body: json({ name: "x", slug: "t-scope-x", templateId: "mixue_01" }) });
  assert.equal(w.status, 403);
  assert.match(w.body.message, /stores:write/);
  await call("/oauth/revoke", { method: "POST", headers: { ...basic(app), "Content-Type": "application/x-www-form-urlencoded" }, body: `token=${tok.body.access_token}` });
  assert.equal((await call("/stores", { headers: h })).status, 401);
});

t("OAuth: đổi secret làm secret cũ hết hiệu lực", async () => {
  const app = await makeApp(["stores:read"]);
  const fresh = await call(`/oauth/applications/${app.id}/rotate-secret`, { method: "POST", headers: ADMIN });
  assert.notEqual(fresh.body.clientSecret, app.clientSecret);
  const old = await call("/oauth/token", { method: "POST", headers: { ...basic(app), "Content-Type": "application/x-www-form-urlencoded" }, body: "grant_type=client_credentials" });
  assert.equal(old.status, 401);
  const ok = await call("/oauth/token", { method: "POST", headers: { ...basic({ clientId: app.clientId, clientSecret: fresh.body.clientSecret }), "Content-Type": "application/x-www-form-urlencoded" }, body: "grant_type=client_credentials" });
  assert.equal(ok.status, 200);
});

t("OAuth refresh token: xoay vòng, dùng lại token cũ thu hồi cả phiên", async () => {
  const app = await prisma.oAuthApplication.findUniqueOrThrow({ where: { clientId: "remini-zalo-miniapp" } });
  const user = await prisma.user.findUniqueOrThrow({ where: { id: ids.userA! } });
  const rt = "rmr_t_" + randomBytes(8).toString("hex");
  await prisma.oAuthRefreshToken.create({ data: { tokenHash: sha(rt), applicationId: app.id, userId: user.id, scope: "profile", expiresAt: new Date(Date.now() + 3600e3) } });
  const doRefresh = (token: string) => call("/oauth/token", { method: "POST", ...form({ grant_type: "refresh_token", client_id: "remini-zalo-miniapp", refresh_token: token }) });

  const first = await doRefresh(rt);
  assert.equal(first.status, 200);
  assert.ok(first.body.refresh_token && first.body.refresh_token !== rt);
  assert.equal((await doRefresh(rt)).body.error, "invalid_grant", "dùng lại refresh cũ bị từ chối");
  assert.equal((await doRefresh(first.body.refresh_token)).body.error, "invalid_grant", "…và phiên mới cũng bị thu hồi");
});

// ───────── Lead + chống spam ─────────
const lead = (o: Record<string, unknown>) => call("/leads", { method: "POST", body: json({ source: "test", ...o }) });

t("Lead: số điện thoại sai bị từ chối", async () => {
  assert.equal((await lead({ name: "t_An", phone: "123" })).status, 400);
});

t("Lead: honeypot trả thành công giả nhưng không lưu", async () => {
  const r = await lead({ name: "t_Bot", phone: "0966000011", website: "http://spam" });
  assert.equal(r.status, 201);
  assert.equal(r.body.id, "accepted");
  assert.equal(await prisma.consultationLead.count({ where: { phone: "0966000011" } }), 0);
});

t("Lead: từ khoá spam + link bị từ chối", async () => {
  const r = await lead({ name: "t_Spam", phone: "0966000012", note: "vay tiền nhanh bit.ly/abc" });
  assert.equal(r.status, 400);
});

t("Lead: gửi lặp trong 10 phút trả về bản cũ", async () => {
  const form1 = await call("/antispam/form-token");
  await new Promise((r) => setTimeout(r, 2700));
  const a = await lead({ name: "t_Bình Nguyễn", phone: "0966000013", formToken: form1.body.token, note: "Cần mini app" });
  assert.equal(a.status, 201, JSON.stringify(a.body));
  const b = await lead({ name: "t_Bình Nguyễn", phone: "0966000013", formToken: form1.body.token });
  assert.equal(b.body.id, a.body.id);
  assert.equal(b.body.duplicate, true);
});

t("Lịch gọi lại: cần ngày + khung giờ hợp lệ", async () => {
  const none = await lead({ name: "t_Lan Chi", phone: "0966000014", requestType: "callback", formToken: "x" });
  assert.equal(none.status, 400);
  const past = await lead({ name: "t_Lan Chi", phone: "0966000014", requestType: "callback", callbackDate: "2020-01-01", callbackSlot: "10:00-12:00" });
  assert.equal(past.status, 400);
  const badSlot = await lead({ name: "t_Lan Chi", phone: "0966000014", requestType: "callback", callbackDate: "2026-12-01", callbackSlot: "03:00-04:00" });
  assert.equal(badSlot.status, 400);
});

// ───────── Công nợ ─────────
t("Công nợ: tạo, thu từng phần, không thu vượt, tự chuyển 'paid'", async () => {
  const d = await call("/debts", { method: "POST", headers: ADMIN, body: json({ customerId: ids.customerA, title: "t_Phí thiết kế", amount: 1000000 }) });
  assert.equal(d.status, 201, JSON.stringify(d.body));
  assert.equal(d.body.remaining, 1000000);
  const id = d.body.id as string;
  const p1 = await call(`/debts/${id}/payments`, { method: "POST", headers: ADMIN, body: json({ amount: 400000, method: "bank" }) });
  assert.equal(p1.body.status, "partial");
  assert.equal(p1.body.remaining, 600000);
  assert.equal((await call(`/debts/${id}/payments`, { method: "POST", headers: ADMIN, body: json({ amount: 700000 }) })).status, 400, "thu vượt số còn nợ");
  assert.equal((await call(`/debts/${id}`, { method: "PATCH", headers: ADMIN, body: json({ amount: 300000 }) })).status, 400, "giảm nợ thấp hơn số đã thu");
  const p2 = await call(`/debts/${id}/payments`, { method: "POST", headers: ADMIN, body: json({ amount: 600000 }) });
  assert.equal(p2.body.status, "paid");
  const undo = await call(`/debts/payments/${p2.body.payments[0].id}`, { method: "DELETE", headers: ADMIN });
  assert.equal(undo.body.status, "partial");
});

t("Công nợ: quá hạn + chỉ quản trị viên", async () => {
  const d = await call("/debts", { method: "POST", headers: ADMIN, body: json({ customerId: ids.customerA, title: "t_Quá hạn", amount: 500000, dueDate: "2020-01-01" }) });
  assert.equal(d.body.status, "overdue");
  const list = await call("/debts?status=overdue", { headers: ADMIN });
  assert.ok(list.body.items.some((x: { id: string }) => x.id === d.body.id));
  assert.ok(list.body.summary.overdueAmount >= 500000);
  assert.equal((await call("/debts", { method: "POST", headers: ADMIN, body: json({ customerId: ids.customerA, title: "x", amount: -5 }) })).status, 400);
});

// ───────── Store ─────────
t("Store công khai: slug không tồn tại → 404", async () => {
  assert.equal((await call("/stores/public/khong-ton-tai-t")).status, 404);
});

t("Tạo store: slug sai định dạng bị từ chối", async () => {
  const r = await call("/stores", { method: "POST", headers: ADMIN, body: json({ name: "t_x", slug: "Sai Slug!", templateId: "mixue_01" }) });
  assert.equal(r.status, 400);
});
