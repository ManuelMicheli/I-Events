import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const response = NextResponse.redirect(new URL("/", request.url), { status: 303 });
  // Event-day pages are kept on the device for offline use: forget them on sign-out.
  response.headers.set("Clear-Site-Data", '"cache", "storage"');
  return response;
}
