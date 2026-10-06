import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@i-events/db";

/** Browser client with the signed-in user's session, used for direct uploads to Storage (RLS applies). */
export function createClient() {
  return createBrowserClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
}
