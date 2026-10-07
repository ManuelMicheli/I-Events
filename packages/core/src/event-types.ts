/**
 * Event types and their inks ("Carta e inchiostro", spec in design-research/personalita-spec.md).
 * Six types, the same for Pubblico, Client and Pro. The interface stays monochrome: an ink appears
 * only on the event itself (cover, type square, header band, service signs inside that event),
 * never on buttons, links, states, selection or focus. Web and app both read the inks from here.
 */

export const EVENT_TYPES = ["music", "brand", "business", "gala", "culture", "sport"] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export function isEventType(value: unknown): value is EventType {
  return typeof value === "string" && (EVENT_TYPES as readonly string[]).includes(value);
}

/**
 * The tones of one ink. Light: bg (fills behind ink text), tint (fills, write on it with deep),
 * light, fill (type square, bars, lines: graphics only, never text), text (ink text on white,
 * Carta and bg), deep (cover background, white text on it). Dark: darkFill and darkText.
 */
export type Ink = {
  name: string;
  bg: string;
  tint: string;
  light: string;
  fill: string;
  text: string;
  deep: string;
  darkFill: string;
  darkText: string;
};

/** Geometric texture of the generated cover, drawn tone on tone on the right half. */
export type CoverPattern = "rings" | "rays" | "dots" | "arches" | "frames" | "lanes";

export type EventTypeInfo = {
  label: string;
  /** One line of examples, shown under the name in "Che evento è?". */
  examples: string;
  ink: Ink;
  pattern: CoverPattern;
};

export const EVENT_TYPE_INFO: Record<EventType, EventTypeInfo> = {
  music: {
    label: "Musica e notte",
    examples: "Concerti, dj set, serate in club",
    pattern: "rings",
    ink: {
      name: "Iris",
      bg: "#F3ECFF",
      tint: "#D7C8F7",
      light: "#B699EB",
      fill: "#8F68CB",
      text: "#674797",
      deep: "#472B6E",
      darkFill: "#AC8AE5",
      darkText: "#C8AEF8",
    },
  },
  brand: {
    label: "Brand e lanci",
    examples: "Lanci di prodotto, pop\u2011up, roadshow",
    pattern: "rays",
    ink: {
      name: "Prugna",
      bg: "#FFEAF1",
      tint: "#F4C1D3",
      light: "#E38CAE",
      fill: "#BF5884",
      text: "#8C3A5E",
      deep: "#652040",
      darkFill: "#DB7BA2",
      darkText: "#F1A3C1",
    },
  },
  business: {
    label: "Business e congressi",
    examples: "Convention, congressi, fiere",
    pattern: "dots",
    ink: {
      name: "Petrolio",
      bg: "#E5F2FC",
      tint: "#B5D6EF",
      light: "#76B3DD",
      fill: "#3788BB",
      text: "#1D618A",
      deep: "#004264",
      darkFill: "#61A7D6",
      darkText: "#90C5EB",
    },
  },
  gala: {
    label: "Gala e cerimonie",
    examples: "Cene di gala, premiazioni, anniversari",
    pattern: "arches",
    ink: {
      name: "Ottone",
      bg: "#F5F0E0",
      tint: "#DED1A9",
      light: "#C0A961",
      fill: "#9A7D0B",
      text: "#6F5800",
      deep: "#4E3A00",
      darkFill: "#B69C48",
      darkText: "#D1BD7E",
    },
  },
  culture: {
    label: "Cultura e spettacolo",
    examples: "Teatro, mostre, festival",
    pattern: "frames",
    ink: {
      name: "Laguna",
      bg: "#E3F4F2",
      tint: "#B0DBD6",
      light: "#6BBBB4",
      fill: "#17938B",
      text: "#006A64",
      deep: "#004944",
      darkFill: "#52B1A9",
      darkText: "#88CDC6",
    },
  },
  sport: {
    label: "Sport e outdoor",
    examples: "Corse, tornei, attività all'aperto",
    pattern: "lanes",
    ink: {
      name: "Oliva",
      bg: "#EBF3E6",
      tint: "#C5D9B8",
      light: "#95B77D",
      fill: "#668E47",
      text: "#45662C",
      deep: "#2B4614",
      darkFill: "#86AC6B",
      darkText: "#ABC996",
    },
  },
};

export function eventTypeLabel(type: EventType | null | undefined): string {
  return type ? EVENT_TYPE_INFO[type].label : "Da indicare";
}
