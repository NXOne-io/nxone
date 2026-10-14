import { describe, expect, it } from "vitest";
import { ask, type AskContext } from "@/lib/ask/answer";
import { parseQuestion } from "@/lib/ask/intents";
import { toMajor } from "@/lib/money";
import type { DocumentData } from "@/lib/documents/types";
import type { Expense, SavedDocument } from "@/lib/store/types";

const TODAY = "2026-06-15";

const docData = (over: Partial<DocumentData> = {}): DocumentData => ({
  kind: "invoice", country: "IN", currency: "INR", issueDate: "2026-06-01", number: "INV-1",
  seller: { name: "Acme", region: "MH" }, buyer: { name: "Globex" }, placeOfSupply: "MH",
  items: [{ id: "1", description: "Work", quantity: 1, rate: 100000, taxRuleId: "in-gst-18" }],
  taxInclusive: false, ...over
});

const bill = (over: Partial<SavedDocument> = {}, doc = docData()): SavedDocument => ({
  id: over.id ?? Math.random().toString(36).slice(2), kind: "invoice", number: doc.number,
  clientName: doc.buyer.name, issueDate: doc.issueDate, dueDate: "2026-06-10", currency: "INR",
  totalMinor: 11800000, paidMinor: 0, status: "sent", doc, createdAt: "", updatedAt: "2026-06-12T00:00:00Z", ...over
});

const spend = (over: Partial<Expense> = {}): Expense => ({
  id: Math.random().toString(36).slice(2), date: "2026-06-05", supplier: "WeWork", category: "6010",
  currency: "INR", netMinor: 4500000, taxMinor: 0, paidFrom: "1020", createdAt: "", updatedAt: "", ...over
});

const context = (over: Partial<AskContext> = {}): AskContext => ({
  documents: [bill({ id: "a" })],
  expenses: [spend()],
  profile: { name: "Acme", country: "IN", currency: "INR", registrations: ["gst"], openingCashMinor: 50000000, openingCashDate: "2026-01-01" },
  today: TODAY,
  currency: "INR",
  ...over
});

describe("understanding the question", () => {
  it("picks the period out of the words", () => {
    expect(parseQuestion("how much did we make last month").period.kind).toBe("last-month");
    expect(parseQuestion("revenue this year").period.kind).toBe("this-year");
    expect(parseQuestion("profit").period.kind).toBe("this-month");
  });
  it("tells apart questions that use similar words", () => {
    expect(parseQuestion("who owes us the most").name).toBe("who-owes");
    expect(parseQuestion("what do we owe suppliers").name).toBe("owe-suppliers");
    expect(parseQuestion("how much is overdue").name).toBe("overdue");
  });
  it("reads an amount, including Indian units", () => {
    expect(parseQuestion("can we afford 60,000 a month")?.amount).toBe(60000);
    expect(parseQuestion("can we afford 1.5 lakh a month")?.amount).toBe(150000);
  });
});

describe("answering from the books", () => {
  it("answers profit with the same figure the accounts show", () => {
    const answer = ask("how much did we make this month", context());
    expect(toMajor(answer.value!)).toBe(100000 - 45000);
    expect(answer.headline).toMatch(/You made/);
    expect(answer.detail.join(" ")).toMatch(/not counted as income/);
  });

  it("says you lost money rather than reporting a negative profit", () => {
    const answer = ask("profit this month", context({ documents: [], expenses: [spend({ netMinor: 10000000 })] }));
    expect(answer.headline).toMatch(/You lost/);
  });

  it("names who owes the most, with the figures", () => {
    const answer = ask("who owes us the most", context({
      documents: [bill({ id: "a", totalMinor: 5000000 }), bill({ id: "b", totalMinor: 90000000 }, docData({ number: "INV-2", buyer: { name: "Initech" } }))]
    }));
    expect(answer.headline).toMatch(/Initech owes you the most/);
  });

  it("knows the difference between what you are owed and what you owe", () => {
    const owed = ask("how much are we owed", context());
    const owing = ask("what do we owe suppliers", context({ expenses: [spend({ paidFrom: undefined })] }));
    expect(owed.headline).toMatch(/owed/);
    expect(owing.headline).toMatch(/You owe/);
  });

  it("works out runway from cash and spending", () => {
    const answer = ask("how long will our cash last", context({ profile: { name: "A", country: "IN", currency: "INR", openingCashMinor: 100000 } }));
    expect(answer.headline).toMatch(/runs out in \d+ days/);
  });

  it("says when cash does not run out, rather than inventing a date", () => {
    const answer = ask("runway", context());
    expect(answer.headline).toMatch(/does not run out/);
  });

  it("warns when one customer is most of the income", () => {
    const answer = ask("who are our biggest customers this month", context());
    expect(answer.detail.join(" ")).toMatch(/More than half your income/);
  });

  it("answers whether you can afford something, and says it is arithmetic not advice", () => {
    const answer = ask("can we afford to hire someone at 60,000 a month", context());
    expect(answer.understood).toMatch(/60,000/);
    expect(answer.detail.join(" ")).toMatch(/not advice/);
  });

  it("asks for the amount when the affordability question has none", () => {
    expect(ask("can we afford to hire someone", context()).headline).toMatch(/Tell me the monthly cost/);
  });

  it("compares two months without pretending there is data", () => {
    const answer = ask("how does this month compare with last month", context());
    expect(answer.headline).toMatch(/nothing from .* to compare|up|down/);
  });

  it("points at the screen where the figure can be checked", () => {
    expect(ask("profit", context()).source?.href).toBe("/books/");
    expect(ask("how much is overdue", context()).source?.href).toBe("/receivables/");
  });

  it("admits when it does not understand, and offers what it can answer", () => {
    const answer = ask("what is the airspeed velocity of an unladen swallow", context());
    expect(answer.unanswered).toBe(true);
    expect(answer.detail.join(" ")).toMatch(/Try:/);
    expect(answer.detail.join(" ")).toMatch(/rather than guessing/);
  });

  it("never answers with a figure it did not calculate", () => {
    const answer = ask("profit this month", context({ documents: [], expenses: [] }));
    expect(answer.value).toBeDefined();
    expect(toMajor(answer.value!)).toBe(0);
  });

  it("tells you what it understood, naming the actual month rather than repeating your words", () => {
    // saying "May 2026" rather than "last month" makes a misread period obvious at a glance
    expect(ask("how much did we make last month", context()).understood).toBe("profit, May 2026");
    expect(ask("profit this year", context()).understood).toMatch(/profit, FY 2026-27/);
  });
});
