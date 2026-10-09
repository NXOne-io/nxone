import type { Plan, PlanPrice } from "./plans";

/**
 * Taking money, behind an interface.
 *
 * Which provider we use has consequences: Razorpay settles in India and supports UPI mandates,
 * Stripe is better nearly everywhere else. That choice should not reach into the rest of the
 * system. Nothing here pretends to charge anyone. Without keys, checkout says plainly that it is
 * not connected rather than showing a button that quietly does nothing.
 */

export interface CheckoutRequest {
  orgId: string;
  email: string;
  plan: Plan;
  price: PlanPrice;
  period: "monthly" | "yearly";
  returnUrl: string;
}

export interface CheckoutSession {
  /** Where to send the customer, or null when checkout is not connected. */
  url: string | null;
  reference: string;
  note?: string;
}

export interface PaymentProvider {
  readonly name: string;
  readonly live: boolean;
  createCheckout(request: CheckoutRequest): Promise<CheckoutSession>;
  verifyWebhook(body: string, signature: string | null): Promise<boolean>;
}

/** Used until a provider is connected. */
export class UnconnectedProvider implements PaymentProvider {
  readonly name = "none";
  readonly live = false;

  async createCheckout(request: CheckoutRequest): Promise<CheckoutSession> {
    return {
      url: null,
      reference: `pending_${request.orgId}`,
      note: "Payments are not connected yet, so nothing can be charged. Your trial continues and your data is safe."
    };
  }

  async verifyWebhook(): Promise<boolean> { return false; }
}

/** Razorpay, for India. Plan ids live in configuration because Razorpay owns them. */
export class RazorpayProvider implements PaymentProvider {
  readonly name = "razorpay";
  readonly live = true;

  constructor(private keyId: string, private keySecret: string, private planIds: Record<string, string>) {}

  async createCheckout(request: CheckoutRequest): Promise<CheckoutSession> {
    const planRef = this.planIds[`${request.plan.id}_${request.period}`];
    if (!planRef) return { url: null, reference: "", note: `No Razorpay plan is configured for ${request.plan.name} ${request.period}.` };

    const res = await fetch("https://api.razorpay.com/v1/subscriptions", {
      method: "POST",
      headers: { Authorization: `Basic ${btoa(`${this.keyId}:${this.keySecret}`)}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        plan_id: planRef,
        total_count: request.period === "yearly" ? 5 : 60,
        customer_notify: 1,
        notes: { orgId: request.orgId, email: request.email }
      })
    });

    if (!res.ok) {
      console.error("Razorpay refused the subscription:", res.status, await res.text().catch(() => ""));
      return { url: null, reference: "", note: "The payment page could not be opened. Nothing has been charged." };
    }

    const body = (await res.json()) as { id: string; short_url?: string };
    return { url: body.short_url ?? null, reference: body.id };
  }

  /** Razorpay signs webhooks with HMAC SHA-256 over the raw body. */
  async verifyWebhook(body: string, signature: string | null): Promise<boolean> {
    if (!signature) return false;
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(this.keySecret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
    const expected = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
    if (expected.length !== signature.length) return false;
    let diff = 0;
    for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
    return diff === 0;
  }
}

export function paymentProvider(env: { PAYMENT_PROVIDER?: string; RAZORPAY_KEY_ID?: string; RAZORPAY_KEY_SECRET?: string; RAZORPAY_PLANS?: string }): PaymentProvider {
  if (env.PAYMENT_PROVIDER === "razorpay" && env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET) {
    let plans: Record<string, string> = {};
    try { plans = JSON.parse(env.RAZORPAY_PLANS ?? "{}"); } catch { plans = {}; }
    return new RazorpayProvider(env.RAZORPAY_KEY_ID, env.RAZORPAY_KEY_SECRET, plans);
  }
  return new UnconnectedProvider();
}
