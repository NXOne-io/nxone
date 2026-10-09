"use client";
import { Check, Minus, Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { plans as fetchPlans, syncAvailable, type PlanOffer } from "@/lib/sync/api";

/** The plans that ship with the app, so the page works before the API is connected. */
const FALLBACK: { country: string; plans: PlanOffer[] } = {
  country: "IN",
  plans: [
    {
      id: "free", name: "Free", summary: "Everything on one device, for as long as you like.",
      limits: { users: 1, devices: 1, records: null, sync: false },
      price: { currency: "INR", monthlyMinor: 0, yearlyMinor: 0 },
      features: [
        "Unlimited invoices, quotations, purchase orders and receipts",
        "Tax worked out for your country, including GST with HSN codes",
        "Customers, items, expenses and the full accounts",
        "Reports and the CSV for your accountant",
        "Everything stays on your device"
      ]
    },
    {
      id: "pro", name: "Pro", summary: "The same work on your laptop and your phone.",
      limits: { users: 1, devices: null, records: 50000, sync: true },
      price: { currency: "INR", monthlyMinor: 59900, yearlyMinor: 599900 },
      features: ["Everything in Free", "Your work on every device you use", "A copy held for you, so a lost laptop is not a lost year", "Export everything whenever you want"]
    },
    {
      id: "business", name: "Business", summary: "For two people, and anyone else you add.",
      limits: { users: 2, devices: null, records: null, sync: true },
      price: { currency: "INR", monthlyMinor: 99900, yearlyMinor: 999900, extraUserMonthlyMinor: 39900 },
      features: ["Everything in Pro", "Two people included, each with their own sign in", "Add anyone else at the price shown, month by month", "An accountant seat that sees the books but cannot change your invoices", "Who changed what, and when"]
    }
  ]
};

const money = (minor: number, currency: string) =>
  new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", { style: "currency", currency, maximumFractionDigits: minor % 100 === 0 ? 0 : 2 }).format(minor / 100);

export default function Pricing() {
  const [data, setData] = useState(FALLBACK);
  const [period, setPeriod] = useState<"monthly" | "yearly">("monthly");
  const [people, setPeople] = useState(2);

  useEffect(() => {
    if (!syncAvailable()) return;
    fetchPlans().then((r) => { if (r.ok) setData({ country: r.data.country, plans: r.data.plans }); });
  }, []);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border border-line bg-white p-0.5">
          {([["monthly", "Monthly"], ["yearly", "Yearly"]] as const).map(([v, l]) => (
            <button key={v} type="button" onClick={() => setPeriod(v)} aria-pressed={period === v}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${period === v ? "bg-forest text-white" : "text-ink-soft"}`}>{l}</button>
          ))}
        </div>
        {period === "yearly" ? <span className="text-sm text-ok">Two months free, near enough</span> : null}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {data.plans.map((plan) => {
          const extraSeats = Math.max(0, people - plan.limits.users);
          const monthly = plan.price.monthlyMinor + extraSeats * (plan.price.extraUserMonthlyMinor ?? 0);
          const headline = period === "yearly" && plan.price.yearlyMinor > 0 ? plan.price.yearlyMinor : monthly;
          const featured = plan.id === "pro";

          return (
            <section key={plan.id} className={`card flex flex-col p-6 ${featured ? "border-forest ring-1 ring-forest" : ""}`}>
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="font-display text-xl">{plan.name}</h2>
                {featured ? <span className="chip">Most people</span> : null}
              </div>
              <p className="mt-1 text-sm text-ink-soft">{plan.summary}</p>

              <p className="mt-4">
                <span className="font-display text-3xl font-semibold tabular">{plan.price.monthlyMinor === 0 ? "Free" : money(headline, plan.price.currency)}</span>
                {plan.price.monthlyMinor > 0 ? <span className="text-sm text-ink-soft"> {period === "yearly" ? "a year" : "a month"}</span> : null}
              </p>
              {period === "yearly" && plan.price.monthlyMinor > 0 ? (
                <p className="text-xs text-ink-faint">{money(Math.round(plan.price.yearlyMinor / 12), plan.price.currency)} a month, paid yearly</p>
              ) : null}

              {plan.price.extraUserMonthlyMinor ? (
                <div className="mt-4 rounded-lg border border-line bg-canvas p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">People</p>
                  <div className="mt-2 flex items-center gap-3">
                    <button type="button" className="rounded border border-line bg-white p-1" aria-label="Fewer people" onClick={() => setPeople((n) => Math.max(plan.limits.users, n - 1))}><Minus size={14} /></button>
                    <span className="tabular font-semibold">{people}</span>
                    <button type="button" className="rounded border border-line bg-white p-1" aria-label="More people" onClick={() => setPeople((n) => Math.min(50, n + 1))}><Plus size={14} /></button>
                    <span className="text-xs text-ink-soft">
                      {extraSeats === 0 ? `${plan.limits.users} included` : `${extraSeats} extra at ${money(plan.price.extraUserMonthlyMinor, plan.price.currency)} each a month`}
                    </span>
                  </div>
                  {period === "monthly" && extraSeats > 0 ? <p className="mt-2 text-sm">Total {money(monthly, plan.price.currency)} a month</p> : null}
                </div>
              ) : null}

              <ul className="mt-5 flex-1 space-y-2 text-sm">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-forest" aria-hidden="true" />{f}</li>
                ))}
              </ul>

              <div className="mt-6">
                {plan.id === "free" ? (
                  <Link href="/invoice-generator?new=1" className="btn-ghost w-full justify-center">Start using it</Link>
                ) : (
                  <Link href="/sign-in/" className="w-full justify-center btn-primary">Try free for 14 days</Link>
                )}
              </div>
            </section>
          );
        })}
      </div>

      <p className="mt-6 max-w-2xl text-sm text-ink-soft">
        The trial needs no card, and nothing is taken away when it ends: you keep working on this device exactly as before, and the copy held for you waits until you decide. Prices shown for {data.country === "IN" ? "India" : "outside India"}.
      </p>
    </div>
  );
}
