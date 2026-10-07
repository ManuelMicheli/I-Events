import { ContactActions } from "@/components/contacts/contact-actions";
import { FilterIcon, ImportIcon, PlusIcon } from "@/components/icons";
import { ChipRow, ChipTick } from "@/components/controls";
import { ButtonLink, Card, Empty, Input } from "@/components/ui";
import { requireOrg } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { getServiceCategory, SERVICE_CATALOG } from "@i-events/core";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Rubrica" };

export default async function AddressBookPage({ searchParams }: { searchParams: Promise<{ q?: string; servizio?: string }> }) {
  const org = await requireOrg("agency");
  const { q = "", servizio = "" } = await searchParams;
  const supabase = await createClient();
  let query = supabase
    .from("contacts")
    .select("id, name, company, role_title, email, phone, city, services, rating, supplier_org_id", { count: "exact" })
    .eq("org_id", org.id)
    .order("name")
    .limit(200);
  const term = q.trim().replace(/[%,()]/g, " ").slice(0, 80);
  if (term) query = query.or(`name.ilike.%${term}%,company.ilike.%${term}%,email.ilike.%${term}%,city.ilike.%${term}%`);
  if (getServiceCategory(servizio)) query = query.contains("services", [servizio]);
  const { data: contacts, count, error } = await query;
  if (error) throw error;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Rubrica</h1>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href="/pro/rubrica/importa" className="ic-host">
            <ImportIcon />
            Importa contatti
          </ButtonLink>
          <ButtonLink href="/pro/rubrica/nuovo" variant="secondary" className="ic-host">
            <PlusIcon />
            Nuovo contatto
          </ButtonLink>
        </div>
      </div>
      <form className="flex flex-wrap gap-2" role="search">
        <label htmlFor="q" className="sr-only">
          Cerca
        </label>
        <Input id="q" name="q" defaultValue={q} placeholder="Cerca per nome, azienda, email o città" className="min-w-64 flex-1" />
        {servizio && <input type="hidden" name="servizio" value={servizio} />}
        <button type="submit" className="ic-host inline-flex h-10 items-center gap-2 rounded-ui border border-border px-4 text-sm">
          <FilterIcon />
          Filtra
        </button>
      </form>
      <ChipRow label="Servizio">
        {[{ key: "", name: "Tutti i servizi" }, ...SERVICE_CATALOG.map((c) => ({ key: c.key, name: c.name.it }))].map((c) => {
          const params = new URLSearchParams();
          if (q) params.set("q", q);
          if (c.key) params.set("servizio", c.key);
          const on = (servizio ?? "") === c.key;
          return (
            <Link key={c.key || "tutti"} href={`/pro/rubrica${params.size ? `?${params}` : ""}`} aria-current={on ? "true" : undefined} className="chip shrink-0">
              <span>
                {on && <ChipTick />}
                {c.name}
              </span>
            </Link>
          );
        })}
      </ChipRow>
      <Card>
        {contacts.length === 0 ? (
          <Empty>
            {q || servizio
              ? "Nessun contatto trovato."
              : "La rubrica è vuota. Importa i tuoi fornitori da un file CSV o Excel, da una vCard o incollandoli come testo."}
          </Empty>
        ) : (
          <>
            <p className="mb-2 text-sm text-muted">{count === 1 ? "1 contatto" : `${count} contatti`}</p>
            <ul className="divide-y divide-border">
              {contacts.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 py-3 text-sm">
                  <span className="min-w-0">
                    <Link href={`/pro/rubrica/${c.id}`} className="font-medium underline">
                      {c.name}
                    </Link>
                    {c.company && <span className="ml-2 text-muted">{c.company}</span>}
                    {c.supplier_org_id && <span className="ml-2 rounded-ui border border-border px-1.5 text-xs">Su I-Events</span>}
                    <span className="block text-muted">
                      {[c.services.map((s) => getServiceCategory(s)?.name.it).filter(Boolean).join(", "), c.city, c.rating ? "★".repeat(c.rating) : null]
                        .filter(Boolean)
                        .join(" · ") || "Nessun servizio indicato"}
                    </span>
                  </span>
                  <ContactActions name={c.name} phone={c.phone} email={c.email} />
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>
    </>
  );
}
