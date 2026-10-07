import type { ProposalStatus, SupplierRequestBucket } from "@i-events/core";
import { StyleSheet, View } from "react-native";
import { OrgSwitcher } from "@/components/org-switcher";
import { AgencyRequestCard, ClientRequestCard, Count, SupplierRequestCard } from "@/components/request-cards";
import { Screen, Section } from "@/components/screen";
import { CardSkeletons, EmptyState, ErrorState } from "@/components/states";
import { TopActions } from "@/components/top-actions";
import { fetchSupplierRequests, type SupplierRequest } from "@/lib/data";
import { fetchAgencyProposals, fetchClientRequests, PROPOSAL_TO_REVIEW } from "@/lib/requests";
import { useActiveOrg } from "@/lib/session";
import { useQuery } from "@/lib/use-query";
import { space } from "@/theme";

export default function RequestsScreen() {
  const org = useActiveOrg();
  if (org.type === "agency") return <AgencyRequests orgId={org.id} />;
  if (org.type === "client") return <ClientRequests orgId={org.id} />;
  return <SupplierRequests orgId={org.id} />;
}

const AGENCY_GROUPS: { title: string; statuses: ProposalStatus[] }[] = [
  { title: "Da guardare", statuses: PROPOSAL_TO_REVIEW },
  { title: "Proposte inviate", statuses: ["submitted"] },
  { title: "Concluse", statuses: ["accepted", "rejected", "declined", "withdrawn"] },
];

function AgencyRequests({ orgId }: { orgId: string }) {
  const q = useQuery(`agency-proposals:${orgId}`, () => fetchAgencyProposals(orgId));
  return (
    <Screen title="Richieste" actions={<TopActions />} header={<OrgSwitcher />} refreshing={q.refreshing} onRefresh={q.refresh}>
      {q.loading ? (
        <CardSkeletons />
      ) : q.error && !q.data ? (
        <ErrorState error={q.error} onRetry={q.refresh} />
      ) : q.data && q.data.length === 0 ? (
        <EmptyState
          icon="file-tray-outline"
          title="Nessuna richiesta ancora"
          body="Quando un'azienda ti manda una richiesta arriva qui, già ordinata per servizio, e ricevi una notifica."
        />
      ) : (
        AGENCY_GROUPS.map((g) => {
          const rows = (q.data ?? []).filter((p) => g.statuses.includes(p.status) && p.request.status !== "draft");
          if (rows.length === 0) return null;
          return (
            <Section key={g.title} title={g.title} aside={<Count n={rows.length} />}>
              <View style={styles.list}>
                {rows.map((p) => (
                  <AgencyRequestCard key={p.id} p={p} />
                ))}
              </View>
            </Section>
          );
        })
      )}
    </Screen>
  );
}

function ClientRequests({ orgId }: { orgId: string }) {
  const q = useQuery(`client-requests:${orgId}`, () => fetchClientRequests(orgId));
  const open = (q.data ?? []).filter((r) => r.status === "sent");
  const closed = (q.data ?? []).filter((r) => r.status !== "sent");
  return (
    <Screen title="Richieste" actions={<TopActions />} header={<OrgSwitcher />} refreshing={q.refreshing} onRefresh={q.refresh}>
      {q.loading ? (
        <CardSkeletons />
      ) : q.error && !q.data ? (
        <ErrorState error={q.error} onRetry={q.refresh} />
      ) : q.data && q.data.length === 0 ? (
        <EmptyState
          icon="file-tray-outline"
          title="Nessuna richiesta ancora"
          body="Le richieste che mandi alle agenzie compaiono qui, con i preventivi man mano che arrivano."
        />
      ) : (
        <>
          {open.length > 0 && (
            <Section title="In corso" aside={<Count n={open.length} />}>
              <View style={styles.list}>
                {open.map((r) => (
                  <ClientRequestCard key={r.id} r={r} />
                ))}
              </View>
            </Section>
          )}
          {closed.length > 0 && (
            <Section title="Assegnate e annullate" aside={<Count n={closed.length} />}>
              <View style={styles.list}>
                {closed.map((r) => (
                  <ClientRequestCard key={r.id} r={r} />
                ))}
              </View>
            </Section>
          )}
        </>
      )}
    </Screen>
  );
}

const BUCKET_TITLE: Record<SupplierRequestBucket, string> = {
  to_answer: "Da rispondere",
  answered: "In attesa dell'agenzia",
  confirmed: "Confermate",
  closed: "Annullate e concluse",
};

function SupplierRequests({ orgId }: { orgId: string }) {
  const q = useQuery<SupplierRequest[]>(`supplier:${orgId}`, () => fetchSupplierRequests(orgId));
  const byBucket = (b: SupplierRequestBucket) =>
    (q.data ?? [])
      .filter((r) => r.bucket === b)
      .sort((x, y) => (x.start_date ?? "9999").localeCompare(y.start_date ?? "9999") * (b === "closed" ? -1 : 1));

  return (
    <Screen title="Richieste" actions={<TopActions />} header={<OrgSwitcher />} refreshing={q.refreshing} onRefresh={q.refresh}>
      {q.loading ? (
        <CardSkeletons />
      ) : q.error && !q.data ? (
        <ErrorState error={q.error} onRetry={q.refresh} />
      ) : q.data && q.data.length === 0 ? (
        <EmptyState
          icon="mail-unread-outline"
          title="Nessuna richiesta ancora"
          body="Quando un'agenzia ti chiede un servizio per un evento, la richiesta arriva qui e ricevi una notifica."
        />
      ) : (
        (["to_answer", "answered", "confirmed", "closed"] as const).map((b) => {
          const rows = byBucket(b);
          if (rows.length === 0) return null;
          return (
            <Section key={b} title={BUCKET_TITLE[b]} aside={<Count n={rows.length} />}>
              <View style={styles.list}>
                {rows.map((r) => (
                  <SupplierRequestCard key={r.id} r={r} />
                ))}
              </View>
            </Section>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: space[3] },
});
