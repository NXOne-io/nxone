import { describe, expect, it } from "vitest";
import { PLANS, entitlementsFor, planById, priceFor } from "@/billing/plans";
import { RazorpayProvider, UnconnectedProvider, paymentProvider } from "@/billing/provider";

describe("plans", () => {
  it("keeps everything local free, and charges only for syncing", () => {
    expect(planById("free").limits.sync).toBe(false);
    expect(planById("pro").limits.sync).toBe(true);
    expect(planById("free").features.join(" ")).toMatch(/Unlimited invoices/);
  });
  it("prices India in rupees and everywhere else in dollars", () => {
    expect(priceFor(planById("pro"), "IN")).toMatchObject({ currency: "INR", monthlyMinor: 59900, yearlyMinor: 599900 });
    expect(priceFor(planById("pro"), "GB")).toMatchObject({ currency: "USD", monthlyMinor: 999 });
    expect(priceFor(planById("pro"), "ZZ").currency).toBe("USD");
  });
  it("charges per person beyond the two included in Business", async () => {
    const { monthlyCostFor } = await import("@/billing/plans");
    expect(monthlyCostFor(planById("business"), "IN", 2)).toBe(99900);
    expect(monthlyCostFor(planById("business"), "IN", 4)).toBe(99900 + 2 * 39900);
    expect(monthlyCostFor(planById("business"), "US", 3)).toBe(1999 + 900);
    // Pro has no extra seats to sell, so more people cost nothing there and are simply not allowed
    expect(monthlyCostFor(planById("pro"), "IN", 5)).toBe(59900);
  });
  it("makes a year cheaper than twelve months", () => {
    for (const plan of PLANS.filter((p) => p.id !== "free")) {
      const price = priceFor(plan, "IN");
      expect(price.yearlyMinor).toBeLessThan(price.monthlyMinor * 12);
    }
  });
});

describe("what an organisation may do", () => {
  it("gives a new account Pro while the trial runs", () => {
    const e = entitlementsFor("free", Date.now() + 86_400_000);
    expect(e.trialing).toBe(true);
    expect(e.limits.sync).toBe(true);
  });
  it("drops back to free when the trial ends, without losing anything", () => {
    const e = entitlementsFor("free", Date.now() - 1000);
    expect(e.trialing).toBe(false);
    expect(e.limits.sync).toBe(false);
    expect(e.plan.features.join(" ")).toMatch(/Unlimited invoices/);
  });
  it("leaves a paying organisation alone whatever the trial says", () => {
    expect(entitlementsFor("pro", Date.now() - 1000).limits.sync).toBe(true);
    expect(entitlementsFor("business", null).limits.users).toBe(2);
  });
});

describe("taking money", () => {
  it("says plainly when checkout is not connected, rather than pretending", async () => {
    const provider = paymentProvider({});
    expect(provider.live).toBe(false);
    const session = await provider.createCheckout({
      orgId: "or_1", email: "a@b.com", plan: planById("pro"), price: priceFor(planById("pro"), "IN"),
      period: "monthly", returnUrl: "https://nxone.io/settings/"
    });
    expect(session.url).toBeNull();
    expect(session.note).toMatch(/not connected/);
  });
  it("uses Razorpay only when both keys are present", () => {
    expect(paymentProvider({ PAYMENT_PROVIDER: "razorpay" })).toBeInstanceOf(UnconnectedProvider);
    expect(paymentProvider({ PAYMENT_PROVIDER: "razorpay", RAZORPAY_KEY_ID: "k", RAZORPAY_KEY_SECRET: "s" })).toBeInstanceOf(RazorpayProvider);
  });
  it("refuses a webhook without a valid signature", async () => {
    const provider = new RazorpayProvider("k", "secret", {});
    expect(await provider.verifyWebhook("{}", null)).toBe(false);
    expect(await provider.verifyWebhook("{}", "nonsense")).toBe(false);
  });
  it("accepts a webhook it signed itself", async () => {
    const provider = new RazorpayProvider("k", "secret", {});
    const body = JSON.stringify({ event: "subscription.activated" });
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode("secret"), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
    const signature = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
    expect(await provider.verifyWebhook(body, signature)).toBe(true);
  });
});
