import { describe, expect, it } from "vitest";
import { agendaSection, agendaSections, appRouteForLink, formatEventDates } from "../src";

const ev = (id: string, status: "planning" | "preparing" | "live" | "completed" | "cancelled", start: string | null, end: string | null = null) => ({
  id,
  status,
  start_date: start,
  end_date: end,
});

describe("agenda", () => {
  it("puts an event in progress on its days even before the status changes", () => {
    expect(agendaSection(ev("a", "preparing", "2026-10-06"), "2026-10-06")).toBe("live");
    expect(agendaSection(ev("a", "preparing", "2026-10-05", "2026-10-07"), "2026-10-06")).toBe("live");
    expect(agendaSection(ev("a", "preparing", "2026-10-05"), "2026-10-06")).toBe("upcoming");
    expect(agendaSection(ev("a", "live", "2026-11-01"), "2026-10-06")).toBe("live");
    expect(agendaSection(ev("a", "completed", "2026-10-06"), "2026-10-06")).toBe("past");
    expect(agendaSection(ev("a", "cancelled", null), "2026-10-06")).toBe("past");
    expect(agendaSection(ev("a", "planning", null), "2026-10-06")).toBe("upcoming");
  });

  it("sorts upcoming by date with undated last, past most recent first", () => {
    const s = agendaSections(
      [
        ev("undated", "planning", null),
        ev("later", "planning", "2026-12-01"),
        ev("sooner", "planning", "2026-10-20"),
        ev("old", "completed", "2026-01-01"),
        ev("recent", "completed", "2026-09-01"),
        ev("now", "live", "2026-10-06"),
      ],
      "2026-10-06",
    );
    expect(s.live.map((e) => e.id)).toEqual(["now"]);
    expect(s.upcoming.map((e) => e.id)).toEqual(["sooner", "later", "undated"]);
    expect(s.past.map((e) => e.id)).toEqual(["recent", "old"]);
  });

  it("formats single and multi-day dates in Italian", () => {
    expect(formatEventDates(null, null)).toBe("Data da definire");
    expect(formatEventDates("2026-10-18", null)).toBe("dom 18 ott 2026");
    expect(formatEventDates("2026-10-18", "2026-10-18")).toBe("dom 18 ott 2026");
    expect(formatEventDates("2026-10-18", "2026-10-19")).toBe("18 ott – lun 19 ott 2026");
    expect(formatEventDates("2026-12-31", "2027-01-01")).toBe("gio 31 dic 2026 – ven 1 gen 2027");
  });
});

describe("notification links in the app", () => {
  const id = "0b6f4f1e-2c4d-4c39-9a51-2f0f6d1b7a10";
  it("opens events and supplier requests on their screens", () => {
    expect(appRouteForLink(`/pro/eventi/${id}`)).toEqual({ pathname: "/evento/[id]", params: { id } });
    expect(appRouteForLink(`/client/eventi/${id}`)).toEqual({ pathname: "/evento/[id]", params: { id } });
    expect(appRouteForLink(`/pro/eventi/${id}/scaletta`)).toEqual({ pathname: "/evento/[id]", params: { id } });
    expect(appRouteForLink(`/pro/eventi/${id}/live`)).toEqual({ pathname: "/giornata/[id]", params: { id } });
    expect(appRouteForLink(`/pro/eventi/${id}/live?giorno=2`)).toEqual({ pathname: "/giornata/[id]", params: { id } });
    expect(appRouteForLink(`/supplier/richieste/${id}`)).toEqual({ pathname: "/richiesta/[id]", params: { id } });
    expect(appRouteForLink("/supplier/richieste")).toEqual({ pathname: "/richieste" });
    expect(appRouteForLink(`/pro/richieste/${id}`)).toEqual({ pathname: "/proposta/[id]", params: { id } });
    expect(appRouteForLink(`/client/richieste/${id}#messaggi`)).toEqual({ pathname: "/richiesta-azienda/[id]", params: { id } });
    expect(appRouteForLink(`/client/richieste/${id}/modifica`)).toEqual({ pathname: "/richiesta-azienda/[id]", params: { id } });
  });

  it("leaves everything else to the web", () => {
    expect(appRouteForLink(null)).toBeNull();
    expect(appRouteForLink("/pro/profilo#recensioni")).toBeNull();
    expect(appRouteForLink("/pro/eventi/not-a-uuid")).toBeNull();
    expect(appRouteForLink(`https://evil.example/pro/eventi/${id}`)).toBeNull();
  });
});
