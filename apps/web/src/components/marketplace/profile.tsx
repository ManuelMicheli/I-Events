import { ContactActions } from "@/components/contacts/contact-actions";
import { PortfolioGallery } from "@/components/profiles/portfolio-gallery";
import { RatingBadge, ReviewList } from "@/components/profiles/reviews";
import { Card } from "@/components/ui";
import type { ProfileExtras } from "@/lib/profiles";
import { rangeLabel } from "@i-events/core";
import type { ReactNode } from "react";
import { OrgLogo } from "./org-logo";
import { serviceNames } from "./search";

export type MarketplaceProfileData = {
  name: string;
  city: string | null;
  headline: string;
  description: string;
  services: string[];
  regions: string[];
  website: string | null;
  email: string | null;
  phone: string | null;
  member_since: string;
  events_done: number;
  logo_url: string | null;
};

const yearFmt = new Intl.DateTimeFormat("it-IT", { month: "long", year: "numeric" });

/** A listed agency or supplier as others see it, with the viewer's next step in `action`. */
export function MarketplaceProfile({
  profile,
  extras,
  back,
  action,
}: {
  profile: MarketplaceProfileData;
  extras: ProfileExtras;
  back: ReactNode;
  action: ReactNode;
}) {
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          {back}
          <div className="mt-1 flex items-center gap-4">
            <OrgLogo name={profile.name} src={profile.logo_url} size="l" />
            <h1 className="text-2xl font-semibold">{profile.name}</h1>
          </div>
          <p className="text-sm text-muted">{[profile.city, profile.headline].filter(Boolean).join(" · ")}</p>
          <a href="#recensioni" className="no-underline">
            <RatingBadge avg={extras.rating.avg} count={extras.rating.count} />
          </a>
        </div>
        {action}
      </div>
      <Card>
        <div className="flex flex-col gap-4 text-sm">
          {profile.description && <p className="whitespace-pre-line">{profile.description}</p>}
          <dl className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-muted">Servizi</dt>
              <dd>{serviceNames(profile.services) || "Non indicati"}</dd>
            </div>
            <div>
              <dt className="text-muted">Zone</dt>
              <dd>{profile.regions.join(", ") || profile.city || "Non indicate"}</dd>
            </div>
            <div>
              <dt className="text-muted">Su I-Events da</dt>
              <dd>{yearFmt.format(new Date(profile.member_since))}</dd>
            </div>
            <div>
              <dt className="text-muted">Eventi conclusi su I-Events</dt>
              <dd>{profile.events_done}</dd>
            </div>
          </dl>
          <div className="flex flex-wrap items-center gap-4">
            {profile.website && (
              <a href={profile.website} target="_blank" rel="noreferrer" className="underline">
                Sito web
              </a>
            )}
            <ContactActions name={profile.name} phone={profile.phone} email={profile.email} />
          </div>
        </div>
      </Card>
      {extras.busy && (
        <Card title="Disponibilità nei prossimi tre mesi">
          <p className="text-sm">
            {extras.busy.length === 0 ? "Libero in tutte le date." : `Già impegnato: ${extras.busy.map(rangeLabel).join(", ")}.`}
          </p>
        </Card>
      )}
      {extras.portfolio.length > 0 && (
        <Card title="Portfolio">
          <PortfolioGallery items={extras.portfolio} />
        </Card>
      )}
      <section id="recensioni">
        <Card title="Recensioni" action={<RatingBadge avg={extras.rating.avg} count={extras.rating.count} />}>
          <ReviewList reviews={extras.reviews} empty="Ancora nessuna recensione." />
        </Card>
      </section>
    </>
  );
}
