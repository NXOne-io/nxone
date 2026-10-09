"use client";
import { ArrowRight, FileText, Quote, Receipt, ShoppingCart, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { formatDate, todayIso } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { summarise } from "@/lib/store/summary";
import { useHydrated, useWorkspace } from "@/lib/store/useStore";
import DocumentList from "./DocumentList";

/** What a business owner actually wants to know: who owes me, what is late, what did I earn. */
export default function Dashboard() {
  const [ws, db] = useWorkspace();
  const ready = useHydrated();

  if (!ready) return <div className="h-72 animate-pulse rounded-xl border border-line bg-white/60" aria-hidden="true" />;

  const currency = ws.profile?.currency ?? db.documents()[0]?.currency ?? "INR";
  const today = todayIso();
  const s = summarise(db.documents(), today, currency);
  const m = (v: { minor: number; currency: string }) => formatMoney(v, "en-IN");
  const name = ws.profile?.name;

  const quick = [
    { href: "/invoice-generator?new=1", label: "New invoice", icon: FileText },
    { href: "/quotation-generator?new=1", label: "New quotation", icon: Quote },
    { href: "/purchase-order-generator?new=1", label: "Purchase order", icon: ShoppingCart },
    { href: "/receipt-generator?new=1", label: "Receipt", icon: Receipt }
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl">{name ? `${name}` : "Your money"}</h1>
          <p className="mt-1 text-ink-soft">
            {db.documents().length === 0
              ? "Save a document and this fills in with what you are owed."
              : `As at ${formatDate(today, ws.profile?.country ?? "IN")}, on this device.`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {quick.map((q) => (
            <Link key={q.href} href={q.href} className="btn-ghost"><q.icon size={15} />{q.label}</Link>
          ))}
        </div>
      </div>

      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card label="Owed to you" value={m(s.outstanding)} sub={`${s.byClient.reduce((a, c) => a + c.count, 0)} unpaid documents`} strong />
        <Card label="Overdue" value={m(s.overdue)} sub={s.overdueCount ? `${s.overdueCount} past the due date` : "Nothing late"} tone={s.overdue.minor > 0 ? "bad" : undefined} />
        <Card label="Due this week" value={m(s.dueThisWeek)} sub="Falling due in the next seven days" />
        <Card label="Paid this month" value={m(s.paidThisMonth)} sub="Marked paid since the 1st" />
      </dl>

      {s.chase.length > 0 ? (
        <section className="card p-5">
          <div className="flex items-center gap-2">
            <TriangleAlert size={18} className="text-warn" aria-hidden="true" />
            <h2 className="font-display text-lg">Worth chasing today</h2>
          </div>
          <ul className="mt-3 divide-y divide-line">
            {s.chase.map(({ doc, daysLate }) => (
              <li key={doc.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <span>
                  <Link href={`/invoice-generator?doc=${doc.id}`} className="font-medium hover:underline">{doc.number}</Link>
                  <span className="text-ink-soft"> to {doc.clientName}</span>
                  <span className="block text-sm text-warn">{daysLate} days late, due {formatDate(doc.dueDate ?? doc.issueDate, doc.doc.country)}</span>
                </span>
                <span className="flex items-center gap-3">
                  <span className="tabular font-semibold">{m({ minor: doc.totalMinor - doc.paidMinor, currency: doc.currency })}</span>
                  <Link href={`/calculators/late-payment-interest`} className="btn-quiet text-sm">Work out interest<ArrowRight size={14} /></Link>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {s.byClient.length > 0 ? (
        <section className="card p-5">
          <h2 className="font-display text-lg">Who owes you most</h2>
          <ul className="mt-3 space-y-2">
            {s.byClient.map((c) => {
              const share = s.outstanding.minor ? Math.round((c.outstandingMinor / s.outstanding.minor) * 100) : 0;
              return (
                <li key={c.name}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="font-medium">{c.name}</span>
                    <span className="tabular text-ink-soft">{m({ minor: c.outstandingMinor, currency })} across {c.count}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-canvas">
                    <div className="h-full rounded-full bg-forest" style={{ width: `${share}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
          {s.byClient.length > 1 && s.byClient[0].outstandingMinor > s.outstanding.minor * 0.6 ? (
            <p className="mt-4 text-sm text-ink-soft">More than half of what you are owed sits with one customer. Worth knowing before you plan around it.</p>
          ) : null}
        </section>
      ) : null}

      <DocumentList limit={6} title="Recent documents" />
    </div>
  );
}

function Card({ label, value, sub, strong, tone }: { label: string; value: string; sub?: string; strong?: boolean; tone?: "bad" }) {
  return (
    <div className={`rounded-xl border p-4 ${strong ? "border-forest bg-forest-pale" : "border-line bg-white"}`}>
      <dt className="text-[0.68rem] font-semibold uppercase tracking-wider text-ink-faint">{label}</dt>
      <dd className={`tabular font-display font-semibold ${strong ? "text-3xl" : "text-2xl"} ${tone === "bad" ? "text-bad" : ""}`}>{value}</dd>
      {sub ? <dd className="mt-1 text-sm text-ink-soft">{sub}</dd> : null}
    </div>
  );
}
