import { ProfileForm } from "@/components/profile-form";
import { OwnProfileExtras } from "@/components/profiles/own-profile";
import { loadProfileExtras } from "@/lib/profiles";
import { Card } from "@/components/ui";
import { requireOrg } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Profilo" };

export default async function SupplierHome() {
  const org = await requireOrg("supplier");
  const supabase = await createClient();
  const [{ data: profile, error }, { data: agencies, error: e2 }] = await Promise.all([
    supabase.from("marketplace_profiles").select("*").eq("org_id", org.id).single(),
    supabase.rpc("supplier_agencies", { p_org: org.id }),
  ]);
  if (error) throw error;
  if (e2) throw e2;
  const extras = await loadProfileExtras(supabase, org.id, false);
  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold">Il tuo profilo</h1>
        <p className="text-muted">Le agenzie ti trovano da qui.</p>
      </div>
      {agencies.length > 0 && (
        <Card title="Agenzie con cui lavori">
          <ul className="divide-y divide-border text-sm">
            {agencies.map((a) => (
              <li key={a.agency_name} className="flex justify-between gap-4 py-2">
                <span>{a.agency_name}</span>
                {a.open_requests > 0 && (
                  <Link href="/supplier/richieste" className="underline">
                    {a.open_requests === 1 ? "1 richiesta da rispondere" : `${a.open_requests} richieste da rispondere`}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}
      <ProfileForm profile={profile} canEdit={org.role === "owner" || org.role === "admin"} />
      <OwnProfileExtras extras={extras} canEdit={org.role === "owner" || org.role === "admin"} />
    </>
  );
}
