import { todayInItaly } from "@i-events/core";
import { usePathname } from "expo-router";
import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { fetchSupplierRequests } from "./data";
import type { MyOrg } from "./session";
import { supabase } from "./supabase";

/**
 * What waits in each section, for the counts on the tabs, as on the website (lib/nav-counts.ts):
 * the same things the Homes call new.
 * - Agency: requests not opened yet (invited), tasks past their date.
 * - Company: proposals arrived on open requests, quotes to approve.
 * - Supplier: booking requests not answered yet.
 */
export type NavCounts = { richieste: number; eventi: number; attivita: number };
const NONE: NavCounts = { richieste: 0, eventi: 0, attivita: 0 };

export async function fetchNavCounts(org: Pick<MyOrg, "id" | "type">): Promise<NavCounts> {
  if (org.type === "agency") {
    const [fresh, late] = await Promise.all([
      supabase.from("proposals").select("id", { count: "exact", head: true }).eq("agency_org_id", org.id).eq("status", "invited"),
      supabase.from("event_tasks").select("id", { count: "exact", head: true }).eq("org_id", org.id).is("done_at", null).lt("due_date", todayInItaly()),
    ]);
    return { ...NONE, richieste: fresh.count ?? 0, attivita: late.count ?? 0 };
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
    return { ...NONE, richieste: fresh.count ?? 0, eventi: quotes.count ?? 0 };
  }
  const bookings = await fetchSupplierRequests(org.id);
  return { ...NONE, richieste: bookings.filter((b) => b.status === "requested" && !b.supplier_response).length };
}

/** The counts of the active organization, read again on every change of screen and when the app comes back. */
export function useNavCounts({ id, type }: Pick<MyOrg, "id" | "type">): NavCounts {
  const pathname = usePathname();
  const [counts, setCounts] = useState<{ org: string; value: NavCounts }>({ org: id, value: NONE });
  const [wake, setWake] = useState(0);
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => s === "active" && setWake((n) => n + 1));
    return () => sub.remove();
  }, []);
  useEffect(() => {
    let alive = true;
    fetchNavCounts({ id, type })
      .then((value) => alive && setCounts({ org: id, value }))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [id, type, pathname, wake]);
  return counts.org === id ? counts.value : NONE;
}
