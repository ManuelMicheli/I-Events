import { rangeLabel, ratingSummary, stars, whatsappUrl } from "@i-events/core";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Image, Linking, ScrollView, StyleSheet, View } from "react-native";
import { Button } from "@/components/button";
import { Card } from "@/components/card";
import { Notice } from "@/components/notice";
import { OrgLogo } from "@/components/org-logo";
import { Divider, InfoRow } from "@/components/rows";
import { Screen, Section } from "@/components/screen";
import { CardSkeletons, EmptyState, ErrorState } from "@/components/states";
import { T } from "@/components/text";
import { errorMessage } from "@/lib/errors";
import { addSupplierToAddressBook, fetchMarketplaceProfile, jobMeta, monthYear, serviceNames, type MarketplaceProfile } from "@/lib/marketplace";
import { useActiveOrg } from "@/lib/session";
import { useQuery } from "@/lib/use-query";
import { radius, space, useTheme } from "@/theme";

/**
 * A listed agency or supplier as others see it, as on the website: who they are, what they do and
 * where, portfolio and reviews; a supplier also shows when it is busy. The one action is the
 * viewer's next step: a company asks the agency for a quote, an agency adds the supplier to its
 * address book (or opens the contact it already has).
 */
export default function MarketplaceProfileScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const org = useActiveOrg();
  const q = useQuery(`marketplace-profile:${org.id}:${slug}`, () => fetchMarketplaceProfile(slug, org.id));
  const [adding, setAdding] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  if (q.loading) {
    return (
      <Screen>
        <CardSkeletons count={2} />
      </Screen>
    );
  }
  if (q.error && !q.data) {
    return (
      <Screen>
        <ErrorState error={q.error} onRetry={q.refresh} />
      </Screen>
    );
  }
  const data = q.data;
  // A company looks for agencies, an agency for suppliers: any other pairing has nothing to do here.
  const fits = data && ((org.type === "client" && data.profile.type === "agency") || (org.type === "agency" && data.profile.type === "supplier"));
  if (!data || !fits) {
    return (
      <Screen>
        <EmptyState icon="storefront-outline" title="Profilo non trovato" body="Forse non è più visibile sul marketplace." />
      </Screen>
    );
  }
  const { profile: p } = data;

  const add = async () => {
    setAdding(true);
    setFailure(null);
    try {
      const id = await addSupplierToAddressBook(org.id, p.org_id);
      router.push({ pathname: "/rubrica/[id]", params: { id, nuovo: "1" } });
      q.refresh();
    } catch (e) {
      setFailure(errorMessage(e));
    } finally {
      setAdding(false);
    }
  };

  const action =
    p.type === "agency" ? (
      <Button block label="Chiedi un preventivo" onPress={() => router.push({ pathname: "/nuova-richiesta", params: { agenzia: p.org_id } })} />
    ) : data.contactId ? (
      <Button
        block
        variant="secondary"
        label="Già in rubrica: apri il contatto"
        onPress={() => router.push({ pathname: "/rubrica/[id]", params: { id: data.contactId! } })}
      />
    ) : (
      <Button block icon="person-add-outline" label="Aggiungi alla rubrica" loading={adding} onPress={add} />
    );

  return (
    <Screen footer={action} footerBar refreshing={q.refreshing} onRefresh={q.refresh}>
      <Stack.Screen options={{ title: p.type === "agency" ? "Agenzia" : "Fornitore" }} />
      <View style={styles.head}>
        <OrgLogo name={p.name} src={p.logo_url} size={64} />
        <View style={styles.titles}>
          <T variant="title2" accessibilityRole="header">
            {p.name}
          </T>
          {(p.city || p.headline) && (
            <T variant="callout" tone="secondary">
              {[p.city, p.headline].filter(Boolean).join(" · ")}
            </T>
          )}
          <RatingLine avg={p.rating_avg} count={p.rating_count} />
        </View>
      </View>

      {failure && <Notice tone="danger">{failure}</Notice>}

      <Card style={styles.facts}>
        {p.description ? <T variant="body">{p.description}</T> : null}
        <InfoRow label="Servizi" value={serviceNames(p.services) || "Non indicati"} />
        <InfoRow label="Zone" value={p.regions.join(", ") || p.city || "Non indicate"} />
        <InfoRow label="Su I-Events da" value={monthYear(p.member_since)} />
        <InfoRow label="Eventi conclusi su I-Events" value={String(p.events_done)} mono />
      </Card>

      <Reach profile={data} />

      {data.busy && (
        <Section title="Disponibilità nei prossimi tre mesi">
          <Card>
            <T variant="body">{data.busy.length === 0 ? "Libero in tutte le date." : `Già impegnato: ${data.busy.map(rangeLabel).join(", ")}.`}</T>
          </Card>
        </Section>
      )}

      {data.portfolio.length > 0 && (
        <Section title="Portfolio">
          <View style={styles.jobs}>
            {data.portfolio.map((job) => (
              <Job key={job.id} job={job} />
            ))}
          </View>
        </Section>
      )}

      <Section title="Recensioni">
        {data.reviews.length === 0 ? (
          <Card>
            <T variant="body" tone="secondary">
              Ancora nessuna recensione.
            </T>
          </Card>
        ) : (
          <Card style={styles.list}>
            {data.reviews.map((r, i) => (
              <View key={r.id}>
                {i > 0 && <Divider />}
                <Review review={r} />
              </View>
            ))}
          </Card>
        )}
      </Section>
    </Screen>
  );
}

/** "★ 4,8 · 12 recensioni", or nothing without reviews. */
function RatingLine({ avg, count }: { avg: number | null; count: number }) {
  const summary = ratingSummary(avg, count);
  if (!summary) return null;
  return (
    <T variant="callout" accessibilityLabel={`Valutazione media ${summary}`}>
      ★ {summary}
    </T>
  );
}

/** Website, call, WhatsApp and email, only for what the profile shows. */
function Reach({ profile: { profile: p } }: { profile: MarketplaceProfile }) {
  const open = (url: string) => Linking.openURL(url).catch(() => {});
  if (!p.website && !p.phone && !p.email) return null;
  return (
    <View style={styles.reach}>
      {p.phone && (
        <>
          <Button variant="secondary" icon="call-outline" label="Chiama" accessibilityLabel={`Chiama ${p.name}`} onPress={() => open(`tel:${p.phone}`)} />
          <Button variant="secondary" icon="logo-whatsapp" label="WhatsApp" accessibilityLabel={`WhatsApp a ${p.name}`} onPress={() => open(whatsappUrl(p.phone))} />
        </>
      )}
      {p.email && <Button variant="secondary" icon="mail-outline" label="Email" accessibilityLabel={`Email a ${p.name}`} onPress={() => open(`mailto:${p.email}`)} />}
      {p.website && (
        <Button variant="secondary" icon="globe-outline" label="Sito web" accessibilityLabel={`Sito web di ${p.name}`} onPress={() => open(p.website)} />
      )}
    </View>
  );
}

type JobItem = MarketplaceProfile["portfolio"][number];

/** A past job: title, for whom, where and when, its photos side by side, the description. */
function Job({ job }: { job: JobItem }) {
  const { c } = useTheme();
  const meta = jobMeta(job);
  return (
    <Card style={styles.job}>
      <View style={styles.jobHead}>
        <T variant="bodyStrong">{job.title}</T>
        {meta ? (
          <T variant="callout" tone="secondary">
            {meta}
          </T>
        ) : null}
      </View>
      {job.photos.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photos} style={styles.photoStrip}>
          {job.photos.map((ph, i) => (
            <Image
              key={ph.id}
              source={{ uri: ph.url }}
              accessible
              accessibilityLabel={`${job.title}, foto ${i + 1}`}
              style={[styles.photo, { backgroundColor: c.bgSubtle, borderColor: c.borderDefault }]}
              resizeMode="cover"
            />
          ))}
        </ScrollView>
      )}
      {job.description ? <T variant="callout">{job.description}</T> : null}
    </Card>
  );
}

type ReviewItem = MarketplaceProfile["reviews"][number];

function Review({ review: r }: { review: ReviewItem }) {
  const { c } = useTheme();
  return (
    <View style={styles.review}>
      <T variant="callout" accessibilityLabel={`${r.rating} su 5`}>
        {stars(r.rating)}
      </T>
      <T variant="calloutStrong">
        {r.author_name}
        <T variant="callout" tone="secondary">
          {`  ${monthYear(r.created_at)}`}
        </T>
      </T>
      {r.comment ? <T variant="callout">{r.comment}</T> : null}
      {r.reply ? (
        <View style={[styles.reply, { borderLeftColor: c.borderStrong }]}>
          <T variant="callout">
            <T variant="callout" tone="secondary">
              Risposta:{" "}
            </T>
            {r.reply}
          </T>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "flex-start", gap: space[4] },
  titles: { flex: 1, gap: space[1] },
  facts: { gap: space[4] },
  reach: { flexDirection: "row", flexWrap: "wrap", gap: space[2] },
  jobs: { gap: space[3] },
  job: { gap: space[3] },
  jobHead: { gap: space[1] },
  photoStrip: { marginHorizontal: -space[4] },
  photos: { gap: space[2], paddingHorizontal: space[4] },
  photo: { width: 240, aspectRatio: 4 / 3, borderRadius: radius.sm, borderWidth: StyleSheet.hairlineWidth },
  list: { paddingVertical: space[1], gap: 0 },
  review: { gap: space[1], paddingVertical: space[3] },
  reply: { borderLeftWidth: 2, paddingLeft: space[3], marginLeft: space[2], marginTop: space[1] },
});
