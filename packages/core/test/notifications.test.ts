import { describe, expect, it } from "vitest";
import { buildDigest } from "../src";

const item = (id: string, title: string, body: string | null = null) => ({ id, title, body, createdAt: "2026-10-06T10:00:00Z" });

describe("notification digest", () => {
  it("uses the update itself as subject when there is only one", () => {
    const d = buildDigest({ fullName: "Carla Bianchi", locale: "it", items: [item("n1", "Nuova proposta da NSS", "Lancio")] }, "https://i-events.app/");
    expect(d.subject).toBe("Nuova proposta da NSS");
    expect(d.text).toContain("Ciao Carla,");
    expect(d.text).toContain("https://i-events.app/notifiche/n1");
  });

  it("counts several updates and escapes HTML", () => {
    const d = buildDigest({ fullName: "", locale: "it", items: [item("a", "Nuovo messaggio da <Brand>", "x & y"), item("b", "Altro")] }, "http://localhost:3000");
    expect(d.subject).toBe("2 novità su I-Events");
    expect(d.html).toContain("Nuovo messaggio da &lt;Brand&gt;");
    expect(d.html).toContain("x &amp; y");
    expect(d.html).not.toContain("<Brand>");
    expect(d.text.startsWith("Ciao,")).toBe(true);
  });

  it("refuses an empty digest", () => {
    expect(() => buildDigest({ fullName: "A", locale: "it", items: [] }, "http://x")).toThrow();
  });
});
