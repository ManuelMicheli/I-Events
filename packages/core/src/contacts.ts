import { z } from "zod";
import { SERVICE_KEYS, type ServiceKey } from "./services";

/**
 * Address book import: turns CSV/Excel tables, vCards and pasted text into clean contacts, proposes a
 * service category for each one and merges duplicates. Pure functions, shared by web and mobile.
 */

export const CONTACT_SOURCES = ["manual", "csv", "excel", "vcard", "text", "google", "phone"] as const;
export type ContactSource = (typeof CONTACT_SOURCES)[number];

export const contactSchema = z.object({
  name: z.string().trim().min(1, "Inserisci un nome").max(200),
  company: z.string().trim().max(200).optional(),
  role_title: z.string().trim().max(120).optional(),
  email: z.email("Email non valida").max(254).optional(),
  phone: z.string().regex(/^\+[0-9]{6,15}$/, "Telefono non valido").optional(),
  website: z.string().trim().max(300).optional(),
  city: z.string().trim().max(120).optional(),
  services: z.array(z.enum(SERVICE_KEYS as [ServiceKey, ...ServiceKey[]])).default([]),
  notes: z.string().trim().max(5000).optional(),
});
export type ContactDraft = z.infer<typeof contactSchema>;

// ---------------------------------------------------------------------------
// Normalization
// ---------------------------------------------------------------------------

/** International format (+39...). Italian numbers without prefix are assumed; returns undefined if unusable. */
export function normalizePhone(raw: string | undefined | null, countryCode = "39"): string | undefined {
  if (!raw) return undefined;
  let s = raw.trim().replace(/^tel:/i, "").replace(/[^\d+]/g, "");
  if (s.startsWith("00")) s = `+${s.slice(2)}`;
  if (!s.startsWith("+")) {
    // Italian mobiles start with 3, landlines with 0; both keep their digits after +39.
    if (/^[03]\d{5,11}$/.test(s)) s = `+${countryCode}${s}`;
    else return undefined;
  }
  s = `+${s.slice(1).replace(/\+/g, "")}`;
  return /^\+[0-9]{6,15}$/.test(s) ? s : undefined;
}

export function normalizeEmail(raw: string | undefined | null): string | undefined {
  const s = raw?.trim().replace(/^mailto:/i, "").toLowerCase();
  return s && z.email().safeParse(s).success ? s : undefined;
}

const clean = (s: string | undefined | null) => {
  const t = s?.replace(/\s+/g, " ").trim();
  return t ? t : undefined;
};

/** WhatsApp link for a normalized phone. */
export function whatsappUrl(phone: string): string {
  return `https://wa.me/${phone.replace(/^\+/, "")}`;
}

// ---------------------------------------------------------------------------
// Service classification
// ---------------------------------------------------------------------------

const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/** Keywords that point to a service category, in Italian and English. */
const SERVICE_KEYWORDS: Record<ServiceKey, RegExp> = {
  organization: /\b(regia|regista|event manager|organizzazion\w*|planner|coordinat\w*|agenzia eventi)\b/,
  venue: /\b(location|venue|villa|castello|sala|salone|tenuta|masseria|hotel|resort|spazio eventi|loft|rooftop)\b/,
  logistics: /\b(logistic\w*|trasport\w*|navett\w*|noleggio (furgoni|auto|pullman)|autist\w*|transfer|corrier\w*|facchin\w*|magazzin\w*)\b/,
  av: /\b(service|audio|luci|illuminotecnic\w*|fonic\w*|ledwall|led wall|video ?proiezion\w*|proiettor\w*|streaming|palchi|palco|sound|lighting|backline)\b/,
  entertainment: /\b(dj|deejay|disc jockey|band|music\w*|musicist\w*|cantant\w*|animazion\w*|animator\w*|intrattenim\w*|presentator\w*|vocalist|performer|artist\w*|show)\b/,
  security: /\b(sicurezza|security|vigilanza|vigilant\w*|steward|buttafuori|bodyguard|guardie|antincendio|portierato)\b/,
  cleaning: /\b(pulizi\w*|cleaning|sanificazion\w*|igiene|rifiuti|facility)\b/,
  catering: /\b(catering|banqueting|chef|cuoc\w*|ristorazion\w*|bar|barman|bartender|cocktail|food|beverage|pasticceri\w*|vini|sommelier|aperitiv\w*)\b/,
  setup: /\b(allestiment\w*|scenograf\w*|stand|arred\w*|noleggio arredi|tensostruttur\w*|gazebo|fiorist\w*|fiori|decor\w*|branding|stampa|grafic\w*|insegn\w*)\b/,
  staffing: /\b(hostess|promoter|modell[ei]|personale|staff|accoglienza|guardaroba)\b/,
  media: /\b(foto\w*|video(?! ?proiez)\w*|videomaker|riprese|drone|social media|content creator|influencer|ufficio stampa|giornalist\w*)\b/,
  permits: /\b(siae|permess\w*|pratiche|licenz\w*|autorizzazion\w*|commercialist\w*|consulen\w* legal\w*|assicurazion\w*|pubblica sicurezza)\b/,
};

/** Proposed service categories for a free text (company, role, notes, a "category" column...). */
export function classifyServices(text: string): ServiceKey[] {
  const t = fold(text);
  if (!t.trim()) return [];
  const found = (Object.keys(SERVICE_KEYWORDS) as ServiceKey[]).filter((k) => SERVICE_KEYWORDS[k].test(t));
  // "Service audio luci" and "service catering" share the word service: keep AV only if nothing else matched it.
  if (found.includes("av") && found.length > 1 && !/\b(audio|luci|fonic|ledwall|led wall|proiet|streaming|palc|sound|lighting|backline)/.test(t)) {
    return found.filter((k) => k !== "av");
  }
  return found;
}

/**
 * Pluggable classifier, so a smarter model (for example Jev) can replace the keyword rules without
 * touching the import flow. It returns one list of categories per contact, in the same order.
 */
export interface ServiceClassifier {
  classify(contacts: readonly ContactDraft[], hints?: readonly (string | undefined)[]): Promise<ServiceKey[][]>;
}

export const keywordClassifier: ServiceClassifier = {
  async classify(contacts, hints) {
    return contacts.map((c, i) => classifyServices([c.company, c.name, c.role_title, c.notes, hints?.[i]].filter(Boolean).join(" ")));
  },
};

// ---------------------------------------------------------------------------
// Tables (CSV, Excel, Google/Outlook exports)
// ---------------------------------------------------------------------------

export const CONTACT_COLUMNS = ["ignore", "name", "first_name", "last_name", "company", "role_title", "email", "phone", "website", "city", "category", "notes"] as const;
export type ContactColumn = (typeof CONTACT_COLUMNS)[number];

export const CONTACT_COLUMN_LABEL: Record<ContactColumn, string> = {
  ignore: "Non importare",
  name: "Nome completo",
  first_name: "Nome",
  last_name: "Cognome",
  company: "Azienda",
  role_title: "Ruolo",
  email: "Email",
  phone: "Telefono",
  website: "Sito web",
  city: "Città o zona",
  category: "Servizio / categoria",
  notes: "Note",
};

/** Ordered: the first rule that matches a header wins (so "Organization Title" is a role, not a company). */
const COLUMN_RULES: [ContactColumn, RegExp][] = [
  ["email", /(e-?mail|posta|pec\b)/],
  ["phone", /(phone|telefon|\btel\b|cellular|\bcell\b|mobile|whatsapp|numero|cel\.)/],
  ["role_title", /(job title|organization( \d+)? -? ?title|qualifica|mansione|\bruolo\b|\btitle\b|position|posizione)/],
  ["company", /(organization|organizzazione|company|azienda|ragione sociale|societa|ditta|fornitore|impresa|business)/],
  ["website", /(website|sito|\bweb\b|\burl\b|homepage)/],
  ["city", /(citta|city|comune|localita|zona|provincia|indirizzo|address|regione)/],
  ["category", /(categori|servizi|service|settore|\btipo\b|labels|etichett|group|gruppo|tag)/],
  ["notes", /(note|notes|descrizion|comment|memo)/],
  ["first_name", /(first name|given name|^nome$|firstname)/],
  ["last_name", /(last name|family name|surname|cognome|lastname)/],
  ["name", /(name|nome|nominativo|contatto|referente|display)/],
];

export function guessColumn(header: string): ContactColumn {
  const h = fold(header).replace(/[_]+/g, " ").replace(/\s+/g, " ").trim();
  if (!h) return "ignore";
  return COLUMN_RULES.find(([, re]) => re.test(h))?.[0] ?? "ignore";
}

/** Guesses every column; a field taken by an earlier column is not proposed again (e.g. a second phone column). */
export function guessColumns(headers: readonly string[]): ContactColumn[] {
  const used = new Set<ContactColumn>();
  return headers.map((h) => {
    const g = guessColumn(h);
    if (g === "ignore" || used.has(g)) return "ignore";
    used.add(g);
    return g;
  });
}

/** RFC 4180 CSV with automatic delimiter (comma, semicolon as Italian Excel exports, or tab). */
export function parseCsv(input: string): string[][] {
  const text = input.replace(/^﻿/, "");
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const counts = [",", ";", "\t"].map((d) => [d, firstLine.split(d).length] as const);
  const delimiter = counts.sort((a, b) => b[1] - a[1])[0]![0];

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"' && field === "") quoted = true;
    else if (c === delimiter) {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((v) => v.trim() !== ""));
}

/** Applies the confirmed column mapping to table rows (header excluded). */
export function rowsToContacts(rows: readonly (readonly unknown[])[], mapping: readonly ContactColumn[]): { contacts: ContactDraft[]; hints: (string | undefined)[] } {
  const contacts: ContactDraft[] = [];
  const hints: (string | undefined)[] = [];
  for (const row of rows) {
    const get = (col: ContactColumn) =>
      clean(
        mapping
          .map((m, i) => (m === col ? row[i] : undefined))
          .filter((v) => v !== undefined && v !== null && String(v).trim() !== "")
          .map(String)
          .join(" "),
      );
    const fullName = get("name") ?? clean([get("first_name"), get("last_name")].filter(Boolean).join(" "));
    const draft = toDraft({
      name: fullName,
      company: get("company"),
      role_title: get("role_title"),
      email: get("email")?.split(/[\s,;]+/)[0],
      phone: get("phone")?.split(/[,;/]| {2,}/)[0],
      website: get("website"),
      city: get("city"),
      notes: get("notes"),
    });
    if (!draft) continue;
    const category = get("category");
    draft.services = classifyServices(category ?? "");
    contacts.push(draft);
    hints.push(category);
  }
  return { contacts, hints };
}

type Loose = { name?: string; company?: string; role_title?: string; email?: string; phone?: string; website?: string; city?: string; notes?: string };

function toDraft(l: Loose): ContactDraft | null {
  const email = normalizeEmail(l.email);
  const phone = normalizePhone(l.phone);
  const company = clean(l.company)?.slice(0, 200);
  const name = (clean(l.name) ?? company ?? email ?? phone)?.slice(0, 200);
  if (!name) return null;
  return {
    name,
    company: company && company !== name ? company : undefined,
    role_title: clean(l.role_title)?.slice(0, 120),
    email,
    phone,
    website: clean(l.website)?.slice(0, 300),
    city: clean(l.city)?.slice(0, 120),
    notes: clean(l.notes)?.slice(0, 5000),
    services: [],
  };
}

// ---------------------------------------------------------------------------
// vCard (phone exports, iCloud, Outlook)
// ---------------------------------------------------------------------------

export function parseVcard(input: string): { contacts: ContactDraft[]; hints: (string | undefined)[] } {
  // Unfold continuation lines (RFC 6350: a line starting with a space continues the previous one).
  const lines = input.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "").split("\n");
  const contacts: ContactDraft[] = [];
  const hints: (string | undefined)[] = [];
  let card: Record<string, string[]> | null = null;
  const unescape = (v: string) => v.replace(/\\n/gi, " ").replace(/\\([,;\\])/g, "$1");

  for (const line of lines) {
    const upper = line.toUpperCase();
    if (upper.startsWith("BEGIN:VCARD")) card = {};
    else if (upper.startsWith("END:VCARD") && card) {
      const n = card.N?.[0]?.split(";") ?? [];
      const tels = card.TEL ?? [];
      const adr = card.ADR?.[0]?.split(";") ?? [];
      const draft = toDraft({
        name: card.FN?.[0] ?? clean([n[1], n[0]].filter(Boolean).join(" ")),
        company: card.ORG?.[0]?.split(";")[0],
        role_title: card.TITLE?.[0],
        email: card.EMAIL?.[0],
        phone: tels.find((t) => normalizePhone(t)) ?? tels[0],
        website: card.URL?.[0],
        city: adr[3],
        notes: card.NOTE?.[0],
      });
      if (draft) {
        const category = card.CATEGORIES?.[0];
        draft.services = classifyServices([category, draft.company, draft.role_title, draft.notes].filter(Boolean).join(" "));
        contacts.push(draft);
        hints.push(category);
      }
      card = null;
    } else if (card) {
      const colon = line.indexOf(":");
      if (colon < 0) continue;
      // "item1.TEL;TYPE=CELL" -> "TEL"
      const key = line.slice(0, colon).split(";")[0]!.split(".").pop()!.toUpperCase();
      (card[key] ??= []).push(unescape(line.slice(colon + 1)));
    }
  }
  return { contacts, hints };
}

// ---------------------------------------------------------------------------
// Pasted text: one contact per line ("Marco Rossi DJ 333 1234567 marco@dj.it")
// ---------------------------------------------------------------------------

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
const PHONE_RE = /(?:\+|00)?\d[\d\s./-]{6,}\d/;

export function parseText(input: string): { contacts: ContactDraft[]; hints: (string | undefined)[] } {
  const contacts: ContactDraft[] = [];
  const hints: (string | undefined)[] = [];
  for (const raw of input.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const email = line.match(EMAIL_RE)?.[0];
    const phone = line.replace(EMAIL_RE, " ").match(PHONE_RE)?.[0];
    const rest = clean(
      line
        .replace(EMAIL_RE, " ")
        .replace(phone ?? "\u0000", " ")
        .replace(/[|,;:\t]+/g, " ")
        .replace(/\s[-–]\s/g, " "),
    );
    const draft = toDraft({ name: rest, email, phone });
    if (!draft) continue;
    draft.services = classifyServices(line);
    contacts.push(draft);
    hints.push(undefined);
  }
  return { contacts, hints };
}

// ---------------------------------------------------------------------------
// Duplicates inside one import (the database also merges with the existing address book)
// ---------------------------------------------------------------------------

export function dedupeContacts(contacts: readonly ContactDraft[]): { contacts: ContactDraft[]; merged: number } {
  const out: ContactDraft[] = [];
  const byKey = new Map<string, ContactDraft>();
  let merged = 0;
  for (const c of contacts) {
    const keys = [c.email && `e:${c.email}`, c.phone && `p:${c.phone}`].filter(Boolean) as string[];
    const existing = keys.map((k) => byKey.get(k)).find(Boolean);
    if (existing) {
      merged += 1;
      for (const f of ["company", "role_title", "email", "phone", "website", "city", "notes"] as const) existing[f] ??= c[f];
      existing.services = [...new Set([...existing.services, ...c.services])];
      for (const k of [existing.email && `e:${existing.email}`, existing.phone && `p:${existing.phone}`]) if (k) byKey.set(k, existing);
      continue;
    }
    const copy = { ...c, services: [...c.services] };
    out.push(copy);
    for (const k of keys) byKey.set(k, copy);
  }
  return { contacts: out, merged };
}
