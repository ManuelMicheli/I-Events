import { z } from "zod";
import type { ProposalLine } from "./proposals";
import { SERVICE_KEYS } from "./services";

/** Where a supplier booking stands: still to find, asked, confirmed, or dropped. */
export const BOOKING_STATUSES = ["to_book", "requested", "confirmed", "cancelled"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

const money = z.number().min(0).max(10_000_000).nullable();

export const bookingSchema = z
  .object({
    service_key: z.enum(SERVICE_KEYS as unknown as [string, ...string[]]),
    description: z.string().trim().max(300).optional(),
    contact_id: z.uuid().nullable(),
    status: z.enum(BOOKING_STATUSES),
    planned_cost: money,
    actual_cost: money,
    notes: z.string().trim().max(2000).optional(),
  })
  .refine((b) => b.contact_id !== null || b.status === "to_book" || b.status === "cancelled", {
    path: ["contact_id"],
    message: "Scegli prima il fornitore",
  });
export type BookingInput = z.infer<typeof bookingSchema>;

type Costed = { service_key: string; status: BookingStatus; planned_cost: number | null; actual_cost: number | null };

export type BudgetRow = { service: string; sold: number | null; planned: number; actual: number; hasActual: boolean };
export type Budget = {
  rows: BudgetRow[];
  sold: number | null;
  planned: number;
  /** Actual where known, planned otherwise: what the event is expected to cost now. */
  forecast: number;
  actual: number;
  /** Sold minus forecast; null when the selling price is not known for this event. */
  margin: number | null;
  confirmed: number;
  open: number;
};

const cents = (n: number | null | undefined) => Math.round((n ?? 0) * 100);

/**
 * Budget of one event: what was sold to the client (the accepted proposal lines, when the proposal
 * covers this event alone) against what suppliers cost, per service and in total. Cancelled bookings
 * cost nothing.
 */
export function eventBudget(bookings: readonly Costed[], soldLines: readonly Pick<ProposalLine, "category" | "amount">[] | null): Budget {
  const live = bookings.filter((b) => b.status !== "cancelled");
  const services = [...new Set([...live.map((b) => b.service_key), ...(soldLines ?? []).map((l) => l.category)])];
  const rows = services.map((service) => {
    const mine = live.filter((b) => b.service_key === service);
    const sold = soldLines ? soldLines.filter((l) => l.category === service).reduce((s, l) => s + cents(l.amount), 0) : null;
    return {
      service,
      sold: sold === null ? null : sold / 100,
      planned: mine.reduce((s, b) => s + cents(b.planned_cost), 0) / 100,
      actual: mine.reduce((s, b) => s + cents(b.actual_cost), 0) / 100,
      hasActual: mine.some((b) => b.actual_cost !== null),
    };
  });
  const planned = live.reduce((s, b) => s + cents(b.planned_cost), 0);
  const actual = live.reduce((s, b) => s + cents(b.actual_cost), 0);
  const forecast = live.reduce((s, b) => s + cents(b.actual_cost ?? b.planned_cost), 0);
  const sold = soldLines ? soldLines.reduce((s, l) => s + cents(l.amount), 0) : null;
  return {
    rows,
    sold: sold === null ? null : sold / 100,
    planned: planned / 100,
    forecast: forecast / 100,
    actual: actual / 100,
    margin: sold === null ? null : (sold - forecast) / 100,
    confirmed: live.filter((b) => b.status === "confirmed").length,
    open: live.filter((b) => b.status !== "confirmed").length,
  };
}
