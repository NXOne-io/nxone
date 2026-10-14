"use client";
import { ArrowRight, Lightbulb, TrendingDown, TrendingUp, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { dailyBrief, insights, type InsightTone } from "@/lib/insights/engine";
import { todayIso } from "@/lib/format";
import { useHydrated, useWorkspace } from "@/lib/store/useStore";

const ICONS: Record<InsightTone, typeof Lightbulb> = {
  good: TrendingUp, watch: Lightbulb, bad: TriangleAlert, neutral: TrendingDown
};

const STYLES: Record<InsightTone, string> = {
  good: "border-ok/30 bg-ok/5 text-ok",
  watch: "border-line bg-canvas text-ink-soft",
  bad: "border-bad/30 bg-bad/5 text-bad",
  neutral: "border-line bg-canvas text-ink-soft"
};

/** What changed, and why we think so. Shown with the figures rather than as assertions. */
export default function Insights({ limit, brief = false }: { limit?: number; brief?: boolean }) {
  const [ws, db] = useWorkspace();
  const ready = useHydrated();
  if (!ready) return null;

  const input = {
    documents: db.documents(), expenses: db.expenses(), profile: ws.profile,
    today: todayIso(), currency: ws.profile?.currency ?? "INR"
  };
  const found = insights(input);
  const lines = brief ? dailyBrief(input) : [];
  const shown = limit ? found.slice(0, limit) : found;

  if (!found.length && !brief) return null;

  return (
    <div className="space-y-4">
      {brief ? (
        <section className="card p-5">
          <h2 className="font-display text-lg">Where things stand</h2>
          <ul className="mt-2 space-y-1 text-ink-soft">
            {lines.map((l) => <li key={l}>{l}</li>)}
          </ul>
        </section>
      ) : null}

      {shown.length ? (
        <section>
          <h2 className="font-display text-lg">Worth knowing</h2>
          <ul className="mt-3 space-y-2">
            {shown.map((insight) => {
              const Icon = ICONS[insight.tone];
              return (
                <li key={insight.id} className={`rounded-xl border p-4 ${STYLES[insight.tone]}`}>
                  <div className="flex flex-wrap items-start gap-3">
                    <Icon size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-ink">{insight.title}</p>
                      <ul className="mt-1 space-y-0.5 text-sm text-ink-soft">
                        {insight.because.map((b) => <li key={b}>{b}</li>)}
                      </ul>
                    </div>
                    {insight.action ? (
                      <Link href={insight.action.href} className="btn-quiet shrink-0 text-sm">{insight.action.label}<ArrowRight size={14} /></Link>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : brief ? (
        <p className="text-sm text-ink-soft">Nothing stands out this week.</p>
      ) : null}
    </div>
  );
}
