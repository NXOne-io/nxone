import { beforeEach, describe, expect, it } from "vitest";
import { Store, type StorageLike } from "@/lib/store/db";
import { summarise } from "@/lib/store/summary";
import type { SavedDocument } from "@/lib/store/types";
import type { DocumentData } from "@/lib/documents/types";

const memory = (): StorageLike => {
  const map = new Map<string, string>();
  return { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => void map.set(k, v), removeItem: (k) => void map.delete(k) };
};

const doc = {} as DocumentData;
const bill = (over: Partial<SavedDocument>): SavedDocument => ({
  id: over.id ?? Math.random().toString(36).slice(2), kind: "invoice", number: "INV-1", clientName: "Globex",
  issueDate: "2026-09-01", dueDate: "2026-09-15", currency: "INR", totalMinor: 100000, paidMinor: 0,
  status: "sent", doc, createdAt: "2026-09-01T00:00:00Z", updatedAt: "2026-09-01T00:00:00Z", ...over
});

let store: Store;
beforeEach(() => { store = new Store(memory()); });

describe("clients and items", () => {
  it("saves a client and finds it again", () => {
    store.saveClient({ name: "Globex Private Limited", email: "ap@globex.example" });
    expect(store.findClients("globex")[0].email).toBe("ap@globex.example");
  });
  it("updates rather than duplicating when the name matches", () => {
    store.saveClient({ name: "Globex", taxId: "29AACCG1234M1ZP" });
    store.saveClient({ name: "globex", email: "new@globex.example" });
    const all = store.clients();
    expect(all).toHaveLength(1);
    expect(all[0].email).toBe("new@globex.example");
    expect(all[0].taxId).toBe("29AACCG1234M1ZP");
  });
  it("keeps a catalogue of what you sell", () => {
    store.saveItem({ description: "Monthly retainer", rate: 15000, code: "998314" });
    expect(store.findItems("retain")[0].rate).toBe(15000);
  });
});

describe("documents", () => {
  it("saves and updates by number instead of piling up copies", () => {
    store.saveDocument(bill({ number: "INV-7" }));
    store.saveDocument(bill({ number: "INV-7", totalMinor: 250000 }));
    expect(store.documents()).toHaveLength(1);
    expect(store.documents()[0].totalMinor).toBe(250000);
  });
  it("marks paid and fills in the amount", () => {
    const saved = store.saveDocument(bill({}));
    store.setStatus(saved.id, "paid");
    expect(store.getDocument(saved.id)?.paidMinor).toBe(100000);
  });
});

describe("backup", () => {
  it("exports and merges back, keeping the newer copy of each record", () => {
    store.saveClient({ name: "Globex" });
    const backup = store.export();

    const other = new Store(memory());
    other.saveClient({ name: "Initech" });
    const counts = other.import(backup);

    expect(counts.clients).toBe(2);
    expect(other.clients().map((c) => c.name)).toEqual(["Globex", "Initech"]);
  });
  it("refuses a file that is not a backup", () => {
    expect(() => store.import(JSON.stringify({ hello: "world" }))).toThrow(/not an NXOne backup/);
  });
  it("survives corrupt storage without losing the app", () => {
    const s = memory();
    s.setItem("nxone.workspace.v1", "{not json");
    expect(new Store(s).clients()).toEqual([]);
  });
});

describe("money summary", () => {
  const docs = [
    bill({ id: "a", number: "INV-1", dueDate: "2026-09-01", totalMinor: 100000 }),
    bill({ id: "b", number: "INV-2", dueDate: "2026-10-20", totalMinor: 50000 }),
    bill({ id: "c", number: "INV-3", dueDate: "2026-08-01", totalMinor: 300000, paidMinor: 100000, status: "partly-paid", clientName: "Initech" }),
    bill({ id: "d", number: "INV-4", status: "paid", totalMinor: 70000, updatedAt: "2026-10-05T00:00:00Z" }),
    bill({ id: "e", number: "INV-5", status: "draft", totalMinor: 999999 })
  ];
  const s = summarise(docs, "2026-10-15", "INR");

  it("adds up what is owed, ignoring drafts and cancelled documents", () => {
    expect(s.outstanding.minor).toBe(100000 + 50000 + 200000);
  });
  it("separates overdue from due soon", () => {
    expect(s.overdue.minor).toBe(300000);
    expect(s.overdueCount).toBe(2);
    expect(s.dueThisWeek.minor).toBe(50000);
  });
  it("counts what was paid this month", () => {
    expect(s.paidThisMonth.minor).toBe(70000);
  });
  it("puts the oldest debt at the top of the chase list", () => {
    expect(s.chase[0].doc.number).toBe("INV-3");
    expect(s.chase[0].daysLate).toBe(75);
  });
  it("groups what is owed by client", () => {
    expect(s.byClient[0]).toMatchObject({ name: "Initech", outstandingMinor: 200000, count: 1 });
  });
});
