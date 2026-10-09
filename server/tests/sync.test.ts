import { describe, expect, it } from "vitest";
import { changesSince, mergePush, resolve, type SyncRecord } from "@/sync/merge";

const rec = (over: Partial<SyncRecord> = {}): SyncRecord => ({
  kind: "document", localId: "dc_1", body: { number: "INV-1" }, version: 1, updatedAt: 1000, ...over
});

describe("which copy wins", () => {
  it("takes anything the server has not seen", () => {
    expect(resolve(rec(), undefined)).toBe("incoming");
  });
  it("takes the higher version", () => {
    expect(resolve(rec({ version: 3 }), rec({ version: 2 }))).toBe("incoming");
    expect(resolve(rec({ version: 1 }), rec({ version: 2 }))).toBe("existing");
  });
  it("breaks a tie on time, and leans to the server when even that ties", () => {
    expect(resolve(rec({ updatedAt: 2000 }), rec({ updatedAt: 1000 }))).toBe("incoming");
    expect(resolve(rec({ updatedAt: 1000 }), rec({ updatedAt: 1000 }))).toBe("existing");
  });
  it("lets a delete win at the same version, because an invoice returning from the dead is worse", () => {
    expect(resolve(rec({ deletedAt: 1500 }), rec({ updatedAt: 9999 }))).toBe("incoming");
  });
});

describe("pushing changes", () => {
  it("applies new records and bumps the version past what was stored", () => {
    const existing = new Map<string, SyncRecord>([["document:dc_1", rec({ version: 4 })]]);
    const result = mergePush([rec({ localId: "dc_2", version: 1 }), rec({ version: 9 })], existing);
    expect(result.applied).toHaveLength(2);
    expect(result.applied.find((r) => r.localId === "dc_1")?.version).toBe(9);
    expect(result.rejected).toHaveLength(0);
  });
  it("rejects a stale write and hands back what the server holds, rather than losing it quietly", () => {
    const current = rec({ version: 5, body: { number: "INV-1-edited" } });
    const existing = new Map<string, SyncRecord>([["document:dc_1", current]]);
    const result = mergePush([rec({ version: 2 })], existing);
    expect(result.applied).toHaveLength(0);
    expect(result.rejected[0]).toMatchObject({ reason: "older-version" });
    expect(result.rejected[0].current.body).toEqual({ number: "INV-1-edited" });
  });
  it("keeps two devices from colliding on the same version number", () => {
    const existing = new Map<string, SyncRecord>();
    mergePush([rec({ version: 1 })], existing);
    const second = mergePush([rec({ version: 1, updatedAt: 2000 })], existing);
    expect(second.applied[0].version).toBe(2);
  });
});

describe("pulling changes", () => {
  const all = [rec({ localId: "a", updatedAt: 100 }), rec({ localId: "b", updatedAt: 200 }), rec({ localId: "c", updatedAt: 300 })];

  it("returns only what happened after the cursor", () => {
    const page = changesSince(all, 100);
    expect(page.records.map((r) => r.localId)).toEqual(["b", "c"]);
    expect(page.cursor).toBe(300);
    expect(page.more).toBe(false);
  });
  it("pages, and says when there is more to come", () => {
    const page = changesSince(all, 0, 2);
    expect(page.records.map((r) => r.localId)).toEqual(["a", "b"]);
    expect(page.cursor).toBe(200);
    expect(page.more).toBe(true);
  });
  it("holds still when nothing has changed", () => {
    expect(changesSince(all, 300)).toMatchObject({ records: [], cursor: 300, more: false });
  });
});
