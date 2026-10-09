import type { CatalogueItem, Client, Expense, Profile, SavedDocument, Workspace } from "../store/types";

/**
 * Translating between the workspace on this device and the records the server stores. The server
 * holds each record as a kind, an id, a version and a body of JSON; it never needs to understand
 * what an invoice is.
 */

export type RecordKind = "profile" | "client" | "item" | "document" | "expense";

export interface WireRecord {
  kind: RecordKind;
  localId: string;
  body: unknown;
  version: number;
  updatedAt: number;
  deletedAt?: number | null;
}

const ms = (iso?: string) => (iso ? Date.parse(iso) : 0);

/** Everything on this device, as the server wants to see it. */
export function toWire(ws: Workspace): WireRecord[] {
  const out: WireRecord[] = [];

  if (ws.profile) {
    out.push({ kind: "profile", localId: "profile", body: ws.profile, version: ws.profile.version ?? 1, updatedAt: ms(ws.profile.updatedAt) || Date.now() });
  }
  const add = (kind: RecordKind, rows: Array<Client | CatalogueItem | SavedDocument | Expense>) => {
    for (const row of rows) {
      out.push({ kind, localId: row.id, body: row, version: row.version ?? 1, updatedAt: ms(row.updatedAt), deletedAt: row.deletedAt ? ms(row.deletedAt) : null });
    }
  };
  add("client", ws.clients ?? []);
  add("item", ws.items ?? []);
  add("document", ws.documents ?? []);
  add("expense", ws.expenses ?? []);
  return out;
}

/** What has changed since the server last accepted it. */
export function pendingRecords(ws: Workspace): WireRecord[] {
  const needsSending = (row: { syncedAt?: string; updatedAt?: string }) => !row.syncedAt || ms(row.syncedAt) < ms(row.updatedAt);
  return toWire(ws).filter((r) => {
    if (r.kind === "profile") return needsSending(ws.profile ?? {});
    const source = collectionFor(ws, r.kind).find((row) => row.id === r.localId);
    return source ? needsSending(source) : false;
  });
}

export function collectionFor(ws: Workspace, kind: RecordKind): Array<Client | CatalogueItem | SavedDocument | Expense> {
  if (kind === "client") return ws.clients ?? [];
  if (kind === "item") return ws.items ?? [];
  if (kind === "document") return ws.documents ?? [];
  if (kind === "expense") return ws.expenses ?? [];
  return [];
}

/**
 * Applies records that came down from the server, using the same rule the server uses: the higher
 * version wins, a tie goes to the later edit, and a delete beats an edit at the same version.
 * Anything the local copy wins stays put and will be pushed on the next run.
 */
export function applyIncoming(ws: Workspace, incoming: WireRecord[]): Workspace {
  let next: Workspace = { ...ws };

  for (const rec of incoming) {
    if (rec.kind === "profile") {
      const mine = next.profile;
      if (!mine || serverWins(rec, { version: mine.version ?? 1, updatedAt: ms(mine.updatedAt) })) {
        next = { ...next, profile: { ...(rec.body as Profile), version: rec.version, syncedAt: new Date().toISOString() } };
      }
      continue;
    }

    const list = collectionFor(next, rec.kind);
    const mine = list.find((row) => row.id === rec.localId);

    if (mine && !serverWins(rec, { version: mine.version ?? 1, updatedAt: ms(mine.updatedAt), deleted: Boolean(mine.deletedAt) })) continue;

    const incomingRow = {
      ...(rec.body as Record<string, unknown>),
      id: rec.localId,
      version: rec.version,
      syncedAt: new Date().toISOString(),
      deletedAt: rec.deletedAt ? new Date(rec.deletedAt).toISOString() : undefined
    } as Client | CatalogueItem | SavedDocument | Expense;

    const updated = mine ? list.map((row) => (row.id === rec.localId ? incomingRow : row)) : [...list, incomingRow];
    next = withCollection(next, rec.kind, updated);
  }

  return next;
}

function serverWins(incoming: WireRecord, mine: { version: number; updatedAt: number; deleted?: boolean }): boolean {
  if (incoming.version > mine.version) return true;
  if (incoming.version < mine.version) return false;
  const incomingDeleted = Boolean(incoming.deletedAt);
  if (incomingDeleted !== Boolean(mine.deleted)) return incomingDeleted;
  return incoming.updatedAt > mine.updatedAt;
}

function withCollection(ws: Workspace, kind: RecordKind, rows: Array<Client | CatalogueItem | SavedDocument | Expense>): Workspace {
  if (kind === "client") return { ...ws, clients: rows as Client[] };
  if (kind === "item") return { ...ws, items: rows as CatalogueItem[] };
  if (kind === "document") return { ...ws, documents: rows as SavedDocument[] };
  if (kind === "expense") return { ...ws, expenses: rows as Expense[] };
  return ws;
}

/** Marks the copies the server accepted, so they stop being resent. */
export function markSynced(ws: Workspace, accepted: Array<{ kind: RecordKind; localId: string; version: number }>): Workspace {
  const at = new Date().toISOString();
  let next = { ...ws };

  for (const a of accepted) {
    if (a.kind === "profile") {
      if (next.profile) next = { ...next, profile: { ...next.profile, version: a.version, syncedAt: at } };
      continue;
    }
    const list = collectionFor(next, a.kind).map((row) => (row.id === a.localId ? { ...row, version: a.version, syncedAt: at } : row));
    next = withCollection(next, a.kind, list);
  }

  // tombstones the server has accepted can finally go
  return {
    ...next,
    clients: (next.clients ?? []).filter(keepRow),
    items: (next.items ?? []).filter(keepRow),
    documents: (next.documents ?? []).filter(keepRow),
    expenses: (next.expenses ?? []).filter(keepRow)
  };
}

const keepRow = (row: { deletedAt?: string; syncedAt?: string }) => !(row.deletedAt && row.syncedAt);
