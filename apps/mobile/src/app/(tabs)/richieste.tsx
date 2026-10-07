import { EVENT_TYPE_INFO, type ProposalStatus, type SupplierRequestBucket } from "@i-events/core";
import { router } from "expo-router";
import { StyleSheet, View } from "react-native";
import { Button } from "@/components/button";
import { PlusIcon } from "@/components/icons";
import { Card } from "@/components/card";
import { OrgSwitcher } from "@/components/org-switcher";
import { AgencyRequestCard, ClientRequestCard, Count, SupplierRequestCard } from "@/components/request-cards";
import { Divider, ListRow } from "@/components/rows";
import { Screen, Section } from "@/components/screen";
import { CardSkeletons, EmptyState, ErrorState } from "@/components/states";
import { T } from "@/components/text";
import { TopActions } from "@/components/top-actions";
import { fetchSupplierRequests, type SupplierRequest } from "@/lib/data";
import { fetchDrafts } from "@/lib/drafts";
import { ago } from "@/lib/format";
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
  const drafts = useQuery(`drafts:${orgId}`, () => fetchDrafts(orgId));
  const open = (q.data ?? []).filter((r) => r.status === "sent");
  const closed = (q.data ?? []).filter((r) => r.status !== "sent");
  const refresh = async () => {
    await Promise.all([q.refresh(), drafts.refresh()]);
  };
  return (
    <Screen
      title="Richieste"
      actions={<TopActions />}
      header={<OrgSwitcher />}
      footer={<Button leading={(color, pressed) => <PlusIcon color={color} turn={pressed} />} label="Nuova richiesta" onPress={() => router.push("/nuova-richiesta")} />}
      refreshing={q.refreshing || drafts.refreshing}
      onRefresh={refresh}
    >
      {q.loading ? (
        <CardSkeletons />
      ) : q.error && !q.data ? (
        <ErrorState error={q.error} onRetry={refresh} />
      ) : q.data && q.data.length === 0 && !drafts.data?.length ? (
        <EmptyState
          icon="file-tray-outline"
          title="Nessuna richiesta ancora"
          body="Le richieste che mandi alle agenzie compaiono qui, con i preventivi man mano che arrivano."
          action={{ label: "Crea la prima richiesta", onPress: () => router.push("/nuova-richiesta") }}
        />
      ) : (
        <>
          {!!drafts.data?.length && (
            <Section title="Bozze" aside={<Count n={drafts.data.length} />}>
              <Card style={styles.drafts}>
                {drafts.data.map((d, i) => (
                  <View key={d.id}>
                    {i > 0 && <Divider />}
                    <ListRow
                      title={d.title || "Richiesta senza nome"}
                      subtitle={`${d.event_type ? `${EVENT_TYPE_INFO[d.event_type].label} · ` : ""}Modificata ${ago(d.updated_at)} · brief al ${d.completeness}%`}
                      onPress={() => router.push({ pathname: "/nuova-richiesta", params: { id: d.id } })}
                      trailing={<T variant="calloutStrong">Riprendi</T>}
                    />
                  </View>
                ))}
              </Card>
            </Section>
          )}
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
  drafts: { paddingVertical: space[1], gap: 0 },
});
