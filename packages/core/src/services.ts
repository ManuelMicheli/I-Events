import { z } from "zod";

/**
 * Catalog of services a client can request. Each category carries the questions shown in the
 * request wizard only when that category is selected. The same catalog seeds the
 * `service_categories` table, so adding a question here needs no app release on mobile.
 */

export type Localized = { it: string; en: string };

export type Question =
  | { key: string; type: "text"; label: Localized; required?: boolean; multiline?: boolean }
  | { key: string; type: "number"; label: Localized; required?: boolean; min?: number; max?: number; unit?: string }
  | { key: string; type: "boolean"; label: Localized; required?: boolean }
  | { key: string; type: "select"; label: Localized; required?: boolean; options: readonly Option[] }
  | { key: string; type: "multiselect"; label: Localized; required?: boolean; options: readonly Option[] };

export type Option = { value: string; label: Localized };

export interface ServiceCategory {
  key: string;
  name: Localized;
  icon: string;
  questions: readonly Question[];
}

const opt = (value: string, it: string, en: string): Option => ({ value, label: { it, en } });
const notes = (): Question => ({
  key: "notes",
  type: "text",
  multiline: true,
  label: { it: "Altre indicazioni", en: "Other notes" },
});

export const SERVICE_CATALOG = [
  {
    key: "organization",
    name: { it: "Organizzazione e regia", en: "Planning and direction" },
    icon: "clipboard",
    questions: [
      { key: "scope", type: "select", required: true, label: { it: "Cosa serve", en: "What you need" }, options: [opt("full", "Gestione completa", "Full management"), opt("partial", "Solo coordinamento", "Coordination only"), opt("day", "Solo il giorno dell'evento", "Event day only")] },
      { key: "on_site_staff", type: "number", min: 0, label: { it: "Persone di regia in loco", en: "On-site directors" } },
      notes(),
    ],
  },
  {
    key: "venue",
    name: { it: "Location", en: "Venue" },
    icon: "building",
    questions: [
      { key: "space_type", type: "select", required: true, label: { it: "Tipo di spazio", en: "Space type" }, options: [opt("private", "Privato", "Private"), opt("public", "Pubblico", "Public"), opt("either", "Indifferente", "Either")] },
      { key: "setting", type: "select", required: true, label: { it: "Ambiente", en: "Setting" }, options: [opt("indoor", "Interno", "Indoor"), opt("outdoor", "Esterno", "Outdoor"), opt("both", "Entrambi", "Both")] },
      { key: "capacity", type: "number", min: 1, unit: "persone", label: { it: "Capienza richiesta", en: "Required capacity" } },
      { key: "city", type: "text", label: { it: "Città o zona", en: "City or area" } },
      { key: "has_venue", type: "boolean", label: { it: "Abbiamo già una location", en: "We already have a venue" } },
      notes(),
    ],
  },
  {
    key: "logistics",
    name: { it: "Logistica e trasporti", en: "Logistics and transport" },
    icon: "truck",
    questions: [
      { key: "needs", type: "multiselect", required: true, label: { it: "Di cosa avete bisogno", en: "What you need" }, options: [opt("goods", "Trasporto materiali", "Goods transport"), opt("guests", "Navette ospiti", "Guest shuttles"), opt("storage", "Magazzino", "Storage"), opt("parking", "Parcheggi", "Parking")] },
      notes(),
    ],
  },
  {
    key: "av",
    name: { it: "Service audio, luci e video", en: "Audio, lighting and video" },
    icon: "speaker",
    questions: [
      { key: "needs", type: "multiselect", required: true, label: { it: "Impianti", en: "Equipment" }, options: [opt("audio", "Audio", "Audio"), opt("lights", "Luci", "Lighting"), opt("ledwall", "Ledwall", "LED wall"), opt("projection", "Proiezione", "Projection"), opt("streaming", "Diretta streaming", "Live streaming"), opt("stage", "Palco", "Stage")] },
      notes(),
    ],
  },
  {
    key: "entertainment",
    name: { it: "DJ set e intrattenimento", en: "DJ set and entertainment" },
    icon: "music",
    questions: [
      { key: "kind", type: "multiselect", required: true, label: { it: "Tipo", en: "Type" }, options: [opt("dj", "DJ set", "DJ set"), opt("live", "Musica dal vivo", "Live music"), opt("host", "Presentatore", "Host"), opt("performer", "Performer", "Performers")] },
      { key: "genre", type: "text", label: { it: "Genere o atmosfera", en: "Genre or mood" } },
      { key: "hours", type: "number", min: 1, unit: "ore", label: { it: "Durata", en: "Duration" } },
      notes(),
    ],
  },
  {
    key: "security",
    name: { it: "Sicurezza e steward", en: "Security and stewards" },
    icon: "shield",
    questions: [
      { key: "guards", type: "number", min: 0, label: { it: "Addetti alla sicurezza", en: "Security staff" } },
      { key: "stewards", type: "number", min: 0, label: { it: "Steward", en: "Stewards" } },
      { key: "first_aid", type: "boolean", label: { it: "Presidio sanitario", en: "First aid station" } },
      notes(),
    ],
  },
  {
    key: "cleaning",
    name: { it: "Pulizia", en: "Cleaning" },
    icon: "sparkles",
    questions: [
      { key: "when", type: "multiselect", required: true, label: { it: "Quando", en: "When" }, options: [opt("before", "Prima", "Before"), opt("during", "Durante", "During"), opt("after", "Dopo", "After")] },
      notes(),
    ],
  },
  {
    key: "catering",
    name: { it: "Catering e bar", en: "Catering and bar" },
    icon: "utensils",
    questions: [
      { key: "format", type: "select", required: true, label: { it: "Formula", en: "Format" }, options: [opt("cocktail", "Aperitivo / cocktail", "Cocktail"), opt("buffet", "Buffet", "Buffet"), opt("seated", "Cena servita", "Seated dinner"), opt("bar", "Solo bar", "Bar only")] },
      { key: "dietary", type: "text", label: { it: "Esigenze alimentari", en: "Dietary needs" } },
      notes(),
    ],
  },
  {
    key: "setup",
    name: { it: "Allestimento e branding", en: "Set design and branding" },
    icon: "palette",
    questions: [
      { key: "product_display", type: "boolean", label: { it: "Esposizione prodotto", en: "Product display" } },
      { key: "brand_assets", type: "boolean", label: { it: "Forniamo noi i materiali del brand", en: "We supply brand assets" } },
      notes(),
    ],
  },
  {
    key: "staffing",
    name: { it: "Hostess e promoter", en: "Hosts and promoters" },
    icon: "users",
    questions: [
      { key: "count", type: "number", min: 1, label: { it: "Numero", en: "Headcount" } },
      { key: "languages", type: "text", label: { it: "Lingue richieste", en: "Required languages" } },
      notes(),
    ],
  },
  {
    key: "media",
    name: { it: "Foto, video e social", en: "Photo, video and social" },
    icon: "camera",
    questions: [
      { key: "needs", type: "multiselect", required: true, label: { it: "Servizi", en: "Services" }, options: [opt("photo", "Foto", "Photo"), opt("video", "Video", "Video"), opt("aftermovie", "Aftermovie", "Aftermovie"), opt("social", "Copertura social live", "Live social coverage"), opt("influencer", "Influencer", "Influencers")] },
      notes(),
    ],
  },
  {
    key: "permits",
    name: { it: "Permessi e SIAE", en: "Permits and licensing" },
    icon: "file-check",
    questions: [
      { key: "needs", type: "multiselect", label: { it: "Pratiche", en: "Paperwork" }, options: [opt("siae", "SIAE", "Music licensing"), opt("public_land", "Suolo pubblico", "Public land"), opt("safety", "Commissione sicurezza", "Safety commission")] },
      notes(),
    ],
  },
] as const satisfies readonly ServiceCategory[];

export type ServiceKey = (typeof SERVICE_CATALOG)[number]["key"];
export const SERVICE_KEYS = SERVICE_CATALOG.map((c) => c.key) as ServiceKey[];

export function getServiceCategory(key: string): ServiceCategory | undefined {
  return SERVICE_CATALOG.find((c) => c.key === key);
}

/**
 * The four families of services ("Carta e inchiostro"): inside an event, charts take one tone of the
 * event's ink per family (Regia deep, Spazio full, Palco light, Accoglienza tint), in this order.
 */
export const SERVICE_FAMILIES = [
  { key: "direction", name: { it: "Regia", en: "Direction" }, services: ["organization", "permits"] },
  { key: "space", name: { it: "Spazio", en: "Space" }, services: ["venue", "setup", "logistics"] },
  { key: "stage", name: { it: "Palco", en: "Stage" }, services: ["av", "entertainment", "media"] },
  { key: "hospitality", name: { it: "Accoglienza", en: "Hospitality" }, services: ["staffing", "catering", "security", "cleaning"] },
] as const satisfies readonly { key: string; name: Localized; services: readonly ServiceKey[] }[];

export type ServiceFamily = (typeof SERVICE_FAMILIES)[number]["key"];

/** The family of a service, or null for a key outside the catalog ("Altro"). */
export function serviceFamily(key: string): ServiceFamily | null {
  return SERVICE_FAMILIES.find((f) => (f.services as readonly string[]).includes(key))?.key ?? null;
}

function questionSchema(q: Question): z.ZodType {
  switch (q.type) {
    case "text": {
      const s = z.string().trim().max(q.multiline ? 4000 : 300);
      return q.required ? s.min(1) : s;
    }
    case "number": {
      let s = z.number().finite();
      if (q.min !== undefined) s = s.min(q.min);
      if (q.max !== undefined) s = s.max(q.max);
      return s;
    }
    case "boolean":
      return z.boolean();
    case "select":
      return z.enum(q.options.map((o) => o.value) as [string, ...string[]]);
    case "multiselect":
      return z.array(z.enum(q.options.map((o) => o.value) as [string, ...string[]])).min(q.required ? 1 : 0);
  }
}

/** Zod schema for the answers of one category; unknown keys are rejected. */
export function answersSchema(category: ServiceCategory) {
  const shape: Record<string, z.ZodType> = {};
  for (const q of category.questions) {
    const s = questionSchema(q);
    shape[q.key] = q.required ? s : s.optional();
  }
  return z.object(shape).strict();
}
