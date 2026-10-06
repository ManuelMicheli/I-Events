import "server-only";
import { createClient } from "@/lib/supabase/server";

/** The booking requests agencies sent to this supplier account. */
export async function getSupplierRequests(orgId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("supplier_bookings", { p_org: orgId });
  if (error) throw error;
  return data;
}

export type SupplierRequest = Awaited<ReturnType<typeof getSupplierRequests>>[number];

const dateFmt = new Intl.DateTimeFormat("it-IT", { weekday: "short", day: "numeric", month: "long", year: "numeric" });
const day = (d: string) => dateFmt.format(new Date(`${d}T12:00:00`));

/** "sab 1 luglio 2027" or a range for multi-day events. */
export function eventDates(r: { start_date: string | null; end_date: string | null }) {
  if (!r.start_date) return "Data da definire";
  return r.end_date && r.end_date !== r.start_date ? `${day(r.start_date)} – ${day(r.end_date)}` : day(r.start_date);
}
