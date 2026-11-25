import { Logger } from "@nestjs/common";
import * as fs from "fs";
import * as path from "path";

const log = new Logger("StoreFiles");
const UPLOADS = () => path.join(process.cwd(), "uploads");
const PRIVATE = () => path.join(process.cwd(), "uploads-private");

/** File ảnh gốc + thumbnail của ảnh album (uploads-private/albums/). */
export function albumPhotoPaths(storageKey: string): string[] {
  const dir = path.join(PRIVATE(), "albums");
  const base = path.basename(storageKey);
  return [path.join(dir, base), path.join(dir, "thumbs", base + ".webp")];
}

/** File ảnh công khai của StoreMedia (uploads/<storageKey>) — chặn storageKey thoát khỏi thư mục uploads. */
export function mediaFilePath(storageKey: string): string | null {
  const root = UPLOADS();
  const abs = path.resolve(root, storageKey);
  return abs.startsWith(root + path.sep) ? abs : null;
}

/** File đính kèm hộp thư (uploads-private/<storageKey>). */
export function attachmentPath(storageKey: string): string {
  return path.join(PRIVATE(), path.basename(storageKey));
}

/**
 * Xoá danh sách file; file không tồn tại bỏ qua, lỗi khác chỉ ghi log (không làm hỏng request —
 * file còn sót sẽ được `npm run storage:orphans` dọn).
 */
export async function removeFiles(files: (string | null)[]): Promise<number> {
  let removed = 0;
  for (const f of files) {
    if (!f) continue;
    try {
      await fs.promises.unlink(f);
      removed++;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") log.warn(`Không xoá được ${f}: ${e instanceof Error ? e.message : e}`);
    }
  }
  return removed;
}

/** Xoá cả thư mục ảnh công khai của store (uploads/stores/<storeId>) — gồm file đã mất bản ghi. */
export async function removeStoreUploadsDir(storeId: string): Promise<void> {
  if (!/^[A-Za-z0-9_-]+$/.test(storeId)) return;
  await fs.promises.rm(path.join(UPLOADS(), "stores", storeId), { recursive: true, force: true }).catch((e) => log.warn(`Không xoá được thư mục ảnh của store ${storeId}: ${e}`));
}
