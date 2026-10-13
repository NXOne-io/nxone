"use client";
import { Bell, Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { notificationPrefs, previewDigest, saveNotificationPrefs, syncAvailable, type NotificationPrefs } from "@/lib/sync/api";
import { sync } from "@/lib/sync/engine";

/**
 * Email reminders. Off unless asked for, and nothing is sent when there is nothing to say,
 * because a weekly email saying all is well is the fastest way into someone's spam folder.
 */
export default function Notifications() {
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "signed-out" | "off">(syncAvailable() ? "loading" : "off");
  const [preview, setPreview] = useState<{ subject: string; lines: string[]; worthSending: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!syncAvailable()) return;
    notificationPrefs().then((r) => {
      if (r.ok) { setPrefs(r.data); setState("ready"); }
      else setState(r.status === 401 ? "signed-out" : "off");
    });
  }, []);

  const change = async (patch: Partial<NotificationPrefs>) => {
    if (!prefs) return;
    const next = { ...prefs, ...patch };
    setPrefs(next);
    setBusy(true);
    const saved = await saveNotificationPrefs(next);
    if (!saved.ok) setPrefs(prefs);
    setBusy(false);
  };

  const showPreview = async () => {
    setBusy(true);
    const r = await previewDigest();
    if (r.ok) setPreview(r.data);
    setBusy(false);
  };

  if (state === "off") {
    return (
      <section className="card p-5">
        <h2 className="flex items-center gap-2 font-display text-lg"><Bell size={18} className="text-ink-faint" />Email reminders</h2>
        <p className="mt-2 max-w-2xl text-sm text-ink-soft">Reminders are sent by the service behind NXOne, which is not connected in this build. Everything else works without it.</p>
      </section>
    );
  }

  if (state === "signed-out") {
    return (
      <section className="card p-5">
        <h2 className="flex items-center gap-2 font-display text-lg"><Bell size={18} />Email reminders</h2>
        <p className="mt-2 max-w-2xl text-sm text-ink-soft">We can email you when invoices go overdue, which is the thing people most often mean to check and forget. It needs an account, since we have to know where to send it.</p>
        <Link href="/sign-in/" className="btn-primary mt-4">Sign in</Link>
      </section>
    );
  }

  return (
    <section className="card p-5">
      <h2 className="flex items-center gap-2 font-display text-lg"><Bell size={18} />Email reminders</h2>
      <p className="mt-1 max-w-2xl text-sm text-ink-soft">Off unless you ask. Nothing is sent when there is nothing to tell you.</p>

      {state === "loading" || !prefs ? (
        <p className="mt-4 flex items-center gap-2 text-sm text-ink-soft"><Loader2 size={15} className="animate-spin" />Checking</p>
      ) : (
        <>
          <div className="mt-4 space-y-2">
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-line p-3">
              <input type="checkbox" className="mt-1" checked={prefs.weeklyDigest} onChange={(e) => change({ weeklyDigest: e.target.checked })} disabled={busy} />
              <span>
                <span className="block font-semibold">A summary once a week</span>
                <span className="block text-sm text-ink-soft">What is overdue, what falls due next week, and any repeating invoices waiting to be made. Monday mornings.</span>
              </span>
            </label>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button type="button" className="btn-ghost" onClick={showPreview} disabled={busy}>Show me what it would say</button>
            {prefs.lastSentAt ? <span className="text-sm text-ink-faint">Last sent {new Date(prefs.lastSentAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span> : null}
          </div>

          {preview ? (
            preview.worthSending ? (
              <div className="mt-4 rounded-lg border border-line bg-canvas p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">{preview.subject}</p>
                <pre className="mt-2 whitespace-pre-wrap font-sans text-sm">{preview.lines.join("\n")}</pre>
              </div>
            ) : (
              <p className="mt-4 text-sm text-ink-soft">Nothing worth emailing about at the moment, so no email would be sent.</p>
            )
          ) : null}

          <p className="mt-4 text-xs text-ink-faint">
            The summary is built from what has synced to your account. Anything you have not synced is not in it.
          </p>
        </>
      )}
    </section>
  );
}
