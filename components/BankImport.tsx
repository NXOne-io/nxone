"use client";
import { AlertTriangle, Check, FileUp, X } from "lucide-react";
import { useState } from "react";
import { EXPENSE_CATEGORIES, cashAccounts } from "@/lib/ledger/accounts";
import { suggestAll, type Suggestion } from "@/lib/banking/match";
import { parseStatement, type ParseResult } from "@/lib/banking/parse";
import { formatDate } from "@/lib/format";
import { formatMoney, fromMinor } from "@/lib/money";
import { store } from "@/lib/store/db";
import { useHydrated, useWorkspace } from "@/lib/store/useStore";

type Decision = { kind: "payment" | "expense" | "skip"; documentId?: string; category?: string; supplier?: string };

/** Upload a statement, confirm what each line is, and post the lot in one go. */
export default function BankImport() {
  const [ws, db] = useWorkspace();
  const ready = useHydrated();
  const [parsed, setParsed] = useState<ParseResult | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [decisions, setDecisions] = useState<Record<number, Decision>>({});
  const [account, setAccount] = useState("1020");
  const [done, setDone] = useState<{ payments: number; expenses: number; skipped: number } | null>(null);

  if (!ready) return <div className="h-72 animate-pulse rounded-xl border border-line bg-white/60" aria-hidden="true" />;

  const currency = ws.profile?.currency ?? "INR";
  const country = ws.profile?.country ?? "IN";
  const m = (minor: number) => formatMoney(fromMinor(minor, currency), "en-IN");

  const read = async (file: File | undefined) => {
    if (!file) return;
    const text = await file.text();
    const result = parseStatement(text);
    const suggested = suggestAll(result.rows, db.documents(), db.expenses(), currency);
    setParsed(result);
    setSuggestions(suggested);
    setDone(null);
    setDecisions(Object.fromEntries(suggested.map((s) => [s.row.line, {
      kind: s.kind === "payment" ? "payment" : s.kind === "expense" && !s.duplicateOf ? "expense" : "skip",
      documentId: s.document?.id, category: s.category, supplier: s.supplier
    } as Decision])));
  };

  const setDecision = (line: number, patch: Partial<Decision>) =>
    setDecisions((d) => ({ ...d, [line]: { ...d[line], ...patch } }));

  const post = () => {
    let payments = 0, expenses = 0, skipped = 0;

    for (const s of suggestions) {
      const decision = decisions[s.row.line];
      if (!decision || decision.kind === "skip") { skipped += 1; continue; }

      if (decision.kind === "payment" && decision.documentId) {
        const doc = db.getDocument(decision.documentId);
        if (!doc) { skipped += 1; continue; }
        const paid = Math.min(doc.totalMinor, doc.paidMinor + s.row.amountMinor);
        store.saveDocument({ ...doc, paidMinor: paid, status: paid >= doc.totalMinor ? "paid" : "partly-paid" });
        payments += 1;
        continue;
      }

      if (decision.kind === "expense") {
        store.saveExpense({
          date: s.row.date,
          supplier: decision.supplier || s.supplier || "Unknown",
          description: s.row.description,
          category: decision.category ?? "6900",
          currency,
          netMinor: Math.abs(s.row.amountMinor),
          taxMinor: 0,
          paidFrom: account,
          reference: s.row.reference
        });
        expenses += 1;
      }
    }

    setDone({ payments, expenses, skipped });
    setSuggestions([]);
    setParsed(null);
  };

  const counts = suggestions.reduce((a, s) => {
    const kind = decisions[s.row.line]?.kind ?? "skip";
    return { ...a, [kind]: (a[kind] ?? 0) + 1 };
  }, {} as Record<string, number>);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold sm:text-3xl">Bring in your bank statement</h1>
        <p className="mt-1 max-w-2xl text-ink-soft">
          Download a CSV from your bank and drop it here. We match what we can to your invoices, suggest a category for the rest, and you confirm before anything is recorded.
        </p>
      </div>

      {done ? (
        <div className="card p-6">
          <h2 className="flex items-center gap-2 font-display text-lg"><Check size={18} className="text-ok" />Done</h2>
          <p className="mt-2 text-ink-soft">
            {done.payments} payment{done.payments === 1 ? "" : "s"} recorded against invoices, {done.expenses} expense{done.expenses === 1 ? "" : "s"} added
            {done.skipped ? `, ${done.skipped} line${done.skipped === 1 ? "" : "s"} skipped` : ""}.
          </p>
          <button type="button" className="btn-ghost mt-4" onClick={() => setDone(null)}>Bring in another</button>
        </div>
      ) : null}

      {!parsed && !done ? (
        <section className="card p-8 text-center">
          <label className="btn-primary inline-flex cursor-pointer">
            <FileUp size={16} />Choose a CSV file
            <input type="file" accept=".csv,text/csv,text/plain" className="sr-only" onChange={(e) => void read(e.target.files?.[0])} />
          </label>
          <p className="mx-auto mt-4 max-w-md text-sm text-ink-soft">
            Most banks offer this under statements or download. We can read the common layouts, including separate debit and credit columns, and we work out which way round the dates are from the file itself.
          </p>
          <p className="mx-auto mt-2 max-w-md text-xs text-ink-faint">The file is read in this browser. It is not uploaded anywhere.</p>
        </section>
      ) : null}

      {parsed ? (
        <>
          <section className="card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-ink-soft">
                Read {parsed.rows.length} line{parsed.rows.length === 1 ? "" : "s"}
                {parsed.rejected.length ? `, and could not read ${parsed.rejected.length}` : ""}. Dates read as{" "}
                {parsed.dateOrder === "dmy" ? "day first" : parsed.dateOrder === "mdy" ? "month first" : "year first"}.
              </p>
              <label className="flex items-center gap-2 text-sm">
                Which account
                <select className="rounded border border-line bg-white px-2 py-1" value={account} onChange={(e) => setAccount(e.target.value)}>
                  {cashAccounts().map((a) => <option key={a.code} value={a.code}>{a.plain ?? a.name}</option>)}
                </select>
              </label>
            </div>

            {parsed.rejected.length ? (
              <details className="mt-3">
                <summary className="cursor-pointer text-sm text-warn">Show the {parsed.rejected.length} lines we could not read</summary>
                <ul className="mt-2 space-y-1 text-xs text-ink-soft">
                  {parsed.rejected.slice(0, 20).map((r) => <li key={r.line}>Line {r.line}: {r.reason}. {r.text}</li>)}
                </ul>
              </details>
            ) : null}
          </section>

          <section className="card overflow-hidden">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-canvas text-left">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Date</th>
                  <th className="px-4 py-2.5 font-semibold">What the bank says</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Amount</th>
                  <th className="px-4 py-2.5 font-semibold">What it is</th>
                </tr>
              </thead>
              <tbody>
                {suggestions.map((s) => {
                  const decision = decisions[s.row.line];
                  const unsure = s.confidence < 0.5;
                  return (
                    <tr key={s.row.line} className={`border-t border-line align-top ${decision?.kind === "skip" ? "opacity-55" : ""}`}>
                      <td className="px-4 py-2.5 tabular">{formatDate(s.row.date, country)}</td>
                      <td className="px-4 py-2.5">
                        <span className="block">{s.row.description}</span>
                        <span className={`block text-xs ${unsure ? "text-warn" : "text-ink-faint"}`}>
                          {unsure ? <AlertTriangle size={11} className="mr-1 inline" aria-hidden="true" /> : null}
                          {s.reason}
                          {s.duplicateOf ? ". This looks like an expense you have already recorded" : ""}
                        </span>
                      </td>
                      <td className={`px-4 py-2.5 text-right tabular ${s.row.amountMinor > 0 ? "text-ok" : ""}`}>{m(s.row.amountMinor)}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {s.row.amountMinor > 0 ? (
                            <select
                              className="rounded border border-line bg-white px-2 py-1 text-sm"
                              value={decision?.kind === "payment" ? decision.documentId ?? "" : ""}
                              onChange={(e) => setDecision(s.row.line, e.target.value ? { kind: "payment", documentId: e.target.value } : { kind: "skip" })}
                              aria-label={`What line ${s.row.line} is`}
                            >
                              <option value="">Skip this line</option>
                              {db.documents().filter((d) => d.status !== "draft" && d.status !== "cancelled" && d.totalMinor > d.paidMinor).map((d) => (
                                <option key={d.id} value={d.id}>Payment for {d.number}, {d.clientName}</option>
                              ))}
                            </select>
                          ) : (
                            <>
                              <select
                                className="rounded border border-line bg-white px-2 py-1 text-sm"
                                value={decision?.kind === "expense" ? decision.category ?? "6900" : ""}
                                onChange={(e) => setDecision(s.row.line, e.target.value ? { kind: "expense", category: e.target.value } : { kind: "skip" })}
                                aria-label={`What line ${s.row.line} is`}
                              >
                                <option value="">Skip this line</option>
                                {EXPENSE_CATEGORIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                              </select>
                              {decision?.kind === "expense" ? (
                                <input
                                  className="w-36 rounded border border-line px-2 py-1 text-sm"
                                  value={decision.supplier ?? ""}
                                  onChange={(e) => setDecision(s.row.line, { supplier: e.target.value })}
                                  aria-label={`Supplier for line ${s.row.line}`}
                                />
                              ) : null}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

          <div className="sticky bottom-4 flex flex-wrap items-center gap-3 rounded-xl border border-line bg-white p-4 shadow-card">
            <span className="text-sm text-ink-soft">
              {counts.payment ?? 0} payment{(counts.payment ?? 0) === 1 ? "" : "s"}, {counts.expense ?? 0} expense{(counts.expense ?? 0) === 1 ? "" : "s"}, {counts.skip ?? 0} skipped
            </span>
            <span className="ml-auto flex gap-2">
              <button type="button" className="btn-quiet" onClick={() => { setParsed(null); setSuggestions([]); }}><X size={15} />Cancel</button>
              <button type="button" className="btn-primary" onClick={post}>Record these</button>
            </span>
          </div>
        </>
      ) : null}
    </div>
  );
}
