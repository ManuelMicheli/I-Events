import { ACTIVE_ORG_COOKIE, getMyOrgs } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Opens a notification from the app or from an email: marks it read, switches to the account it
 * belongs to and goes to the page it is about.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const fallback = new URL("/notifiche", request.url);
  if (!/^[0-9a-f-]{36}$/.test(id)) return NextResponse.redirect(fallback);
  const supabase = await createClient();
  const { data: n } = await supabase.from("notifications").select("id, org_id, link, read_at").eq("id", id).maybeSingle();
  if (!n) return NextResponse.redirect(fallback);
  if (!n.read_at) await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", n.id);
  if ((await getMyOrgs()).some((o) => o.id === n.org_id)) {
    (await cookies()).set(ACTIVE_ORG_COOKIE, n.org_id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
  }
  const target = n.link && /^\/[a-z]/.test(n.link) ? n.link : "/notifiche";
  return NextResponse.redirect(new URL(target, request.url));
}
