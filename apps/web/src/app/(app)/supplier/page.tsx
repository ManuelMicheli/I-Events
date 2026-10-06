import { ProfileForm } from "@/components/profile-form";
import { requireOrg } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Profilo" };

export default async function SupplierHome() {
  const org = await requireOrg("supplier");
  const supabase = await createClient();
  const { data: profile, error } = await supabase.from("marketplace_profiles").select("*").eq("org_id", org.id).single();
  if (error) throw error;
  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold">Il tuo profilo</h1>
        <p className="text-muted">Le agenzie ti trovano da qui. Le richieste di preventivo arrivano in una fase successiva.</p>
      </div>
      <ProfileForm profile={profile} canEdit={org.role === "owner" || org.role === "admin"} />
    </>
  );
}
