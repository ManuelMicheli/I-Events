import { addDays, dayRanges, PORTFOLIO_BUCKET, todayInItaly } from "@i-events/core";
import type { createClient } from "./supabase/server";
import { env } from "./env";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export type PortfolioPhoto = { id: string; url: string; position: number };
export type PortfolioItem = {
  id: string;
  title: string;
  description: string;
  client_name: string | null;
  city: string | null;
  happened_on: string | null;
  photos: PortfolioPhoto[];
};
export type ProfileReview = {
  id: string;
  rating: number;
  comment: string;
  reply: string | null;
  created_at: string;
  author_name: string;
};
export type ProfileExtras = {
  portfolio: PortfolioItem[];
  reviews: ProfileReview[];
  rating: { avg: number | null; count: number };
  /** Supplier only: busy periods in the next three months. */
  busy: { from: string; to: string }[] | null;
};

/** Public address of a portfolio photo. */
export const photoUrl = (path: string) => `${env.supabaseUrl}/storage/v1/object/public/${PORTFOLIO_BUCKET}/${path}`;

export async function loadPortfolio(supabase: Supabase, orgId: string): Promise<PortfolioItem[]> {
  const { data, error } = await supabase
    .from("portfolio_items")
    .select("id, title, description, client_name, city, happened_on, created_at, portfolio_photos(id, storage_path, position, created_at)")
    .eq("org_id", orgId)
    .order("happened_on", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data.map(({ portfolio_photos, id, title, description, client_name, city, happened_on }) => ({
    id,
    title,
    description,
    client_name,
    city,
    happened_on,
    photos: [...portfolio_photos]
      .sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at))
      .map((p) => ({ id: p.id, url: photoUrl(p.storage_path), position: p.position })),
  }));
}

/** Portfolio, reviews and (for suppliers) availability of a profile. */
export async function loadProfileExtras(supabase: Supabase, orgId: string, withAvailability: boolean): Promise<ProfileExtras> {
  const today = todayInItaly();
  const [portfolio, reviewsRes, ratingRes, busyRes] = await Promise.all([
    loadPortfolio(supabase, orgId),
    supabase.rpc("org_reviews", { p_org: orgId, p_limit: 50 }),
    supabase.rpc("org_rating", { p_org: orgId }),
    withAvailability ? supabase.rpc("supplier_busy_days", { p_supplier: orgId, p_from: today, p_to: addDays(today, 90) }) : null,
  ]);
  if (reviewsRes.error) throw reviewsRes.error;
  if (ratingRes.error) throw ratingRes.error;
  if (busyRes?.error) throw busyRes.error;
  const rating = ratingRes.data[0];
  return {
    portfolio,
    reviews: reviewsRes.data,
    rating: {
      avg: rating?.rating_avg === null || rating?.rating_avg === undefined ? null : Number(rating.rating_avg),
      count: rating?.rating_count ?? 0,
    },
    busy: busyRes ? dayRanges(busyRes.data.map((d) => d.day)) : null,
  };
}
