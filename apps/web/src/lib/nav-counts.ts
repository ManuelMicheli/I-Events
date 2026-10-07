import "server-only";
import type { MyOrg } from "./session";
import { createClient } from "./supabase/server";
import { getSupplierRequests } from "./supplier-requests";

const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(new Date());

/**
 * What waits in each section, for the counts in the sidebar and the tab bar: the same things the
 * Homes call new (agencyHome / clientHome in @i-events/core).
 * - Agency: requests not opened yet (invited), tasks past their date.
 * - Company: proposals arrived on open requests, quotes to approve.
 * - Supplier: booking requests not answered yet.
 */
export async function navCounts(org: MyOrg): Promise<Record<string, number>> {
  const supabase = await createClient();
  if (org.type === "agency") {
    const [fresh, late] = await Promise.all([
      supabase.from("proposals").select("id", { count: "exact", head: true }).eq("agency_org_id", org.id).eq("status", "invited"),
      supabase.from("event_tasks").select("id", { count: "exact", head: true }).eq("org_id", org.id).is("done_at", null).lt("due_date", today()),
    ]);
    return { "/pro/richieste": fresh.count ?? 0, "/pro/attivita": late.count ?? 0 };
  }
  if (org.type === "client") {
    const [fresh, quotes] = await Promise.all([
      supabase
        .from("proposals")
        .select("id, request:requests!inner(id)", { count: "exact", head: true })
        .eq("request.client_org_id", org.id)
        .eq("request.status", "sent")
        .eq("status", "submitted"),
      supabase.from("event_quotes").select("id, event:events!inner(id)", { count: "exact", head: true }).eq("event.client_org_id", org.id).eq("status", "sent"),
    ]);
    return { "/client/richieste": fresh.count ?? 0, "/client/eventi": quotes.count ?? 0 };
  }
  const bookings = await getSupplierRequests(org.id);
  return { "/supplier/richieste": bookings.filter((b) => b.status === "requested" && !b.supplier_response).length };
}
