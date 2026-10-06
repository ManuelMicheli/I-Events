/**
 * Lifecycles. A request is written by a client and sent to one or more agencies; each agency answers
 * with a proposal; the client accepts one proposal, which creates the event(s) and rejects the rest.
 * The database enforces the same transitions in its RPC functions.
 */

export const REQUEST_STATUSES = ["draft", "sent", "awarded", "cancelled"] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const PROPOSAL_STATUSES = [
  "invited",
  "reviewing",
  "clarification",
  "submitted",
  "revision_requested",
  "accepted",
  "rejected",
  "declined",
  "withdrawn",
] as const;
export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number];

export const EVENT_STATUSES = ["planning", "preparing", "live", "completed", "cancelled"] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

const REQUEST_FLOW: Record<RequestStatus, readonly RequestStatus[]> = {
  draft: ["sent", "cancelled"],
  sent: ["awarded", "cancelled"],
  awarded: [],
  cancelled: [],
};

const PROPOSAL_FLOW: Record<ProposalStatus, readonly ProposalStatus[]> = {
  invited: ["reviewing", "declined", "rejected"],
  reviewing: ["clarification", "submitted", "declined", "rejected"],
  clarification: ["reviewing", "submitted", "declined", "rejected"],
  submitted: ["accepted", "rejected", "revision_requested", "withdrawn"],
  revision_requested: ["submitted", "declined", "rejected"],
  accepted: [],
  rejected: [],
  declined: [],
  withdrawn: ["submitted"],
};

const EVENT_FLOW: Record<EventStatus, readonly EventStatus[]> = {
  planning: ["preparing", "cancelled"],
  preparing: ["live", "cancelled"],
  live: ["completed"],
  completed: [],
  cancelled: [],
};

export const canMoveRequest = (from: RequestStatus, to: RequestStatus) => REQUEST_FLOW[from].includes(to);
export const canMoveProposal = (from: ProposalStatus, to: ProposalStatus) => PROPOSAL_FLOW[from].includes(to);
export const canMoveEvent = (from: EventStatus, to: EventStatus) => EVENT_FLOW[from].includes(to);

/** Proposal states that still compete for the request. */
export const OPEN_PROPOSAL_STATUSES: readonly ProposalStatus[] = [
  "invited",
  "reviewing",
  "clarification",
  "submitted",
  "revision_requested",
];
