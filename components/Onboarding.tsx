"use client";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { PACKS, packFor } from "@/lib/countries/packs";
import { DEMO_OPENING_MINOR, buildDemo } from "@/lib/setup/demo";
import { buildProfile, registrationChoices, type Answers } from "@/lib/setup/onboarding";
import type { Registration } from "@/lib/compliance/rules";
import { store } from "@/lib/store/db";
import { useWorkspace } from "@/lib/store/useStore";
import { guessCountry } from "@/lib/format";

/** Three short steps. Anything we can work out ourselves is not asked. */
export default function Onboarding() {
  const [, db] = useWorkspace();
  const [step, setStep] = useState<1 | 2 | 3 | "done">(1);
  const [answers, setAnswers] = useState<Answers>(() => ({
    country: typeof window === "undefined" ? "IN" : guessCountry(),
    businessName: "",
    registrations: []
  }));
  const [summary, setSummary] = useState<ReturnType<typeof buildProfile> | null>(null);

  const pack = packFor(answers.country);
  const set = (patch: Partial<Answers>) => setAnswers((a) => ({ ...a, ...patch }));
  const toggle = (r: Registration) =>
    set({ registrations: answers.registrations.includes(r) ? answers.registrations.filter((x) => x !== r) : [...answers.registrations, r] });

  const finish = (withDemo: boolean) => {
    const built = buildProfile(answers);
    store.saveProfile(built.profile);
    if (withDemo) {
      const demo = buildDemo(built.profile);
      // a business with no opening balance looks permanently overdrawn, which is not the point
      store.saveProfile({ ...built.profile, openingCashMinor: DEMO_OPENING_MINOR, openingCashDate: demo.expenses[0]?.date ?? built.profile.updatedAt?.slice(0, 10) });
      store.apply({
        clients: [...db.raw().clients, ...demo.clients],
        documents: [...db.raw().documents, ...demo.documents],
        expenses: [...(db.raw().expenses ?? []), ...demo.expenses],
        recurring: [...(db.raw().recurring ?? []), ...demo.recurring]
      });
    }
    setSummary(built);
    setStep("done");
  };

  if (step === "done" && summary) {
    return (
      <div className="card max-w-2xl p-6 sm:p-8">
        <h2 className="flex items-center gap-2 font-display text-2xl"><Check size={22} className="text-ok" />{summary.profile.name} is set up</h2>
        <p className="mt-2 text-ink-soft">Here is what that configured. All of it can be changed later in your business details.</p>
        <ul className="mt-5 divide-y divide-line border-y border-line">
          {summary.configured.map((c) => (
            <li key={c.title} className="flex gap-3 py-3">
              <Check size={16} className="mt-0.5 shrink-0 text-forest" aria-hidden="true" />
              <span><span className="block font-medium">{c.title}</span><span className="block text-sm text-ink-soft">{c.detail}</span></span>
            </li>
          ))}
        </ul>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/invoice-generator/?new=1" className="btn-primary">Make your first invoice</Link>
          <Link href="/today/" className="btn-ghost">See Today</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="card max-w-2xl p-6 sm:p-8">
      <p className="text-sm text-ink-faint">Step {step} of 3</p>

      {step === 1 ? (
        <>
          <h2 className="mt-1 font-display text-2xl">Where do you trade, and what is the business called?</h2>
          <p className="mt-2 text-sm text-ink-soft">This sets your currency, your tax rules and how your documents are laid out.</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="ob-country">Country</label>
              <select id="ob-country" className="field" value={answers.country} onChange={(e) => set({ country: e.target.value, region: undefined, registrations: [] })}>
                {PACKS.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}
              </select>
              {pack.support !== "supported" ? <p className="mt-1 text-xs text-warn">Tax rules for {pack.name} are only partly configured. You can still use everything, but check the rates you choose.</p> : null}
            </div>
            <div>
              <label className="label" htmlFor="ob-name">Business name</label>
              <input id="ob-name" className="field" value={answers.businessName} onChange={(e) => set({ businessName: e.target.value })} placeholder="Acme Consulting LLP" autoFocus />
            </div>
            {pack.regions?.length ? (
              <div>
                <label className="label" htmlFor="ob-region">Your state</label>
                <select id="ob-region" className="field" value={answers.region ?? ""} onChange={(e) => set({ region: e.target.value })}>
                  <option value="">Select</option>
                  {pack.regions.map((r) => <option key={r.code} value={r.code}>{r.name}</option>)}
                </select>
                <p className="mt-1 text-xs text-ink-faint">Decides whether an invoice carries CGST and SGST or IGST.</p>
              </div>
            ) : null}
          </div>
          <div className="mt-6 flex justify-end">
            <button type="button" className="btn-primary" disabled={!answers.businessName.trim()} onClick={() => setStep(2)}>Next<ArrowRight size={16} /></button>
          </div>
        </>
      ) : null}

      {step === 2 ? (
        <>
          <h2 className="mt-1 font-display text-2xl">What are you registered for?</h2>
          <p className="mt-2 text-sm text-ink-soft">This decides what appears on your invoices and which filing dates you see. Tick nothing if none apply, which is fine and common.</p>
          <div className="mt-5 space-y-2">
            {registrationChoices(answers.country).map((c) => (
              <label key={c.value} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${answers.registrations.includes(c.value) ? "border-forest bg-forest-pale" : "border-line bg-white"}`}>
                <input type="checkbox" className="mt-1" checked={answers.registrations.includes(c.value)} onChange={() => toggle(c.value)} />
                <span><span className="block font-semibold">{c.label}</span><span className="block text-sm text-ink-soft">{c.help}</span></span>
              </label>
            ))}
          </div>

          {(answers.registrations.includes("gst") || answers.registrations.includes("vat")) ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="ob-taxid">{pack.taxIdLabel}</label>
                <input id="ob-taxid" className="field" value={answers.taxId ?? ""} onChange={(e) => set({ taxId: e.target.value })} placeholder={answers.country === "IN" ? "27AAPFU0939F1ZV" : ""} />
              </div>
              {answers.country === "IN" ? (
                <label className="flex items-end gap-2 pb-2 text-sm text-ink-soft">
                  <input type="checkbox" checked={Boolean(answers.quarterlyGst)} onChange={(e) => set({ quarterlyGst: e.target.checked })} />
                  I file GST quarterly under QRMP
                </label>
              ) : null}
            </div>
          ) : null}

          <div className="mt-6 flex justify-between">
            <button type="button" className="btn-quiet" onClick={() => setStep(1)}>Back</button>
            <button type="button" className="btn-primary" onClick={() => setStep(3)}>Next<ArrowRight size={16} /></button>
          </div>
        </>
      ) : null}

      {step === 3 ? (
        <>
          <h2 className="mt-1 font-display text-2xl">Where is your numbering up to?</h2>
          <p className="mt-2 text-sm text-ink-soft">If you have been invoicing elsewhere, carry on from the next number rather than starting again. Leave it alone to start at INV-0001.</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="ob-number">Your next invoice number</label>
              <input id="ob-number" className="field" value={answers.invoiceStart ?? ""} onChange={(e) => set({ invoiceStart: e.target.value })} placeholder="INV-0001" />
            </div>
            <div>
              <label className="label" htmlFor="ob-email">Email on your invoices</label>
              <input id="ob-email" type="email" className="field" value={answers.email ?? ""} onChange={(e) => set({ email: e.target.value })} placeholder="billing@yourbusiness.com" />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="ob-address">Your address</label>
              <textarea id="ob-address" className="field min-h-[5rem]" value={answers.address ?? ""} onChange={(e) => set({ address: e.target.value })} />
            </div>
          </div>

          <div className="mt-6 rounded-lg border border-line bg-canvas p-4">
            <p className="flex items-center gap-2 font-semibold"><Sparkles size={16} className="text-forest" aria-hidden="true" />Would you like something to look at?</p>
            <p className="mt-1 text-sm text-ink-soft">We can fill the app with a made-up business, so the screens have invoices, expenses and overdue customers in them. It is clearly marked and you can clear it in one click.</p>
          </div>

          <div className="mt-6 flex flex-wrap justify-between gap-3">
            <button type="button" className="btn-quiet" onClick={() => setStep(2)}>Back</button>
            <span className="flex flex-wrap gap-2">
              <button type="button" className="btn-ghost" onClick={() => finish(true)}>Set up with sample data</button>
              <button type="button" className="btn-primary" onClick={() => finish(false)}>Set up, empty</button>
            </span>
          </div>
        </>
      ) : null}
    </div>
  );
}
