import { formatEventDates, getServiceCategory } from "@i-events/core";
import { router } from "expo-router";
import { StyleSheet, View } from "react-native";
import { fetchSupplierRequests } from "@/lib/data";
import { ago, plural, requestMeta } from "@/lib/format";
import { PROPOSAL_PRICED, type AgencyProposal, type ClientRequest } from "@/lib/requests";
import { proposalStatusLook, supplierBucketLook } from "@/lib/status-look";
import { space } from "@/theme";
import { AvatarStack } from "./avatar";
import { EventCard } from "./event-card";
import { RequestCard } from "./request-card";
import { T } from "./text";

type SupplierRequest = Awaited<ReturnType<typeof fetchSupplierRequests>>[number];

export const openProposal = (id: string) => router.push({ pathname: "/proposta/[id]", params: { id } });
export const openClientRequest = (id: string) => router.push({ pathname: "/richiesta-azienda/[id]", params: { id } });

/** A request the agency received, as a card: who asked, what, and where it stands. */
export function AgencyRequestCard({ p }: { p: AgencyProposal }) {
  const r = p.request;
  return (
    <RequestCard
      badge={proposalStatusLook(p.status)}
      title={`${r.client.name} · ${r.title}`}
      meta={requestMeta(r)}
      note={r.submitted_at ? `Ricevuta ${ago(r.submitted_at)}` : undefined}
      onPress={() => openProposal(p.id)}
    />
  );
}

/** One of the company's requests: new quotes first, then the agencies involved and how many answered. */
export function ClientRequestCard({ r }: { r: ClientRequest }) {
  const fresh = r.proposals.filter((p) => p.status === "submitted").length;
  const priced = r.proposals.filter((p) => PROPOSAL_PRICED.includes(p.status)).length;
  const badge =
    r.status === "awarded"
      ? ({ label: "Assegnata", tone: "success", icon: "checkmark" } as const)
      : r.status === "cancelled"
        ? ({ label: "Annullata", tone: "outline" } as const)
        : fresh > 0
          ? ({
              label: fresh === 1 ? "1 preventivo nuovo" : `${fresh} preventivi nuovi`,
              tone: "accent",
              live: true,
            } as const)
          : ({ label: "In attesa dei preventivi", tone: "neutral", icon: "time-outline" } as const);
  const answered = `${priced} ${priced === 1 ? "preventivo" : "preventivi"} su ${r.proposals.length}`;
  return (
    <RequestCard
      badge={badge}
      title={r.title}
      meta={requestMeta(r)}
      accessibilityLabel={[badge.label, r.title, requestMeta(r), answered].join(", ")}
      footer={
        <View style={styles.footer}>
          <AvatarStack names={r.proposals.map((p) => p.agency.name)} />
          <T variant="caption" tone="secondary" style={styles.flexEnd}>
            {answered}
          </T>
        </View>
      }
      onPress={() => openClientRequest(r.id)}
    />
  );
}

const place = (e: { venue: string | null; city: string | null }) => [e.venue, e.city].filter(Boolean).join(", ") || null;

/** A booking request an agency sent to the supplier. */
export function SupplierRequestCard({ r }: { r: SupplierRequest }) {
  return (
    <EventCard
      title={r.event_title}
      counterpart={[r.agency_name, getServiceCategory(r.service_key)?.name.it ?? r.service_key].join(" · ")}
      dates={formatEventDates(r.start_date, r.end_date)}
      place={place(r)}
      badge={supplierBucketLook(r.bucket)}
      onPress={() => router.push({ pathname: "/richiesta/[id]", params: { id: r.id } })}
    />
  );
}

/** How many items a section holds, in mono next to its title. */
export function Count({ n }: { n: number }) {
  return (
    <T variant="mono" tone="secondary" accessibilityLabel={plural(n, "elemento", "elementi")}>
      {n}
    </T>
  );
}

const styles = StyleSheet.create({
  footer: { flexDirection: "row", alignItems: "center", gap: space[3] },
  flexEnd: { flex: 1, textAlign: "right" },
});
