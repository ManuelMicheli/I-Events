import { useSession } from "./session";
import { supabase } from "./supabase";
import { useQuery } from "./use-query";

/** The signed-in person's full name from their profile, or null while loading or when not set. */
export function useMyName(): string | null {
  const { session } = useSession();
  const userId = session?.user.id ?? null;
  const q = useQuery(userId && `profile:${userId}`, async () => {
    const { data, error } = await supabase.from("profiles").select("full_name").eq("id", userId!).maybeSingle();
    if (error) throw error;
    return data?.full_name?.trim() || null;
  });
  return q.data ?? null;
}
