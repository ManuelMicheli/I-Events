import { describe, expect, it } from "vitest";
import { supplierRequestBucket, supplierResponseSchema } from "../src";

describe("supplier requests", () => {
  it("validates the answer", () => {
    expect(supplierResponseSchema.safeParse({ available: true, price: 800, note: "Porto le luci" }).success).toBe(true);
    expect(supplierResponseSchema.safeParse({ available: true, price: null }).success).toBe(true);
    expect(supplierResponseSchema.safeParse({ available: true, price: -1 }).success).toBe(false);
    expect(supplierResponseSchema.safeParse({ available: false, price: 100 }).success).toBe(false);
    expect(supplierResponseSchema.safeParse({ available: false, price: null }).success).toBe(true);
  });

  it("sorts requests by what they wait on", () => {
    const r = { status: "requested", supplier_response: null, event_status: "preparing" } as const;
    expect(supplierRequestBucket(r)).toBe("to_answer");
    expect(supplierRequestBucket({ ...r, supplier_response: "available" })).toBe("answered");
    expect(supplierRequestBucket({ ...r, status: "confirmed" })).toBe("confirmed");
    expect(supplierRequestBucket({ ...r, status: "cancelled" })).toBe("closed");
    expect(supplierRequestBucket({ ...r, status: "confirmed", event_status: "completed" })).toBe("closed");
  });
});
