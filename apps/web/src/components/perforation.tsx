/**
 * A1 "Perforazione": the wait, in place of a spinner. Six dashes; one at a time goes dark, as if
 * running along the ticket's perforation. `late` keeps it hidden for the first 200 ms.
 */
export function Perforation({ size = "m", late = false, label }: { size?: "s" | "m"; late?: boolean; label?: string }) {
  return (
    <span role={label ? "status" : undefined} aria-label={label} className={["perf", size === "s" && "perf-s", late && "perf-late"].filter(Boolean).join(" ")}>
      {Array.from({ length: 6 }, (_, i) => (
        <i key={i} />
      ))}
    </span>
  );
}
