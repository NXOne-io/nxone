import { describe, expect, it } from "vitest";
import { detectDateOrder, parseStatement, splitCsv } from "@/lib/banking/parse";
import { guessCategory, normalise, similarity, suggestAll, suggestFor, supplierFrom } from "@/lib/banking/match";
import type { Expense, SavedDocument } from "@/lib/store/types";
import type { DocumentData } from "@/lib/documents/types";

const doc = {} as DocumentData;
const bill = (over: Partial<SavedDocument>): SavedDocument => ({
  id: over.id ?? Math.random().toString(36).slice(2), kind: "invoice", number: "INV-0007", clientName: "Globex Private Limited",
  issueDate: "2026-05-01", dueDate: "2026-05-15", currency: "INR", totalMinor: 11800000, paidMinor: 0,
  status: "sent", doc, createdAt: "", updatedAt: "", ...over
});

describe("reading the file", () => {
  it("handles quotes, commas inside fields, and semicolons", () => {
    const rows = splitCsv('Date,Description,Amount\n01/05/2026,"Globex, payment",1000\n');
    expect(rows).toHaveLength(2);
    expect(rows[1].cells[1]).toBe("Globex, payment");
  });

  it("reads a typical Indian bank export with separate debit and credit columns", () => {
    const csv = [
      "Txn Date,Narration,Debit,Credit,Balance",
      "02/05/2026,NEFT-GLOBEX PRIVATE LTD-INV-0007,,118000.00,218000.00",
      "05/05/2026,UPI-WEWORK INDIA-9823,53100.00,,164900.00"
    ].join("\n");
    const result = parseStatement(csv);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toMatchObject({ date: "2026-05-02", amountMinor: 11800000 });
    expect(result.rows[1].amountMinor).toBe(-5310000);
  });

  it("reads a single amount column where money out is negative", () => {
    const csv = "Date,Details,Amount\n2026-05-02,Stripe payout,1250.50\n2026-05-03,AWS,-98.20";
    const result = parseStatement(csv);
    expect(result.rows[0].amountMinor).toBe(125050);
    expect(result.rows[1].amountMinor).toBe(-9820);
  });

  it("copes with amounts in brackets and with currency symbols", () => {
    const csv = 'Date,Details,Amount\n02/05/2026,Rent,"(45,000.00)"\n03/05/2026,Fees,"₹1,234.56"';
    const result = parseStatement(csv);
    expect(result.rows[0].amountMinor).toBe(-4500000);
    expect(result.rows[1].amountMinor).toBe(123456);
  });

  it("refuses a row whose number was split by an unquoted comma, rather than reading it as a smaller amount", () => {
    const csv = "Date,Details,Amount\n02/05/2026,Rent,45,000.00";
    const result = parseStatement(csv);
    expect(result.rows).toHaveLength(0);
    expect(result.rejected[0].reason).toMatch(/unquoted comma/);
  });

  it("reads European formatting, where the comma is the decimal point", () => {
    const csv = 'Date,Details,Amount\n02/05/2026,Rent,"1.234,56"';
    expect(parseStatement(csv).rows[0].amountMinor).toBe(123456);
  });

  it("works without a header row at all", () => {
    const csv = "02/05/2026,Some payment,1000.00\n03/05/2026,Another,-500.00";
    const result = parseStatement(csv);
    expect(result.rows).toHaveLength(2);
    expect(result.header).toHaveLength(0);
  });

  it("explains the rows it could not read rather than dropping them", () => {
    const csv = "Date,Details,Amount\n02/05/2026,Fine,1000\nnonsense,row,here\n04/05/2026,No amount,";
    const result = parseStatement(csv);
    expect(result.rows).toHaveLength(1);
    expect(result.rejected).toHaveLength(2);
    expect(result.rejected[0].reason).toMatch(/date/);
    expect(result.rejected[1].reason).toMatch(/amount/);
  });
});

describe("which way round the dates are", () => {
  it("knows 25/12 must be day first", () => {
    expect(detectDateOrder(["25/12/2026", "03/04/2026"])).toBe("dmy");
  });
  it("knows 12/25 must be month first", () => {
    expect(detectDateOrder(["12/25/2026", "04/03/2026"])).toBe("mdy");
  });
  it("recognises an ISO date", () => {
    expect(detectDateOrder(["2026-05-02", "2026-05-03"])).toBe("ymd");
  });
  it("assumes day first when nothing settles it, which is how most of the world writes dates", () => {
    expect(detectDateOrder(["03/04/2026", "05/06/2026"])).toBe("dmy");
  });
  it("reads the whole file rather than deciding row by row", () => {
    const csv = "Date,D,Amount\n03/04/2026,A,100\n25/12/2026,B,200";
    expect(parseStatement(csv).rows.map((r) => r.date)).toEqual(["2026-04-03", "2026-12-25"]);
  });
});

describe("matching money in to invoices", () => {
  const docs = [bill({ id: "a" }), bill({ id: "b", number: "INV-0008", clientName: "Initech LLP", totalMinor: 5000000 })];

  it("matches on the amount and the name together", () => {
    const s = suggestFor({ line: 2, date: "2026-05-16", description: "NEFT GLOBEX PRIVATE LTD", amountMinor: 11800000 }, docs, [], "INR");
    expect(s.kind).toBe("payment");
    expect(s.document?.number).toBe("INV-0007");
    expect(s.confidence).toBeGreaterThan(0.6);
  });

  it("matches when the invoice number appears in the reference", () => {
    const s = suggestFor({ line: 2, date: "2026-05-16", description: "Transfer", amountMinor: 9999999, reference: "INV-0008" }, docs, [], "INR");
    expect(s.document?.number).toBe("INV-0008");
  });

  it("admits when nothing matches instead of guessing", () => {
    const s = suggestFor({ line: 2, date: "2026-05-16", description: "Unknown deposit", amountMinor: 777777 }, docs, [], "INR");
    expect(s.kind).toBe("unknown");
    expect(s.reason).toMatch(/no invoice obviously matches/i);
  });

  it("never matches two deposits to the same invoice", () => {
    const rows = [
      { line: 2, date: "2026-05-16", description: "NEFT GLOBEX PRIVATE LTD", amountMinor: 11800000 },
      { line: 3, date: "2026-05-17", description: "NEFT GLOBEX PRIVATE LTD", amountMinor: 11800000 }
    ];
    const suggestions = suggestAll(rows, docs, [], "INR");
    expect(suggestions.filter((s) => s.document?.id === "a")).toHaveLength(1);
    expect(suggestions.some((s) => s.reason.includes("already matches"))).toBe(true);
  });
});

describe("matching money out", () => {
  it("files a known supplier under the right category", () => {
    expect(guessCategory("UPI-AWS CLOUD SERVICES")!.code).toBe("6040");
    expect(guessCategory("NEFT WEWORK INDIA RENT")!.code).toBe("6010");
    expect(guessCategory("GOOGLE ADS")!.code).toBe("6050");
    expect(guessCategory("Something nobody recognises")).toBeNull();
  });

  it("says plainly when it is guessing", () => {
    const s = suggestFor({ line: 2, date: "2026-05-16", description: "PAYMENT XYZ123", amountMinor: -500000 }, [], [], "INR");
    expect(s.category).toBe("6900");
    expect(s.confidence).toBeLessThan(0.5);
    expect(s.reason).toMatch(/for you to correct/);
  });

  it("notices an expense that is already recorded", () => {
    const expense: Expense = { id: "e1", date: "2026-05-15", supplier: "WeWork", category: "6010", currency: "INR", netMinor: 4500000, taxMinor: 810000, createdAt: "", updatedAt: "" };
    const s = suggestFor({ line: 2, date: "2026-05-16", description: "WEWORK RENT", amountMinor: -5310000 }, [], [expense], "INR");
    expect(s.duplicateOf?.id).toBe("e1");
  });

  it("gets a readable supplier name out of bank noise", () => {
    expect(supplierFrom("NEFT-WEWORK INDIA PVT LTD-982301928")).toMatch(/Wework India/i);
    expect(supplierFrom("UPI/9823019283/PAYMENT")).toBeTruthy();
  });
});

describe("comparing descriptions", () => {
  it("ignores the words banks add", () => {
    expect(normalise("NEFT-GLOBEX PRIVATE LTD-INV0007")).not.toContain("neft");
    expect(similarity("NEFT GLOBEX PRIVATE LTD", "Globex Private Limited")).toBeGreaterThan(0.5);
  });
  it("does not match two unrelated names", () => {
    expect(similarity("WEWORK INDIA", "Globex Private Limited")).toBe(0);
  });
});
