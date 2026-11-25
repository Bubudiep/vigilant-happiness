import { describe, expect, it } from "vitest";
import { findDataImages, replaceDataImage } from "../miniapp-builder/inline-images";

const A = "data:image/png;base64,AAAA+/==";
const B = "data:image/jpeg;base64,BBBB";

describe("findDataImages", () => {
  it("tìm và loại trùng", () => {
    const schema = { pages: [{ blocks: [{ props: { image: A } }, { props: { image: B } }, { props: { image: A } }] }] };
    expect(findDataImages(schema).sort()).toEqual([A, B].sort());
  });
  it("bỏ qua URL thường và chuỗi không phải ảnh", () => {
    const schema = { a: "https://x.vn/a.jpg", b: "data:text/plain;base64,QQ==", c: "ảnh data:image" };
    expect(findDataImages(schema)).toEqual([]);
  });
  it("hỗ trợ svg+xml", () => {
    expect(findDataImages({ i: "data:image/svg+xml;base64,PHN2Zz4=" })).toHaveLength(1);
  });
});

describe("replaceDataImage", () => {
  it("thay mọi chỗ, giữ nguyên phần khác", () => {
    const schema = { logo: A, items: [{ image: A }, { image: B }], title: "Xin chào", n: 3 };
    const out = replaceDataImage(schema, A, "http://s/uploads/a.jpg");
    expect(out).toEqual({ logo: "http://s/uploads/a.jpg", items: [{ image: "http://s/uploads/a.jpg" }, { image: B }], title: "Xin chào", n: 3 });
    expect(findDataImages(out)).toEqual([B]);
  });
  it("không đổi schema gốc", () => {
    const schema = { x: A };
    replaceDataImage(schema, A, "u");
    expect(schema.x).toBe(A);
  });
});
