"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PACKS, packFor } from "@/lib/countries/packs";
import { calculate, counterpartRuleId, defaultTaxRuleId } from "@/lib/documents/totals";
import type { DocumentData, DocumentKind, LineItem } from "@/lib/documents/types";
import { addDays, guessCountry, todayIso } from "@/lib/format";
import { kindConfig } from "@/lib/documents/kinds";
import { store } from "@/lib/store/db";
import type { DocumentStatus } from "@/lib/store/types";
import { nextNumber } from "@/lib/format";

const KEY = "nxone.document.v1";
/** Which saved document the current draft belongs to, so a refresh still updates rather than duplicates. */
const LINK = "nxone.document.saved.v1";

export function emptyLine(country: string, isoDate: string, interRegion = false): LineItem {
  return { id: Math.random().toString(36).slice(2, 9), description: "", quantity: 1, rate: 0, taxRuleId: defaultTaxRuleId(country, isoDate, interRegion) };
}

/**
 * A fresh document, pre-filled from the saved profile where there is one: your details, logo,
 * signature, bank details, layout and the next number in your series.
 */
export function blankDocument(kind: DocumentKind, country: string): DocumentData {
  const issueDate = todayIso();
  const profile = typeof window === "undefined" ? undefined : store.getProfile();
  const useCountry = profile?.country ?? country;
  const pack = packFor(useCountry);
  const cfg = kindConfig(kind);
  const saved = profile?.nextNumbers?.[kind];
  return {
    kind, country: useCountry, currency: profile?.currency ?? pack.currency, issueDate,
    dueDate: cfg.secondDateLabel ? addDays(issueDate, cfg.secondDateDays ?? 0) : undefined,
    number: saved || `${cfg.numberPrefix}0001`,
    template: profile?.template ?? "classic",
    accentColor: profile?.accentColor ?? "#0B3D2E",
    seller: profile
      ? { name: profile.name, address: profile.address, email: profile.email, phone: profile.phone, website: profile.website, taxId: profile.taxId, region: profile.region }
      : { name: "", address: "", email: "", taxId: "", region: "" },
    logoDataUrl: profile?.logoDataUrl,
    signatureDataUrl: profile?.signatureDataUrl,
    signatoryName: profile?.signatoryName,
    signMode: profile?.signatureDataUrl ? "image" : "none",
    paymentDetails: cfg.showPaymentDetails ? profile?.paymentDetails : undefined,
    payment: cfg.showPaymentDetails ? { upiId: profile?.upiId, paymentLink: profile?.paymentLink, includeAmount: true } : undefined,
    buyer: { name: "", address: "", email: "", taxId: "", region: "" },
    placeOfSupply: "",
    items: [emptyLine(country, issueDate)],
    taxInclusive: false,
    roundOff: pack.code === "IN",
    terms: profile?.defaultTerms || cfg.defaultTerms || "",
    notes: cfg.defaultNotes ?? "",
  };
}

/** Called after a document is saved: the series moves on so the next one is ready. */
export function advanceNumber(kind: DocumentKind, used: string) {
  const profile = store.getProfile();
  if (!profile) return;
  store.saveProfile({ ...profile, nextNumbers: { ...profile.nextNumbers, [kind]: nextNumber(used) } });
}

/** Move a document to another country: currency, tax rules and regional defaults all follow. */
function withCountry(d: DocumentData, code: string): DocumentData {
  const pack = packFor(code);
  return {
    ...d, country: code, currency: pack.currency, roundOff: pack.code === "IN",
    placeOfSupply: "", seller: { ...d.seller, region: "" },
    items: d.items.map((i) => ({ ...i, taxRuleId: defaultTaxRuleId(code, d.issueDate), taxRateOverride: undefined }))
  };
}

/**
 * Holds the document being edited. It is kept in the browser's local storage so a refresh or a
 * closed tab does not lose an hour of typing. Nothing is sent anywhere.
 */
export function useDocument(kind: DocumentKind) {
  const [doc, setDoc] = useState<DocumentData>(() => blankDocument(kind, "IN"));
  const [loaded, setLoaded] = useState(false);
  /** Set once this document exists in the documents list, so saving again updates it. */
  const [savedId, setSavedId] = useState<string | undefined>();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    // ?new=1 starts a fresh document, which is what "New invoice" should always do
    if (params.has("new")) {
      try { localStorage.removeItem(`${KEY}.${kind}`); localStorage.removeItem(`${LINK}.${kind}`); } catch { /* ignore */ }
      setDoc(blankDocument(kind, guessCountry()));
      setSavedId(undefined);
      setLoaded(true);
      return;
    }

    // /invoice-generator?doc=dc_123 reopens a document you saved earlier
    const openId = params.get("doc");
    if (openId) {
      const found = store.getDocument(openId);
      if (found) { setDoc(found.doc); setSavedId(found.id); setLoaded(true); return; }
    }

    // /invoice-generator?copy=dc_123 starts a fresh one from an old one
    const copyId = params.get("copy");
    if (copyId) {
      const found = store.getDocument(copyId);
      if (found) {
        setSavedId(undefined);
        const profile = store.getProfile();
        setDoc({
          ...found.doc,
          number: profile?.nextNumbers?.[kind] ?? nextNumber(found.doc.number),
          issueDate: todayIso(),
          dueDate: found.doc.dueDate ? addDays(todayIso(), kindConfig(kind).secondDateDays ?? 14) : undefined,
          amountPaid: undefined
        });
        setLoaded(true);
        return;
      }
    }

    // a link such as /invoice-generator?country=GB starts you in the right country
    const asked = params.get("country")?.toUpperCase();
    const wanted = asked && PACKS.some((p) => p.code === asked) ? asked : undefined;

    try {
      const saved = localStorage.getItem(`${KEY}.${kind}`);
      if (saved) {
        const parsed = JSON.parse(saved) as DocumentData;
        if (parsed?.kind === kind && Array.isArray(parsed.items)) {
          // keep the saved work, but respect a country asked for in the address
          setDoc(wanted && parsed.country !== wanted ? withCountry(parsed, wanted) : parsed);
          // if this draft is a document already in the list, keep updating that one
          const link = localStorage.getItem(`${LINK}.${kind}`);
          if (link && store.getDocument(link)) setSavedId(link);
          setLoaded(true);
          return;
        }
      }
    } catch { /* storage unavailable or corrupt: start fresh */ }
    setDoc(blankDocument(kind, wanted ?? guessCountry()));
    setLoaded(true);
  }, [kind]);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(`${KEY}.${kind}`, JSON.stringify(doc));
      if (savedId) localStorage.setItem(`${LINK}.${kind}`, savedId);
      else localStorage.removeItem(`${LINK}.${kind}`);
    } catch { /* private mode */ }
  }, [doc, kind, loaded, savedId]);

  /**
   * Changing the place of supply or your own state switches every line between the intra-state and
   * inter-state version of the same rate, so an invoice can never end up half CGST and half IGST.
   */
  const update = useCallback((patch: Partial<DocumentData>) => setDoc((d) => {
    const next = { ...d, ...patch };
    const regionChanged = ("placeOfSupply" in patch && patch.placeOfSupply !== d.placeOfSupply)
      || ("seller" in patch && patch.seller?.region !== d.seller.region)
      || ("supplyType" in patch && patch.supplyType !== d.supplyType);
    if (!regionChanged) return next;
    const mode = next.supplyType ?? "auto";
    if (mode === "auto" && (!next.placeOfSupply || !next.seller.region)) return next;
    const inter = mode === "auto" ? next.placeOfSupply !== next.seller.region : mode === "inter";
    return { ...next, items: next.items.map((i) => ({ ...i, taxRuleId: counterpartRuleId(next.country, next.issueDate, i.taxRuleId, inter) })) };
  }), []);
  const updateItem = useCallback((id: string, patch: Partial<LineItem>) => setDoc((d) => ({ ...d, items: d.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) })), []);
  const addItem = useCallback(() => setDoc((d) => ({ ...d, items: [...d.items, emptyLine(d.country, d.issueDate, Boolean(d.placeOfSupply && d.seller.region && d.placeOfSupply !== d.seller.region))] })), []);
  const removeItem = useCallback((id: string) => setDoc((d) => ({ ...d, items: d.items.length > 1 ? d.items.filter((i) => i.id !== id) : d.items })), []);
  const moveItem = useCallback((id: string, dir: -1 | 1) => setDoc((d) => {
    const i = d.items.findIndex((x) => x.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= d.items.length) return d;
    const items = [...d.items];
    [items[i], items[j]] = [items[j], items[i]];
    return { ...d, items };
  }), []);

  /** Changing country switches currency, tax rules and round-off defaults together. */
  const setCountry = useCallback((code: string) => setDoc((d) => withCountry(d, code)), []);

  /** A clean document, with the next number from your series. */
  const reset = useCallback(() => {
    setDoc(blankDocument(kind, doc.country));
    setSavedId(undefined);
    try { localStorage.removeItem(`${LINK}.${kind}`); } catch { /* ignore */ }
  }, [kind, doc.country]);
  const totals = useMemo(() => calculate(doc), [doc]);

  /**
   * Puts the document in your list. Saving the same number twice updates it rather than making a
   * second copy, and the numbering series moves on the first time a document is saved.
   */
  const save = useCallback((status: DocumentStatus = "draft") => {
    const t = calculate(doc);
    const paidMinor = t.paid.minor;
    const resolved: DocumentStatus = status !== "draft" ? status
      : paidMinor >= t.total.minor && t.total.minor > 0 ? "paid"
      : paidMinor > 0 ? "partly-paid" : "draft";

    const saved = store.saveDocument({
      id: savedId, kind: doc.kind, number: doc.number, clientName: doc.buyer.name || "No customer",
      issueDate: doc.issueDate, dueDate: doc.dueDate, currency: doc.currency,
      totalMinor: t.total.minor, paidMinor, status: resolved, doc
    });
    setSavedId(saved.id);
    if (!savedId) advanceNumber(kind, doc.number);
    return saved;
  }, [doc, kind, savedId]);

  return { doc, setDoc, update, updateItem, addItem, removeItem, moveItem, setCountry, reset, totals, loaded, save, savedId };
}
