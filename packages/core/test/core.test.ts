import { describe, expect, it } from "vitest";
import {
  answersSchema,
  briefCompleteness,
  can,
  canMoveProposal,
  canMoveRequest,
  getServiceCategory,
  requestDraftSchema,
  SERVICE_CATALOG,
  SERVICE_FAMILIES,
  serviceFamily,
  slugify,
  submissionIssues,
} from "../src";

const single = {
  kind: "single",
  eventType: "brand",
  basics: { title: "Lancio Nutella Plant", objective: "product_launch", startDate: "2026-11-20", guests: 300 },
  items: [{ category: "venue", answers: { space_type: "private", setting: "indoor", capacity: 300 } }],
};

describe("service catalog", () => {
  it("has unique keys and unique question keys per category", () => {
    const keys = SERVICE_CATALOG.map((c) => c.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const c of SERVICE_CATALOG) {
      const qs = c.questions.map((q) => q.key);
      expect(new Set(qs).size).toBe(qs.length);
    }
  });

  it("puts every service in exactly one family", () => {
    const listed = SERVICE_FAMILIES.flatMap((f) => [...f.services]);
    expect(listed.sort()).toEqual(SERVICE_CATALOG.map((c) => c.key).sort());
    expect(serviceFamily("security")).toBe("hospitality");
    expect(serviceFamily("other")).toBeNull();
  });

  it("validates answers against the category questions", () => {
    const venue = getServiceCategory("venue")!;
    expect(answersSchema(venue).safeParse({ space_type: "private", setting: "outdoor" }).success).toBe(true);
    expect(answersSchema(venue).safeParse({ space_type: "castle", setting: "outdoor" }).success).toBe(false);
    expect(answersSchema(venue).safeParse({ setting: "outdoor" }).success).toBe(false);
    expect(answersSchema(venue).safeParse({ space_type: "private", setting: "indoor", extra: 1 }).success).toBe(false);
  });
});

describe("request draft", () => {
  it("accepts a valid single event", () => {
    const r = requestDraftSchema.safeParse(single);
    expect(r.success).toBe(true);
  });

  it("rejects a campaign whose stages do not match the number of events", () => {
    const r = requestDraftSchema.safeParse({
      ...single,
      kind: "campaign",
      campaign: { eventsCount: 3, sameVenue: false, servicesMode: "shared", stages: [{ city: "Milano" }] },
    });
    expect(r.success).toBe(false);
  });

  it("requires a stage on every service when services are chosen per stage", () => {
    const base = {
      ...single,
      kind: "campaign",
      campaign: {
        eventsCount: 2,
        sameVenue: false,
        servicesMode: "per_stage",
        stages: [{ city: "Milano" }, { city: "Roma" }],
      },
    };
    expect(requestDraftSchema.safeParse(base).success).toBe(false);
    const ok = { ...base, items: [{ ...single.items[0], stageIndex: 1 }] };
    expect(requestDraftSchema.safeParse(ok).success).toBe(true);
    const outOfRange = { ...base, items: [{ ...single.items[0], stageIndex: 2 }] };
    expect(requestDraftSchema.safeParse(outOfRange).success).toBe(false);
  });

  it("rejects inverted dates and budgets", () => {
    const r = requestDraftSchema.safeParse({
      ...single,
      basics: { ...single.basics, endDate: "2026-11-01", budgetMin: 10, budgetMax: 5 },
    });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues.map((i) => i.path.join("."))).toEqual(
      expect.arrayContaining(["basics.endDate", "basics.budgetMax"]),
    );
  });

  it("reports what blocks submission and scores completeness", () => {
    const draft = requestDraftSchema.parse(single);
    expect(submissionIssues(draft)).toEqual([]);
    expect(submissionIssues({ ...draft, items: [] })).toHaveLength(1);
    expect(submissionIssues({ ...draft, eventType: undefined })).toEqual(["Scegli che evento è"]);
    const score = briefCompleteness(draft);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(100);
  });
});

describe("lifecycles", () => {
  it("follows the request and proposal flows", () => {
    expect(canMoveRequest("draft", "sent")).toBe(true);
    expect(canMoveRequest("awarded", "draft")).toBe(false);
    expect(canMoveProposal("submitted", "accepted")).toBe(true);
    expect(canMoveProposal("invited", "accepted")).toBe(false);
  });
});

describe("permissions", () => {
  it("scopes permissions by organization type and role", () => {
    expect(can("client", "approver", "proposals.decide")).toBe(true);
    expect(can("client", "member", "proposals.decide")).toBe(false);
    expect(can("agency", "owner", "requests.create")).toBe(false);
    expect(can("agency", "manager", "proposals.submit")).toBe(true);
  });

  it("slugifies names", () => {
    expect(slugify("NSS Eventi & Comunicazione")).toBe("nss-eventi-comunicazione");
    expect(slugify("Caffè Città")).toBe("caffe-citta");
  });
});

describe("catalog seed", () => {
  it("matches the committed SQL seed", async () => {
    const { readFileSync } = await import("node:fs");
    const { serviceCatalogSql } = await import("../src/catalog-sql");
    const committed = readFileSync(new URL("../../../supabase/seed/01_service_categories.sql", import.meta.url), "utf8");
    expect(committed).toBe(serviceCatalogSql());
  });
});
