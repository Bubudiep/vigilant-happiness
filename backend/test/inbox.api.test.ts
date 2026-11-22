import * as assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { after, before, test } from "node:test";
import { PrismaClient } from "@prisma/client";

/**
 * Test tích hợp hộp thư / ảnh khách / OA / chăm sóc. Chạy với server test (npm run start:test, cổng 4010,
 * có ZALO_APP_ID=t_app, ZALO_OA_SECRET=t_oa_secret). Không có server thì bỏ qua; dữ liệu tiền tố "t_" được dọn sau khi chạy.
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
const json = (o: unknown) => JSON.stringify(o);

async function call(path: string, init: RequestInit & { headers?: Record<string, string> } = {}) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { ...(typeof init.body === "string" ? { "Content-Type": "application/json" } : {}), ...init.headers },
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
const form = (fields: Record<string, string>, file?: { name: string; data: Buffer }) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  if (file) fd.set("file", new Blob([new Uint8Array(file.data)]), file.name);
  return fd;
};

let up = false;
let customerA = "";
let customerB = "";
let token = "";

before(async () => {
  up = await fetch(`${API}/health`).then((r) => r.ok).catch(() => false);
  if (!up) return console.warn(`[inbox.api.test] Không kết nối được ${API} — bỏ qua`);
  const mk = async (name: string, phone: string) => (await call("/customers", { method: "POST", headers: ADMIN, body: json({ name, phone }) })).body.id as string;
  customerA = await mk("t_Inbox A", "0966000101");
  customerB = await mk("t_Inbox B", "0966000102");
  const app = await prisma.oAuthApplication.findUniqueOrThrow({ where: { clientId: "remini-zalo-miniapp" } });
  const user = await prisma.user.upsert({
    where: { provider_providerId: { provider: "zalo", providerId: "t_inbox_user" } },
    update: { customerId: customerA, phone: "0966000101" },
    create: { provider: "zalo", providerId: "t_inbox_user", name: "t_Chủ Inbox", role: "member", phone: "0966000101", customerId: customerA },
  });
  token = "rma_t_" + randomBytes(8).toString("hex");
  await prisma.oAuthAccessToken.create({
    data: { tokenHash: sha(token), applicationId: app.id, userId: user.id, scope: "profile tickets:write", expiresAt: new Date(Date.now() + 3600e3) },
  });
});

after(async () => {
  if (up) {
    const convs = await prisma.conversation.findMany({
      where: { OR: [{ externalKey: { startsWith: "t_" } }, { displayName: { startsWith: "t_" } }, { customerId: { in: [customerA, customerB] } }] },
      select: { id: true },
    });
    const ids = convs.map((c) => c.id);
    const atts = await prisma.attachment.findMany({ where: { OR: [{ conversationId: { in: ids } }, { filename: { startsWith: "t_" } }, { customerId: { in: [customerA, customerB] } }] }, select: { id: true } });
    for (const a of atts) await call(`/inbox/files/${a.id}`, { method: "DELETE", headers: ADMIN }).catch(() => undefined);
    await prisma.conversation.deleteMany({ where: { id: { in: ids } } });
    await prisma.user.deleteMany({ where: { providerId: "t_inbox_user" } });
    await prisma.platformCustomer.deleteMany({ where: { name: { startsWith: "t_" } } });
  }
  await prisma.$disconnect();
});

const t = (name: string, fn: () => Promise<void>) => test(name, async (ctx) => (up ? fn() : ctx.skip("backend không chạy")));
const sendMsg = (body?: string, file?: { name: string; data: Buffer }) =>
  call("/me/messages", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form(body ? { body } : {}, file) });

t("Khách nhắn chữ + ảnh → nhân viên thấy, trả lời, ảnh tải bằng URL ký", async () => {
  const text = await sendMsg("t_Xin chào, tôi muốn sửa banner");
  assert.equal(text.status, 201, JSON.stringify(text.body));
  const img = await sendMsg(undefined, { name: "t_banner.png", data: PNG });
  assert.equal(img.status, 201, JSON.stringify(img.body));
  assert.equal(img.body.kind, "image");

  const list = await call("/inbox/conversations?channel=miniapp&q=t_", { headers: ADMIN });
  const conv = list.body.find((c: { displayName: string }) => c.displayName === "t_Chủ Inbox");
  assert.ok(conv, "có hội thoại");
  assert.equal(conv.unreadStaff, 2);
  assert.equal(conv.customerId, customerA, "tự gắn khách theo SĐT Zalo");

  const detail = await call(`/inbox/conversations/${conv.id}`, { headers: ADMIN });
  assert.equal(detail.body.messages.length, 2);
  const url = detail.body.messages[1].image.url as string;
  const ok = await fetch(url);
  assert.equal(ok.status, 200);
  assert.equal(ok.headers.get("content-type"), "image/png");
  assert.equal(ok.headers.get("x-content-type-options"), "nosniff");
  assert.equal((await fetch(url.replace(/sig=[0-9a-f]{4}/, "sig=0000"))).status, 403, "chữ ký sai");
  assert.equal((await fetch(url.replace(/exp=\d+/, "exp=1"))).status, 403, "hết hạn");
  assert.equal((await call(`/inbox/conversations/${conv.id}`, { headers: ADMIN })).body.unreadStaff, 0, "mở xem là đã đọc");

  const reply = await call(`/inbox/conversations/${conv.id}/messages`, { method: "POST", headers: ADMIN, body: form({ body: "t_Dạ em đã nhận ảnh ạ" }) });
  assert.equal(reply.status, 201, JSON.stringify(reply.body));
  const note = await call(`/inbox/conversations/${conv.id}/messages`, { method: "POST", headers: ADMIN, body: form({ body: "t_Khách khó tính", internal: "true" }) });
  assert.equal(note.body.direction, "note");

  const thread = await call("/me/messages", { headers: { Authorization: `Bearer ${token}` } });
  assert.deepEqual(thread.body.messages.map((m: { from: string }) => m.from), ["me", "me", "staff"], "khách không thấy ghi chú nội bộ");
  assert.equal((await call("/me/messages/unread", { headers: { Authorization: `Bearer ${token}` } })).body.count, 0);

  const gal = await call(`/inbox/files?customerId=${customerA}`, { headers: ADMIN });
  assert.equal(gal.body.length, 1);
  assert.equal(gal.body[0].storageKey, undefined, "không lộ đường dẫn lưu trữ");
  const tag = await call(`/inbox/files/${gal.body[0].id}`, { method: "PATCH", headers: ADMIN, body: json({ tag: "banner", note: "t_ảnh gốc" }) });
  assert.equal(tag.body.tag, "banner");
});

t("Upload: từ chối file giả mạo (HTML đổi đuôi .png), rỗng và ảnh quá lớn", async () => {
  const fake = await sendMsg(undefined, { name: "t_x.png", data: Buffer.from("<html><script>alert(1)</script></html> padding padding") });
  assert.equal(fake.status, 400);
  const big = await sendMsg(undefined, { name: "t_big.png", data: Buffer.concat([PNG, Buffer.alloc(9 * 1024 * 1024)]) });
  assert.ok([400, 413].includes(big.status), `quá lớn → ${big.status}`);
  assert.equal((await sendMsg()).status, 400, "không có chữ lẫn ảnh");
});

t("Hộp thư chỉ dành cho quản trị", async () => {
  const h = { Authorization: `Bearer ${token}` };
  for (const p of ["/inbox/conversations", "/inbox/files", "/inbox/care", "/inbox/oa/status", "/inbox/summary"]) assert.equal((await call(p, { headers: h })).status, 403, p);
  assert.equal((await call("/inbox/conversations")).status, 401);
});

const OA_APP = "t_app";
const OA_SECRET = "t_oa_secret";
const oaPost = (payload: Record<string, unknown>, sig?: string) => {
  const raw = JSON.stringify({ app_id: OA_APP, ...payload });
  const mac = sig ?? createHash("sha256").update(OA_APP + raw + String(payload.timestamp) + OA_SECRET).digest("hex");
  return call("/oa/webhook", { method: "POST", headers: { "X-ZEvent-Signature": `mac=${mac}` }, body: raw });
};

t("Webhook OA: chữ ký sai bị từ chối; tin hợp lệ vào hộp thư, gửi lặp chỉ lưu một lần", async () => {
  const bad = await oaPost({ event_name: "user_send_text", sender: { id: "t_oa_1" }, message: { text: "x", msg_id: "m0" }, timestamp: "1" }, "deadbeef");
  if (bad.status === 503) return; // server không có ZALO_OA_SECRET — chạy bằng npm run start:test
  assert.equal(bad.status, 401);
  const ev = { event_name: "user_send_text", sender: { id: "t_oa_1" }, recipient: { id: "oa" }, message: { text: "t_Cho em hỏi giá gói Pro", msg_id: "t_m1" }, timestamp: "1700000000001" };
  assert.equal((await oaPost(ev)).status, 200);
  assert.equal((await oaPost(ev)).status, 200, "Zalo gửi lại");
  await new Promise((r) => setTimeout(r, 1000)); // xử lý nền
  const conv = (await call("/inbox/conversations?channel=oa", { headers: ADMIN })).body.find((c: { externalKey: string }) => c.externalKey === "t_oa_1");
  assert.ok(conv, "có hội thoại OA");
  const detail = await call(`/inbox/conversations/${conv.id}`, { headers: ADMIN });
  assert.equal(detail.body.messages.length, 1);
  assert.equal(detail.body.messages[0].body, "t_Cho em hỏi giá gói Pro");

  // OA chưa có token → tin gửi đi vẫn được lưu, đánh dấu failed + lý do
  const out = await call(`/inbox/conversations/${conv.id}/messages`, { method: "POST", headers: ADMIN, body: form({ body: "t_Dạ gói Pro ạ" }) });
  assert.equal(out.status, 201);
  assert.equal(out.body.delivery, "failed");
  assert.ok(out.body.error);

  const link = await call(`/inbox/conversations/${conv.id}`, { method: "PATCH", headers: ADMIN, body: json({ customerId: customerB, status: "closed" }) });
  assert.equal(link.body.customerId, customerB);
  assert.equal(link.body.status, "closed");
});

t("Việc chăm sóc: bắt buộc gắn khách/hội thoại, đến hạn, hoàn thành", async () => {
  const none = await call("/inbox/care", { method: "POST", headers: ADMIN, body: json({ title: "t_x", dueAt: new Date().toISOString() }) });
  assert.equal(none.status, 400);
  const c = await call("/inbox/care", { method: "POST", headers: ADMIN, body: json({ title: "t_Hỏi thăm sau bàn giao", dueAt: new Date(Date.now() - 60000).toISOString(), customerId: customerA }) });
  assert.equal(c.status, 201, JSON.stringify(c.body));
  assert.ok((await call("/inbox/summary", { headers: ADMIN })).body.careDue >= 1);
  const done = await call(`/inbox/care/${c.body.id}`, { method: "PATCH", headers: ADMIN, body: json({ done: true }) });
  assert.ok(done.body.doneAt);
  const open = await call(`/inbox/care?status=open&customerId=${customerA}`, { headers: ADMIN });
  assert.ok(!open.body.some((x: { id: string }) => x.id === c.body.id));
});
