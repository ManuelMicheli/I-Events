import { MarketplaceProfile } from "@/components/marketplace/profile";
import { Button } from "@/components/ui";
import { requireOrg } from "@/lib/session";
import { loadProfileExtras } from "@/lib/profiles";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { addMarketplaceSupplier } from "../../rubrica/actions";

export const metadata: Metadata = { title: "Fornitore" };

export default async function SupplierProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const org = await requireOrg("agency");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("marketplace_profile", { p_slug: slug.slice(0, 120) });
  if (error) throw error;
  const profile = data[0];
  if (!profile || profile.type !== "supplier") notFound();
  const [{ data: contact, error: e2 }, extras] = await Promise.all([
    supabase.from("contacts").select("id").eq("org_id", org.id).eq("supplier_org_id", profile.org_id).limit(1).maybeSingle(),
    loadProfileExtras(supabase, profile.org_id, true),
  ]);
  if (e2) throw e2;
  return (
    <MarketplaceProfile
      profile={profile}
      extras={extras}
      back={
        <Link href="/pro/fornitori" className="text-sm text-muted underline">
          Trova fornitori
        </Link>
      }
      action={
        contact ? (
          <Link
            href={`/pro/rubrica/${contact.id}`}
            className="inline-flex h-10 items-center rounded-ui border border-border px-4 text-sm font-medium"
          >
            Già in rubrica: apri il contatto
          </Link>
        ) : (
          <form action={addMarketplaceSupplier}>
            <input type="hidden" name="supplierId" value={profile.org_id} />
            <Button type="submit">Aggiungi alla rubrica</Button>
          </form>
        )
      }
    />
  );
}
