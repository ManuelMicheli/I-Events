import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@i-events/db";
import { env } from "../env";

/** Service-role client for scheduled jobs. Bypasses RLS: never use it with input from a request. */
export function createAdminClient() {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error("Missing environment variable SUPABASE_SECRET_KEY");
  return createClient<Database>(env.supabaseUrl, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
