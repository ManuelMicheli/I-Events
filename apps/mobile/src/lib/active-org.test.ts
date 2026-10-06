import { describe, expect, it } from "vitest";
import { pickActiveOrg, type MyOrg } from "./active-org";

const org = (id: string): MyOrg => ({ id, name: id, slug: id, type: "agency", role: "owner" });

describe("active organization", () => {
  it("keeps the saved choice while it is still valid", () => {
    expect(pickActiveOrg([org("a"), org("b")], "b")?.id).toBe("b");
  });
  it("falls back to the first organization", () => {
    expect(pickActiveOrg([org("a"), org("b")], "gone")?.id).toBe("a");
    expect(pickActiveOrg([org("a")], null)?.id).toBe("a");
  });
  it("is empty without organizations", () => {
    expect(pickActiveOrg([], "a")).toBeNull();
  });
});
