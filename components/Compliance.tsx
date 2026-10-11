"use client";
import { CalendarClock, Check } from "lucide-react";
import { calendarFor } from "@/lib/compliance/calendar";
import type { Registration } from "@/lib/compliance/rules";
import { formatDate, todayIso } from "@/lib/format";
import { store } from "@/lib/store/db";
import { useHydrated, useWorkspace } from "@/lib/store/useStore";

const LABELS: Array<[Registration, string, string]> = [
  ["gst", "GST", "Registered for GST, so you file returns"],
  ["vat", "VAT", "Registered for VAT"],
  ["tds", "TDS", "You deduct tax at source from suppliers or salaries"],
  ["payroll", "Payroll", "You run payroll with PF or ESI"]
];

/** The filing calendar, built from what the business is actually registered for. */
export default function Compliance() {
  const [ws] = useWorkspace();
  const ready = useHydrated();

  if (!ready) return <div className="h-72 animate-pulse rounded-xl border border-line bg-white/60" aria-hidden="true" />;

  const profile = ws.profile;
  const country = profile?.country ?? "IN";
  const today = todayIso();
  const registrations = profile?.registrations ?? [];
  const deadlines = calendarFor({ country, registrations, today, quarterlyGst: profile?.quarterlyGst });

  const toggle = (r: Registration) => {
    if (!profile) return;
    const current = profile.registrations ?? [];
    store.saveProfile({ ...profile, registrations: current.includes(r) ? current.filter((x) => x !== r) : [...current, r] });
  };

  const relevant = country === "IN" ? LABELS.filter(([r]) => r !== "vat") : LABELS.filter(([r]) => r !== "gst" || country !== "IN");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold sm:text-3xl">Filing calendar</h1>
        <p className="mt-1 max-w-2xl text-ink-soft">Dates worked out from what you are registered for, so you are not reading a list of things that do not apply to you.</p>
      </div>

      <section className="card p-5">
        <h2 className="font-display text-lg">What applies to you</h2>
        {!profile ? (
          <p className="mt-2 text-sm text-warn">Fill in your business details first, so we know which country you are in.</p>
        ) : (
          <>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {relevant.map(([value, label, help]) => {
                const on = registrations.includes(value);
                return (
                  <label key={value} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${on ? "border-forest bg-forest-pale" : "border-line bg-white"}`}>
                    <input type="checkbox" className="mt-1" checked={on} onChange={() => toggle(value)} />
                    <span>
                      <span className="block font-semibold">{label}</span>
                      <span className="block text-sm text-ink-soft">{help}</span>
                    </span>
                  </label>
                );
              })}
            </div>
            {country === "IN" && registrations.includes("gst") ? (
              <label className="mt-3 flex items-center gap-2 text-sm text-ink-soft">
                <input type="checkbox" checked={Boolean(profile.quarterlyGst)} onChange={() => store.saveProfile({ ...profile, quarterlyGst: !profile.quarterlyGst })} />
                I file GST quarterly under the QRMP scheme
              </label>
            ) : null}
          </>
        )}
      </section>

      {deadlines.length === 0 ? (
        <div className="card p-8 text-center">
          <h2 className="font-display text-lg">Nothing to show yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">Tick what you are registered for above and the dates appear.</p>
        </div>
      ) : (
        <section className="card overflow-hidden">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-canvas text-left">
              <tr>
                <th className="px-5 py-2.5 font-semibold">Due</th>
                <th className="px-5 py-2.5 font-semibold">What</th>
                <th className="px-5 py-2.5 font-semibold">For</th>
                <th className="px-5 py-2.5 font-semibold">Where it comes from</th>
              </tr>
            </thead>
            <tbody>
              {deadlines.map((d) => (
                <tr key={d.id} className={`border-t border-line ${d.state === "overdue" ? "bg-bad/5" : ""}`}>
                  <td className="px-5 py-2.5 tabular">
                    {formatDate(d.dueDate, country)}
                    <span className={`block text-xs ${d.state === "overdue" ? "text-bad" : d.state === "due-soon" ? "text-warn" : "text-ink-faint"}`}>
                      {d.daysAway < 0 ? `${-d.daysAway} days ago` : d.daysAway === 0 ? "today" : `in ${d.daysAway} days`}
                    </span>
                  </td>
                  <td className="px-5 py-2.5">
                    <span className="flex items-center gap-2 font-medium">
                      {d.state === "overdue" ? <CalendarClock size={15} className="text-bad" aria-hidden="true" /> : null}
                      {d.rule.name}
                    </span>
                    <span className="block text-xs text-ink-soft">{d.rule.plain}</span>
                  </td>
                  <td className="px-5 py-2.5 text-ink-soft">{d.period}</td>
                  <td className="px-5 py-2.5 text-xs text-ink-faint">
                    {d.rule.source}
                    {d.rule.appliesWhen ? <span className="block">{d.rule.appliesWhen}</span> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <p className="max-w-2xl text-sm text-ink-faint">
        <Check size={14} className="mr-1 inline" aria-hidden="true" />
        These are the usual dates, shown with where they come from. Deadlines get extended, states differ, and your own position may change what applies. Check anything that matters against the authority named beside it.
      </p>
    </div>
  );
}
