/**
 * Sync between a device and the server.
 *
 * The rules are deliberately simple, because clever merge strategies fail in ways nobody can
 * explain to a business owner at month end:
 *
 *   - Each record is matched by the client's own id, within an organisation and kind.
 *   - The copy with the higher version wins. Versions only ever increase.
 *   - If versions match, the later updatedAt wins, and a tie goes to the server.
 *   - A delete is a tombstone, so it travels like any other change. Deleting beats editing at the
 *     same version, because an invoice someone deleted coming back is worse than losing an edit.
 *
 * Anything the server rejects comes back in the response, so the device can tell the person
 * rather than quietly losing their work.
 */

export interface SyncRecord {
  kind: "profile" | "client" | "item" | "document" | "expense";
  localId: string;
  body: unknown;
  version: number;
  updatedAt: number;
  deletedAt?: number | null;
}

export type Resolution = "incoming" | "existing";

export function resolve(incoming: SyncRecord, existing: SyncRecord | undefined): Resolution {
  if (!existing) return "incoming";
  if (incoming.version > existing.version) return "incoming";
  if (incoming.version < existing.version) return "existing";

  // same version: a delete wins, then the later timestamp, then the server
  const incomingDeleted = Boolean(incoming.deletedAt);
  const existingDeleted = Boolean(existing.deletedAt);
  if (incomingDeleted !== existingDeleted) return incomingDeleted ? "incoming" : "existing";
  return incoming.updatedAt > existing.updatedAt ? "incoming" : "existing";
}

export interface PushResult {
  applied: SyncRecord[];
  /** Records the server kept, which the device should adopt. */
  rejected: Array<{ record: SyncRecord; reason: "older-version" | "server-newer"; current: SyncRecord }>;
}

export function mergePush(incoming: SyncRecord[], existingByKey: Map<string, SyncRecord>): PushResult {
  const applied: SyncRecord[] = [];
  const rejected: PushResult["rejected"] = [];

  for (const rec of incoming) {
    const key = `${rec.kind}:${rec.localId}`;
    const existing = existingByKey.get(key);
    if (resolve(rec, existing) === "incoming") {
      // the stored version is always one past whatever was there, so two devices cannot collide
      const next = { ...rec, version: Math.max(rec.version, (existing?.version ?? 0) + 1) };
      existingByKey.set(key, next);
      applied.push(next);
    } else if (existing) {
      rejected.push({ record: rec, reason: rec.version < existing.version ? "older-version" : "server-newer", current: existing });
    }
  }

  return { applied, rejected };
}

/** What a device asks for: everything written after the cursor it last saw. */
export function changesSince(all: SyncRecord[], since: number, limit = 500): { records: SyncRecord[]; cursor: number; more: boolean } {
  const sorted = all.filter((r) => r.updatedAt > since).sort((a, b) => a.updatedAt - b.updatedAt);
  const page = sorted.slice(0, limit);
  return {
    records: page,
    cursor: page.length ? page[page.length - 1].updatedAt : since,
    more: sorted.length > page.length
  };
}
