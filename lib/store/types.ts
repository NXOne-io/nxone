import type { DocumentData, DocumentKind } from "../documents/types";

/** Your own business, filled into every document so you type it once. */
export interface Profile extends Syncable {
  name: string;
  address?: string;
  email?: string;
  phone?: string;
  website?: string;
  taxId?: string;
  region?: string;
  country: string;
  currency: string;
  logoDataUrl?: string;
  signatureDataUrl?: string;
  signatoryName?: string;
  paymentDetails?: string;
  /** Your UPI id, used to put a scannable QR on Indian invoices. */
  upiId?: string;
  /** A hosted payment page, for cards and overseas customers. */
  paymentLink?: string;
  defaultTerms?: string;
  /** Next number for each kind, so a new invoice carries on from the last one. */
  nextNumbers?: Partial<Record<DocumentKind, string>>;
  accentColor?: string;
  template?: DocumentData["template"];
  updatedAt?: string;
}

/**
 * What every record that syncs carries. Version only ever increases, and a delete is a tombstone
 * rather than a removal, because a deletion has to reach your other devices too.
 */
export interface Syncable {
  version?: number;
  deletedAt?: string;
  /** When the server last accepted this exact copy. */
  syncedAt?: string;
}

export interface Client extends Syncable {
  id: string;
  name: string;
  address?: string;
  email?: string;
  phone?: string;
  taxId?: string;
  region?: string;
  /** Country code, for clients you bill abroad. */
  country?: string;
  notes?: string;
  /** Default payment terms in days for this client. */
  termsDays?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CatalogueItem extends Syncable {
  id: string;
  description: string;
  unit?: string;
  rate: number;
  /** HSN or SAC code, so the tax rate follows automatically. */
  code?: string;
  taxRuleId?: string;
  createdAt: string;
  updatedAt: string;
}

export type DocumentStatus = "draft" | "sent" | "partly-paid" | "paid" | "cancelled";

/** A document you saved, with just enough summary to list and total without recalculating. */
export interface SavedDocument extends Syncable {
  id: string;
  kind: DocumentKind;
  number: string;
  clientName: string;
  clientId?: string;
  issueDate: string;
  dueDate?: string;
  currency: string;
  /** Minor units, as everywhere else. */
  totalMinor: number;
  paidMinor: number;
  status: DocumentStatus;
  doc: DocumentData;
  createdAt: string;
  updatedAt: string;
}

/** Something you bought. Posts to the ledger the moment it is saved. */
export interface Expense extends Syncable {
  id: string;
  date: string;
  supplier: string;
  description?: string;
  /** Expense account code from the chart of accounts. */
  category: string;
  currency: string;
  netMinor: number;
  taxMinor: number;
  /** The cash account it was paid from, or empty when it is still owed. */
  paidFrom?: string;
  /** Bill or receipt number, for matching later. */
  reference?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Workspace {
  version: 1;
  /** How far this device has caught up with the server, in milliseconds. */
  syncCursor?: number;
  /** Who is signed in, so the app can say whose data it is syncing. */
  account?: { email: string; orgId?: string };
  profile?: Profile;
  clients: Client[];
  items: CatalogueItem[];
  documents: SavedDocument[];
  expenses: Expense[];
}

export const emptyWorkspace = (): Workspace => ({ version: 1, clients: [], items: [], documents: [], expenses: [] });
