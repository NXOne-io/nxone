import type { RecordKind, WireRecord } from "./records";

/**
 * Talking to the API. The session lives in an httpOnly cookie, so requests carry credentials and
 * the browser handles the rest. Every call returns a plain result rather than throwing, because a
 * sync failure must never break the page someone is working on.
 */

export const API_URL = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");
export const syncAvailable = () => API_URL.length > 0;

export type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string };

async function call<T>(path: string, init: RequestInit = {}): Promise<ApiResult<T>> {
  if (!syncAvailable()) return { ok: false, status: 0, error: "Syncing is not switched on in this build." };
  try {
    const res = await fetch(`${API_URL}${path}`, {
      ...init,
      credentials: "include",
      headers: { "Content-Type": "application/json", ...(init.headers ?? {}) }
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, status: res.status, error: (body as { error?: string }).error ?? `Request failed (${res.status}).` };
    return { ok: true, data: body as T };
  } catch {
    return { ok: false, status: 0, error: "Could not reach the server. Your work is saved on this device." };
  }
}

export interface PlanLimits { users: number; devices: number | null; records: number | null; sync: boolean }

export interface Account {
  user: { email: string };
  orgId?: string;
  organisations: Array<{ id: string; name: string; plan: string; role: string }>;
  plan?: { id: string; name: string; trialing: boolean; trialEndsAt: number | null; limits: PlanLimits } | null;
}

export interface PlanOffer {
  id: string;
  name: string;
  summary: string;
  features: string[];
  limits: PlanLimits;
  price: { currency: string; monthlyMinor: number; yearlyMinor: number; extraUserMonthlyMinor?: number };
}

export const requestLink = (email: string) => call<{ ok: boolean; sent: boolean }>("/auth/request", { method: "POST", body: JSON.stringify({ email }) });
export const verifyLink = (token: string) => call<{ ok: boolean; user: { email: string }; orgId: string }>("/auth/verify", { method: "POST", body: JSON.stringify({ token }) });
export const whoAmI = () => call<Account>("/auth/me");
export const signOut = () => call<{ ok: boolean }>("/auth/sign-out", { method: "POST" });

export const plans = (country?: string) => call<{ country: string; provider: string; checkoutConnected: boolean; plans: PlanOffer[] }>(`/billing/plans${country ? `?country=${country}` : ""}`);

export const checkout = (plan: string, period: "monthly" | "yearly") =>
  call<{ url: string | null; reference: string; note?: string; provider: string; connected: boolean }>("/billing/checkout", { method: "POST", body: JSON.stringify({ plan, period }) });

export const pull = (since: number) => call<{ records: WireRecord[]; cursor: number; more: boolean }>(`/sync/pull?since=${since}`);

export const push = (records: WireRecord[]) =>
  call<{
    applied: Array<{ kind: RecordKind; localId: string; version: number }>;
    rejected: Array<{ record: WireRecord; reason: string; current: WireRecord }>;
    cursor: number;
  }>("/sync/push", { method: "POST", body: JSON.stringify({ records }) });
