import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

/** Tiện ích dùng chung cho các script bảo trì dung lượng (chạy ở thư mục backend/). */
export const ROOT = process.cwd();
export const UPLOADS = path.join(ROOT, "uploads");
export const PRIVATE = path.join(ROOT, "uploads-private");
export const ALBUMS = path.join(PRIVATE, "albums");
export const THUMBS = path.join(ALBUMS, "thumbs");

export const hasFlag = (name: string) => process.argv.slice(2).includes(name);

export const fmt = (n: number) =>
  n >= 1024 ** 3 ? `${(n / 1024 ** 3).toFixed(2)} GB` : n >= 1024 ** 2 ? `${(n / 1024 ** 2).toFixed(1)} MB` : n >= 1024 ? `${(n / 1024).toFixed(0)} KB` : `${n} B`;

export function newPrisma() {
  return new PrismaClient();
}

/** Liệt kê file (không đệ quy) trong thư mục; thư mục không tồn tại → []. */
export async function listFiles(dir: string): Promise<{ name: string; abs: string; size: number; mtimeMs: number }[]> {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true }).catch(() => []);
  const out: { name: string; abs: string; size: number; mtimeMs: number }[] = [];
  for (const e of entries) {
    if (!e.isFile()) continue;
    const abs = path.join(dir, e.name);
    const st = await fs.promises.stat(abs).catch(() => null);
    if (st) out.push({ name: e.name, abs, size: st.size, mtimeMs: st.mtimeMs });
  }
  return out;
}

/** Liệt kê file đệ quy; `rel` dùng dấu "/" để so với storageKey trong DB. */
export async function walkFiles(root: string, rel = ""): Promise<{ rel: string; abs: string; size: number; mtimeMs: number }[]> {
  const dir = rel ? path.join(root, rel) : root;
  const entries = await fs.promises.readdir(dir, { withFileTypes: true }).catch(() => []);
  const out: { rel: string; abs: string; size: number; mtimeMs: number }[] = [];
  for (const e of entries) {
    const r = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) out.push(...(await walkFiles(root, r)));
    else if (e.isFile()) {
      const abs = path.join(root, r);
      const st = await fs.promises.stat(abs).catch(() => null);
      if (st) out.push({ rel: r, abs, size: st.size, mtimeMs: st.mtimeMs });
    }
  }
  return out;
}
