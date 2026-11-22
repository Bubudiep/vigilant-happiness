import * as assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { after, before, test } from "node:test";
import { PrismaClient } from "@prisma/client";

/**
 * Test tích hợp OA riêng của gian hàng + yêu cầu build Mini App. Chạy với server test (npm run start:test, cổng 4010).
 * Không có server thì bỏ qua; dữ liệu tiền tố "t_" được dọn sau khi chạy.
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

const APP_ID = "t_store_app";
const OA_SECRET = "t_store_oa_secret";
const SLUG = "t-oa-shop";
let up = false;
let storeId = "";
let customerId = "";

const sign = (raw: string, ts: string, secret = OA_SECRET) => "mac=" + createHash("sha256").update(APP_ID + raw + ts + secret).digest("hex");
const webhook = (event: Record<string, unknown>, secret = OA_SECRET, slug = SLUG) => {
  const ts = String(Date.now());
  const raw = JSON.stringify({ app_id: APP_ID, timestamp: ts, ...event });
  return call(`/oa/webhook/${slug}`, { method: "POST", headers: { "Content-Type": "application/json", "X-ZEvent-Signature": sign(raw, ts, secret) }, body: raw });
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

before(async () => {
  up = await fetch(`${API}/health`).then((r) => r.ok).catch(() => false);
  if (!up) return console.warn(`[store-oa.api.test] Không kết nối được ${API} — bỏ qua`);
  customerId = (await call("/customers", { method: "POST", headers: ADMIN, body: json({ name: "t_Chủ OA shop", phone: "0966000201" }) })).body.id;
  const s = await call("/stores", {
    method: "POST",
    headers: ADMIN,
    body: json({ customerId, name: "t_OA Shop", slug: SLUG, templateId: "fnb_cafe_01", zaloAppId: APP_ID }),
  });
  assert.equal(s.status, 201, JSON.stringify(s.body));
  storeId = s.body.id;
});

after(async () => {
  if (up) {
    await prisma.conversation.deleteMany({ where: { storeId } });
    await prisma.oaCredential.deleteMany({ where: { id: `store:${storeId}` } });
    await prisma.store.deleteMany({ where: { slug: SLUG } });
    await prisma.platformCustomer.deleteMany({ where: { name: { startsWith: "t_" } } });
  }
  await prisma.$disconnect();
});

const t = (name: string, fn: () => Promise<void>) => test(name, async (ctx) => (up ? fn() : ctx.skip("backend không chạy")));

t("Lưu OA riêng: secret/token chỉ ghi, trạng thái báo đủ điều kiện", async () => {
  const before = await call(`/stores/${storeId}/oa`, { headers: ADMIN });
  assert.equal(before.body.hasOaSecret, false);
  assert.equal(before.body.configured, false);
  assert.equal(before.body.webhookPath, `/api/oa/webhook/${SLUG}`);

  const half = await call(`/stores/${storeId}/oa`, { method: "PUT", headers: ADMIN, body: json({ accessToken: "x" }) });
  assert.equal(half.status, 400);

  const saved = await call(`/stores/${storeId}/oa`, { method: "PUT", headers: ADMIN, body: json({ oaId: "t_oa_1", oaSecret: OA_SECRET, accessToken: "t_access", refreshToken: "t_refresh" }) });
  assert.equal(saved.status, 200, JSON.stringify(saved.body));
  assert.equal(saved.body.hasOaSecret, true);
  assert.equal(saved.body.configured, true);
  assert.equal(saved.body.oaId, "t_oa_1");
  assert.ok(!JSON.stringify(saved.body).includes(OA_SECRET) && !JSON.stringify(saved.body).includes("t_access"), "không được trả secret/token");

  const detail = await call(`/stores/${storeId}`, { headers: ADMIN });
  assert.ok(!JSON.stringify(detail.body).includes("oaSecretEnc"), "chi tiết gian hàng không được lộ secret đã mã hoá");
  assert.equal(detail.body.hasOaSecret, true);

  // gỡ token (giữ OA ID + secret) để các test sau không gọi Zalo thật
  const off = await call(`/stores/${storeId}/oa/token`, { method: "DELETE", headers: ADMIN });
  assert.equal(off.status, 200);
  assert.equal(off.body.configured, false);
  assert.equal(off.body.hasOaSecret, true);
});

t("Webhook OA của gian hàng: chữ ký sai 401, slug lạ 404, đúng thì vào hộp thư gian hàng và KHÔNG lộ sang hộp thư reMini", async () => {
  const msg = { event_name: "user_send_text", sender: { id: "t_oauser" }, recipient: { id: "t_oa_1" }, message: { text: "t_Cho mình hỏi giá", msg_id: "t_m1" } };
  assert.equal((await webhook(msg, "sai-secret")).status, 401);
  assert.equal((await webhook(msg, OA_SECRET, "khong-co-shop")).status, 404);
  assert.equal((await webhook(msg)).status, 200);
  assert.equal((await webhook(msg)).status, 200); // gửi lặp
  await sleep(600);

  const list = await call(`/stores/${storeId}/inbox/conversations?status=open`, { headers: ADMIN });
  assert.equal(list.status, 200);
  assert.equal(list.body.length, 1);
  assert.equal(list.body[0].lastPreview, "t_Cho mình hỏi giá");

  const platform = await call("/inbox/conversations?q=t_Cho", { headers: ADMIN });
  assert.equal(platform.body.length, 0, "hộp thư reMini không được thấy hội thoại của gian hàng");
  const cross = await call(`/inbox/conversations/${list.body[0].id}`, { headers: ADMIN });
  assert.equal(cross.status, 404);

  const detail = await call(`/stores/${storeId}/inbox/conversations/${list.body[0].id}`, { headers: ADMIN });
  assert.equal(detail.body.messages.length, 1, "tin gửi lặp chỉ lưu một lần");
});

t("Trả lời khách OA: ghi chú nội bộ lưu được; gửi OA lỗi vẫn lưu với delivery=failed", async () => {
  const list = await call(`/stores/${storeId}/inbox/conversations`, { headers: ADMIN });
  const cid = list.body[0].id;
  const fd = new FormData();
  fd.set("body", "t_ghi chú");
  fd.set("internal", "true");
  const note = await call(`/stores/${storeId}/inbox/conversations/${cid}/messages`, { method: "POST", headers: ADMIN, body: fd });
  assert.equal(note.status, 201, JSON.stringify(note.body));
  assert.equal(note.body.direction, "note");

  const fd2 = new FormData();
  fd2.set("body", "t_Dạ giá 50k ạ");
  const out = await call(`/stores/${storeId}/inbox/conversations/${cid}/messages`, { method: "POST", headers: ADMIN, body: fd2 });
  assert.equal(out.status, 201, JSON.stringify(out.body));
  assert.equal(out.body.direction, "out");
  assert.equal(out.body.delivery, "failed"); // token giả → Zalo không nhận; nội dung vẫn được giữ
  assert.ok(out.body.error);

  const closed = await call(`/stores/${storeId}/inbox/conversations/${cid}`, { method: "PATCH", headers: ADMIN, body: json({ status: "closed" }) });
  assert.equal(closed.status, 200);
  assert.equal(closed.body.status, "closed");
});

t("Yêu cầu build: gửi → chờ duyệt → duyệt → chờ Zalo → phát hành, cập nhật App ID gian hàng", async () => {
  const a = await call(`/stores/${storeId}/build-requests`, { method: "POST", headers: ADMIN, body: json({ appName: "t_Quán A", note: "t_gấp" }) });
  assert.equal(a.status, 201, JSON.stringify(a.body));
  assert.equal(a.body.status, "pending_admin");
  const id = a.body.id as string;

  assert.equal((await call(`/stores/${storeId}/build-requests`, { method: "POST", headers: ADMIN, body: json({}) })).status, 409, "đang có yêu cầu mở");
  assert.equal((await call(`/admin/build-requests/${id}`, { method: "PATCH", headers: ADMIN, body: json({ action: "publish" }) })).status, 400, "chưa qua bước Zalo duyệt");
  assert.equal((await call(`/admin/build-requests/${id}`, { method: "PATCH", headers: ADMIN, body: json({ action: "reject" }) })).status, 400, "từ chối cần lý do");

  const snap = await prisma.storeBuildRequest.findUniqueOrThrow({ where: { id } });
  assert.equal((snap.snapshot as { slug: string }).slug, SLUG, "lưu bản chụp cấu hình");

  const ap = await call(`/admin/build-requests/${id}`, { method: "PATCH", headers: ADMIN, body: json({ action: "approve", adminNote: "t_ok" }) });
  assert.equal(ap.body.status, "pending_zalo");
  assert.equal((await call(`/stores/${storeId}/build-requests/${id}/cancel`, { method: "POST", headers: ADMIN })).status, 400, "đã duyệt thì shop không huỷ được");

  const pub = await call(`/admin/build-requests/${id}`, { method: "PATCH", headers: ADMIN, body: json({ action: "publish", appId: "1234567890123" }) });
  assert.equal(pub.body.status, "published");
  assert.equal(pub.body.publishedUrl, "https://zalo.me/s/1234567890123/");
  const store = await prisma.store.findUniqueOrThrow({ where: { id: storeId } });
  assert.equal(store.zaloAppId, "1234567890123");

  const mine = await call(`/stores/${storeId}/build-requests`, { headers: ADMIN });
  assert.equal(mine.body[0].status, "published");
  assert.ok(!("snapshot" in mine.body[0]), "shop không cần nhận cả bản chụp");
});

t("Yêu cầu build: shop huỷ khi chưa duyệt; admin từ chối có lý do; App ID sai bị chặn", async () => {
  assert.equal((await call(`/stores/${storeId}/build-requests`, { method: "POST", headers: ADMIN, body: json({ appId: "abc" }) })).status, 400);
  const a = await call(`/stores/${storeId}/build-requests`, { method: "POST", headers: ADMIN, body: json({}) });
  assert.equal(a.status, 201);
  const c = await call(`/stores/${storeId}/build-requests/${a.body.id}/cancel`, { method: "POST", headers: ADMIN });
  assert.equal(c.body.status, "cancelled");

  const b = await call(`/stores/${storeId}/build-requests`, { method: "POST", headers: ADMIN, body: json({}) });
  const r = await call(`/admin/build-requests/${b.body.id}`, { method: "PATCH", headers: ADMIN, body: json({ action: "reject", adminNote: "t_thiếu logo" }) });
  assert.equal(r.body.status, "rejected");
  assert.equal(r.body.adminNote, "t_thiếu logo");
  const list = await call("/admin/build-requests?status=rejected", { headers: ADMIN });
  assert.ok(list.body.some((x: { id: string }) => x.id === b.body.id));
});

t("Người không phải admin không dùng được API duyệt build", async () => {
  assert.equal((await call("/admin/build-requests")).status, 401);
});
