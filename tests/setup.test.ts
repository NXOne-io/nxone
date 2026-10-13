import { describe, expect, it } from "vitest";
import { buildProfile, missingPieces, registrationChoices } from "@/lib/setup/onboarding";
import { buildDemo, hasDemoData, withoutDemo } from "@/lib/setup/demo";
import { aging } from "@/lib/analysis/receivables";
import { calendarFor } from "@/lib/compliance/calendar";
import { ledgerFor } from "@/lib/ledger/posting";
import { trialBalance } from "@/lib/ledger/journal";
import { todayIso } from "@/lib/format";
import { emptyWorkspace } from "@/lib/store/types";

describe("the questions we ask", () => {
  it("asks about the right tax in each country", () => {
    expect(registrationChoices("IN").map((c) => c.value)).toContain("gst");
    expect(registrationChoices("GB").map((c) => c.value)).toContain("vat");
    expect(registrationChoices("GB").map((c) => c.value)).not.toContain("gst");
  });
  it("only mentions TDS in India", () => {
    expect(registrationChoices("IN").map((c) => c.value)).toContain("tds");
    expect(registrationChoices("AU").map((c) => c.value)).not.toContain("tds");
  });
});

describe("turning answers into a business", () => {
  const summary = buildProfile({
    country: "IN", businessName: "Acme Consulting LLP", registrations: ["gst"],
    region: "MH", taxId: "27AAPFU0939F1ZV", invoiceStart: "INV-2026-010"
  });

  it("sets the currency from the country", () => {
    expect(summary.profile.currency).toBe("INR");
  });
  it("carries on from the numbering they already use", () => {
    expect(summary.profile.nextNumbers?.invoice).toBe("INV-2026-010");
  });
  it("defaults the numbering when they have none", () => {
    expect(buildProfile({ country: "GB", businessName: "X", registrations: [] }).profile.nextNumbers?.invoice).toBe("INV-0001");
  });
  it("explains what it configured, without claiming more than it did", () => {
    expect(summary.configured.map((c) => c.title)).toContain("Filing calendar");
    const none = buildProfile({ country: "GB", businessName: "X", registrations: [] });
    expect(none.configured.map((c) => c.title)).not.toContain("Filing calendar");
    expect(none.configured.find((c) => c.title === "Tax rules")!.detail).toMatch(/Not registered/);
  });
  it("produces a profile that drives the filing calendar", () => {
    const deadlines = calendarFor({ country: "IN", registrations: summary.profile.registrations ?? [], today: todayIso() });
    expect(deadlines.length).toBeGreaterThan(0);
  });
  it("says what is still worth adding", () => {
    expect(missingPieces(summary.profile)).toContain("your address");
    expect(missingPieces(undefined)).toEqual(["your business details"]);
  });
});

describe("demo data", () => {
  const { profile } = buildProfile({ country: "IN", businessName: "Acme Consulting LLP", registrations: ["gst"], region: "MH" });
  const demo = buildDemo(profile);
  const today = todayIso();

  it("creates a business with history rather than one invoice", () => {
    expect(demo.clients).toHaveLength(3);
    expect(demo.documents.length).toBeGreaterThanOrEqual(6);
    expect(demo.expenses.length).toBeGreaterThanOrEqual(8);
    expect(demo.recurring).toHaveLength(1);
  });
  it("includes invoices in every state, so each screen has something to show", () => {
    const states = new Set(demo.documents.map((d) => d.status));
    expect(states).toContain("paid");
    expect(states).toContain("partly-paid");
    expect(states).toContain("draft");
    expect(states).toContain("sent");
  });
  it("has money genuinely overdue, so the chase list is not empty", () => {
    const buckets = aging(demo.documents, today, "INR");
    expect(buckets.total.minor).toBeGreaterThan(0);
    expect(buckets.days31to60.minor + buckets.days61to90.minor).toBeGreaterThan(0);
  });
  it("produces books that balance", () => {
    const ledger = ledgerFor(demo.documents, demo.expenses.map((e) => ({
      id: e.id, date: e.date, supplier: e.supplier, category: e.category, currency: e.currency,
      netMinor: e.netMinor, taxMinor: e.taxMinor, paidFrom: e.paidFrom
    })), "INR");
    expect(trialBalance(ledger, "INR").balanced).toBe(true);
  });
  it("has a repeating invoice waiting, so that screen is not empty either", () => {
    expect(demo.recurring[0].nextDate <= today).toBe(true);
  });

  it("is recognisable as demo data, and removable", () => {
    const ws = { ...emptyWorkspace(), ...demo };
    expect(hasDemoData(ws)).toBe(true);
    const cleared = withoutDemo(ws);
    expect(cleared.documents).toHaveLength(0);
    expect(cleared.expenses).toHaveLength(0);
    expect(cleared.clients).toHaveLength(0);
  });
  it("leaves anything the person made themselves alone", () => {
    const mine = { ...demo.documents[0], id: "mine", number: "INV-9999", clientName: "Real Customer", doc: { ...demo.documents[0].doc, notes: "" } };
    const ws = { ...emptyWorkspace(), ...demo, documents: [...demo.documents, mine] };
    const cleared = withoutDemo(ws);
    expect(cleared.documents).toHaveLength(1);
    expect(cleared.documents![0].number).toBe("INV-9999");
  });
});
