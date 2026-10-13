import type { Profile } from "../store/types";

/** The opening balance in the shape the ledger wants, or nothing when none was entered. */
export function openingOf(profile?: Profile): { amountMinor: number; date: string } | undefined {
  if (!profile?.openingCashMinor || profile.openingCashMinor <= 0) return undefined;
  return { amountMinor: profile.openingCashMinor, date: profile.openingCashDate ?? "2000-01-01" };
}
