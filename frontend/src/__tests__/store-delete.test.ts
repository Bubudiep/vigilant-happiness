import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { forgetDeletedStore, LAST_STORE_KEY, slugConfirmed } from "../data/store-delete";

describe("slugConfirmed", () => {
  it("khớp đúng slug (bỏ khoảng trắng, không phân biệt hoa thường)", () => {
    expect(slugConfirmed("lumi-studio", "lumi-studio")).toBe(true);
    expect(slugConfirmed("  Lumi-Studio ", "lumi-studio")).toBe(true);
  });
  it("sai / thiếu / thừa → không khớp", () => {
    expect(slugConfirmed("", "lumi-studio")).toBe(false);
    expect(slugConfirmed("lumi", "lumi-studio")).toBe(false);
    expect(slugConfirmed("lumi-studio-2", "lumi-studio")).toBe(false);
  });
  it("slug rỗng không bao giờ khớp (kể cả input rỗng)", () => {
    expect(slugConfirmed("", "")).toBe(false);
    expect(slugConfirmed("  ", "  ")).toBe(false);
  });
});

describe("forgetDeletedStore", () => {
  const mk = (v: string | null) => {
    const state = { v };
    return {
      state,
      getItem: (k: string) => (k === LAST_STORE_KEY ? state.v : null),
      removeItem: (k: string) => {
        if (k === LAST_STORE_KEY) state.v = null;
      },
    };
  };
  it("xoá khoá khi đúng gian hàng đang được nhớ", () => {
    const s = mk("st1");
    expect(forgetDeletedStore("st1", s)).toBe(true);
    expect(s.state.v).toBeNull();
  });
  it("giữ nguyên khi là gian hàng khác / không có", () => {
    const s = mk("st2");
    expect(forgetDeletedStore("st1", s)).toBe(false);
    expect(s.state.v).toBe("st2");
    expect(forgetDeletedStore("st1", mk(null))).toBe(false);
  });
  it("storage lỗi/không có → không ném", () => {
    expect(forgetDeletedStore("st1", { getItem: () => { throw new Error("x"); }, removeItem: () => {} })).toBe(false);
    expect(forgetDeletedStore("st1", undefined)).toBe(false);
  });
});

describe("deleteStore", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", { getItem: () => null, setItem: () => {}, removeItem: () => {} });
    vi.stubGlobal("window", { dispatchEvent: () => true });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });
  it("gọi DELETE /stores/:id và trả kết quả; 403 → ApiError", async () => {
    const f = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ id: "st1", name: "A", deleted: true, files: 7 }) }) as unknown as Response);
    vi.stubGlobal("fetch", f);
    const { deleteStore } = await import("../data/store-delete");
    expect(await deleteStore("st1")).toEqual({ id: "st1", name: "A", deleted: true, files: 7 });
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toMatch(/\/stores\/st1$/);
    expect(init.method).toBe("DELETE");

    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 403, json: async () => ({ message: "Chỉ quản trị viên" }) }) as unknown as Response));
    await expect(deleteStore("st1")).rejects.toMatchObject({ status: 403, message: "Chỉ quản trị viên" });
  });
});
