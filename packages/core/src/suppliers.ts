import { z } from "zod";

/** A supplier's answer to an agency's booking request. */
export const supplierResponseSchema = z
  .object({
    available: z.boolean(),
    price: z.number().min(0, "Il prezzo non può essere negativo").max(10_000_000).nullable(),
    note: z.string().trim().max(2000).optional(),
  })
  .refine((r) => r.available || r.price === null, { path: ["price"], message: "Il prezzo serve solo se sei disponibile" });
export type SupplierResponseInput = z.infer<typeof supplierResponseSchema>;

export const SUPPLIER_REQUEST_BUCKETS = ["to_answer", "answered", "confirmed", "closed"] as const;
export type SupplierRequestBucket = (typeof SUPPLIER_REQUEST_BUCKETS)[number];

type SupplierRequest = {
  status: "to_book" | "requested" | "confirmed" | "cancelled";
  supplier_response: string | null;
  event_status: "planning" | "preparing" | "live" | "completed" | "cancelled";
};

/** Where a request sits in the supplier's list: waiting for their answer, for the agency, booked, or over. */
export function supplierRequestBucket(r: SupplierRequest): SupplierRequestBucket {
  if (r.status === "cancelled" || r.event_status === "cancelled" || r.event_status === "completed") return "closed";
  if (r.status === "confirmed") return "confirmed";
  if (r.status === "requested") return r.supplier_response ? "answered" : "to_answer";
  return "closed";
}
