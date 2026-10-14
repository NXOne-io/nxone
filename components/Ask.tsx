"use client";
import { ArrowRight, CornerDownLeft, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ask, type Answer } from "@/lib/ask/answer";
import { EXAMPLE_QUESTIONS } from "@/lib/ask/intents";
import { todayIso } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { useHydrated, useWorkspace } from "@/lib/store/useStore";

/**
 * Questions about your own money, answered from your own books.
 *
 * Nothing is sent anywhere and no model is involved: the same engine that produces the reports
 * produces these answers, so they cannot disagree with the accounts, and every answer says where
 * to go and check it.
 */
export default function Ask() {
  const [ws, db] = useWorkspace();
  const ready = useHydrated();
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState<Array<{ question: string; answer: Answer }>>([]);

  if (!ready) return <div className="h-72 animate-pulse rounded-xl border border-line bg-white/60" aria-hidden="true" />;

  const currency = ws.profile?.currency ?? "INR";
  const submit = (text: string) => {
    const asked = text.trim();
    if (!asked) return;
    const answer = ask(asked, {
      documents: db.documents(), expenses: db.expenses(), profile: ws.profile,
      today: todayIso(), currency
    });
    setHistory((h) => [{ question: asked, answer }, ...h]);
    setQuestion("");
  };

  const empty = db.documents().length === 0 && db.expenses().length === 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold sm:text-3xl">Ask about your money</h1>
        <p className="mt-1 max-w-2xl text-ink-soft">
          Answered from your own books, on this device. No question or figure is sent anywhere.
        </p>
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-line bg-white px-3 focus-within:border-forest">
        <Search size={18} className="shrink-0 text-ink-faint" aria-hidden="true" />
        <input
          className="w-full bg-transparent py-3 text-base outline-none"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") submit(question); }}
          placeholder="How much did we make last month?"
          aria-label="Ask a question about your money"
          autoFocus
        />
        <button type="button" onClick={() => submit(question)} className="shrink-0 rounded-lg p-2 text-ink-faint hover:bg-canvas hover:text-ink" aria-label="Ask">
          <CornerDownLeft size={18} />
        </button>
      </div>

      {empty ? (
        <p className="text-sm text-ink-soft">There is nothing to answer from yet. Make an invoice or record an expense, or fill the app with sample data from your business details.</p>
      ) : null}

      {history.length === 0 ? (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-faint">Things you can ask</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {EXAMPLE_QUESTIONS.map((q) => (
              <li key={q}>
                <button type="button" className="rounded-lg border border-line bg-white px-3 py-1.5 text-sm text-ink-soft hover:border-forest hover:text-ink" onClick={() => submit(q)}>{q}</button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <ul className="space-y-4">
        {history.map((entry, i) => (
          <li key={`${entry.question}-${i}`} className="card p-5">
            <p className="text-sm text-ink-faint">{entry.question}</p>
            <p className={`mt-2 font-display text-xl ${entry.answer.unanswered ? "text-ink-soft" : ""}`}>{entry.answer.headline}</p>

            {entry.answer.value && !entry.answer.unanswered ? (
              <p className="mt-1 tabular font-display text-3xl font-semibold">{formatMoney(entry.answer.value, "en-IN")}</p>
            ) : null}

            {entry.answer.detail.length ? (
              <ul className="mt-3 space-y-1 text-sm text-ink-soft">
                {entry.answer.detail.map((d) => <li key={d}>{d}</li>)}
              </ul>
            ) : null}

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-ink-faint">Read as: {entry.answer.understood}</span>
              {entry.answer.source ? (
                <Link href={entry.answer.source.href} className="btn-quiet text-sm">{entry.answer.source.label}<ArrowRight size={14} /></Link>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      {history.length > 0 ? (
        <p className="text-xs text-ink-faint">
          Every figure above is worked out from your saved documents and expenses by the same engine that produces your reports. If an answer looks wrong, the screen it points at will show the working.
        </p>
      ) : null}
    </div>
  );
}
