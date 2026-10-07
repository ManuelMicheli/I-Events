import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import { Avatar } from "@/components/avatar";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { Card, TicketDivider } from "@/components/card";
import { ProposalDecision } from "@/components/proposal-decision";
import { serviceName } from "@/components/proposal-lines";
import { Divider } from "@/components/rows";
import { Screen } from "@/components/screen";
import { Sheet } from "@/components/sheet";
import { CardSkeletons, EmptyState, ErrorState } from "@/components/states";
import { T } from "@/components/text";
import { euro } from "@/lib/format";
import { compareProposals, proposalBadge, sentAgo } from "@/lib/proposal-compare";
import { fetchClientRequest, PROPOSAL_PRICED, type ClientProposal } from "@/lib/requests";
import { useActiveOrg } from "@/lib/session";
import { useQuery } from "@/lib/use-query";
import { control, fonts, radius, space, useTheme } from "@/theme";

const GAP = space[3];

/**
 * Confronta le proposte (Client 5), as on the website's phone layout: one card per agency, swiped
 * sideways with the next one peeking in, the services in rows with the amounts in mono and a small
 * dot on the lowest of each row, the total big under the perforation, then the decision. Under the
 * cards, the comparison line by line.
 */
export default function CompareScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const org = useActiveOrg();
  const q = useQuery(`client-request:${org.id}:${id}`, () => fetchClientRequest(id, org.id));
  const { c } = useTheme();
  const { width } = useWindowDimensions();
  const [page, setPage] = useState(0);
  const [lineByLine, setLineByLine] = useState(false);
  const pager = useRef<ScrollView>(null);

  if (q.loading)
    return (
      <Screen>
        <CardSkeletons count={2} />
      </Screen>
    );
  if (q.error && !q.data)
    return (
      <Screen>
        <ErrorState error={q.error} onRetry={q.refresh} />
      </Screen>
    );
  const priced = (q.data?.proposals ?? []).filter((p) => PROPOSAL_PRICED.includes(p.status) && p.version > 0);
  if (!q.data || priced.length < 2)
    return (
      <Screen>
        <EmptyState icon="git-compare-outline" title="Ancora niente da confrontare" body="Il confronto si apre quando arrivano almeno due proposte." />
      </Screen>
    );

  const { request, proposals } = q.data;
  const title = request.row.title;
  const open = request.status === "sent";
  const decidable = open ? priced.filter((p) => p.status === "submitted").length : 0;
  const { categories, amount, lowestFor, lowestTotal, cheapestId, mostCompleteId } = compareProposals(priced);
  const cardWidth = Math.min(width - space[4] * 2 - space[6], 480);
  const step = cardWidth + GAP;
  const tag = (p: ClientProposal) => (p.id === cheapestId ? "Prezzo più basso" : p.id === mostCompleteId ? "Più completa" : null);

  return (
    <Screen refreshing={q.refreshing} onRefresh={q.refresh}>
      <T variant="callout" tone="secondary">
        {`${priced.length} agenzie · ${title}`}
      </T>

      <View accessibilityLabel="Le proposte" style={styles.carousel}>
        <ScrollView
          ref={pager}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={step}
          decelerationRate="fast"
          style={styles.pager}
          contentContainerStyle={styles.pagerContent}
          scrollEventThrottle={32}
          onScroll={(e) => setPage(Math.min(priced.length - 1, Math.max(0, Math.round(e.nativeEvent.contentOffset.x / step))))}
        >
          {priced.map((p, i) => {
            const badge = proposalBadge(p.status, p.submitted_at);
            const label = tag(p);
            return (
              <View key={p.id} style={{ width: cardWidth }} accessibilityLabel={`${p.agency.name}, ${i + 1} di ${priced.length}`}>
                <Card style={styles.card}>
                  <View style={styles.head}>
                    <Avatar name={p.agency.name} size={40} />
                    <View style={styles.headText}>
                      <T variant="bodyStrong" accessibilityRole="header">
                        {p.agency.name}
                      </T>
                      <T variant="mono" tone="secondary">
                        {`v${p.version} · ${sentAgo(p.submitted_at)}`}
                      </T>
                      <View style={styles.badges}>
                        <Badge label={badge.label} tone={badge.tone} live={badge.live} />
                        {label && <Badge label={label} tone="outline" />}
                      </View>
                    </View>
                  </View>
                  <View>
                    {categories.map((cat) => {
                      const value = amount(p, cat);
                      const lowest = value !== null && value === lowestFor(cat);
                      return (
                        <View
                          key={cat}
                          style={[styles.row, { borderTopColor: c.borderDefault }]}
                          accessible
                          accessibilityLabel={`${serviceName(cat)}, ${value === null ? "non incluso" : `${lowest ? "il più basso, " : ""}${euro(value)}`}`}
                        >
                          <T variant="callout" style={styles.flex}>
                            {serviceName(cat)}
                          </T>
                          {value === null ? (
                            <T variant="callout" tone="secondary">
                              Non incluso
                            </T>
                          ) : (
                            <View style={styles.money}>
                              {lowest && <View style={[styles.dot6, { backgroundColor: c.textPrimary }]} />}
                              <T variant="mono">{euro(value)}</T>
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>
                  <TicketDivider />
                  <View accessible accessibilityLabel={`Totale ${euro(p.total)}${p.total === lowestTotal ? ", il più basso" : ""}`}>
                    <T variant="callout" tone="secondary">
                      Totale
                    </T>
                    <T variant="monoMetric" style={styles.total} adjustsFontSizeToFit numberOfLines={1}>
                      {euro(p.total)}
                    </T>
                  </View>
                  {p.summary && (
                    <T variant="callout" tone="secondary" numberOfLines={3}>
                      {p.summary}
                    </T>
                  )}
                  <View style={styles.spacer} />
                  {open && p.status === "submitted" && <ProposalDecision proposal={p} others={proposals.length - 1} lead={decidable === 1} onChange={q.refresh} />}
                  <Button
                    variant="tertiary"
                    icon="chatbubble-outline"
                    label={`Scrivi a ${p.agency.name}`}
                    onPress={() => router.push({ pathname: "/conversazione/[id]", params: { id: p.id } })}
                  />
                </Card>
              </View>
            );
          })}
        </ScrollView>
        <View style={styles.dots}>
          {priced.map((p, i) => (
            <Pressable
              key={p.id}
              onPress={() => pager.current?.scrollTo({ x: i * step, animated: true })}
              accessibilityRole="button"
              accessibilityLabel={`Vai alla proposta di ${p.agency.name}`}
              accessibilityState={{ selected: i === page }}
              style={styles.dotTouch}
            >
              <View style={[styles.dot, { backgroundColor: i === page ? c.textPrimary : c.borderStrong }]} />
            </Pressable>
          ))}
        </View>
      </View>

      <Button
        block
        variant="secondary"
        leading={(color) => <Ionicons name="git-compare-outline" size={20} color={color} />}
        label="Confronta voce per voce"
        onPress={() => setLineByLine(true)}
      />

      <Sheet visible={lineByLine} title="Voce per voce" onClose={() => setLineByLine(false)}>
        <ScrollView style={styles.sheetList}>
          {[...categories, "__total"].map((cat, i) => {
            const total = cat === "__total";
            const min = total ? lowestTotal : lowestFor(cat);
            return (
              <View key={cat} style={styles.compareBlock}>
                {i > 0 && <Divider />}
                <T variant={total ? "bodyStrong" : "calloutStrong"}>{total ? "Totale" : serviceName(cat)}</T>
                {priced.map((p) => {
                  const value = total ? p.total : amount(p, cat);
                  const lowest = value !== null && value === min;
                  return (
                    <View key={p.id} style={styles.compareRow}>
                      <View style={styles.dotSlot}>{lowest && <View style={[styles.dot6, { backgroundColor: c.textPrimary }]} />}</View>
                      <T variant="callout" tone="secondary" style={styles.flex} numberOfLines={1}>
                        {p.agency.name}
                      </T>
                      {value === null ? (
                        <T variant="callout" tone="secondary">
                          Non incluso
                        </T>
                      ) : (
                        <T variant="mono" accessibilityLabel={`${euro(value)}${lowest ? ", il più basso" : ""}`}>
                          {euro(value)}
                        </T>
                      )}
                    </View>
                  );
                })}
              </View>
            );
          })}
          <T variant="caption" tone="secondary">
            Il punto indica il prezzo più basso di ogni voce.
          </T>
        </ScrollView>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  carousel: { gap: 0 },
  pager: { marginHorizontal: -space[4] },
  pagerContent: { paddingHorizontal: space[4], gap: GAP },
  card: { flex: 1, gap: space[4] },
  head: { flexDirection: "row", alignItems: "flex-start", gap: space[3] },
  headText: { flex: 1, minWidth: 0, gap: space[1] },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: space[2], paddingTop: space[1] },
  row: { flexDirection: "row", alignItems: "center", gap: space[4], paddingVertical: space[2], borderTopWidth: StyleSheet.hairlineWidth },
  flex: { flex: 1, minWidth: 0 },
  money: { flexDirection: "row", alignItems: "center", gap: space[2] },
  dot6: { width: 6, height: 6, borderRadius: radius.full },
  total: { fontFamily: fonts.mono["500"], fontSize: 30, lineHeight: 36 },
  spacer: { flexGrow: 1, marginTop: -space[4] },
  dots: { flexDirection: "row", justifyContent: "center" },
  dotTouch: { width: control.touch, height: control.touch, alignItems: "center", justifyContent: "center" },
  dot: { width: 8, height: 8, borderRadius: radius.full },
  sheetList: { maxHeight: 480 },
  compareBlock: { gap: space[2], paddingBottom: space[3] },
  compareRow: { flexDirection: "row", alignItems: "center", gap: space[2], minHeight: space[8] },
  dotSlot: { width: 8, alignItems: "center" },
});
