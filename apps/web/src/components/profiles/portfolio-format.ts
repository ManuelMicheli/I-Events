const monthFmt = new Intl.DateTimeFormat("it-IT", { month: "long", year: "numeric", timeZone: "UTC" });

/** "Per Brand · Milano · maggio 2026". */
export function itemMeta(item: { client_name: string | null; city: string | null; happened_on: string | null }): string {
  return [
    item.client_name ? `Per ${item.client_name}` : null,
    item.city,
    item.happened_on ? monthFmt.format(new Date(`${item.happened_on}T00:00:00Z`)) : null,
  ]
    .filter(Boolean)
    .join(" · ");
}
