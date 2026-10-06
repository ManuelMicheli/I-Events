import { z } from "zod";

// ---------------------------------------------------------------------------
// Portfolio
// ---------------------------------------------------------------------------

export const PORTFOLIO_BUCKET = "portfolio";
export const PORTFOLIO_MAX_BYTES = 10 * 1024 * 1024;
export const PORTFOLIO_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const PORTFOLIO_ACCEPT = ".jpg,.jpeg,.png,.webp";
export const PORTFOLIO_MAX_PHOTOS = 12;
export const PORTFOLIO_MAX_ITEMS = 30;

const EXT: Record<(typeof PORTFOLIO_IMAGE_TYPES)[number], string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

/** The file extension stored for a photo, or null when the type is not accepted. */
export function portfolioExt(mime: string): string | null {
  return EXT[mime as keyof typeof EXT] ?? null;
}

export function isAllowedPortfolioPhoto(type: string, size: number): boolean {
  return size > 0 && size <= PORTFOLIO_MAX_BYTES && portfolioExt(type) !== null;
}

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || null)
    .nullable();

/** One job in the portfolio; `happened_on` comes from a month field ("2026-05") and is stored as its first day. */
export const portfolioItemSchema = z.object({
  title: z.string().trim().min(1, "Dai un titolo al lavoro").max(160),
  description: z.string().trim().max(2000),
  client_name: optionalText(120),
  city: optionalText(120),
  happened_on: z
    .string()
    .trim()
    .regex(/^(\d{4}-(0[1-9]|1[0-2]))?$/, "Scegli mese e anno")
    .transform((v) => (v ? `${v}-01` : null)),
});
export type PortfolioItemInput = z.infer<typeof portfolioItemSchema>;

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------

export const reviewSchema = z.object({
  rating: z.coerce.number<string>().int().min(1, "Scegli da 1 a 5 stelle").max(5, "Scegli da 1 a 5 stelle"),
  comment: z.string().trim().max(2000),
});
export type ReviewInput = z.infer<typeof reviewSchema>;

export const reviewReplySchema = z.string().trim().max(2000);

const decimal = new Intl.NumberFormat("it-IT", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** "4,8 · 12 recensioni", or null when there are none. */
export function ratingSummary(avg: number | string | null, count: number): string | null {
  if (!count || avg === null) return null;
  return `${decimal.format(Number(avg))} · ${count === 1 ? "1 recensione" : `${count} recensioni`}`;
}

/** "★★★★☆" for 4. */
export const stars = (rating: number) => "★".repeat(rating) + "☆".repeat(5 - rating);

// ---------------------------------------------------------------------------
// Supplier availability
// ---------------------------------------------------------------------------

const DAY_MS = 86_400_000;
const dayNumber = (iso: string) => Math.round(Date.parse(`${iso}T00:00:00Z`) / DAY_MS);
const isoOf = (n: number) => new Date(n * DAY_MS).toISOString().slice(0, 10);

/** Adds days to an ISO date. */
export const addDays = (iso: string, days: number) => isoOf(dayNumber(iso) + days);

export const unavailabilitySchema = z
  .object({
    starts_on: z.iso.date("Scegli il primo giorno"),
    ends_on: z.iso.date("Scegli l'ultimo giorno"),
    note: optionalText(200),
  })
  .refine((u) => u.ends_on >= u.starts_on, { path: ["ends_on"], message: "L'ultimo giorno viene dopo il primo" })
  .refine((u) => dayNumber(u.ends_on) - dayNumber(u.starts_on) <= 366, { path: ["ends_on"], message: "Al massimo un anno alla volta" });
export type UnavailabilityInput = z.infer<typeof unavailabilitySchema>;

/** The weeks of a month, Monday first, with null for the days of the months around it. */
export function monthGrid(year: number, month: number): (string | null)[][] {
  const first = dayNumber(`${year}-${String(month).padStart(2, "0")}-01`);
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const lead = (new Date(first * DAY_MS).getUTCDay() + 6) % 7;
  const cells: (string | null)[] = [...Array<null>(lead).fill(null), ...Array.from({ length: days }, (_, i) => isoOf(first + i))];
  while (cells.length % 7) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7));
}

/** Consecutive days merged into ranges: ["2026-10-12", "2026-10-13", "2026-10-20"] → two ranges. */
export function dayRanges(days: readonly string[]): { from: string; to: string }[] {
  const sorted = [...new Set(days)].sort();
  const ranges: { from: string; to: string }[] = [];
  for (const d of sorted) {
    const last = ranges.at(-1);
    if (last && dayNumber(d) - dayNumber(last.to) === 1) last.to = d;
    else ranges.push({ from: d, to: d });
  }
  return ranges;
}

const shortFmt = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short", timeZone: "UTC" });
const dayOnly = new Intl.DateTimeFormat("it-IT", { day: "numeric", timeZone: "UTC" });
const dateOf = (iso: string) => new Date(`${iso}T00:00:00Z`);

/** "12 ott", "12–14 ott", "30 ott – 2 nov". */
export function rangeLabel({ from, to }: { from: string; to: string }): string {
  if (from === to) return shortFmt.format(dateOf(from));
  if (from.slice(0, 7) === to.slice(0, 7)) return `${dayOnly.format(dateOf(from))}–${shortFmt.format(dateOf(to))}`;
  return `${shortFmt.format(dateOf(from))} – ${shortFmt.format(dateOf(to))}`;
}
