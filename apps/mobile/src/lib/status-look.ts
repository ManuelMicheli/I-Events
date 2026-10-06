import {
  BOOKING_STATUS_LABEL,
  EVENT_STATUS_LABEL,
  QUOTE_STATUS_LABEL,
  SUPPLIER_BUCKET_LABEL,
  type BookingStatus,
  type EventStatus,
  type QuoteStatus,
  type SupplierRequestBucket,
} from "@i-events/core";
import type { ComponentProps } from "react";
import type { Badge } from "@/components/badge";

type Look = ComponentProps<typeof Badge>;

const EVENT_LOOK: Record<EventStatus, Look> = {
  planning: { label: EVENT_STATUS_LABEL.planning, tone: "neutral" },
  preparing: { label: EVENT_STATUS_LABEL.preparing, tone: "neutral" },
  live: { label: EVENT_STATUS_LABEL.live, tone: "accent", live: true },
  completed: { label: EVENT_STATUS_LABEL.completed, tone: "success", icon: "checkmark" },
  cancelled: { label: EVENT_STATUS_LABEL.cancelled, tone: "danger", icon: "close-circle-outline" },
};

const BOOKING_LOOK: Record<BookingStatus, Look> = {
  to_book: { label: BOOKING_STATUS_LABEL.to_book, tone: "outline" },
  requested: { label: BOOKING_STATUS_LABEL.requested, tone: "warning", icon: "time-outline" },
  confirmed: { label: BOOKING_STATUS_LABEL.confirmed, tone: "success", icon: "checkmark" },
  cancelled: { label: BOOKING_STATUS_LABEL.cancelled, tone: "danger", icon: "close-circle-outline" },
};

const QUOTE_LOOK: Record<QuoteStatus, Look> = {
  draft: { label: QUOTE_STATUS_LABEL.draft, tone: "outline" },
  sent: { label: QUOTE_STATUS_LABEL.sent, tone: "warning", icon: "time-outline" },
  approved: { label: QUOTE_STATUS_LABEL.approved, tone: "success", icon: "checkmark" },
  changes_requested: { label: QUOTE_STATUS_LABEL.changes_requested, tone: "neutral" },
  superseded: { label: QUOTE_STATUS_LABEL.superseded, tone: "outline" },
};

const BUCKET_LOOK: Record<SupplierRequestBucket, Look> = {
  to_answer: { label: SUPPLIER_BUCKET_LABEL.to_answer, tone: "accent", live: true },
  answered: { label: "In attesa", tone: "neutral", icon: "time-outline" },
  confirmed: { label: "Confermata", tone: "success", icon: "checkmark" },
  closed: { label: "Chiusa", tone: "outline" },
};

/** Badge for each status: the label, plus colour and icon so colour is never the only signal. */
export const eventStatusLook = (s: EventStatus) => EVENT_LOOK[s];
export const bookingStatusLook = (s: BookingStatus) => BOOKING_LOOK[s];
export const quoteStatusLook = (s: QuoteStatus) => QUOTE_LOOK[s];
export const supplierBucketLook = (b: SupplierRequestBucket) => BUCKET_LOOK[b];
