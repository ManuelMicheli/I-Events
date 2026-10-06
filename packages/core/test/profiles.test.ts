import { describe, expect, it } from "vitest";
import {
  addDays,
  dayRanges,
  isAllowedPortfolioPhoto,
  monthGrid,
  portfolioExt,
  portfolioItemSchema,
  rangeLabel,
  ratingSummary,
  reviewSchema,
  stars,
  unavailabilitySchema,
} from "../src/profiles";

describe("portfolio", () => {
  it("accepts photos only", () => {
    expect(portfolioExt("image/jpeg")).toBe("jpg");
    expect(portfolioExt("image/heic")).toBeNull();
    expect(isAllowedPortfolioPhoto("image/webp", 1000)).toBe(true);
    expect(isAllowedPortfolioPhoto("image/png", 11 * 1024 * 1024)).toBe(false);
    expect(isAllowedPortfolioPhoto("application/pdf", 1000)).toBe(false);
  });

  it("stores the month as its first day and empty fields as null", () => {
    expect(portfolioItemSchema.parse({ title: " Lancio ", description: "", client_name: "", city: "Roma", happened_on: "2026-05" })).toEqual({
      title: "Lancio",
      description: "",
      client_name: null,
      city: "Roma",
      happened_on: "2026-05-01",
    });
    expect(portfolioItemSchema.parse({ title: "X", description: "", client_name: null, city: null, happened_on: "" }).happened_on).toBeNull();
    expect(portfolioItemSchema.safeParse({ title: "", description: "", client_name: null, city: null, happened_on: "" }).success).toBe(false);
    expect(portfolioItemSchema.safeParse({ title: "X", description: "", client_name: null, city: null, happened_on: "2026-13" }).success).toBe(false);
  });
});

describe("reviews", () => {
  it("validates the rating", () => {
    expect(reviewSchema.parse({ rating: "4", comment: " Bene " })).toEqual({ rating: 4, comment: "Bene" });
    expect(reviewSchema.safeParse({ rating: "0", comment: "" }).success).toBe(false);
    expect(reviewSchema.safeParse({ rating: "", comment: "" }).success).toBe(false);
  });

  it("summarizes ratings", () => {
    expect(ratingSummary("4.8", 12)).toBe("4,8 · 12 recensioni");
    expect(ratingSummary(5, 1)).toBe("5,0 · 1 recensione");
    expect(ratingSummary(null, 0)).toBeNull();
    expect(stars(4)).toBe("★★★★☆");
  });
});

describe("availability", () => {
  it("checks the range", () => {
    expect(unavailabilitySchema.safeParse({ starts_on: "2026-10-12", ends_on: "2026-10-10", note: "" }).success).toBe(false);
    expect(unavailabilitySchema.safeParse({ starts_on: "2026-01-01", ends_on: "2027-06-01", note: "" }).success).toBe(false);
    expect(unavailabilitySchema.parse({ starts_on: "2026-10-12", ends_on: "2026-10-12", note: "" }).note).toBeNull();
  });

  it("lays out a month from Monday", () => {
    const october = monthGrid(2026, 10);
    expect(october[0]).toEqual([null, null, null, "2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04"]);
    expect(october.at(-1)).toEqual(["2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31", null]);
    expect(monthGrid(2027, 2).flat().filter(Boolean)).toHaveLength(28);
    expect(monthGrid(2027, 2)[0]![0]).toBe("2027-02-01");
  });

  it("merges consecutive days", () => {
    const ranges = dayRanges(["2026-10-20", "2026-10-12", "2026-10-13", "2026-10-31", "2026-11-01"]);
    expect(ranges).toEqual([
      { from: "2026-10-12", to: "2026-10-13" },
      { from: "2026-10-20", to: "2026-10-20" },
      { from: "2026-10-31", to: "2026-11-01" },
    ]);
    expect(ranges.map(rangeLabel)).toEqual(["12–13 ott", "20 ott", "31 ott – 1 nov"]);
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });
});
