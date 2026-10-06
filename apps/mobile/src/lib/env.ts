/**
 * Public configuration, inlined by Expo at build time from EXPO_PUBLIC_* variables. Missing values
 * do not crash the app: the root layout shows what to set instead.
 */
export const env = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "",
  supabaseKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
  siteUrl: (process.env.EXPO_PUBLIC_SITE_URL ?? "https://i-events.app").replace(/\/$/, ""),
};

export const missingEnv = [!env.supabaseUrl && "EXPO_PUBLIC_SUPABASE_URL", !env.supabaseKey && "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY"].filter(
  (v): v is string => Boolean(v),
);
