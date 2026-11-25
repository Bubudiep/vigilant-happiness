import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mediaUsage, USED_IN_LABEL, usedInLabel } from "../data/media-usage";

const respond = (status: number, body: unknown) =>
  vi.fn(async () => ({ ok: status >= 200 && status < 300, status, json: async () => body }) as unknown as Response);

beforeEach(() => {
  vi.stubGlobal("localStorage", { getItem: () => null, setItem: () => {}, removeItem: () => {} });
  vi.stubGlobal("window", { dispatchEvent: () => true });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

const base = { id: "m1", type: "product", fileName: "a.jpg", mimeType: "image/jpeg", sizeBytes: 1, url: "u", storageKey: "k", createdAt: "t" };

describe("usedInLabel / mediaUsage", () => {
  it("map nhãn tiếng Việt, giá trị lạ giữ nguyên", () => {
    expect(USED_IN_LABEL).toMatchObject({ logo: "Logo", cover: "Ảnh bìa", theme: "Giao diện", slider: "Slider", design: "Thiết kế", banner: "Banner", product: "Sản phẩm" });
    expect(usedInLabel("design")).toBe("Thiết kế");
    expect(usedInLabel("zzz")).toBe("zzz");
  });
  it("ưu tiên cờ server, kể cả khi client nghĩ khác", () => {
    expect(mediaUsage({ ...base, inUse: false, usedIn: [] }, new Set(["m1"]))).toEqual({ inUse: false, usedIn: [] });
    expect(mediaUsage({ ...base, inUse: true, usedIn: ["logo", "design"] }, new Set())).toEqual({ inUse: true, usedIn: ["logo", "design"] });
  });
  it("thiếu cờ server → dùng kết quả client", () => {
    expect(mediaUsage(base, new Set(["m1"]))).toEqual({ inUse: true, usedIn: [] });
    expect(mediaUsage(base, new Set())).toEqual({ inUse: false, usedIn: [] });
  });
});

describe("deleteStoreMedia", () => {
  it("xoá thành công", async () => {
    const f = respond(200, { deleted: true });
    vi.stubGlobal("fetch", f);
    const { deleteStoreMedia } = await import("../data/media-api");
    expect(await deleteStoreMedia("m1")).toEqual({ deleted: true });
    expect((f.mock.calls[0] as unknown as [string])[0]).toMatch(/\/stores\/media\/m1$/);
  });
  it("409 → conflict kèm usedIn (không ném lỗi)", async () => {
    vi.stubGlobal("fetch", respond(409, { message: "Ảnh đang được dùng", usedIn: ["logo", "product"] }));
    const { deleteStoreMedia } = await import("../data/media-api");
    expect(await deleteStoreMedia("m1")).toEqual({ deleted: false, conflict: true, usedIn: ["logo", "product"], message: "Ảnh đang được dùng" });
  });
  it("409 thiếu usedIn → danh sách rỗng", async () => {
    vi.stubGlobal("fetch", respond(409, { message: "x" }));
    const { deleteStoreMedia } = await import("../data/media-api");
    expect(await deleteStoreMedia("m1")).toMatchObject({ deleted: false, usedIn: [] });
  });
  it("force → gửi ?force=1", async () => {
    const f = respond(200, { deleted: true });
    vi.stubGlobal("fetch", f);
    const { deleteStoreMedia } = await import("../data/media-api");
    await deleteStoreMedia("m1", true);
    expect((f.mock.calls[0] as unknown as [string])[0]).toMatch(/\/stores\/media\/m1\?force=1$/);
  });
  it("lỗi khác (404) vẫn ném ApiError", async () => {
    vi.stubGlobal("fetch", respond(404, { message: "Không tìm thấy" }));
    const { deleteStoreMedia } = await import("../data/media-api");
    await expect(deleteStoreMedia("m1")).rejects.toMatchObject({ status: 404 });
  });
});
