import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { StoreConfig } from "../data/store-api";

type Call = { method: string; path: string; body?: unknown };
let calls: Call[];
let nextId: number;

beforeEach(() => {
  calls = [];
  nextId = 1;
  vi.stubGlobal("localStorage", { getItem: () => null, setItem: () => {}, removeItem: () => {} });
  vi.stubGlobal("window", { dispatchEvent: () => true });
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit = {}) => {
      const path = url.replace(/^.*\/api/, "");
      const method = init.method ?? "GET";
      const body = typeof init.body === "string" ? JSON.parse(init.body) : undefined;
      calls.push({ method, path, body });
      const json = method === "POST" ? { ...body, id: `real-${nextId++}`, createdAt: "t" } : { ok: true };
      return { ok: true, status: 200, json: async () => json } as unknown as Response;
    }),
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
});

const store = (over: Partial<StoreConfig> = {}) => ({ id: "st1", name: "A", bookings: [], ...over }) as unknown as StoreConfig;

describe("syncStoreChanges", () => {
  it("thêm → POST (bỏ id tạm), trả bản ghi thật và ghi idMap", async () => {
    const { syncStoreChanges } = await import("../data/store-sync");
    const idMap: Record<string, string> = {};
    const prev = store();
    const next = store({ bookings: [{ id: "tmp-1", title: "Hẹn", status: "new" }] as never });
    const created = await syncStoreChanges(prev, next, idMap);
    expect(calls).toEqual([{ method: "POST", path: "/stores/st1/data/bookings", body: { title: "Hẹn", status: "new" } }]);
    expect(created).toHaveLength(1);
    expect(created[0]).toMatchObject({ key: "bookings", tempId: "tmp-1", item: { id: "real-1" } });
    expect(idMap).toEqual({ "tmp-1": "real-1" });
  });

  it("tạo rồi sửa ngay (hàng đợi lần lượt) → PATCH đúng id thật, không 404", async () => {
    const { syncStoreChanges } = await import("../data/store-sync");
    const idMap: Record<string, string> = {};
    const s0 = store();
    const s1 = store({ bookings: [{ id: "tmp-1", title: "Hẹn", status: "new" }] as never });
    const s2 = store({ bookings: [{ id: "tmp-1", title: "Hẹn", status: "done" }] as never });
    // giống StoreConsole: nối các lần đồng bộ vào một chuỗi promise
    let q: Promise<unknown> = Promise.resolve();
    q = q.then(() => syncStoreChanges(s0, s1, idMap));
    q = q.then(() => syncStoreChanges(s1, s2, idMap));
    await q;
    expect(calls.map((c) => `${c.method} ${c.path}`)).toEqual(["POST /stores/st1/data/bookings", "PATCH /stores/st1/data/bookings/real-1"]);
    expect(calls[1].body).toEqual({ status: "done" });
  });

  it("sửa chỉ gửi trường đã đổi; không đổi → không gọi API", async () => {
    const { syncStoreChanges } = await import("../data/store-sync");
    const a = store({ bookings: [{ id: "b1", title: "X", status: "new", createdAt: "1" }] as never });
    const b = store({ bookings: [{ id: "b1", title: "X", status: "done", createdAt: "1" }] as never });
    await syncStoreChanges(a, b);
    expect(calls).toEqual([{ method: "PATCH", path: "/stores/st1/data/bookings/b1", body: { status: "done" } }]);
    calls.length = 0;
    await syncStoreChanges(a, store({ bookings: [{ id: "b1", title: "X", status: "new", createdAt: "1" }] as never }));
    expect(calls).toEqual([]);
  });

  it("xoá → DELETE (dùng id thật nếu là id tạm)", async () => {
    const { syncStoreChanges } = await import("../data/store-sync");
    const prev = store({ bookings: [{ id: "tmp-9", title: "X" }] as never });
    await syncStoreChanges(prev, store(), { "tmp-9": "real-9" });
    expect(calls).toEqual([{ method: "DELETE", path: "/stores/st1/data/bookings/real-9", body: undefined }]);
  });

  it("orders: không tạo/xoá, chỉ PATCH", async () => {
    const { syncStoreChanges } = await import("../data/store-sync");
    const o = (status: string) => store({ orders: [{ id: "o1", status }] as never });
    await syncStoreChanges(o("new"), store({ orders: [] as never }));
    expect(calls).toEqual([]);
    await syncStoreChanges(store({ orders: [] as never }), o("new"));
    expect(calls).toEqual([]);
    await syncStoreChanges(o("new"), o("paid"));
    expect(calls).toEqual([{ method: "PATCH", path: "/stores/st1/data/orders/o1", body: { status: "paid" } }]);
  });
});

describe("configKey / autosaveDecision", () => {
  it("configKey chỉ đổi khi trường cấu hình đổi (không phải sản phẩm/lịch hẹn)", async () => {
    const { configKey } = await import("../data/store-sync");
    const a = store();
    expect(configKey(a)).toBe(configKey({ ...a, bookings: [{ id: "x" }] as never, products: [{ id: "p" }] as never }));
    expect(configKey(a)).not.toBe(configKey({ ...a, name: "B" }));
    expect(configKey(a)).not.toBe(configKey({ ...a, builder: { pages: [] } as never }));
  });

  it("autosaveDecision: chưa tải chi tiết → không so sánh", async () => {
    const { autosaveDecision } = await import("../data/store-sync");
    expect(autosaveDecision(false, undefined, "k")).toBe("skip");
    expect(autosaveDecision(undefined, "old", "new")).toBe("skip");
    expect(autosaveDecision(true, undefined, "k")).toBe("baseline");
    expect(autosaveDecision(true, "k", "k")).toBe("skip");
    expect(autosaveDecision(true, "k", "k2")).toBe("save");
  });
});
