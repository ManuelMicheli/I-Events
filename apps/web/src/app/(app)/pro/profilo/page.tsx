import { ProfileForm } from "@/components/profile-form";
import { requireOrg } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Profilo marketplace" };

export default async function AgencyProfile() {
  const org = await requireOrg("agency");
  const supabase = await createClient();
  const { data: profile, error } = await supabase.from("marketplace_profiles").select("*").eq("org_id", org.id).single();
  if (error) throw error;
  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold">Profilo marketplace</h1>
        <p className="text-muted">Se il profilo è visibile, le aziende possono trovarti e inviarti richieste anche senza invito.</p>
      </div>
      <ProfileForm profile={profile} canEdit={org.role === "owner" || org.role === "admin"} />
    </>
  );
}
