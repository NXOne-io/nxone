"use client";
import { Copy, Mail, MessageCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { aging, chaseList, customerStanding, mailtoLink, reminderText, whatsappLink, type ReminderTone } from "@/lib/analysis/receivables";
import { formatDate, todayIso } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import type { SavedDocument } from "@/lib/store/types";
import { useHydrated, useWorkspace } from "@/lib/store/useStore";

/** Who owes you, who is late, and a message you can send in one click. */
export default function Receivables() {
  const [ws, db] = useWorkspace();
  const ready = useHydrated();
  const [open, setOpen] = useState<string | null>(null);
  const [tone, setTone] = useState<ReminderTone>("gentle");
  const [copied, setCopied] = useState(false);

  if (!ready) return <div className="h-72 animate-pulse rounded-xl border border-line bg-white/60" aria-hidden="true" />;

  const currency = ws.profile?.currency ?? "INR";
  const today = todayIso();
  const docs = db.documents();
  const buckets = aging(docs, today, currency);
  const chase = chaseList(docs, today, currency);
  const standing = customerStanding(docs, today, currency);
  const m = (v: { minor: number; currency: string }) => formatMoney(v, "en-IN");

  const draftFor = (doc: SavedDocument) => {
    const client = db.clients().find((c) => c.name === doc.clientName);
    const daysLate = doc.dueDate ? Math.floor((Date.parse(today) - Date.parse(doc.dueDate)) / 86_400_000) : 0;
    const pay = doc.doc.payment?.upiId ? `You can pay by UPI to ${doc.doc.payment.upiId}.` : doc.doc.payment?.paymentLink ? `You can pay here: ${doc.doc.payment.paymentLink}` : undefined;
    const text = reminderText({
      tone,
      businessName: ws.profile?.name ?? "us",
      customerName: doc.clientName,
      number: doc.number,
      amount: m({ minor: doc.totalMinor - doc.paidMinor, currency: doc.currency }),
      dueDate: formatDate(doc.dueDate ?? doc.issueDate, doc.doc.country ?? "IN"),
      daysLate: Math.max(0, daysLate),
      paymentLine: pay
    });
    return { text, client };
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold sm:text-3xl">Money owed to you</h1>
        <p className="mt-1 text-ink-soft">What is outstanding, how old it is, and who is worth a message today.</p>
      </div>

      <dl className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {([["Not yet due", buckets.current], ["1 to 30 days", buckets.days1to30], ["31 to 60", buckets.days31to60], ["61 to 90", buckets.days61to90], ["Over 90 days", buckets.over90]] as const).map(([label, value], i) => (
          <div key={label} className={`rounded-xl border p-4 ${i >= 3 && value.minor > 0 ? "border-bad/40 bg-bad/5" : "border-line bg-white"}`}>
            <dt className="text-[0.68rem] font-semibold uppercase tracking-wider text-ink-faint">{label}</dt>
            <dd className={`tabular font-display text-xl font-semibold ${i >= 3 && value.minor > 0 ? "text-bad" : ""}`}>{m(value)}</dd>
          </div>
        ))}
      </dl>

      {chase.length === 0 ? (
        <div className="card p-8 text-center">
          <h2 className="font-display text-lg">Nothing to chase</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">Either everyone has paid, or there are no invoices saved yet. Downloading an invoice saves it here automatically.</p>
          <Link href="/invoice-generator/?new=1" className="btn-primary mt-4">Make an invoice</Link>
        </div>
      ) : (
        <section>
          <h2 className="font-display text-lg">Worth a message today</h2>
          <ul className="mt-3 space-y-2">
            {chase.map(({ doc, daysLate, owed, reason }) => {
              const isOpen = open === doc.id;
              const { text, client } = draftFor(doc);
              return (
                <li key={doc.id} className="card p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <Link href={`/invoice-generator/?doc=${doc.id}`} className="font-medium hover:underline">{doc.number}</Link>
                      <span className="text-ink-soft"> to {doc.clientName}</span>
                      <span className={`block text-sm ${daysLate > 0 ? "text-warn" : "text-ink-faint"}`}>
                        {reason}{doc.dueDate ? `, due ${formatDate(doc.dueDate, doc.doc.country ?? "IN")}` : ""}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="tabular font-semibold">{m(owed)}</span>
                      <button type="button" className="btn-ghost" onClick={() => { setOpen(isOpen ? null : doc.id); setCopied(false); }}>
                        {isOpen ? "Close" : "Write a reminder"}
                      </button>
                    </div>
                  </div>

                  {isOpen ? (
                    <div className="mt-4 border-t border-line pt-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Tone</span>
                        {([["gentle", "Gentle"], ["firm", "Firm"], ["final", "Final"]] as Array<[ReminderTone, string]>).map(([v, l]) => (
                          <button key={v} type="button" onClick={() => setTone(v)} aria-pressed={tone === v}
                            className={`rounded-lg border px-3 py-1 text-sm font-medium ${tone === v ? "border-forest bg-forest text-white" : "border-line bg-white text-ink-soft"}`}>{l}</button>
                        ))}
                      </div>

                      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-ink-faint">{text.subject}</p>
                      <pre className="mt-1 whitespace-pre-wrap rounded-lg border border-line bg-canvas p-3 font-sans text-sm text-ink">{text.body}</pre>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <button type="button" className="btn-ghost" onClick={() => { void navigator.clipboard.writeText(text.body); setCopied(true); }}>
                          <Copy size={15} />{copied ? "Copied" : "Copy"}
                        </button>
                        {client?.phone ? (
                          <a className="btn-ghost" href={whatsappLink(client.phone, text.body)} target="_blank" rel="noopener noreferrer"><MessageCircle size={15} />WhatsApp</a>
                        ) : null}
                        {client?.email ? (
                          <a className="btn-ghost" href={mailtoLink(client.email, text.subject, text.body)}><Mail size={15} />Email</a>
                        ) : null}
                        {!client?.phone && !client?.email ? <span className="self-center text-sm text-ink-faint">Save a phone or email for {doc.clientName} to send it from here.</span> : null}
                      </div>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {standing.length > 0 ? (
        <section className="card overflow-hidden">
          <h2 className="px-5 pt-5 font-display text-lg">How your customers pay</h2>
          <p className="px-5 pb-3 text-sm text-ink-soft">Based on when you marked their invoices paid.</p>
          <table className="w-full border-collapse text-sm">
            <thead className="bg-canvas text-left">
              <tr>
                <th className="px-5 py-2.5 font-semibold">Customer</th>
                <th className="px-5 py-2.5 text-right font-semibold">Outstanding</th>
                <th className="px-5 py-2.5 text-right font-semibold">Overdue</th>
                <th className="px-5 py-2.5 text-right font-semibold">Usually pays</th>
              </tr>
            </thead>
            <tbody>
              {standing.map((c) => (
                <tr key={c.name} className="border-t border-line">
                  <td className="px-5 py-2.5">
                    {c.name}
                    {c.habituallyLate ? <span className="ml-2 rounded bg-warn/10 px-1.5 py-0.5 text-[0.65rem] font-semibold text-warn">often late</span> : null}
                  </td>
                  <td className="px-5 py-2.5 text-right tabular">{m(c.outstanding)}</td>
                  <td className={`px-5 py-2.5 text-right tabular ${c.overdue.minor > 0 ? "text-warn" : "text-ink-faint"}`}>{m(c.overdue)}</td>
                  <td className="px-5 py-2.5 text-right tabular text-ink-soft">
                    {c.averageDaysLate === null ? "no history yet"
                      : c.averageDaysLate > 0 ? `${c.averageDaysLate} days late`
                      : c.averageDaysLate < 0 ? `${-c.averageDaysLate} days early`
                      : "on time"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}
    </div>
  );
}
