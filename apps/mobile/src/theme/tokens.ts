/**
 * Carta, the I-Events design system: values from the design thread's /carta and /fondamenta pages
 * (specs in design-research/). Screens use these semantic names only, never raw hex values.
 */

export type Palette = {
  bgApp: string;
  bgSurface: string;
  bgSubtle: string;
  /** Sheets and modals: white in light mode, the lightest surface in dark mode. */
  bgElevated: string;
  bgPressed: string;
  borderDefault: string;
  borderStrong: string;
  /** Borders that identify a control, such as text fields: at least 3:1 against the surface. */
  borderControl: string;
  textPrimary: string;
  textSecondary: string;
  textDisabled: string;
  accentFill: string;
  accentPressed: string;
  accentText: string;
  onAccent: string;
  accentSubtle: string;
  danger: string;
  dangerBg: string;
  onDanger: string;
  success: string;
  successBg: string;
  warning: string;
  warningBg: string;
  info: string;
  infoBg: string;
  focus: string;
  scrim: string;
};

export const light: Palette = {
  bgApp: "#F5F3EF",
  bgSurface: "#FFFFFF",
  bgSubtle: "#EDEAE4",
  bgElevated: "#FFFFFF",
  bgPressed: "#E2DED6",
  borderDefault: "rgba(28,27,25,0.08)",
  borderStrong: "#E2DED6",
  borderControl: "#8A847A",
  textPrimary: "#1C1B19",
  textSecondary: "#66625B",
  textDisabled: "#A8A298",
  accentFill: "#FF4626",
  accentPressed: "#FF6A47",
  accentText: "#C8300F",
  onAccent: "#1C1B19",
  accentSubtle: "#FFF1EC",
  danger: "#B42335",
  dangerBg: "#FBE7E9",
  onDanger: "#FFFFFF",
  success: "#276B43",
  successBg: "#E6F2EA",
  warning: "#9A5B00",
  warningBg: "#FBF0DC",
  info: "#2F5BD3",
  infoBg: "#E8EEFB",
  focus: "#1C1B19",
  scrim: "rgba(28,27,25,0.32)",
};

export const dark: Palette = {
  bgApp: "#121110",
  bgSurface: "#1B1A18",
  bgSubtle: "#24221F",
  bgElevated: "#2D2A26",
  bgPressed: "#2D2A26",
  borderDefault: "rgba(241,236,228,0.08)",
  borderStrong: "rgba(241,236,228,0.16)",
  borderControl: "#7A746B",
  textPrimary: "#F1ECE4",
  textSecondary: "#A49D93",
  textDisabled: "#5E5952",
  accentFill: "#FF5A3C",
  accentPressed: "#FF7A60",
  accentText: "#FF7A60",
  onAccent: "#121110",
  accentSubtle: "#36221C",
  danger: "#F06A78",
  dangerBg: "#352424",
  onDanger: "#121110",
  success: "#5FBF83",
  successBg: "#232E25",
  warning: "#E0A040",
  warningBg: "#332A1D",
  info: "#7C9BFF",
  infoBg: "#272934",
  focus: "#F1ECE4",
  scrim: "rgba(0,0,0,0.6)",
};

/** Spacing scale, base 4: no other values are allowed. */
export const space = { 0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48, 16: 64 } as const;

export const radius = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, full: 999 } as const;

/** Control heights: L is the mobile default, and 44 is the smallest touch target. */
export const control = { s: 32, m: 40, l: 48, touch: 44 } as const;

export const motion = { fast: 120, base: 180, moderate: 240, slow: 320 } as const;

/**
 * Font families, bundled with the app: Bricolage Grotesque for all text, Azeret Mono with tabular figures for
 * numbers, codes, dates and times. Each weight is its own family, so styles pick the family and never set fontWeight.
 */
export const fonts = {
  sans: { "400": "BricolageGrotesque_400Regular", "500": "BricolageGrotesque_500Medium", "600": "BricolageGrotesque_600SemiBold" },
  mono: { "400": "AzeretMono_400Regular", "500": "AzeretMono_500Medium" },
} as const;

type TextStyle = { fontSize: number; lineHeight: number; fontWeight: "400" | "500" | "600"; letterSpacing: number; mono?: boolean };
const track = (size: number, percent: number) => Math.round(size * percent) / 100;

/** Carta text styles, mobile sizes: body is Corpo L (17) as on iOS. */
export const type = {
  title1: { fontSize: 32, lineHeight: 38, fontWeight: "600", letterSpacing: track(32, -2) },
  title2: { fontSize: 24, lineHeight: 30, fontWeight: "500", letterSpacing: track(24, -1.5) },
  title3: { fontSize: 20, lineHeight: 26, fontWeight: "500", letterSpacing: track(20, -1) },
  body: { fontSize: 17, lineHeight: 26, fontWeight: "400", letterSpacing: track(17, -0.5) },
  bodyStrong: { fontSize: 17, lineHeight: 26, fontWeight: "500", letterSpacing: track(17, -0.5) },
  callout: { fontSize: 15, lineHeight: 22, fontWeight: "400", letterSpacing: track(15, -0.2) },
  calloutStrong: { fontSize: 15, lineHeight: 22, fontWeight: "500", letterSpacing: track(15, -0.2) },
  label: { fontSize: 13, lineHeight: 18, fontWeight: "500", letterSpacing: 0 },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: "400", letterSpacing: track(12, 0.2) },
  mono: { fontSize: 13, lineHeight: 18, fontWeight: "400", letterSpacing: 0, mono: true },
  monoMetric: { fontSize: 32, lineHeight: 36, fontWeight: "500", letterSpacing: track(32, -2), mono: true },
} satisfies Record<string, TextStyle>;

export type TypeVariant = keyof typeof type;
