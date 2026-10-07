import { ContactActions } from "@/components/contacts/contact-actions";
import { ContactForm } from "@/components/contacts/contact-form";
import { SupplierAccountCard } from "@/components/contacts/supplier-account";
import { Notice } from "@/components/ui";
import { env } from "@/lib/env";
import { requireOrg } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { can } from "@i-events/core";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

export const metadata: Metadata = { title: "Contatto" };

const nowIso = () => new Date().toISOString();

export default async function ContactPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ salvato?: string; aggiunto?: string }>;
}) {
  const { id } = await params;
  const { salvato, aggiunto } = await searchParams;
  const org = await requireOrg("agency");
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const supabase = await createClient();
  const { data: contact, error } = await supabase.from("contacts").select("*").eq("id", id).eq("org_id", org.id).maybeSingle();
  if (error) throw error;
  if (!contact) notFound();
  const [supplierRes, inviteRes] = await Promise.all([
    contact.supplier_org_id
      ? supabase.from("organizations").select("name").eq("id", contact.supplier_org_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase.from("supplier_invitations").select("token, expires_at").eq("contact_id", id).is("accepted_at", null).maybeSingle(),
  ]);
  if (supplierRes.error) throw supplierRes.error;
  if (inviteRes.error) throw inviteRes.error;
  const invite = inviteRes.data && inviteRes.data.expires_at > nowIso() ? inviteRes.data : null;
  // From 1536 px the form takes the width and the I-Events account sits in a column on the right (A11 in globals.css).
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/pro/rubrica" className="text-sm text-muted underline">
            Rubrica
          </Link>
          <h1 className="text-2xl font-semibold">{contact.name}</h1>
        </div>
        <ContactActions name={contact.name} phone={contact.phone} email={contact.email} />
      </div>
      {salvato && <Notice tone="success">Contatto salvato.</Notice>}
      {aggiunto && <Notice tone="success">Aggiunto alla rubrica. Ora puoi sceglierlo per i servizi dei tuoi eventi.</Notice>}
      <div className="flex flex-col gap-6 2xl:grid 2xl:grid-cols-[minmax(0,1fr)_24rem] 2xl:items-start 3xl:grid-cols-[minmax(0,1fr)_28rem] 4xl:grid-cols-[minmax(0,1fr)_30rem]">
        <div className="2xl:sticky 2xl:top-20 2xl:col-start-2 2xl:row-start-1">
          <SupplierAccountCard
            contactId={contact.id}
            name={contact.name}
            phone={contact.phone}
            email={contact.email}
            supplierName={contact.supplier_org_id ? (supplierRes.data?.name ?? contact.company ?? contact.name) : null}
            inviteLink={invite ? `${env.siteUrl}/invito/${invite.token}` : null}
            agencyName={org.name}
          />
        </div>
        <div className="2xl:col-start-1 2xl:row-start-1">
          <ContactForm key={contact.updated_at} contact={contact} canDelete={can(org.type, org.role, "contacts.delete")} />
        </div>
      </div>
    </div>
  );
}
