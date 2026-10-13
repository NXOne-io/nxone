import { calculate } from "../documents/totals";
import type { DocumentData } from "../documents/types";
import { addDays, todayIso } from "../format";
import { newId } from "../store/db";
import type { Client, Expense, Profile, RecurringTemplate, SavedDocument, Workspace } from "../store/types";

/**
 * A believable business to look at.
 *
 * An empty product is impossible to judge, so this fills one in: customers who pay at different
 * speeds, invoices at every age including two that are late, expenses across several months and a
 * retainer that is due. Everything is marked as demo data and can be cleared in one go.
 */

export const DEMO_MARK = "demo";

const consulting = (country: string) => country.toUpperCase() === "IN";

export function buildDemo(profile: Profile): Pick<Workspace, "clients" | "documents" | "expenses" | "recurring"> {
  const today = todayIso();
  const country = profile.country;
  const currency = profile.currency;
  const indian = consulting(country);
  const taxRule = indian ? "in-gst-18" : country === "GB" ? "gb-vat-20" : undefined;

  const clients: Client[] = [
    { id: newId("cl"), name: "Globex Private Limited", email: "accounts@globex.example", phone: "98200 11111", address: "4th Floor, Prestige Tech Park\nBengaluru 560103", taxId: indian ? "29AACCG1234M1ZP" : undefined, region: indian ? "KA" : undefined, createdAt: today, updatedAt: today, version: 1 },
    { id: newId("cl"), name: "Initech LLP", email: "pay@initech.example", phone: "98200 22222", address: "12 Linking Road\nMumbai 400050", taxId: indian ? "27AAFCI5678K1Z2" : undefined, region: indian ? "MH" : undefined, createdAt: today, updatedAt: today, version: 1 },
    { id: newId("cl"), name: "Umbrella Design Co", email: "hello@umbrella.example", address: "7 Residency Road\nBengaluru 560025", region: indian ? "KA" : undefined, createdAt: today, updatedAt: today, version: 1 }
  ];

  const lineFor = (description: string, rate: number, code?: string) => ({
    id: Math.random().toString(36).slice(2, 9), description, quantity: 1, rate, taxRuleId: taxRule, code
  });

  const makeDoc = (over: {
    number: string; client: Client; issue: string; due: string; lines: Array<{ description: string; rate: number; code?: string }>;
  }): DocumentData => ({
    kind: "invoice", country, currency, issueDate: over.issue, number: over.number,
    seller: { name: profile.name, address: profile.address, email: profile.email, phone: profile.phone, taxId: profile.taxId, region: profile.region },
    buyer: { name: over.client.name, address: over.client.address, email: over.client.email, phone: over.client.phone, taxId: over.client.taxId, region: over.client.region },
    placeOfSupply: over.client.region,
    items: over.lines.map((l) => lineFor(l.description, l.rate, l.code)),
    taxInclusive: false, dueDate: over.due, roundOff: indian,
    template: profile.template ?? "classic", accentColor: profile.accentColor,
    paymentDetails: profile.paymentDetails, payment: profile.upiId ? { upiId: profile.upiId, includeAmount: true } : undefined,
    notes: DEMO_MARK
  });

  const spec: Array<{ number: string; client: Client; issue: number; due: number; lines: Array<{ description: string; rate: number; code?: string }>; status: SavedDocument["status"]; paidPart?: number }> = [
    { number: "INV-0007", client: clients[0], issue: -95, due: -65, lines: [{ description: "Website design and build", rate: 180000, code: indian ? "998314" : undefined }], status: "sent" },
    { number: "INV-0008", client: clients[1], issue: -62, due: -32, lines: [{ description: "Monthly retainer, August", rate: 50000, code: indian ? "998311" : undefined }], status: "partly-paid", paidPart: 0.5 },
    { number: "INV-0009", client: clients[2], issue: -40, due: -10, lines: [{ description: "Brand refresh", rate: 95000, code: indian ? "998391" : undefined }], status: "sent" },
    { number: "INV-0010", client: clients[1], issue: -31, due: -1, lines: [{ description: "Monthly retainer, September", rate: 50000, code: indian ? "998311" : undefined }], status: "paid" },
    { number: "INV-0011", client: clients[0], issue: -12, due: 18, lines: [{ description: "Support and hosting", rate: 24000, code: indian ? "998315" : undefined }], status: "sent" },
    { number: "INV-0012", client: clients[2], issue: -3, due: 27, lines: [{ description: "Campaign artwork", rate: 36000, code: indian ? "998391" : undefined }], status: "draft" }
  ];

  const documents: SavedDocument[] = spec.map((s) => {
    const doc = makeDoc({ number: s.number, client: s.client, issue: addDays(today, s.issue), due: addDays(today, s.due), lines: s.lines });
    const totals = calculate(doc);
    const paidMinor = s.status === "paid" ? totals.total.minor : s.paidPart ? Math.round(totals.total.minor * s.paidPart) : 0;
    return {
      id: newId("dc"), kind: "invoice", number: s.number, clientName: s.client.name, clientId: s.client.id,
      issueDate: doc.issueDate, dueDate: doc.dueDate, currency, totalMinor: totals.total.minor, paidMinor,
      status: s.status, doc, createdAt: doc.issueDate, updatedAt: addDays(doc.issueDate, 2) + "T00:00:00Z", version: 1
    };
  });

  const expenseSpec: Array<[string, string, number, number, number]> = [
    ["Office rent", "6010", -75, 45000, indian ? 8100 : 0],
    ["Office rent", "6010", -45, 45000, indian ? 8100 : 0],
    ["Office rent", "6010", -15, 45000, indian ? 8100 : 0],
    ["Design software", "6040", -60, 4200, indian ? 756 : 0],
    ["Design software", "6040", -30, 4200, indian ? 756 : 0],
    ["Online advertising", "6050", -22, 18000, indian ? 3240 : 0],
    ["Accountant", "6070", -18, 15000, indian ? 2700 : 0],
    ["Laptop", "1700", -50, 92000, indian ? 16560 : 0]
  ];

  const expenses: Expense[] = expenseSpec.map(([supplier, category, daysAgo, net, tax]) => ({
    id: newId("ex"), date: addDays(today, daysAgo), supplier, category: category === "1700" ? "6900" : category,
    description: DEMO_MARK, currency, netMinor: net * 100, taxMinor: tax * 100,
    paidFrom: daysAgo < -20 ? "1020" : undefined, createdAt: today, updatedAt: today, version: 1
  }));

  const retainerDoc = makeDoc({
    number: "INV-0013", client: clients[1], issue: today, due: addDays(today, 14),
    lines: [{ description: "Monthly retainer", rate: 50000, code: indian ? "998311" : undefined }]
  });

  const recurring: RecurringTemplate[] = [{
    id: newId("rc"), name: "Initech monthly retainer", frequency: "monthly",
    dayOfMonth: Number(today.split("-")[2]), startDate: addDays(today, -62), nextDate: addDays(today, -1),
    occurrences: 2, dueInDays: 30, paused: false, document: retainerDoc,
    createdAt: today, updatedAt: today, version: 1
  }];

  return { clients, documents, expenses, recurring };
}

/** True when a workspace is holding demo data rather than someone's real business. */
export function hasDemoData(ws: Workspace): boolean {
  return (ws.documents ?? []).some((d) => d.doc?.notes === DEMO_MARK) || (ws.expenses ?? []).some((e) => e.description === DEMO_MARK);
}

/** Removes only what the demo added, leaving anything the person made themselves. */
export function withoutDemo(ws: Workspace): Partial<Workspace> {
  const demoDocs = (ws.documents ?? []).filter((d) => d.doc?.notes === DEMO_MARK);
  const demoClientNames = new Set(demoDocs.map((d) => d.clientName));
  return {
    documents: (ws.documents ?? []).filter((d) => d.doc?.notes !== DEMO_MARK),
    expenses: (ws.expenses ?? []).filter((e) => e.description !== DEMO_MARK),
    clients: (ws.clients ?? []).filter((c) => !demoClientNames.has(c.name)),
    recurring: (ws.recurring ?? []).filter((r) => r.document?.notes !== DEMO_MARK)
  };
}
