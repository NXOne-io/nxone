"use client";
import { openingOf } from "@/lib/ledger/opening";
import SetupPrompt from "./SetupPrompt";
import { ArrowRight, CalendarClock, HandCoins, Sparkles, TrendingDown, Wallet } from "lucide-react";
import Link from "next/link";
import { todayView, type TodayItem } from "@/lib/analysis/today";
import { formatDate, todayIso } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { useHydrated, useWorkspace } from "@/lib/store/useStore";

const ICONS: Record<TodayItem["kind"], typeof HandCoins> = {
  collect: HandCoins, pay: TrendingDown, compliance: CalendarClock, cash: Wallet, tidy: Sparkles
};

/** What needs doing, and nothing else. A quiet day should look quiet. */
export default function Today() {
  const [ws, db] = useWorkspace();
  const ready = useHydrated();

  if (!ready) return <div className="h-72 animate-pulse rounded-xl border border-line bg-white/60" aria-hidden="true" />;

  const currency = ws.profile?.currency ?? "INR";
  const country = ws.profile?.country ?? "IN";
  const today = todayIso();
  const t = todayView({
    documents: db.documents(), expenses: db.expenses(), recurring: db.recurring(), opening: openingOf(ws.profile), today, currency, country,
    registrations: ws.profile?.registrations ?? [], quarterlyGst: ws.profile?.quarterlyGst
  });
  const m = (v: { minor: number; currency: string }) => formatMoney(v, "en-IN");
  const hasAnything = db.documents().length > 0 || db.expenses().length > 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold sm:text-3xl">Today</h1>
        <p className="mt-1 text-ink-soft">
          {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
          {ws.profile?.name ? `, at ${ws.profile.name}` : ""}
        </p>
      </div>

      <SetupPrompt />

      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Cash" value={m(t.cashNow)} strong />
        <Stat label="Owed to you" value={m(t.owedToYou)} sub={t.overdue.minor > 0 ? `${m(t.overdue)} of it overdue` : "Nothing overdue"} tone={t.overdue.minor > 0 ? "warn" : undefined} />
        <Stat label="You owe" value={m(t.youOwe)} sub="Bills not yet paid" />
        <Stat
          label="Next filing"
          value={t.nextDeadline ? t.nextDeadline.rule.name : "None set"}
          sub={t.nextDeadline ? `${formatDate(t.nextDeadline.dueDate, country)}, in ${t.nextDeadline.daysAway} days` : "Tell us what you are registered for"}
        />
      </dl>

      {t.items.length === 0 ? (
        <div className="card p-8 text-center">
          <h2 className="font-display text-lg">{hasAnything ? "Nothing needs you today" : "Nothing here yet"}</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">
            {hasAnything
              ? "Nobody is overdue, no bills are waiting and no filing is close. This screen stays empty until something needs doing."
              : "Make an invoice or record an expense and this becomes the screen worth opening each morning."}
          </p>
          <Link href="/invoice-generator/?new=1" className="btn-primary mt-4">Make an invoice</Link>
        </div>
      ) : (
        <section>
          <h2 className="font-display text-lg">Needs you</h2>
          <ul className="mt-3 space-y-2">
            {t.items.map((item) => {
              const Icon = ICONS[item.kind];
              return (
                <li key={item.id} className={`card flex flex-wrap items-center gap-4 p-4 ${item.urgency === "now" ? "border-warn/40" : ""}`}>
                  <span className={`shrink-0 rounded-lg p-2 ${item.urgency === "now" ? "bg-warn/10 text-warn" : "bg-canvas text-ink-soft"}`}>
                    <Icon size={18} aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{item.title}</span>
                    <span className="block text-sm text-ink-soft">{item.detail}</span>
                  </span>
                  {item.amount ? <span className="tabular font-semibold">{m(item.amount)}</span> : null}
                  {item.href ? (
                    <Link href={item.href} className="btn-ghost shrink-0">{item.action}<ArrowRight size={14} /></Link>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value, sub, strong, tone }: { label: string; value: string; sub?: string; strong?: boolean; tone?: "warn" }) {
  return (
    <div className={`rounded-xl border p-4 ${strong ? "border-forest bg-forest-pale" : "border-line bg-white"}`}>
      <dt className="text-[0.68rem] font-semibold uppercase tracking-wider text-ink-faint">{label}</dt>
      <dd className={`tabular font-display font-semibold ${strong ? "text-3xl" : "text-2xl"}`}>{value}</dd>
      {sub ? <dd className={`mt-1 text-sm ${tone === "warn" ? "text-warn" : "text-ink-soft"}`}>{sub}</dd> : null}
    </div>
  );
}
