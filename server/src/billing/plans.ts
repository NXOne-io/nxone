/**
 * What each plan allows.
 *
 * The free plan keeps everything that runs on the person's own device, because that is already
 * built and taking it away to manufacture a reason to pay would be a poor trade. What costs money
 * to run, chiefly storing and syncing data, is what is paid for.
 *
 * Prices are per country. Charging dollars converted into rupees would overcharge India badly.
 */

export type PlanId = "free" | "pro" | "business";

export interface PlanPrice {
  currency: string;
  monthlyMinor: number;
  yearlyMinor: number;
  /** What each person beyond the included seats costs, per month. */
  extraUserMonthlyMinor?: number;
}

export interface Plan {
  id: PlanId;
  name: string;
  summary: string;
  prices: Record<string, PlanPrice>;
  limits: {
    /** People included in the base price. More can be added where extraUserMonthlyMinor is set. */
    users: number;
    /** Devices that may sync. Null means no limit. */
    devices: number | null;
    /** Records the server will hold. Null means no limit. */
    records: number | null;
    /** Whether a copy is held and kept in step across devices. */
    sync: boolean;
    /** Email reminders, which cost us something to send and need a schedule running. */
    reminders: boolean;
    /** Reading a photographed bill, which is billed per request by the service that does it. */
    receiptReading: boolean;
  };
  features: string[];
}

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    summary: "The whole product, with your work kept safe.",
    prices: { default: { currency: "USD", monthlyMinor: 0, yearlyMinor: 0 }, IN: { currency: "INR", monthlyMinor: 0, yearlyMinor: 0 } },
    /**
     * Free includes a held copy and syncing. Losing somebody's books because they cleared their
     * browser would lose the person permanently, and storing a few thousand small records costs
     * us almost nothing. What is paid for is what costs money to run: sending email and reading
     * photographs.
     */
    limits: { users: 1, devices: null, records: 2000, sync: true, reminders: false, receiptReading: false },
    features: [
      "Unlimited invoices, quotations, purchase orders and receipts",
      "Tax worked out for your country, including GST with HSN codes",
      "Customers, items, expenses and the full accounts",
      "Reports and the CSV for your accountant",
      "A copy held for you, so a lost laptop is not a lost year",
      "The same work on your laptop and your phone"
    ]
  },
  {
    id: "pro",
    name: "Pro",
    summary: "The chasing and the paperwork, done for you.",
    prices: {
      IN: { currency: "INR", monthlyMinor: 59900, yearlyMinor: 599900 },
      default: { currency: "USD", monthlyMinor: 999, yearlyMinor: 9900 }
    },
    limits: { users: 1, devices: null, records: null, sync: true, reminders: true, receiptReading: true },
    features: [
      "Everything in Free",
      "Email reminders when invoices go overdue, which arrive whether or not you open the app",
      "Photograph a bill and have it read into an expense",
      "No limit on how much we hold for you",
      "Export everything whenever you want"
    ]
  },
  {
    id: "business",
    name: "Business",
    summary: "For two people, and anyone else you add.",
    prices: {
      IN: { currency: "INR", monthlyMinor: 99900, yearlyMinor: 999900, extraUserMonthlyMinor: 39900 },
      default: { currency: "USD", monthlyMinor: 1999, yearlyMinor: 19900, extraUserMonthlyMinor: 900 }
    },
    limits: { users: 2, devices: null, records: null, sync: true, reminders: true, receiptReading: true },
    features: [
      "Everything in Pro",
      "Two people included, each with their own sign in",
      "Add anyone else at the price shown, month by month",
      "An accountant seat that sees the books but cannot change your invoices",
      "Who changed what, and when"
    ]
  }
];

export const TRIAL_DAYS = 14;

/** The monthly cost for a given number of people, which is what a team actually pays. */
export function monthlyCostFor(plan: Plan, country: string, users: number): number {
  const price = priceFor(plan, country);
  const extra = Math.max(0, users - plan.limits.users);
  return price.monthlyMinor + extra * (price.extraUserMonthlyMinor ?? 0);
}

export const planById = (id: string): Plan => PLANS.find((p) => p.id === id) ?? PLANS[0];

export function priceFor(plan: Plan, country: string): PlanPrice {
  return plan.prices[country.toUpperCase()] ?? plan.prices.default;
}

/** What an organisation may do right now, given its plan and whether a trial is still running. */
export function entitlementsFor(planId: string, trialEndsAt?: number | null) {
  const trialing = Boolean(trialEndsAt && trialEndsAt > Date.now());
  const effective = planId === "free" && trialing ? planById("pro") : planById(planId);
  return { plan: effective, trialing, limits: effective.limits, trialEndsAt: trialEndsAt ?? null };
}
