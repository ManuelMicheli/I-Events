"use client";

import { importContacts, suggestServices } from "@/app/(app)/pro/rubrica/actions";
import { Button, ButtonLink, Card, Notice, Select } from "@/components/ui";
import {
  CONTACT_COLUMN_LABEL,
  CONTACT_COLUMNS,
  dedupeContacts,
  guessColumns,
  parseCsv,
  parseText,
  parseVcard,
  rowsToContacts,
  SERVICE_CATALOG,
  type ContactColumn,
  type ContactDraft,
  type ContactSource,
  type ServiceKey,
} from "@i-events/core";
import { useState, useTransition } from "react";

type Table = { headers: string[]; rows: string[][] };
type Row = ContactDraft & { include: boolean };
type Result = { created: number; merged: number; skipped: number };

const BATCH = 500;
const MAX_CONTACTS = 5000;

/** Source → (column mapping for tables) → review with proposed services → import in batches. */
export function ContactImport() {
  const [step, setStep] = useState<"source" | "mapping" | "review" | "done">("source");
  const [source, setSource] = useState<ContactSource>("csv");
  const [table, setTable] = useState<Table | null>(null);
  const [mapping, setMapping] = useState<ContactColumn[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [duplicates, setDuplicates] = useState(0);
  const [text, setText] = useState("");
  const [error, setError] = useState<string>();
  const [result, setResult] = useState<Result>();
  const [progress, setProgress] = useState<string>();
  const [pending, start] = useTransition();

  /** Merges duplicates in the file and asks the classifier for services on top of what the parser found. */
  function review(parsed: { contacts: ContactDraft[]; hints: (string | undefined)[] }) {
    if (parsed.contacts.length === 0) return setError("Non ho trovato contatti: controlla il file o il testo.");
    if (parsed.contacts.length > MAX_CONTACTS) return setError(`Puoi importare fino a ${MAX_CONTACTS} contatti alla volta: dividi il file.`);
    start(async () => {
      const suggested = await suggestServices(parsed.contacts, parsed.hints);
      const withServices = parsed.contacts.map((c, i) => ({ ...c, services: [...new Set([...c.services, ...((suggested[i] ?? []) as ServiceKey[])])] }));
      const { contacts, merged } = dedupeContacts(withServices);
      setRows(contacts.map((c) => ({ ...c, include: true })));
      setDuplicates(merged);
      setError(undefined);
      setStep("review");
    });
  }

  async function readFile(file: File) {
    setError(undefined);
    const name = file.name.toLowerCase();
    try {
      if (name.endsWith(".vcf") || file.type === "text/vcard") {
        setSource("vcard");
        return review(parseVcard(await file.text()));
      }
      let data: string[][];
      if (name.endsWith(".xlsx")) {
        setSource("excel");
        const { readSheet } = await import("read-excel-file/browser");
        data = (await readSheet(file)).map((r) => r.map((v) => (v === null ? "" : v instanceof Date ? v.toISOString().slice(0, 10) : String(v))));
      } else if (name.endsWith(".xls")) {
        return setError("Il vecchio formato .xls non è supportato: salva il file come .xlsx o .csv.");
      } else {
        setSource(name.includes("google") ? "google" : "csv");
        data = parseCsv(await file.text());
      }
      if (data.length < 2) return setError("Il file non ha righe di contatti sotto l'intestazione.");
      const width = Math.max(...data.map((r) => r.length));
      const headers = Array.from({ length: width }, (_, i) => data[0]![i] ?? "");
      setTable({ headers, rows: data.slice(1).map((r) => Array.from({ length: width }, (_, i) => r[i] ?? "")) });
      setMapping(guessColumns(headers));
      setStep("mapping");
    } catch {
      setError("Non riesco a leggere questo file. Prova a salvarlo come CSV.");
    }
  }

  function runImport() {
    // The server action's schema drops the extra `include` flag.
    const selected: ContactDraft[] = rows.filter((r) => r.include);
    if (selected.length === 0) return setError("Seleziona almeno un contatto.");
    start(async () => {
      const total: Result = { created: 0, merged: 0, skipped: 0 };
      for (let i = 0; i < selected.length; i += BATCH) {
        setProgress(`Importazione ${Math.min(i + BATCH, selected.length)} di ${selected.length}…`);
        const res = await importContacts(selected.slice(i, i + BATCH), source);
        if (res.error) {
          setProgress(undefined);
          setResult(total.created + total.merged > 0 ? total : undefined);
          return setError(res.error);
        }
        total.created += res.created ?? 0;
        total.merged += res.merged ?? 0;
        total.skipped += res.skipped ?? 0;
      }
      setProgress(undefined);
      setResult(total);
      setStep("done");
    });
  }

  const setRow = (i: number, patch: Partial<Row>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const included = rows.filter((r) => r.include).length;
  const withoutService = rows.filter((r) => r.include && r.services.length === 0).length;

  return (
    <div className="flex flex-col gap-4">
      {step === "source" && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card title="Da file">
            <label htmlFor="contacts-file" className="mb-2 block text-sm">
              CSV, Excel (.xlsx) o vCard (.vcf)
            </label>
            <input
              id="contacts-file"
              type="file"
              accept=".csv,.txt,.xlsx,.xls,.vcf,text/csv,text/vcard"
              disabled={pending}
              onChange={(e) => e.target.files?.[0] && readFile(e.target.files[0])}
              className="text-sm"
            />
          </Card>
          <Card title="Incolla testo">
            <label htmlFor="contacts-text" className="sr-only">
              Contatti da incollare
            </label>
            <textarea
              id="contacts-text"
              rows={6}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={"Un contatto per riga, ad esempio:\nMarco Rossi DJ 333 1234567 marco@email.it"}
              className="mb-3 w-full rounded-ui border border-border bg-bg p-3 text-sm"
            />
            <Button
              type="button"
              disabled={pending || !text.trim()}
              onClick={() => {
                setSource("text");
                review(parseText(text));
              }}
            >
              Riconosci contatti
            </Button>
          </Card>
        </div>
      )}

      {step === "mapping" && table && (
        <Card title="Abbina le colonne">
          <p className="mb-4 text-sm text-muted">Ho riconosciuto le colonne in automatico: controlla e correggi se serve.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {table.headers.map((h, i) => (
                    <th key={i} className="min-w-40 p-1 text-left align-bottom font-medium">
                      <span className="mb-1 block text-muted">{h || `Colonna ${i + 1}`}</span>
                      <Select
                        aria-label={`Campo per ${h || `colonna ${i + 1}`}`}
                        value={mapping[i]}
                        onChange={(e) => setMapping((m) => m.map((v, j) => (j === i ? (e.target.value as ContactColumn) : v)))}
                        className="w-full"
                      >
                        {CONTACT_COLUMNS.map((c) => (
                          <option key={c} value={c}>
                            {CONTACT_COLUMN_LABEL[c]}
                          </option>
                        ))}
                      </Select>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.slice(0, 5).map((r, i) => (
                  <tr key={i} className="border-t border-border">
                    {r.map((v, j) => (
                      <td key={j} className={`p-1 ${mapping[j] === "ignore" ? "text-muted line-through" : ""}`}>
                        {v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-sm text-muted">{table.rows.length} righe nel file.</p>
          <div className="mt-4 flex gap-3">
            <Button type="button" variant="secondary" onClick={() => setStep("source")}>
              Indietro
            </Button>
            <Button
              type="button"
              disabled={pending || !mapping.some((m) => ["name", "first_name", "last_name", "company", "email", "phone"].includes(m))}
              onClick={() => review(rowsToContacts(table.rows, mapping))}
            >
              Continua
            </Button>
          </div>
        </Card>
      )}

      {step === "review" && (
        <Card title={`Controlla ${rows.length} contatti`}>
          <p className="mb-4 text-sm text-muted">
            Ho proposto un servizio per ogni contatto in base a nome, azienda e categoria.
            {duplicates > 0 && ` Ho unito ${duplicates} ${duplicates === 1 ? "duplicato" : "duplicati"} presenti nel file.`}
            {withoutService > 0 && ` ${withoutService} senza servizio: puoi sceglierlo ora o più tardi.`}
          </p>
          <div className="mb-2 flex gap-4 text-sm">
            <button type="button" className="underline" onClick={() => setRows((rs) => rs.map((r) => ({ ...r, include: true })))}>
              Seleziona tutti
            </button>
            <button type="button" className="underline" onClick={() => setRows((rs) => rs.map((r) => ({ ...r, include: false })))}>
              Deseleziona tutti
            </button>
          </div>
          <div className="max-h-[32rem] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-bg text-left text-muted">
                <tr>
                  <th className="p-1 font-medium">
                    <span className="sr-only">Importa</span>
                  </th>
                  <th className="p-1 font-medium">Nome</th>
                  <th className="p-1 font-medium">Telefono</th>
                  <th className="p-1 font-medium">Email</th>
                  <th className="p-1 font-medium">Servizio</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className={`border-t border-border ${r.include ? "" : "text-muted"}`}>
                    <td className="p-1">
                      <input type="checkbox" aria-label={`Importa ${r.name}`} checked={r.include} onChange={(e) => setRow(i, { include: e.target.checked })} />
                    </td>
                    <td className="p-1">
                      {r.name}
                      {r.company && <span className="block text-xs text-muted">{r.company}</span>}
                    </td>
                    <td className="p-1">{r.phone ?? "–"}</td>
                    <td className="p-1">{r.email ?? "–"}</td>
                    <td className="p-1">
                      <Select
                        aria-label={`Servizio di ${r.name}`}
                        value={r.services[0] ?? ""}
                        onChange={(e) => setRow(i, { services: e.target.value ? [e.target.value as ServiceKey, ...r.services.filter((s) => s !== e.target.value).slice(1)] : [] })}
                      >
                        <option value="">Nessuno</option>
                        {SERVICE_CATALOG.map((s) => (
                          <option key={s.key} value={s.key}>
                            {s.name.it}
                          </option>
                        ))}
                      </Select>
                      {r.services.length > 1 && <span className="ml-2 text-xs text-muted">+{r.services.length - 1}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button type="button" variant="secondary" disabled={pending} onClick={() => setStep(table ? "mapping" : "source")}>
              Indietro
            </Button>
            <Button type="button" disabled={pending || included === 0} onClick={runImport}>
              Importa {included} {included === 1 ? "contatto" : "contatti"}
            </Button>
            {progress && <span className="text-sm text-muted">{progress}</span>}
          </div>
        </Card>
      )}

      {step === "done" && result && (
        <Card title="Importazione completata">
          <p className="mb-4 text-sm">
            {result.created} {result.created === 1 ? "nuovo contatto" : "nuovi contatti"}, {result.merged} già in rubrica e completati
            {result.skipped > 0 && `, ${result.skipped} scartati perché vuoti`}.
          </p>
          <ButtonLink href="/pro/rubrica">Vai alla rubrica</ButtonLink>
        </Card>
      )}

      {error && <Notice tone="error">{error}</Notice>}
      {result && step !== "done" && (
        <Notice>
          Prima dell&apos;errore sono stati importati {result.created + result.merged} contatti.
        </Notice>
      )}
      {pending && !progress && <p className="text-sm text-muted">Analisi in corso…</p>}
    </div>
  );
}
