import { z } from "zod";
import { SERVICE_KEYS } from "./services";

export const proposalLineSchema = z.object({
  /** Service category this line prices, or "other". */
  category: z.enum(["other", ...SERVICE_KEYS] as [string, ...string[]]),
  description: z.string().trim().min(1, "Descrivi la voce").max(300),
  amount: z.number().min(0).max(10_000_000),
});

export const proposalSchema = z.object({
  summary: z.string().trim().min(1, "Scrivi una sintesi della proposta").max(5000),
  lines: z.array(proposalLineSchema).min(1, "Aggiungi almeno una voce"),
});

export type ProposalLine = z.infer<typeof proposalLineSchema>;
export type ProposalInput = z.infer<typeof proposalSchema>;

/** Total in cents-safe arithmetic, rounded to 2 decimals. */
export function proposalTotal(lines: readonly Pick<ProposalLine, "amount">[]): number {
  const cents = lines.reduce((sum, l) => sum + Math.round(l.amount * 100), 0);
  return cents / 100;
}

/** `useGrouping: "always"` (ES2023), not yet in this TypeScript lib. */
const ALWAYS_GROUP = { useGrouping: "always" } as unknown as Intl.NumberFormatOptions;

export function formatEuro(amount: number | null | undefined, locale = "it-IT"): string {
  if (amount === null || amount === undefined) return "–";
  // Always group thousands ("1.700,00 €"): Node and browsers disagree on 4-digit amounts in it-IT,
  // so the same figure would read differently on the server, in the browser and in the app.
  return new Intl.NumberFormat(locale, { style: "currency", currency: "EUR", maximumFractionDigits: 2, ...ALWAYS_GROUP }).format(amount);
}
