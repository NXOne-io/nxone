import { describe, expect, it } from "vitest";
import { buildDigest, digestEmail, type DigestRecord } from "@/notify/digest";

const TODAY = "2026-06-30";

const invoice = (over: Record<string, unknown> = {}): DigestRecord => ({
  kind: "document",
  body: { kind: "invoice", number: "INV-1", clientName: "Globex", dueDate: "2026-06-01", status: "sent", totalMinor: 10000000, paidMinor: 0, currency: "INR", ...over }
});

describe("what goes in the digest", () => {
  it("says nothing when there is nothing to say", () => {
    const d = buildDigest({ currency: "INR", today: TODAY, records: [] });
    expect(d.worthSending).toBe(false);
    expect(d.lines).toHaveLength(0);
  });

  it("leads with what is overdue, biggest first", () => {
    const d = buildDigest({
      currency: "INR", today: TODAY, businessName: "Acme",
      records: [invoice({ number: "SMALL", totalMinor: 100000 }), invoice({ number: "BIG", totalMinor: 90000000 })]
    });
    expect(d.worthSending).toBe(true);
    expect(d.subject).toMatch(/overdue at Acme/);
    expect(d.lines[1]).toContain("BIG");
  });

  it("counts only what is actually owed", () => {
    const d = buildDigest({
      currency: "INR", today: TODAY,
      records: [
        invoice({ paidMinor: 4000000 }),
        invoice({ status: "draft" }),
        invoice({ status: "cancelled" }),
        invoice({ status: "paid", paidMinor: 10000000 }),
        invoice({ deletedAt: "2026-06-02T00:00:00Z" })
      ]
    });
    expect(d.overdueMinor).toBe(6000000);
  });

  it("separates what is coming up from what is late", () => {
    const d = buildDigest({ currency: "INR", today: TODAY, records: [invoice({ dueDate: "2026-07-03" })] });
    expect(d.overdueMinor).toBe(0);
    expect(d.dueSoonMinor).toBe(10000000);
  });

  it("ignores another currency rather than adding it up wrongly", () => {
    const d = buildDigest({ currency: "INR", today: TODAY, records: [invoice({ currency: "USD" })] });
    expect(d.worthSending).toBe(false);
  });

  it("mentions repeating invoices waiting to be made, but not paused ones", () => {
    const d = buildDigest({
      currency: "INR", today: TODAY,
      records: [
        { kind: "recurring", body: { name: "Initech retainer", nextDate: "2026-06-01" } },
        { kind: "recurring", body: { name: "Paused one", nextDate: "2026-06-01", paused: true } },
        { kind: "recurring", body: { name: "Later", nextDate: "2026-12-01" } }
      ]
    });
    expect(d.readyToSend).toBe(1);
    expect(d.lines.join(" ")).toContain("Initech retainer");
  });

  it("writes an email that says how to stop receiving it", () => {
    const d = buildDigest({ currency: "INR", today: TODAY, records: [invoice()] });
    const mail = digestEmail(d, "https://nxone.io");
    expect(mail.text).toContain("https://nxone.io/today/");
    expect(mail.text).toMatch(/Turn it off/);
  });
});
