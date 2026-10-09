"use client";
import { Check, Trash2, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { PACKS, packFor } from "@/lib/countries/packs";
import { TEMPLATES } from "@/lib/documents/templates";
import { PALETTES } from "@/lib/documents/palettes";
import { useProfile } from "@/lib/store/useStore";
import type { Profile } from "@/lib/store/types";

const blank = (): Profile => ({ name: "", country: "IN", currency: "INR", accentColor: "#0B3D2E", template: "classic" });

/** Type your business details once. Every new document starts from them. */
export default function ProfileForm() {
  const { profile, saveProfile } = useProfile();
  const [form, setForm] = useState<Profile>(blank);
  const [saved, setSaved] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => { setForm(profile ?? blank()); setReady(true); }, [profile]);

  const pack = packFor(form.country);
  const set = (patch: Partial<Profile>) => { setForm((f) => ({ ...f, ...patch })); setSaved(false); };

  const onFile = (file: File | undefined, key: "logoDataUrl" | "signatureDataUrl") => {
    if (!file) return;
    const r = new FileReader();
    r.onload = () => set({ [key]: String(r.result) } as Partial<Profile>);
    r.readAsDataURL(file);
  };

  const submit = () => {
    saveProfile({ ...form, currency: form.currency || pack.currency });
    setSaved(true);
  };

  if (!ready) return <div className="h-96 animate-pulse rounded-xl border border-line bg-white/60" aria-hidden="true" />;

  return (
    <div className="space-y-6">
      <section className="card p-5">
        <h2 className="font-display text-lg">Your business</h2>
        <p className="mt-1 text-sm text-ink-soft">This fills in every document you make from now on, so you never type it twice.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Business name" value={form.name} onChange={(v) => set({ name: v })} placeholder="Acme Consulting LLP" />
          <Field label={pack.taxIdLabel} value={form.taxId || ""} onChange={(v) => set({ taxId: v })} />
          <Area label="Address" value={form.address || ""} onChange={(v) => set({ address: v })} />
          <div className="grid gap-4">
            <Field label="Email" value={form.email || ""} onChange={(v) => set({ email: v })} type="email" />
            <Field label="Phone" value={form.phone || ""} onChange={(v) => set({ phone: v })} />
            <Field label="Website" value={form.website || ""} onChange={(v) => set({ website: v })} />
          </div>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="font-display text-lg">Where you trade</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="pcountry">Country</label>
            <select id="pcountry" className="field" value={form.country} onChange={(e) => set({ country: e.target.value, currency: packFor(e.target.value).currency, region: "" })}>
              {PACKS.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}
            </select>
          </div>
          <Field label="Currency" value={form.currency} onChange={(v) => set({ currency: v.toUpperCase().slice(0, 3) })} />
          {pack.regions?.length ? (
            <div>
              <label className="label" htmlFor="pregion">Your state</label>
              <select id="pregion" className="field" value={form.region || ""} onChange={(e) => set({ region: e.target.value })}>
                <option value="">Select</option>
                {pack.regions.map((r) => <option key={r.code} value={r.code}>{r.name}</option>)}
              </select>
            </div>
          ) : null}
        </div>
      </section>

      <section className="card p-5">
        <h2 className="font-display text-lg">Logo and signature</h2>
        <div className="mt-4 grid gap-6 sm:grid-cols-2">
          {([["logoDataUrl", "Logo"], ["signatureDataUrl", "Signature"]] as const).map(([key, label]) => (
            <div key={key}>
              <span className="label">{label}</span>
              {form[key] ? (
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={form[key]} alt="" className="max-h-14 max-w-[8rem] rounded border border-line bg-white object-contain p-1" />
                  <button type="button" className="btn-quiet" onClick={() => set({ [key]: undefined } as Partial<Profile>)}><Trash2 size={15} />Remove</button>
                </div>
              ) : (
                <label className="btn-ghost inline-flex cursor-pointer">
                  <Upload size={16} />Choose a file
                  <input type="file" accept="image/png,image/jpeg" className="sr-only" onChange={(e) => onFile(e.target.files?.[0], key)} />
                </label>
              )}
            </div>
          ))}
          <Field label="Name under the signature" value={form.signatoryName || ""} onChange={(v) => set({ signatoryName: v })} placeholder="Asha Verma, Partner" />
        </div>
      </section>

      <section className="card p-5">
        <h2 className="font-display text-lg">Defaults on every document</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Area label="Payment details" value={form.paymentDetails || ""} onChange={(v) => set({ paymentDetails: v })} placeholder="Bank name, account number, IFSC or IBAN, UPI id" />
          <Area label="Terms" value={form.defaultTerms || ""} onChange={(v) => set({ defaultTerms: v })} placeholder="Payment due within 14 days. Interest at 1.5% a month on overdue amounts." />
          <Field label="UPI id" value={form.upiId || ""} onChange={(v) => set({ upiId: v })} placeholder="acme@hdfcbank" />
          <Field label="Payment link" value={form.paymentLink || ""} onChange={(v) => set({ paymentLink: v })} placeholder="https://rzp.io/l/your-page" />
        </div>
        <p className="mt-2 text-sm text-ink-soft">A UPI id puts a scannable code on your Indian invoices, with the amount and the invoice number already in it. A payment link suits cards and customers abroad.</p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <span className="label">Layout</span>
            <div className="flex flex-wrap gap-1.5">
              {TEMPLATES.map((t) => (
                <button key={t.id} type="button" onClick={() => set({ template: t.id })} aria-pressed={form.template === t.id}
                  className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${form.template === t.id ? "border-forest bg-forest text-white" : "border-line bg-white text-ink-soft hover:border-ink"}`}>{t.name}</button>
              ))}
            </div>
          </div>
          <div>
            <span className="label">Colour</span>
            <div className="flex flex-wrap items-center gap-1.5">
              {PALETTES.map((p) => (
                <button key={p.id} type="button" onClick={() => set({ accentColor: p.accent })} title={p.name} aria-label={p.name}
                  aria-pressed={form.accentColor === p.accent}
                  className={`h-6 w-6 rounded-full border-2 ${form.accentColor?.toLowerCase() === p.accent.toLowerCase() ? "border-ink" : "border-white"}`} style={{ background: p.accent }} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="font-display text-lg">Numbering</h2>
        <p className="mt-1 text-sm text-ink-soft">The next number for each kind of document. It moves on by itself each time you save one.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-4">
          {(["invoice", "quote", "purchase-order", "receipt"] as const).map((k) => (
            <Field key={k} label={k === "quote" ? "Quotation" : k === "purchase-order" ? "Purchase order" : k === "receipt" ? "Receipt" : "Invoice"}
              value={form.nextNumbers?.[k] || ""} onChange={(v) => set({ nextNumbers: { ...form.nextNumbers, [k]: v } })}
              placeholder={k === "invoice" ? "INV-0001" : k === "quote" ? "QUO-0001" : k === "purchase-order" ? "PO-0001" : "RCP-0001"} />
          ))}
        </div>
      </section>

      <div className="sticky bottom-4 flex items-center gap-3">
        <button type="button" className="btn-primary" onClick={submit}>Save details</button>
        {saved ? <span className="flex items-center gap-1.5 text-sm font-medium text-ok"><Check size={16} />Saved on this device</span> : null}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  const id = `p-${label.replace(/\W+/g, "-").toLowerCase()}`;
  return <div><label className="label" htmlFor={id}>{label}</label><input id={id} type={type} className="field" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} /></div>;
}

function Area({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  const id = `pa-${label.replace(/\W+/g, "-").toLowerCase()}`;
  return <div><label className="label" htmlFor={id}>{label}</label><textarea id={id} className="field min-h-[6rem]" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} /></div>;
}
