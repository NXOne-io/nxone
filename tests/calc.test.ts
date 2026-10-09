import { describe, expect, it } from "vitest";
import { breakEven, discount, hourlyRate, lateFee, margin, marginToMarkup, markupToMargin, priceForMargin, priceForMarkup } from "@/lib/calc";

describe("margin and markup", () => {
  it("separates margin from markup, which people mix up constantly", () => {
    const r = margin(100, 60);
    expect(r.profit).toBe(40);
    expect(r.marginPct).toBe(40);
    expect(r.markupPct).toBe(66.67);
  });
  it("prices for a target margin and a target markup differently", () => {
    expect(priceForMargin(60, 40)).toBe(100);
    expect(priceForMarkup(60, 40)).toBe(84);
  });
  it("converts between the two", () => {
    expect(marginToMarkup(40)).toBe(66.67);
    expect(markupToMargin(66.67)).toBe(40);
  });
});

describe("break even", () => {
  it("works out units and revenue", () => {
    const r = breakEven(50000, 500, 300);
    expect(r.contributionPerUnit).toBe(200);
    expect(r.units).toBe(250);
    expect(r.revenue).toBe(125000);
  });
  it("says so when every sale loses money", () => {
    expect(breakEven(10000, 100, 120).impossible).toBe(true);
  });
  it("shows the cushion when current sales are given", () => {
    const r = breakEven(50000, 500, 300, 400);
    expect(r.marginOfSafetyPct).toBe(37.5);
    expect(r.profitAtVolume).toBe(30000);
  });
});

describe("late payment interest", () => {
  it("charges simple interest for the days past due", () => {
    const r = lateFee(100000, "2026-01-01", "2026-03-02", 1.5, "monthly");
    expect(r.daysLate).toBe(60);
    expect(r.interest).toBeCloseTo(2958.9, 1);
  });
  it("treats an annual rate as an annual rate", () => {
    expect(lateFee(100000, "2026-01-01", "2026-01-31", 18, "annual").interest).toBeCloseTo(1479.45, 1);
  });
  it("honours a grace period and never goes negative", () => {
    expect(lateFee(50000, "2026-01-01", "2026-01-05", 2, "monthly", 7).daysLate).toBe(0);
    expect(lateFee(50000, "2026-01-01", "2025-12-01", 2).interest).toBe(0);
  });
});

describe("discount and hourly rate", () => {
  it("stacks two discounts correctly", () => {
    expect(discount(1000, 20, 10)).toMatchObject({ final: 720, saved: 280, effectivePct: 28 });
  });
  it("prices an hour from what you need to earn", () => {
    const r = hourlyRate(1200000, 200000, 25, 46);
    expect(r.billableHours).toBe(1150);
    expect(r.rate).toBe(1217.39);
  });
});

describe("tax on a price", () => {
  it("adds tax", async () => {
    const { taxOnPrice } = await import("@/lib/calc");
    expect(taxOnPrice(1000, 18, "add")).toMatchObject({ taxable: 1000, tax: 180, gross: 1180 });
  });
  it("removes tax correctly, which is the bit people get wrong", async () => {
    const { taxOnPrice } = await import("@/lib/calc");
    const r = taxOnPrice(1180, 18, "remove");
    expect(r.taxable).toBe(1000);
    expect(r.tax).toBe(180);
  });
  it("splits into CGST and SGST without losing a paisa", async () => {
    const { taxOnPrice } = await import("@/lib/calc");
    const r = taxOnPrice(1000, 5, "add", "cgst-sgst");
    expect(r.parts.map((p) => p.amount)).toEqual([25, 25]);
    expect(r.parts.reduce((a, p) => a + p.amount, 0)).toBe(r.tax);
  });
});

describe("due dates", () => {
  it("counts net days from the invoice date", async () => {
    const { dueDate } = await import("@/lib/calc");
    expect(dueDate("2026-01-10", 30).due).toBe("2026-02-09");
  });
  it("counts end of month terms from the month end", async () => {
    const { dueDate } = await import("@/lib/calc");
    const r = dueDate("2026-01-10", 30, "eom");
    expect(r.due).toBe("2026-03-02");
    expect(r.days).toBe(51);
  });
  it("handles due on receipt", async () => {
    const { dueDate } = await import("@/lib/calc");
    expect(dueDate("2026-01-10", 0, "on-receipt").due).toBe("2026-01-10");
  });
});
