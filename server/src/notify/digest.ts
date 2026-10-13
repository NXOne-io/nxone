/**
 * The daily email.
 *
 * The server holds records but deliberately does not understand them, so the digest is assembled
 * from what sync already stores: invoices with dates and amounts, expenses, and the filing dates
 * the client sends up with the profile. Nothing is recalculated here, which keeps one set of tax
 * rules rather than two that can disagree.
 */

export interface DigestRecord {
  kind: string;
  body: Record<string, unknown>;
}

export interface DigestInput {
  businessName?: string;
  currency: string;
  today: string;
  records: DigestRecord[];
}

export interface Digest {
  /** Nothing worth saying means no email, rather than a cheerful empty one. */
  worthSending: boolean;
  subject: string;
  lines: string[];
  overdueMinor: number;
  dueSoonMinor: number;
  readyToSend: number;
}

const days = (from: string, to: string) =>
  Math.floor((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);

const money = (minor: number, currency: string) => {
  try {
    return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(minor / 100);
  } catch {
    return `${currency} ${Math.round(minor / 100)}`;
  }
};

export function buildDigest(input: DigestInput): Digest {
  const { today, currency } = input;
  const docs = input.records.filter((r) => r.kind === "document").map((r) => r.body as {
    kind?: string; number?: string; clientName?: string; dueDate?: string; status?: string;
    totalMinor?: number; paidMinor?: number; currency?: string; deletedAt?: string;
  });

  const live = docs.filter((d) => !d.deletedAt && d.currency === currency && (d.kind === "invoice" || d.kind === "proforma")
    && d.status !== "draft" && d.status !== "cancelled" && d.status !== "paid");

  let overdueMinor = 0, dueSoonMinor = 0;
  const overdue: Array<{ who: string; number: string; late: number; owed: number }> = [];

  for (const d of live) {
    const owed = Math.max(0, (d.totalMinor ?? 0) - (d.paidMinor ?? 0));
    if (!owed || !d.dueDate) continue;
    const late = days(d.dueDate, today);
    if (late > 0) {
      overdueMinor += owed;
      overdue.push({ who: d.clientName ?? "a customer", number: d.number ?? "", late, owed });
    } else if (late >= -7) {
      dueSoonMinor += owed;
    }
  }

  const recurringDue = input.records
    .filter((r) => r.kind === "recurring")
    .map((r) => r.body as { nextDate?: string; paused?: boolean; deletedAt?: string; name?: string })
    .filter((t) => !t.deletedAt && !t.paused && t.nextDate && t.nextDate <= today);

  overdue.sort((a, b) => b.owed - a.owed);

  const lines: string[] = [];
  if (overdue.length) {
    lines.push(`${money(overdueMinor, currency)} is overdue, across ${overdue.length} invoice${overdue.length === 1 ? "" : "s"}.`);
    for (const o of overdue.slice(0, 3)) {
      lines.push(`  ${o.who}, ${o.number}: ${money(o.owed, currency)}, ${o.late} days late.`);
    }
  }
  if (dueSoonMinor > 0) lines.push(`${money(dueSoonMinor, currency)} falls due in the next week.`);
  if (recurringDue.length) {
    lines.push(`${recurringDue.length} repeating invoice${recurringDue.length === 1 ? " is" : "s are"} ready to be made: ${recurringDue.map((t) => t.name).filter(Boolean).join(", ")}.`);
  }

  const worthSending = lines.length > 0;
  const subject = overdue.length
    ? `${money(overdueMinor, currency)} overdue${input.businessName ? ` at ${input.businessName}` : ""}`
    : recurringDue.length
      ? "Invoices ready to send"
      : "Your week ahead";

  return { worthSending, subject, lines, overdueMinor, dueSoonMinor, readyToSend: recurringDue.length };
}

export function digestEmail(digest: Digest, appUrl: string): { subject: string; text: string } {
  return {
    subject: digest.subject,
    text: [
      ...digest.lines,
      "",
      `Open NXOne: ${appUrl}/today/`,
      "",
      "You are getting this because you asked for a weekly summary. Turn it off in your settings at any time.",
      "NXOne"
    ].join("\n")
  };
}
