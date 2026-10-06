import { describe, expect, it } from "vitest";
import { contrastRatio } from "./contrast";
import { dark, light, space, type Palette } from "./tokens";

/** Every text color the components put on a background, with the minimum WCAG AA ratio. */
const pairs: [keyof Palette, keyof Palette, number][] = [
  ["textPrimary", "bgApp", 4.5],
  ["textPrimary", "bgSurface", 4.5],
  ["textPrimary", "bgSubtle", 4.5],
  ["textPrimary", "bgPressed", 4.5],
  ["textPrimary", "bgElevated", 4.5],
  ["textSecondary", "bgElevated", 4.5],
  ["textSecondary", "bgApp", 4.5],
  ["textSecondary", "bgSurface", 4.5],
  ["textSecondary", "bgSubtle", 4.5],
  ["accentText", "bgApp", 4.5],
  ["accentText", "bgSurface", 4.5],
  ["accentText", "accentSubtle", 4.5],
  ["onAccent", "accentFill", 4.5],
  ["onAccent", "accentPressed", 4.5],
  ["onDanger", "danger", 4.5],
  ["danger", "bgSurface", 4.5],
  ["danger", "bgApp", 4.5],
  ["danger", "dangerBg", 4.5],
  ["success", "successBg", 4.5],
  ["warning", "warningBg", 4.5],
  ["info", "infoBg", 4.5],
  // Non-text: control borders and the focus ring need 3:1.
  ["borderControl", "bgSurface", 3],
  ["borderControl", "bgApp", 3],
  ["focus", "bgApp", 3],
];

describe.each([
  ["chiaro", light],
  ["scuro", dark],
])("Carta %s", (_, palette) => {
  it.each(pairs)("%s su %s raggiunge il contrasto minimo", (fg, bg, min) => {
    expect(contrastRatio(palette[fg], palette[bg])).toBeGreaterThanOrEqual(min);
  });
});

describe("contrast ratio", () => {
  it("matches the WCAG reference values", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 1);
    expect(contrastRatio("#1C1B19", "#F5F3EF")).toBeCloseTo(15.5, 0);
  });
});

it("keeps spacing on the 4-point scale", () => {
  for (const v of Object.values(space)) expect(v % 4).toBe(0);
});
