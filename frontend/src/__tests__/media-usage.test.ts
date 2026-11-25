import { describe, expect, it } from "vitest";
import { findMediaInUse } from "../data/media-usage";

const m = (id: string, key: string) => ({ id, url: `http://s:4000/uploads/${key}`, storageKey: key });
const media = [m("a", "stores/s1/product/a.jpg"), m("b", "stores/s1/banner/b.jpg"), m("c", "stores/s1/general/c.png")];

describe("findMediaInUse", () => {
  it("khớp theo URL đầy đủ", () => {
    const src = { products: [{ imageUrl: "http://s:4000/uploads/stores/s1/product/a.jpg" }] };
    expect([...findMediaInUse(media, src)]).toEqual(["a"]);
  });
  it("khớp theo storageKey khi URL khác domain / tương đối", () => {
    const src = { builder: { pages: [{ blocks: [{ props: { image: "/uploads/stores/s1/banner/b.jpg" } }] }] } };
    expect([...findMediaInUse(media, src)]).toEqual(["b"]);
  });
  it("không dùng → rỗng; nhiều chỗ → đủ", () => {
    expect(findMediaInUse(media, { x: "https://khac/z.jpg" }).size).toBe(0);
    const both = findMediaInUse(media, [{ i: "stores/s1/product/a.jpg" }, { j: "http://s:4000/uploads/stores/s1/general/c.png" }]);
    expect([...both].sort()).toEqual(["a", "c"]);
  });
  it("nguồn null/rỗng và media thiếu key không lỗi", () => {
    expect(findMediaInUse(media, null).size).toBe(0);
    expect(findMediaInUse([{ id: "z", url: "", storageKey: "" }], { a: 1 }).size).toBe(0);
  });
});
