"use client";
import { CalendarSync, Pause, Play, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { formatDate, nextNumber, todayIso } from "@/lib/format";
import { calculate } from "@/lib/documents/totals";
import { formatMoney } from "@/lib/money";
import { describe as describeTemplate, due, generate, isFinished, type Frequency, type RecurringTemplate } from "@/lib/recurring/schedule";
import { newId, store } from "@/lib/store/db";
import { useHydrated, useWorkspace } from "@/lib/store/useStore";

const FREQUENCIES: Array<[Frequency, string]> = [
  ["weekly", "Every week"], ["fortnightly", "Every two weeks"], ["monthly", "Monthly"],
  ["quarterly", "Every three months"], ["yearly", "Yearly"]
];

/** Invoices that go out on a schedule, as drafts you approve rather than post sent on their own. */
export default function Recurring() {
  const [ws, db] = useWorkspace();
  const ready = useHydrated();
  const [picking, setPicking] = useState(false);
  const [message, setMessage] = useState("");

  if (!ready) return <div className="h-72 animate-pulse rounded-xl border border-line bg-white/60" aria-hidden="true" />;

  const today = todayIso();
  const templates = db.recurring();
  const waiting = due(templates, today);
  const country = ws.profile?.country ?? "IN";
  const m = (v: { minor: number; currency: string }) => formatMoney(v, "en-IN");
  const amountOf = (t: RecurringTemplate) => calculate(t.document).total;

  /** Turning a past invoice into a schedule is how people actually think about this. */
  const createFrom = (documentId: string) => {
    const source = db.getDocument(documentId);
    if (!source) return;
    const day = Number(source.issueDate.split("-")[2]);
    store.saveRecurring({
      id: newId("rc"),
      name: `${source.clientName} repeat`,
      frequency: "monthly",
      dayOfMonth: day,
      startDate: source.issueDate,
      nextDate: nextMonthFrom(source.issueDate, day),
      occurrences: 0,
      dueInDays: source.dueDate ? Math.max(0, Math.round((Date.parse(source.dueDate) - Date.parse(source.issueDate)) / 86_400_000)) : 14,
      paused: false,
      document: source.doc
    });
    setPicking(false);
    setMessage(`Set up from ${source.number}. Change the schedule below if monthly is not right.`);
  };

  /** Makes the invoice as a draft. Nothing is sent, and nothing is numbered until you say so. */
  const makeInvoice = (t: RecurringTemplate) => {
    const profile = ws.profile;
    const number = profile?.nextNumbers?.invoice ?? "INV-0001";
    const result = generate(t, number, today);

    const totals = calculate(result.document);
    const saved = store.saveDocument({
      kind: "invoice", number, clientName: result.document.buyer.name || "No customer",
      issueDate: result.document.issueDate, dueDate: result.document.dueDate,
      currency: result.document.currency, totalMinor: totals.total.minor, paidMinor: 0,
      status: "draft", doc: result.document
    });

    store.saveRecurring(result.template);
    if (profile) store.saveProfile({ ...profile, nextNumbers: { ...profile.nextNumbers, invoice: nextNumber(number) } });

    setMessage(result.skipped > 0
      ? `${saved.number} is ready as a draft. ${result.skipped} earlier run${result.skipped === 1 ? "" : "s"} were skipped rather than billed late without asking.`
      : `${saved.number} is ready as a draft. Check it, then download it to send.`);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl">Repeating invoices</h1>
          <p className="mt-1 text-ink-soft">For the work you bill every month. Each one arrives as a draft for you to check.</p>
        </div>
        <button type="button" className="btn-primary" onClick={() => setPicking((v) => !v)}><Plus size={16} />Set one up</button>
      </div>

      {message ? <p className="rounded-lg border border-forest bg-forest-pale p-3 text-sm">{message}</p> : null}

      {picking ? (
        <section className="card p-5">
          <h2 className="font-display text-lg">Repeat an invoice you have already sent</h2>
          <p className="mt-1 text-sm text-ink-soft">Pick one and we will copy the customer, the lines and the terms. You can change the schedule afterwards.</p>
          {db.documents().filter((d) => d.kind === "invoice").length === 0 ? (
            <p className="mt-3 text-sm text-ink-faint">No invoices saved yet. <Link href="/invoice-generator/?new=1" className="underline">Make one first</Link>.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {db.documents().filter((d) => d.kind === "invoice").slice(0, 8).map((d) => (
                <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                  <span>
                    <span className="font-medium">{d.number}</span>
                    <span className="text-ink-soft"> to {d.clientName}</span>
                    <span className="block text-xs text-ink-faint">{formatDate(d.issueDate, country)}</span>
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="tabular text-ink-soft">{m({ minor: d.totalMinor, currency: d.currency })}</span>
                    <button type="button" className="btn-ghost" onClick={() => createFrom(d.id)}>Repeat this</button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {waiting.length > 0 ? (
        <section>
          <h2 className="font-display text-lg">Ready to make</h2>
          <ul className="mt-3 space-y-2">
            {waiting.map((t) => (
              <li key={t.id} className="card flex flex-wrap items-center gap-4 p-4">
                <CalendarSync size={18} className="shrink-0 text-forest" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{t.name}</span>
                  <span className="block text-sm text-ink-soft">Due {formatDate(t.nextDate, country)}, for {t.document.buyer.name || "no customer"}</span>
                </span>
                <span className="tabular font-semibold">{m(amountOf(t))}</span>
                <button type="button" className="btn-primary shrink-0" onClick={() => makeInvoice(t)}>Make the invoice</button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {templates.length === 0 ? (
        <div className="card p-8 text-center">
          <h2 className="font-display text-lg">Nothing repeating yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">If you bill the same customer every month, set it up once here and it will be waiting for you each time rather than being remembered or forgotten.</p>
        </div>
      ) : (
        <section className="card overflow-hidden">
          <h2 className="px-5 pt-5 font-display text-lg">All of them</h2>
          <table className="mt-3 w-full border-collapse text-sm">
            <thead className="bg-canvas text-left">
              <tr>
                <th className="px-5 py-2.5 font-semibold">What</th>
                <th className="px-5 py-2.5 font-semibold">Schedule</th>
                <th className="px-5 py-2.5 font-semibold">Next</th>
                <th className="px-5 py-2.5 text-right font-semibold">Amount</th>
                <th className="px-5 py-2.5 text-right font-semibold"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {templates.map((t) => (
                <tr key={t.id} className="border-t border-line">
                  <td className="px-5 py-2.5">
                    <input
                      className="w-full bg-transparent font-medium outline-none focus:underline"
                      value={t.name}
                      onChange={(e) => store.saveRecurring({ ...t, name: e.target.value })}
                      aria-label={`Name for ${t.name}`}
                    />
                    <span className="block text-xs text-ink-faint">{t.document.buyer.name || "no customer"}{t.occurrences > 0 ? `, ${t.occurrences} made so far` : ""}</span>
                  </td>
                  <td className="px-5 py-2.5">
                    <select
                      className="rounded border border-line bg-white px-2 py-1 text-sm"
                      value={t.frequency}
                      onChange={(e) => store.saveRecurring({ ...t, frequency: e.target.value as Frequency })}
                      aria-label={`How often ${t.name} repeats`}
                    >
                      {FREQUENCIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                    <span className="block text-xs text-ink-faint">{describeTemplate(t)}</span>
                  </td>
                  <td className="px-5 py-2.5 tabular">
                    {isFinished(t) ? <span className="text-ink-faint">finished</span> : formatDate(t.nextDate, country)}
                  </td>
                  <td className="px-5 py-2.5 text-right tabular">{m(amountOf(t))}</td>
                  <td className="px-5 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      <button type="button" onClick={() => store.saveRecurring({ ...t, paused: !t.paused })}
                        className="rounded p-1.5 text-ink-faint hover:bg-canvas hover:text-ink" aria-label={t.paused ? `Resume ${t.name}` : `Pause ${t.name}`}>
                        {t.paused ? <Play size={15} /> : <Pause size={15} />}
                      </button>
                      <button type="button" onClick={() => { if (confirm(`Stop repeating ${t.name}? Invoices already made are not affected.`)) store.deleteRecurring(t.id); }}
                        className="rounded p-1.5 text-ink-faint hover:bg-canvas hover:text-bad" aria-label={`Delete ${t.name}`}><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

function nextMonthFrom(date: string, day: number): string {
  const [y, m] = date.split("-").map(Number);
  const target = new Date(Date.UTC(y, m, 1));
  const year = target.getUTCFullYear();
  const month = target.getUTCMonth() + 1;
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(Math.min(day, last)).padStart(2, "0")}`;
}
