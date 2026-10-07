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

/**
 * Whether the website can be opened from the phone: a site on localhost only exists on the developer's computer, so
 * the buttons that open it stay hidden and the app keeps everything in its own screens.
 */
export const siteOnline = !/^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:|\/|$)/.test(env.siteUrl);
