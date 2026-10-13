"use client";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { missingPieces } from "@/lib/setup/onboarding";
import { useHydrated, useWorkspace } from "@/lib/store/useStore";

/**
 * Shown until the business is set up, and then only when something useful is still missing.
 * It disappears entirely once there is nothing worth saying, rather than nagging for ever.
 */
export default function SetupPrompt() {
  const [ws] = useWorkspace();
  const ready = useHydrated();
  if (!ready) return null;

  const profile = ws.profile;

  if (!profile?.name) {
    return (
      <div className="rounded-xl border border-forest bg-forest-pale p-5">
        <h2 className="font-display text-lg">Set up your business first</h2>
        <p className="mt-1 max-w-2xl text-sm text-ink-soft">
          A minute of questions and every invoice afterwards arrives with your details, your numbering and the right tax for your country.
        </p>
        <Link href="/welcome/" className="btn-primary mt-4">Set up now<ArrowRight size={16} /></Link>
      </div>
    );
  }

  const missing = missingPieces(profile);
  if (missing.length === 0) return null;

  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <p className="text-sm text-ink-soft">
        Worth adding when you have a moment: {missing.join(", ")}.{" "}
        <Link href="/settings/" className="font-medium underline">Your business details</Link>
      </p>
    </div>
  );
}
