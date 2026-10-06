import { MarketplaceProfile } from "@/components/marketplace/profile";
import { ButtonLink } from "@/components/ui";
import { requireOrg } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

export const metadata: Metadata = { title: "Agenzia" };

export default async function AgencyProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await requireOrg("client");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("marketplace_profile", { p_slug: slug.slice(0, 120) });
  if (error) throw error;
  const profile = data[0];
  if (!profile || profile.type !== "agency") notFound();
  return (
    <MarketplaceProfile
      profile={profile}
      back={
        <Link href="/client/agenzie" className="text-sm text-muted underline">
          Trova agenzie
        </Link>
      }
      action={<ButtonLink href={`/client/richieste/nuova?agenzia=${profile.org_id}`}>Chiedi un preventivo</ButtonLink>}
    />
  );
}
