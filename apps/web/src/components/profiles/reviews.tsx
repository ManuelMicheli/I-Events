import { Empty } from "@/components/ui";
import type { ProfileReview } from "@/lib/profiles";
import { ratingSummary, stars } from "@i-events/core";
import { ReplyForm } from "./review-forms";

const monthFmt = new Intl.DateTimeFormat("it-IT", { month: "long", year: "numeric" });

/** "★ 4,8 · 12 recensioni", or nothing without reviews. */
export function RatingBadge({ avg, count }: { avg: number | string | null; count: number }) {
  const summary = ratingSummary(avg, count);
  if (!summary) return null;
  return (
    <span className="whitespace-nowrap text-sm">
      <span aria-hidden>★ </span>
      <span className="sr-only">Valutazione media </span>
      {summary}
    </span>
  );
}

/** Reviews on a profile; the reviewed organization can answer each one. */
export function ReviewList({ reviews, canReply = false, empty }: { reviews: ProfileReview[]; canReply?: boolean; empty: string }) {
  if (reviews.length === 0) return <Empty>{empty}</Empty>;
  return (
    <ul className="divide-y divide-border">
      {reviews.map((r) => (
        <li key={r.id} className="flex flex-col gap-1.5 py-4 text-sm">
          <p>
            <span aria-label={`${r.rating} su 5`} className="text-text">
              {stars(r.rating)}
            </span>
            <span className="ml-2 font-medium">{r.author_name}</span>
            <span className="ml-2 text-muted">{monthFmt.format(new Date(r.created_at))}</span>
          </p>
          {r.comment && <p className="whitespace-pre-line">{r.comment}</p>}
          {r.reply && (
            <blockquote className="ml-4 border-l-2 border-border pl-3">
              <span className="text-muted">Risposta: </span>
              {r.reply}
            </blockquote>
          )}
          {canReply && <ReplyForm reviewId={r.id} reply={r.reply} />}
        </li>
      ))}
    </ul>
  );
}
