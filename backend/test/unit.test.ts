import * as assert from "node:assert/strict";
import { createServer } from "node:http";
import { test } from "node:test";
import { AntiSpamService, hasDigitRun } from "../src/antispam/antispam.service";
import { debtStatus } from "../src/debts/debts.service";
import { diskLevel, parseSlot, shouldAlertDisk, shouldRemind } from "../src/jobs/jobs.service";
import { NotifyService } from "../src/notify/notify.service";
import { normalizeVnPhone } from "../src/oauth/zalo.service";

const config = (env: Record<string, string> = {}) => ({ get: (k: string) => env[k] }) as never;

// ───────── Nhắc lịch gọi lại ─────────
test("parseSlot đọc khung giờ", () => {
  assert.deepEqual(parseSlot("10:00-12:00"), [600, 720]);
  assert.equal(parseSlot("sáng"), null);
});

test("shouldRemind: nhắc trong 15 phút trước giờ hẹn đến hết khung", () => {
  const day = new Date("2026-11-21T00:00:00+07:00");
  const at = (hhmm: string) => new Date(`2026-11-21T${hhmm}:00+07:00`).getTime();
  assert.equal(shouldRemind(day, "10:00-12:00", at("09:40")), false, "còn 20 phút → chưa nhắc");
  assert.equal(shouldRemind(day, "10:00-12:00", at("09:46")), true, "còn 14 phút → nhắc");
  assert.equal(shouldRemind(day, "10:00-12:00", at("11:00")), true, "đang trong khung → vẫn nhắc nếu chưa nhắc");
  assert.equal(shouldRemind(day, "10:00-12:00", at("12:01")), false, "quá khung → bỏ");
  assert.equal(shouldRemind(day, "bad", at("10:00")), false);
});

// ───────── Số điện thoại Zalo ─────────
test("normalizeVnPhone", () => {
  assert.equal(normalizeVnPhone("84987654321"), "0987654321");
  assert.equal(normalizeVnPhone("+84 987 654 321"), "0987654321");
  assert.equal(normalizeVnPhone("0987654321"), "0987654321");
  assert.equal(normalizeVnPhone("12345"), null);
  assert.equal(normalizeVnPhone(undefined), null);
});

// ───────── Thông báo ─────────
test("NotifyService escape HTML và gửi webhook", async () => {
  const received: { event: string; text: string }[] = [];
  const server = createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      received.push(JSON.parse(body));
      res.end("ok");
    });
  });
  await new Promise<void>((r) => server.listen(0, r));
  const port = (server.address() as { port: number }).port;

  const n = new NotifyService(config({ NOTIFY_WEBHOOK_URL: `http://127.0.0.1:${port}/hook`, FRONTEND_URL: "https://admin.example.com/" }));
  const res = await n.send({ type: "lead.created", name: "<b>Bình</b> & Co", phone: "0912345678", verified: true, note: "cần app" });
  server.close();

  assert.equal(res.webhook, true);
  assert.equal(res.telegram, false);
  assert.equal(received[0].event, "lead.created");
  assert.ok(received[0].text.includes("<b>Bình</b> & Co"), "text thuần không còn thẻ HTML của hệ thống");
  assert.ok(received[0].text.includes("https://admin.example.com/admin/callbacks"));
  assert.ok(n.format({ type: "lead.created", name: "<x>", phone: "0912345678", verified: false }).html.includes("&lt;x&gt;"));
});

test("NotifyService không ném lỗi khi kênh hỏng", async () => {
  const n = new NotifyService(config({ NOTIFY_WEBHOOK_URL: "http://127.0.0.1:1/none" }));
  const res = await n.send({ type: "callback.reminder", name: "A", phone: "0912345678", slot: "10:00-12:00" });
  assert.equal(res.webhook, false);
});

// ───────── Chống spam ─────────
function spamService() {
  const events: unknown[] = [];
  const prisma = {
    spamBlock: { findMany: async () => [], updateMany: async () => ({}), upsert: async () => ({}) },
    consultationLead: { count: async () => 0 },
    spamEvent: { create: async ({ data }: { data: unknown }) => events.push(data), count: async () => 0 },
  };
  return { svc: new AntiSpamService(prisma as never, config({ ANTISPAM_SECRET: "test-secret" })), events };
}

test("Chống spam: honeypot bị chặn âm thầm", async () => {
  const { svc } = spamService();
  const v = await svc.check({ route: "t", honeypot: "http://spam", phone: "0912345678" });
  assert.equal(v.action, "block");
  assert.equal(v.silent, true);
});

test("Chống spam: thiếu form token → nghi ngờ; token hợp lệ sau 3 giây → sạch", async () => {
  const { svc } = spamService();
  const base = { route: "t", name: "Nguyễn Văn Bình", phone: "0938112244", texts: ["Cần mini app bán hàng"] };
  const noToken = await svc.check(base);
  assert.ok(noToken.reasons.includes("no_form_token"));
  assert.equal(noToken.action, "flag");

  const { token } = svc.issueFormToken();
  const realNow = Date.now;
  Date.now = () => realNow() + 3000;
  try {
    const ok = await svc.check({ ...base, formToken: token });
    assert.equal(ok.action, "allow");
    assert.equal(ok.score, 0);
    const reused = await svc.check({ ...base, formToken: token });
    assert.ok(reused.reasons.includes("token_reused"));
  } finally {
    Date.now = realNow;
  }
});

test("Chống spam: gửi quá nhanh + token giả", async () => {
  const { svc } = spamService();
  const { token } = svc.issueFormToken();
  const fast = await svc.check({ route: "t", name: "Lan", phone: "0938112233", formToken: token });
  assert.ok(fast.reasons.includes("too_fast"));
  const forged = await svc.check({ route: "t", name: "Lan", phone: "0938112233", formToken: token.slice(0, -3) + "xyz" });
  assert.ok(forged.reasons.includes("bad_form_token"));
});

test("Chống spam: từ khoá, link, đầu số lạ, số dãy", async () => {
  const { svc } = spamService();
  const kw = await svc.check({ route: "t", skipFormToken: true, name: "An", phone: "0938112233", texts: ["vay tiền nhanh bit.ly/x"] });
  assert.equal(kw.action, "block", "từ khoá + link vượt ngưỡng chặn");
  const bad = await svc.check({ route: "t", skipFormToken: true, name: "An", phone: "0111111111" });
  assert.ok(bad.reasons.includes("phone_prefix"));
  const seq = await svc.check({ route: "t", skipFormToken: true, name: "An", phone: "0912345678" });
  assert.ok(seq.reasons.includes("phone_pattern"));
});

test("Chống spam: người dùng Zalo đã xác minh được giảm điểm", async () => {
  const { svc } = spamService();
  const v = await svc.check({ route: "t", trusted: true, name: "Hoa", phone: "0938112233", texts: ["xem https://remini.vn giúp"] });
  assert.equal(v.action, "allow");
  assert.ok(v.reasons.includes("zalo_verified"));
});

test("hasDigitRun: nhận diện số dãy nhưng không đánh nhầm số thường", () => {
  assert.equal(hasDigitRun("912345678", 6), true);
  assert.equal(hasDigitRun("987654321", 6), true);
  assert.equal(hasDigitRun("900000012", 6), true);
  assert.equal(hasDigitRun("938112244", 6), false);
  assert.equal(hasDigitRun("977001133", 6), false);
});

test("normalizeVnPhone: mọi cách nhập về cùng dạng để khớp số Zalo", () => {
  for (const raw of ["0977 001 122", "+84 977 001 122", "84977001122", "0977.001.122", " 0977-001-122 "]) {
    assert.equal(normalizeVnPhone(raw), "0977001122", raw);
  }
});

// ───────── Công nợ ─────────
test("debtStatus: chưa trả / trả một phần / đủ / quá hạn", () => {
  const now = new Date("2026-11-20T10:00:00");
  assert.equal(debtStatus(1000, 0, null, now), "unpaid");
  assert.equal(debtStatus(1000, 400, null, now), "partial");
  assert.equal(debtStatus(1000, 1000, null, now), "paid");
  assert.equal(debtStatus(1000, 1000, new Date("2020-01-01"), now), "paid", "đã thu đủ thì không quá hạn");
  assert.equal(debtStatus(1000, 400, new Date("2026-11-19"), now), "overdue");
  assert.equal(debtStatus(1000, 0, new Date("2026-11-20"), now), "unpaid", "đúng ngày hạn vẫn chưa quá hạn");
  assert.equal(debtStatus(1000, 0, new Date("2026-11-21"), now), "unpaid");
});

// ───────── Cảnh báo ổ đĩa (T32) ─────────
test("diskLevel: <80 bình thường, ≥80 cảnh báo, ≥90 khẩn", () => {
  assert.equal(diskLevel(79.9), null);
  assert.equal(diskLevel(80), "warn");
  assert.equal(diskLevel(89.99), "warn");
  assert.equal(diskLevel(90), "critical");
  assert.equal(diskLevel(100), "critical");
});

test("shouldAlertDisk: mỗi mức tối đa 1 lần / 12 giờ", () => {
  const now = Date.now();
  assert.equal(shouldAlertDisk(undefined, now), true);
  assert.equal(shouldAlertDisk(now - 11 * 3600e3, now), false);
  assert.equal(shouldAlertDisk(now - 12 * 3600e3, now), true);
});

test("notify: định dạng cảnh báo ổ đĩa", () => {
  const e = { type: "disk.warning" as const, level: "critical" as const, usedPct: 92.3, freeBytes: 3 * 1024 ** 3, totalBytes: 40 * 1024 ** 3 };
  const { text } = new NotifyService({ get: () => undefined } as never).format(e);
  assert.match(text, /KHẨN/);
  assert.match(text, /92\.3%/);
  assert.match(text, /3\.0 \/ 40\.0 GB/);
});

// ───────── Bán hàng: tiền giờ bàn / phòng ─────────
import { timeCharge } from "../src/pos/pos.service";

test("timeCharge: làm tròn lên theo block, tối thiểu, giá giờ", () => {
  const t0 = new Date("2026-11-25T10:00:00Z");
  const at = (min: number) => new Date(t0.getTime() + min * 60_000);
  // Bida 60k/h, block 30′: 41′ → 60′ → 60.000đ
  assert.deepEqual(timeCharge(t0, at(41), 60_000, 30, 0), { minutes: 41, billedMinutes: 60, charge: 60_000 });
  // 30′ đúng → 30.000đ
  assert.equal(timeCharge(t0, at(30), 60_000, 30, 0).charge, 30_000);
  // Karaoke 150k/h, tối thiểu 60′: 20′ → 150.000đ
  assert.equal(timeCharge(t0, at(20), 150_000, 30, 60).charge, 150_000);
  // Block 15′: 50′ → 60′; 1h05 → 75′ → 75.000đ
  assert.equal(timeCharge(t0, at(65), 60_000, 15, 0).charge, 75_000);
  // Tính theo phút (block 1), làm tròn 1.000đ: 7′ × 50k/h = 5.833 → 6.000
  assert.equal(timeCharge(t0, at(7), 50_000, 1, 0).charge, 6_000);
  // Không tính giờ
  assert.equal(timeCharge(t0, at(90), 0, 30, 0).charge, 0);
});

// ───────── Thẻ tích tem ─────────
import { parseStampProgram, stampsForOrder } from "../src/stores/stamps";

test("stampsForOrder: theo món / theo đơn / sản phẩm áp dụng", () => {
  const items = [
    { productId: "a", quantity: 2 },
    { productId: "b", quantity: 1 },
    { productId: null, quantity: 1 }, // dòng tiền giờ / món ngoài danh mục: không tính
  ];
  const base = { enabled: true, required: 10, productIds: [] as string[], countBy: "item" as const, reward: "Quà", icon: "coffee" };
  assert.equal(stampsForOrder(base, items), 3);
  assert.equal(stampsForOrder({ ...base, productIds: ["a"] }, items), 2);
  assert.equal(stampsForOrder({ ...base, countBy: "order" }, items), 1);
  assert.equal(stampsForOrder({ ...base, productIds: ["z"] }, items), 0);
  assert.equal(stampsForOrder({ ...base, enabled: false }, items), 0);
  assert.equal(stampsForOrder(null, items), 0);
  assert.throws(() => parseStampProgram({ required: 1, reward: "x" }));
  assert.throws(() => parseStampProgram({ required: 8, reward: " " }));
  assert.equal(parseStampProgram({ required: 8, reward: "Ly miễn phí", icon: "bad" }).icon, "coffee");
});
