const dayFmt = new Intl.DateTimeFormat("it-IT", { weekday: "long", day: "numeric", month: "long" });

/** "lunedì 15 giugno" for a YYYY-MM-DD day. */
export const dayLabel = (d: string) => dayFmt.format(new Date(`${d}T12:00:00`));
