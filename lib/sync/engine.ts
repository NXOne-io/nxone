"use client";
import { store } from "../store/db";
import * as api from "./api";
import { applyIncoming, markSynced, pendingRecords } from "./records";

/**
 * Keeping this device and the server in step.
 *
 * The app works entirely without this. Sync is something a person turns on, and when it fails the
 * only consequence should be a message: the work stays on the device either way.
 */

export type SyncState = "off" | "signed-out" | "idle" | "working" | "error" | "needs-plan";

export interface SyncStatus {
  state: SyncState;
  email?: string;
  lastSyncedAt?: number;
  pending: number;
  message?: string;
  /** The plan the account is on, so the app can say what is included. */
  plan?: { id: string; name: string; trialing: boolean; trialEndsAt: number | null };
  /** Records the server would not take, because another device had a newer copy. */
  overwritten: number;
}

type Listener = (status: SyncStatus) => void;

class SyncEngine {
  private status: SyncStatus = { state: api.syncAvailable() ? "signed-out" : "off", pending: 0, overwritten: 0 };
  private listeners = new Set<Listener>();
  private running = false;
  private timer?: ReturnType<typeof setInterval>;

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    fn(this.status);
    return () => { this.listeners.delete(fn); };
  }

  private set(patch: Partial<SyncStatus>) {
    this.status = { ...this.status, ...patch };
    this.listeners.forEach((fn) => fn(this.status));
  }

  current() { return this.status; }

  countPending() {
    const pending = pendingRecords(store.raw()).length;
    this.set({ pending });
    return pending;
  }

  /** Called on load: works out whether there is a session without bothering the person. */
  async resume() {
    if (!api.syncAvailable()) return;
    const me = await api.whoAmI();
    if (!me.ok) {
      store.setAccount(undefined);
      this.set({ state: "signed-out", email: undefined });
      return;
    }
    store.setAccount({ email: me.data.user.email, orgId: me.data.orgId });
    const plan = me.data.plan ? { id: me.data.plan.id, name: me.data.plan.name, trialing: me.data.plan.trialing, trialEndsAt: me.data.plan.trialEndsAt } : undefined;
    this.set({ state: me.data.plan && !me.data.plan.limits.sync ? "needs-plan" : "idle", email: me.data.user.email, plan });
    this.countPending();
    await this.run();
    this.startTimer();
  }

  startTimer(everyMs = 60_000) {
    this.stopTimer();
    this.timer = setInterval(() => { void this.run(); }, everyMs);
  }

  stopTimer() { if (this.timer) clearInterval(this.timer); this.timer = undefined; }

  /**
   * One round: send what changed here, then take what changed elsewhere. Pushing first means a
   * record edited on both devices is resolved by the server once, rather than ping-ponging.
   */
  async run(): Promise<SyncStatus> {
    if (!api.syncAvailable() || this.running || this.status.state === "signed-out") return this.status;
    this.running = true;
    this.set({ state: "working", message: undefined });

    try {
      let overwritten = 0;

      const pending = pendingRecords(store.raw());
      if (pending.length) {
        for (let i = 0; i < pending.length; i += 200) {
          const batch = pending.slice(i, i + 200);
          const result = await api.push(batch);
          if (!result.ok) {
            if (result.status === 401) { this.signedOut(); return this.status; }
            if (result.status === 402) { this.set({ state: "needs-plan", message: result.error }); return this.status; }
            this.set({ state: "error", message: result.error });
            return this.status;
          }
          store.apply(markSynced(store.raw(), result.data.applied));
          // where the server kept its own copy, take it: the other device was later
          if (result.data.rejected.length) {
            overwritten += result.data.rejected.length;
            store.apply(applyIncoming(store.raw(), result.data.rejected.map((r) => r.current)));
          }
        }
      }

      let cursor = store.getCursor();
      for (let page = 0; page < 20; page++) {
        const incoming = await api.pull(cursor);
        if (!incoming.ok) {
          if (incoming.status === 401) { this.signedOut(); return this.status; }
          if (incoming.status === 402) { this.set({ state: "needs-plan", message: incoming.error }); return this.status; }
          this.set({ state: "error", message: incoming.error });
          return this.status;
        }
        if (incoming.data.records.length) store.apply(applyIncoming(store.raw(), incoming.data.records));
        cursor = incoming.data.cursor;
        store.setCursor(cursor);
        if (!incoming.data.more) break;
      }

      this.set({ state: "idle", lastSyncedAt: Date.now(), overwritten, message: undefined });
      this.countPending();
    } finally {
      this.running = false;
    }

    return this.status;
  }

  async signIn(email: string) {
    const result = await api.requestLink(email);
    if (!result.ok) this.set({ state: "error", message: result.error });
    return result;
  }

  async completeSignIn(token: string) {
    const result = await api.verifyLink(token);
    if (!result.ok) { this.set({ state: "error", message: result.error }); return result; }
    store.setAccount({ email: result.data.user.email, orgId: result.data.orgId });
    this.set({ state: "idle", email: result.data.user.email, message: undefined });
    // a device that has been working offline sends everything it has on first sign in
    await this.run();
    this.startTimer();
    return result;
  }

  async signOutNow() {
    await api.signOut();
    this.signedOut();
  }

  /** Signing out leaves the data here. It only stops the copying. */
  private signedOut() {
    this.stopTimer();
    store.setAccount(undefined);
    this.set({ state: "signed-out", email: undefined, lastSyncedAt: undefined });
  }
}

export const sync = new SyncEngine();
