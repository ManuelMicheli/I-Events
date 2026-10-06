import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Database } from "@i-events/db";
import { createClient } from "@supabase/supabase-js";
import { AppState, Platform } from "react-native";
import { env } from "./env";

/**
 * Supabase with the signed-in user's session, kept on the device. Every read and write goes through
 * the same RLS policies and RPCs as the web app: the app has no server of its own.
 */
export const supabase = createClient<Database>(env.supabaseUrl || "http://localhost", env.supabaseKey || "missing", {
  auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
});

// Refresh the session only while the app is in the foreground, as Supabase recommends on mobile.
if (Platform.OS !== "web") {
  AppState.addEventListener("change", (state) => {
    if (state === "active") supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
