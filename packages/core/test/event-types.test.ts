import { describe, expect, it } from "vitest";
import { EVENT_TYPE_INFO, EVENT_TYPES, isEventType } from "../src";

/** WCAG 2.x contrast ratio between two #RRGGBB colours. */
function contrast(a: string, b: string) {
  const lum = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => {
      const v = parseInt(hex.slice(i, i + 2), 16) / 255;
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r! + 0.7152 * g! + 0.0722 * bl!;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

const CARTA = { white: "#FFFFFF", app: "#F5F3EF", darkBg: "#1B1A18", darkSurface: "#24221F" };

describe("event types", () => {
  it("has six types with a distinct ink each", () => {
    expect(EVENT_TYPES).toHaveLength(6);
    expect(new Set(EVENT_TYPES.map((t) => EVENT_TYPE_INFO[t].ink.name)).size).toBe(6);
    expect(isEventType("gala")).toBe(true);
    expect(isEventType("party")).toBe(false);
  });

  it.each(EVENT_TYPES)("%s ink keeps the promised contrast", (type) => {
    const ink = EVENT_TYPE_INFO[type].ink;
    // Ink text on white, on Carta and on its own bg; deep on the tint.
    for (const bg of [CARTA.white, CARTA.app, ink.bg]) expect(contrast(ink.text, bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(ink.deep, ink.tint)).toBeGreaterThanOrEqual(4.5);
    // White cover titles on deep.
    expect(contrast("#FFFFFF", ink.deep)).toBeGreaterThanOrEqual(7);
    // The type square and bars are graphics: 3:1 against what they sit on.
    expect(contrast(ink.fill, CARTA.white)).toBeGreaterThanOrEqual(3);
    expect(contrast(ink.fill, CARTA.app)).toBeGreaterThanOrEqual(3);
    for (const bg of [CARTA.darkBg, CARTA.darkSurface]) {
      expect(contrast(ink.darkFill, bg)).toBeGreaterThanOrEqual(3);
      expect(contrast(ink.darkText, bg)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
