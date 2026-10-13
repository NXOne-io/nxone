"use client";
import { Sparkles, Trash2 } from "lucide-react";
import { useState } from "react";
import { DEMO_OPENING_MINOR, buildDemo, hasDemoData, withoutDemo } from "@/lib/setup/demo";
import { store } from "@/lib/store/db";
import { useHydrated, useWorkspace } from "@/lib/store/useStore";

/** Sample data, clearly labelled, and removable without touching anything real. */
export default function DemoControls() {
  const [ws, db] = useWorkspace();
  const ready = useHydrated();
  const [message, setMessage] = useState("");

  if (!ready) return null;
  const present = hasDemoData(ws);

  const add = () => {
    if (!ws.profile) { setMessage("Fill in your business details first, so the sample invoices look like yours."); return; }
    const demo = buildDemo(ws.profile);
    if (!ws.profile.openingCashMinor) {
      store.saveProfile({ ...ws.profile, openingCashMinor: DEMO_OPENING_MINOR, openingCashDate: demo.expenses[0]?.date });
    }
    store.apply({
      clients: [...db.raw().clients, ...demo.clients],
      documents: [...db.raw().documents, ...demo.documents],
      expenses: [...(db.raw().expenses ?? []), ...demo.expenses],
      recurring: [...(db.raw().recurring ?? []), ...demo.recurring]
    });
    setMessage("Added. Every screen now has something in it, and all of it is marked as sample data.");
  };

  const clear = () => {
    store.apply(withoutDemo(db.raw()));
    setMessage("Cleared. Anything you made yourself has been left alone.");
  };

  return (
    <section className="card p-5">
      <h2 className="font-display text-lg">Sample data</h2>
      <p className="mt-1 max-w-2xl text-sm text-ink-soft">
        {present
          ? "This workspace currently holds sample data: three customers, invoices at various ages including two overdue, a few months of expenses and a repeating invoice. None of it is real."
          : "A made-up business you can click around in, so the screens are not empty while you are deciding. Removing it later leaves your own work untouched."}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {present
          ? <button type="button" className="btn-ghost" onClick={clear}><Trash2 size={16} />Clear the sample data</button>
          : <button type="button" className="btn-ghost" onClick={add}><Sparkles size={16} />Fill with sample data</button>}
      </div>
      {message ? <p className="mt-3 text-sm text-ink-soft">{message}</p> : null}
    </section>
  );
}
