/** Giới hạn tải lên: Nginx 50MB/request (chừa dư cho multipart), backend nhận tối đa 30 ảnh/lần, mỗi ảnh ≤ 10MB. */
export const MAX_BATCH_BYTES = 45 * 1024 * 1024;
export const MAX_BATCH_FILES = 30;
export const MAX_SINGLE_BYTES = 10 * 1024 * 1024;

/**
 * Chia danh sách (đã nén) thành các lô theo thứ tự: mỗi lô ≤ maxBytes và ≤ maxFiles.
 * Phần tử đơn lẻ vượt maxBytes vẫn nằm một lô riêng (nơi gọi phải loại trước bằng MAX_SINGLE_BYTES).
 */
export function splitBatches<T extends { size: number }>(items: T[], maxBytes = MAX_BATCH_BYTES, maxFiles = MAX_BATCH_FILES): T[][] {
  const batches: T[][] = [];
  let cur: T[] = [];
  let bytes = 0;
  for (const it of items) {
    if (cur.length && (cur.length >= maxFiles || bytes + it.size > maxBytes)) {
      batches.push(cur);
      cur = [];
      bytes = 0;
    }
    cur.push(it);
    bytes += it.size;
  }
  if (cur.length) batches.push(cur);
  return batches;
}
