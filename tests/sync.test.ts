import { describe, expect, it } from "vitest";
import { applyIncoming, markSynced, pendingRecords, toWire, type WireRecord } from "@/lib/sync/records";
import type { Workspace } from "@/lib/store/types";
import type { DocumentData } from "@/lib/documents/types";

const doc = {} as DocumentData;
const iso = (ms: number) => new Date(ms).toISOString();

const workspace = (over: Partial<Workspace> = {}): Workspace => ({
  version: 1, clients: [], items: [], documents: [], expenses: [], ...over
});

const client = (over: Partial<Workspace["clients"][number]> = {}) => ({
  id: "cl_1", name: "Globex", createdAt: iso(1000), updatedAt: iso(1000), version: 1, ...over
});

const savedDoc = (over: Partial<Workspace["documents"][number]> = {}) => ({
  id: "dc_1", kind: "invoice" as const, number: "INV-1", clientName: "Globex", issueDate: "2026-05-01",
  currency: "INR", totalMinor: 118000, paidMinor: 0, status: "sent" as const, doc,
  createdAt: iso(1000), updatedAt: iso(1000), version: 1, ...over
});

describe("what gets sent", () => {
  it("sends everything the first time", () => {
    const ws = workspace({ clients: [client()], documents: [savedDoc()] });
    expect(pendingRecords(ws).map((r) => r.kind).sort()).toEqual(["client", "document"]);
  });
  it("stops sending a record the server has accepted", () => {
    const ws = workspace({ clients: [client({ syncedAt: iso(2000) })] });
    expect(pendingRecords(ws)).toHaveLength(0);
  });
  it("sends it again once it is edited", () => {
    const ws = workspace({ clients: [client({ syncedAt: iso(2000), updatedAt: iso(3000) })] });
    expect(pendingRecords(ws)).toHaveLength(1);
  });
  it("sends deletions, because another device still has the record", () => {
    const ws = workspace({ clients: [client({ syncedAt: iso(2000), updatedAt: iso(3000), deletedAt: iso(3000) })] });
    const wire = pendingRecords(ws);
    expect(wire).toHaveLength(1);
    expect(wire[0].deletedAt).toBe(3000);
  });
  it("includes the profile", () => {
    const ws = workspace({ profile: { name: "Acme", country: "IN", currency: "INR", version: 1, updatedAt: iso(1000) } });
    expect(toWire(ws).find((r) => r.kind === "profile")?.body).toMatchObject({ name: "Acme" });
  });
});

describe("what comes down", () => {
  const incoming = (over: Partial<WireRecord> = {}): WireRecord => ({
    kind: "client", localId: "cl_1", body: { id: "cl_1", name: "Globex from the laptop", createdAt: iso(1000), updatedAt: iso(5000) },
    version: 5, updatedAt: 5000, ...over
  });

  it("adds a record this device has never seen", () => {
    const next = applyIncoming(workspace(), [incoming()]);
    expect(next.clients).toHaveLength(1);
    expect(next.clients[0].name).toBe("Globex from the laptop");
  });
  it("takes the newer version from the server", () => {
    const next = applyIncoming(workspace({ clients: [client({ version: 2 })] }), [incoming()]);
    expect(next.clients[0].name).toBe("Globex from the laptop");
    expect(next.clients[0].version).toBe(5);
  });
  it("keeps the local copy when this device is ahead", () => {
    const next = applyIncoming(workspace({ clients: [client({ version: 9, name: "Edited here" })] }), [incoming()]);
    expect(next.clients[0].name).toBe("Edited here");
  });
  it("accepts a deletion made on another device", () => {
    const next = applyIncoming(workspace({ clients: [client({ version: 1 })] }), [incoming({ version: 2, deletedAt: 6000 })]);
    expect(next.clients[0].deletedAt).toBeTruthy();
  });
  it("lets a delete beat an edit made at the same version", () => {
    const next = applyIncoming(workspace({ clients: [client({ version: 3, name: "Edited here", updatedAt: iso(9000) })] }), [incoming({ version: 3, deletedAt: 4000 })]);
    expect(next.clients[0].deletedAt).toBeTruthy();
  });
});

describe("after the server accepts", () => {
  it("marks records so they are not sent again", () => {
    const ws = workspace({ clients: [client()] });
    const next = markSynced(ws, [{ kind: "client", localId: "cl_1", version: 4 }]);
    expect(next.clients[0].syncedAt).toBeTruthy();
    expect(next.clients[0].version).toBe(4);
    expect(pendingRecords(next)).toHaveLength(0);
  });
  it("clears away tombstones once they have been delivered", () => {
    const ws = workspace({ clients: [client({ deletedAt: iso(3000) })] });
    const next = markSynced(ws, [{ kind: "client", localId: "cl_1", version: 2 }]);
    expect(next.clients).toHaveLength(0);
  });
  it("leaves an undelivered tombstone alone", () => {
    const ws = workspace({ clients: [client({ deletedAt: iso(3000) })] });
    expect(markSynced(ws, []).clients).toHaveLength(1);
  });
});
