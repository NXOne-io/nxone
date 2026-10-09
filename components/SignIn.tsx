"use client";
import { Check, Loader2, Mail } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { syncAvailable } from "@/lib/sync/api";
import { sync } from "@/lib/sync/engine";

type Stage = "ask" | "sent" | "checking" | "done" | "error";

/** Signing in is a link in an email. No password to choose, forget or leak. */
export default function SignIn() {
  const [stage, setStage] = useState<Stage>("ask");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) return;
    setStage("checking");
    sync.completeSignIn(token).then((result) => {
      if (result.ok) {
        setStage("done");
        setEmail(result.data.user.email);
        window.history.replaceState({}, "", window.location.pathname);
      } else {
        setStage("error");
        setMessage(result.error);
      }
    });
  }, []);

  const request = async () => {
    setMessage("");
    const result = await sync.signIn(email);
    if (result.ok) setStage("sent");
    else { setStage("error"); setMessage(result.error); }
  };

  if (!syncAvailable()) {
    return (
      <div className="card p-6">
        <h2 className="font-display text-lg">Syncing is not switched on</h2>
        <p className="mt-2 text-ink-soft">This copy of NXOne works entirely on this device, which is all most people need. Accounts and syncing between devices arrive when the service behind them is connected.</p>
      </div>
    );
  }

  return (
    <div className="card max-w-lg p-6">
      {stage === "checking" ? (
        <p className="flex items-center gap-2 text-ink-soft"><Loader2 size={18} className="animate-spin" />Signing you in</p>
      ) : null}

      {stage === "done" ? (
        <>
          <h2 className="flex items-center gap-2 font-display text-lg"><Check size={18} className="text-ok" />Signed in as {email}</h2>
          <p className="mt-2 text-ink-soft">Your documents, customers and expenses on this device are being copied to your account, and anything from your other devices is on its way here.</p>
          <Link href="/dashboard/" className="btn-primary mt-4">Go to your money</Link>
        </>
      ) : null}

      {stage === "sent" ? (
        <>
          <h2 className="flex items-center gap-2 font-display text-lg"><Mail size={18} />Check your email</h2>
          <p className="mt-2 text-ink-soft">If {email} has an account, or is about to, a sign-in link is on its way. It works once and expires in fifteen minutes.</p>
          <button type="button" className="btn-quiet mt-3" onClick={() => setStage("ask")}>Use a different address</button>
        </>
      ) : null}

      {stage === "ask" || stage === "error" ? (
        <>
          <h2 className="font-display text-lg">Sign in to sync</h2>
          <p className="mt-1 text-sm text-ink-soft">We send a link rather than asking for a password. Nothing to remember, and nothing for us to lose.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <input
              className="field max-w-xs"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void request(); }}
              placeholder="you@yourbusiness.com"
              aria-label="Your email address"
            />
            <button type="button" className="btn-primary" onClick={request} disabled={!email.includes("@")}>Send me a link</button>
          </div>
          {message ? <p className="mt-3 text-sm text-bad">{message}</p> : null}
          <p className="mt-4 text-xs text-ink-faint">Signing in copies your data to your account so another device can see it. Until you do, everything stays on this device only.</p>
        </>
      ) : null}
    </div>
  );
}
