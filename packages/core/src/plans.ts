import type { OrgType } from "./organizations";

/** Subscription plans. Agencies, clients and suppliers all pay (decision of 2026-10-06); prices live in Stripe. */
export const PLAN_IDS = ["trial", "starter", "pro", "enterprise"] as const;
export type PlanId = (typeof PLAN_IDS)[number];

export interface PlanLimits {
  /** Members of the organization; null = unlimited. */
  seats: number | null;
  /** Requests a client can send per month, or proposals an agency can send per month. */
  monthlyRequests: number | null;
  /** Agencies a single request can be sent to at once (client side). */
  agenciesPerRequest: number;
  marketplaceListing: boolean;
}

export const TRIAL_DAYS = 30;

export const PLAN_LIMITS: Record<OrgType, Record<PlanId, PlanLimits>> = {
  agency: {
    trial: { seats: 3, monthlyRequests: 10, agenciesPerRequest: 0, marketplaceListing: false },
    starter: { seats: 5, monthlyRequests: 30, agenciesPerRequest: 0, marketplaceListing: true },
    pro: { seats: 25, monthlyRequests: null, agenciesPerRequest: 0, marketplaceListing: true },
    enterprise: { seats: null, monthlyRequests: null, agenciesPerRequest: 0, marketplaceListing: true },
  },
  client: {
    trial: { seats: 3, monthlyRequests: 3, agenciesPerRequest: 3, marketplaceListing: false },
    starter: { seats: 5, monthlyRequests: 10, agenciesPerRequest: 3, marketplaceListing: false },
    pro: { seats: 25, monthlyRequests: null, agenciesPerRequest: 5, marketplaceListing: false },
    enterprise: { seats: null, monthlyRequests: null, agenciesPerRequest: 10, marketplaceListing: false },
  },
  supplier: {
    trial: { seats: 1, monthlyRequests: null, agenciesPerRequest: 0, marketplaceListing: true },
    starter: { seats: 2, monthlyRequests: null, agenciesPerRequest: 0, marketplaceListing: true },
    pro: { seats: 10, monthlyRequests: null, agenciesPerRequest: 0, marketplaceListing: true },
    enterprise: { seats: null, monthlyRequests: null, agenciesPerRequest: 0, marketplaceListing: true },
  },
};

export function planLimits(orgType: OrgType, plan: PlanId): PlanLimits {
  return PLAN_LIMITS[orgType][plan];
}
