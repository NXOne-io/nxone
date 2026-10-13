import { describe, expect, it } from "vitest";
import { fieldsFromText, receiptService } from "@/receipts/read";

describe("choosing a service", () => {
  it("says it is not connected when there is no key, rather than failing quietly", async () => {
    const service = receiptService({});
    expect(service.connected).toBe(false);
    expect(await service.read("data:image/jpeg;base64,abc")).toBeNull();
  });
  it("uses Vision only when both the provider and the key are set", () => {
    expect(receiptService({ RECEIPT_PROVIDER: "google-vision" }).connected).toBe(false);
    expect(receiptService({ RECEIPT_PROVIDER: "google-vision", GOOGLE_VISION_KEY: "k" }).connected).toBe(true);
  });
});

describe("pulling fields out of the text", () => {
  const indian = [
    "WeWork India Private Limited",
    "4th Floor, Prestige Tech Park, Bengaluru",
    "GSTIN: 29AACCW1234M1ZP",
    "Invoice No: WW/2026/0918",
    "Date: 04/10/2026",
    "Desk rental, October            45,000.00",
    "CGST 9%                          4,050.00",
    "SGST 9%                          4,050.00",
    "Grand Total                     53,100.00"
  ].join("\n");

  const receipt = fieldsFromText(indian);

  it("finds the total from the line that says total, not the largest number", () => {
    expect(receipt.totalMinor).toBe(5310000);
  });
  it("finds the date and reads it the way it was written", () => {
    expect(receipt.date).toBe("2026-10-04");
  });
  it("finds the supplier from the top of the bill", () => {
    expect(receipt.supplier).toMatch(/WeWork/);
  });
  it("finds the invoice number", () => {
    expect(receipt.invoiceNumber).toBe("WW/2026/0918");
  });
  it("recognises the currency from the symbols used", () => {
    expect(fieldsFromText("Total ₹1,200.00").currency).toBe("INR");
    expect(fieldsFromText("Total $42.00").currency).toBe("USD");
    expect(fieldsFromText("Total £42.00").currency).toBe("GBP");
  });
  it("keeps what it read, so a person can check rather than trust it", () => {
    expect(receipt.rawText).toContain("WeWork");
  });
  it("reports low confidence when it found almost nothing", () => {
    expect(fieldsFromText("thank you for your custom").confidence).toBeLessThan(0.3);
  });
  it("does not invent fields it could not find", () => {
    const sparse = fieldsFromText("Total 500.00");
    expect(sparse.invoiceNumber).toBeUndefined();
    expect(sparse.taxMinor).toBeUndefined();
  });
});
