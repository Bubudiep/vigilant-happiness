import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const TOKEN_KEY = "recloud_auth_token_v1";
const store: Record<string, string> = {};
const events: string[] = [];

beforeEach(() => {
  for (const k of Object.keys(store)) delete store[k];
  events.length = 0;
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => void (store[k] = v),
    removeItem: (k: string) => void delete store[k],
  });
  vi.stubGlobal("window", { dispatchEvent: (e: Event) => events.push(e.type) });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

const respond = (status: number, body: unknown) =>
  vi.fn(async () => ({ ok: status >= 200 && status < 300, status, json: async () => body }) as unknown as Response);

async function load() {
  const api = await import("../data/platform-api");
  const media = await import("../data/media-api");
  return { ...api, ...media };
}

describe("api()", () => {
  it("thành công trả body, gắn Authorization khi có token", async () => {
    const m = await load();
    store[TOKEN_KEY] = "T";
    const fetchMock = respond(200, { ok: 1 });
    vi.stubGlobal("fetch", fetchMock);
    expect(await m.api("/x")).toEqual({ ok: 1 });
    const init = (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1];
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer T");
  });

  it("401 có token → ApiError 401 + phát sự kiện hết phiên", async () => {
    const m = await load();
    store[TOKEN_KEY] = "T";
    vi.stubGlobal("fetch", respond(401, { message: "x" }));
    await expect(m.api("/x")).rejects.toMatchObject({ status: 401 });
    expect(events).toContain(m.AUTH_EXPIRED_EVENT);
  });

  it("401 không token → không phát sự kiện", async () => {
    const m = await load();
    vi.stubGlobal("fetch", respond(401, {}));
    await expect(m.api("/x")).rejects.toBeInstanceOf(m.ApiError);
    expect(events).toEqual([]);
  });

  it("413 giữ nguyên message server", async () => {
    const m = await load();
    vi.stubGlobal("fetch", respond(413, { message: "Hết dung lượng", usedBytes: 5, quotaBytes: 5 }));
    await expect(m.api("/x")).rejects.toMatchObject({ status: 413, message: "Hết dung lượng", quota: true });
  });

  it("413 hết hạn mức (có quotaBytes) → quota=true, giữ message", async () => {
    const m = await load();
    vi.stubGlobal("fetch", respond(413, { message: "Hết dung lượng", quotaBytes: 100, usedBytes: 100 }));
    await expect(m.api("/x")).rejects.toMatchObject({ status: 413, quota: true, message: "Hết dung lượng" });
  });

  it("413 từ Nginx (không có JSON body) → thông báo 'quá lớn', quota=false", async () => {
    const m = await load();
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 413, json: async () => { throw new SyntaxError("<html>"); } }) as unknown as Response));
    await expect(m.api("/x")).rejects.toMatchObject({ status: 413, quota: false, message: "Ảnh quá lớn, thử ít ảnh hơn" });
  });

  it("message dạng mảng lấy phần tử đầu; không message → 'Lỗi <status>'", async () => {
    const m = await load();
    vi.stubGlobal("fetch", respond(400, { message: ["a", "b"] }));
    await expect(m.api("/x")).rejects.toMatchObject({ status: 400, message: "a" });
    vi.stubGlobal("fetch", respond(500, null));
    await expect(m.api("/x")).rejects.toMatchObject({ status: 500, message: "Lỗi 500" });
  });

  it("403 và mất kết nối", async () => {
    const m = await load();
    vi.stubGlobal("fetch", respond(403, {}));
    await expect(m.api("/x")).rejects.toMatchObject({ status: 403 });
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("net"); }));
    await expect(m.api("/x")).rejects.toMatchObject({ status: 0 });
  });
});

describe("uploadStoreMedia()", () => {
  it("trả url khi thành công", async () => {
    const m = await load();
    vi.stubGlobal("fetch", respond(201, { url: "http://s/uploads/a.jpg" }));
    expect(await m.uploadStoreMedia("st1", new Blob(["x"]), "a.jpg")).toBe("http://s/uploads/a.jpg");
  });
  it("413 → ApiError 413 kèm message", async () => {
    const m = await load();
    vi.stubGlobal("fetch", respond(413, { message: "Vượt hạn mức", quotaBytes: 10, usedBytes: 10 }));
    await expect(m.uploadStoreMedia("st1", new Blob(["x"]), "a.jpg")).rejects.toMatchObject({ status: 413, message: "Vượt hạn mức", quota: true });
  });
  it("413 không body (Nginx) → thông báo dễ hiểu", async () => {
    const m = await load();
    vi.stubGlobal("fetch", respond(413, null));
    await expect(m.uploadStoreMedia("st1", new Blob(["x"]), "a.jpg")).rejects.toMatchObject({ status: 413, quota: false, message: "Ảnh quá lớn, thử ít ảnh hơn" });
  });
  it("201 nhưng thiếu url → lỗi", async () => {
    const m = await load();
    vi.stubGlobal("fetch", respond(201, {}));
    await expect(m.uploadStoreMedia("st1", new Blob(["x"]), "a.jpg")).rejects.toBeInstanceOf(m.ApiError);
  });
});
