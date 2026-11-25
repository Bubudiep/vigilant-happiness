import { describe, expect, it } from "vitest";
import { storesForCustomer } from "../data/store-filter";

const stores = [
  { id: "s1", customer: { id: "c1" } },
  { id: "s2", customer: { id: "c2" } },
  { id: "s3", customer: null },
  { id: "s4" },
];

describe("storesForCustomer", () => {
  it("lọc theo khách", () => {
    expect(storesForCustomer(stores, "c1").map((s) => s.id)).toEqual(["s1"]);
  });
  it("không có customerId → tất cả", () => {
    expect(storesForCustomer(stores)).toHaveLength(4);
  });
  it("khách không có store → rỗng", () => {
    expect(storesForCustomer(stores, "zzz")).toEqual([]);
  });
});
