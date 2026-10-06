import { Card } from "@/components/ui";
import type { ProfileExtras } from "@/lib/profiles";
import { PortfolioEditor } from "./portfolio-editor";
import { PortfolioGallery } from "./portfolio-gallery";
import { RatingBadge, ReviewList } from "./reviews";

/** Portfolio and received reviews on the organization's own profile page. */
export function OwnProfileExtras({ extras, canEdit }: { extras: ProfileExtras; canEdit: boolean }) {
  return (
    <>
      <Card title="Portfolio">
        <p className="mb-4 text-sm text-muted">I lavori di cui vai fiero, con le foto: compaiono sul tuo profilo pubblico.</p>
        {canEdit ? (
          <PortfolioEditor items={extras.portfolio} />
        ) : extras.portfolio.length ? (
          <PortfolioGallery items={extras.portfolio} />
        ) : (
          <p className="text-sm text-muted">Il portfolio è vuoto. Lo curano i titolari e gli amministratori.</p>
        )}
      </Card>
      <section id="recensioni">
        <Card title="Recensioni ricevute" action={<RatingBadge avg={extras.rating.avg} count={extras.rating.count} />}>
          <ReviewList
            reviews={extras.reviews}
            canReply={canEdit}
            empty="Ancora nessuna recensione. A fine evento chiediamo ai tuoi clienti di lasciarne una."
          />
        </Card>
      </section>
    </>
  );
}
