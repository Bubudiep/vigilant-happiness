import * as assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { after, before, test } from "node:test";
import { PrismaClient } from "@prisma/client";

/** Test tích hợp dự án: bỏ gán gian hàng / xoá ngày bằng null hoặc "", kiểm tra store thuộc đúng khách. */
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
  const res = await fetch(`${API}${path}`, { ...init, headers: { ...(typeof init.body === "string" ? { "Content-Type": "application/json" } : {}), ...init.headers } });
  return { status: res.status, body: await res.json().catch(() => null) };
}

let up = false;
let cA = "";
let cB = "";
let storeA = "";
let storeB = "";
let projectId = "";

before(async () => {
  up = await fetch(`${API}/health`).then((r) => r.ok).catch(() => false);
  if (!up) return console.warn(`[projects.api.test] Không kết nối được ${API} — bỏ qua`);
  const mk = async (name: string, phone: string) => (await call("/customers", { method: "POST", headers: ADMIN, body: json({ name, phone }) })).body.id as string;
  cA = await mk("t_Khách dự án A", "0966000501");
  cB = await mk("t_Khách dự án B", "0966000502");
  const stamp = Date.now();
  storeA = (await call("/stores", { method: "POST", headers: ADMIN, body: json({ customerId: cA, name: "t_Shop DA A", slug: `t-da-a-${stamp}`, templateId: "fnb_cafe_01" }) })).body.id;
  storeB = (await call("/stores", { method: "POST", headers: ADMIN, body: json({ customerId: cB, name: "t_Shop DA B", slug: `t-da-b-${stamp}`, templateId: "fnb_cafe_01" }) })).body.id;
});

after(async () => {
  if (up) {
    await prisma.project.deleteMany({ where: { customerId: { in: [cA, cB] } } });
    await prisma.store.deleteMany({ where: { id: { in: [storeA, storeB] } } });
    await prisma.platformCustomer.deleteMany({ where: { id: { in: [cA, cB] } } });
  }
  await prisma.$disconnect();
});

const t = (name: string, fn: () => Promise<void>) => test(name, async (ctx) => (up ? fn() : ctx.skip("backend không chạy")));

t("tạo dự án: store của khách khác → 400; store không tồn tại → 400; đúng khách → 201", async () => {
  let r = await call("/admin/projects", { method: "POST", headers: ADMIN, body: json({ customerId: cA, name: "t_Dự án", storeId: storeB }) });
  assert.equal(r.status, 400, json(r.body));
  r = await call("/admin/projects", { method: "POST", headers: ADMIN, body: json({ customerId: cA, name: "t_Dự án", storeId: "khong-co" }) });
  assert.equal(r.status, 400);
  r = await call("/admin/projects", { method: "POST", headers: ADMIN, body: json({ customerId: cA, name: "t_Dự án", storeId: storeA, startDate: "2026-11-01", dueDate: "2026-12-31" }) });
  assert.equal(r.status, 201, json(r.body));
  projectId = r.body.id;
  assert.equal(r.body.storeId, storeA);
});

t("sửa dự án: null / chuỗi rỗng bỏ gán store và xoá ngày; sai khách → 400", async () => {
  let r = await call(`/admin/projects/${projectId}`, { method: "PATCH", headers: ADMIN, body: json({ storeId: storeB }) });
  assert.equal(r.status, 400, "store của khách khác");
  r = await call(`/admin/projects/${projectId}`, { method: "PATCH", headers: ADMIN, body: json({ name: "t_Đổi tên" }) });
  assert.equal(r.status, 200);
  assert.equal(r.body.storeId, storeA, "không gửi storeId → giữ nguyên");
  assert.ok(r.body.dueDate, "không gửi ngày → giữ nguyên");

  r = await call(`/admin/projects/${projectId}`, { method: "PATCH", headers: ADMIN, body: json({ storeId: null, dueDate: null }) });
  assert.equal(r.status, 200, json(r.body));
  let db = await prisma.project.findUniqueOrThrow({ where: { id: projectId } });
  assert.equal(db.storeId, null);
  assert.equal(db.dueDate, null);
  assert.ok(db.startDate, "startDate không đụng tới");

  r = await call(`/admin/projects/${projectId}`, { method: "PATCH", headers: ADMIN, body: json({ storeId: storeA }) });
  assert.equal(r.status, 200);
  r = await call(`/admin/projects/${projectId}`, { method: "PATCH", headers: ADMIN, body: json({ storeId: "", startDate: "" }) });
  assert.equal(r.status, 200, json(r.body));
  db = await prisma.project.findUniqueOrThrow({ where: { id: projectId } });
  assert.equal(db.storeId, null, '"" coi như null');
  assert.equal(db.startDate, null);

  r = await call(`/admin/projects/${projectId}`, { method: "PATCH", headers: ADMIN, body: json({ dueDate: "không phải ngày" }) });
  assert.equal(r.status, 400);
});
