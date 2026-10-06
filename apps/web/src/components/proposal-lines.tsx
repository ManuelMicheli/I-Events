import { formatEuro, getServiceCategory, type ProposalLine } from "@i-events/core";

export function ProposalLines({ lines, total }: { lines: ProposalLine[]; total: number | null }) {
  return (
    <table className="w-full text-sm">
      <tbody>
        {lines.map((l, i) => (
          <tr key={i} className="border-t border-border">
            <td className="py-2 text-muted">{getServiceCategory(l.category)?.name.it ?? "Altro"}</td>
            <td className="py-2">{l.description}</td>
            <td className="py-2 text-right">{formatEuro(l.amount)}</td>
          </tr>
        ))}
        <tr className="border-t border-border font-semibold">
          <td className="py-2" colSpan={2}>
            Totale
          </td>
          <td className="py-2 text-right">{formatEuro(total)}</td>
        </tr>
      </tbody>
    </table>
  );
}
