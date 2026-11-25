import { describe, expect, it } from "vitest";
import { MAX_BATCH_BYTES, MAX_BATCH_FILES, splitBatches } from "../data/upload-batch";

const MB = 1024 * 1024;
const mk = (n: number, size: number) => Array.from({ length: n }, (_, i) => ({ id: i, size }));

describe("splitBatches", () => {
  it("rỗng → không lô", () => {
    expect(splitBatches([])).toEqual([]);
  });
  it("ảnh nhỏ: tối đa 30 ảnh/lô", () => {
    const b = splitBatches(mk(65, 1 * MB));
    expect(b.map((x) => x.length)).toEqual([30, 30, 5]);
  });
  it("lô ≤ 45MB theo dung lượng sau nén", () => {
    const b = splitBatches(mk(10, 9 * MB)); // 9MB × 5 = 45MB
    expect(b.map((x) => x.length)).toEqual([5, 5]);
    for (const x of b) expect(x.reduce((s, i) => s + i.size, 0)).toBeLessThanOrEqual(MAX_BATCH_BYTES);
  });
  it("giữ thứ tự và không mất ảnh", () => {
    const items = mk(100, 2 * MB);
    const flat = splitBatches(items).flat();
    expect(flat.map((i) => i.id)).toEqual(items.map((i) => i.id));
    for (const x of splitBatches(items)) expect(x.length).toBeLessThanOrEqual(MAX_BATCH_FILES);
  });
  it("ảnh lớn xen kẽ: đóng lô khi cộng thêm sẽ vượt", () => {
    const b = splitBatches([{ size: 30 * MB }, { size: 20 * MB }, { size: 1 * MB }]);
    expect(b.map((x) => x.map((i) => i.size / MB))).toEqual([[30], [20, 1]]);
  });
  it("ảnh đơn vượt hạn vẫn nằm lô riêng (không rơi mất)", () => {
    const b = splitBatches([{ size: 1 * MB }, { size: 60 * MB }, { size: 1 * MB }]);
    expect(b).toHaveLength(3);
  });
});
