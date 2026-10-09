"use client";
import { Check, CloudOff, Loader2, RefreshCw, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { syncAvailable } from "@/lib/sync/api";
import { sync, type SyncStatus } from "@/lib/sync/engine";

const when = (ms?: number) => {
  if (!ms) return "not yet";
  const mins = Math.round((Date.now() - ms) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} minutes ago`;
  return new Date(ms).toLocaleString("en-IN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" });
};

/** Says plainly what is happening, including when nothing is. */
export default function SyncPanel() {
  const [status, setStatus] = useState<SyncStatus>(sync.current());

  useEffect(() => {
    const stop = sync.subscribe(setStatus);
    void sync.resume();
    return stop;
  }, []);

  if (!syncAvailable() || status.state === "off") {
    return (
      <section className="card p-5">
        <h2 className="flex items-center gap-2 font-display text-lg"><CloudOff size={18} className="text-ink-faint" />This device only</h2>
        <p className="mt-2 max-w-2xl text-sm text-ink-soft">
          Everything you have made is held in this browser. That is private and fast, and it also means this browser is the only copy. Take a backup from below now and then.
        </p>
      </section>
    );
  }

  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg">Syncing</h2>
          {status.state === "signed-out" ? (
            <p className="mt-1 text-sm text-ink-soft">Not signed in, so this device is the only copy of your work.</p>
          ) : (
            <p className="mt-1 text-sm text-ink-soft">
              Signed in as {status.email}. Last synced {when(status.lastSyncedAt)}.
              {status.pending > 0 ? ` ${status.pending} change${status.pending === 1 ? "" : "s"} waiting to go up.` : " Everything here is on your account."}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {status.state === "working" ? <span className="flex items-center gap-1.5 text-sm text-ink-soft"><Loader2 size={15} className="animate-spin" />Working</span> : null}
          {status.state === "idle" ? <span className="flex items-center gap-1.5 text-sm text-ok"><Check size={15} />Up to date</span> : null}
          {status.state === "error" ? <span className="flex items-center gap-1.5 text-sm text-warn"><TriangleAlert size={15} />Could not sync</span> : null}
        </div>
      </div>

      {status.message ? <p className="mt-3 rounded-lg border border-warn/30 bg-warn/5 p-3 text-sm text-warn">{status.message} Your work is safe on this device and will go up when the connection returns.</p> : null}

      {status.overwritten > 0 ? (
        <p className="mt-3 rounded-lg border border-line bg-canvas p-3 text-sm text-ink-soft">
          {status.overwritten} record{status.overwritten === 1 ? " was" : "s were"} edited on another device more recently, so that version was kept. Check anything you changed here just now.
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {status.state === "signed-out" ? (
          <Link href="/sign-in/" className="btn-primary">Sign in to sync</Link>
        ) : (
          <>
            <button type="button" className="btn-ghost" onClick={() => void sync.run()} disabled={status.state === "working"}><RefreshCw size={15} />Sync now</button>
            <button type="button" className="btn-quiet" onClick={() => { if (confirm("Sign out? Your data stays on this device.")) void sync.signOutNow(); }}>Sign out</button>
          </>
        )}
      </div>
    </section>
  );
}
