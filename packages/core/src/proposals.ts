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

export function formatEuro(amount: number | null | undefined, locale = "it-IT"): string {
  if (amount === null || amount === undefined) return "–";
  return new Intl.NumberFormat(locale, { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(amount);
}
