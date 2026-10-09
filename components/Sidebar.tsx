"use client";
import { BookOpen, Building2, Calculator, ChartColumn, FileText, FolderOpen, HandCoins, LayoutDashboard, Quote, Receipt, Search, ShoppingCart, TrendingDown, Wallet, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import Logo from "./Logo";

const GROUPS: Array<{ title: string; items: Array<{ href: string; label: string; icon: typeof FileText; soon?: boolean }> }> = [
  {
    title: "Overview",
    items: [
      { href: "/dashboard", label: "Your money", icon: LayoutDashboard },
      { href: "/documents", label: "Documents", icon: FolderOpen },
      { href: "/receivables", label: "Owed to you", icon: HandCoins },
      { href: "/cash-flow", label: "Cash", icon: Wallet },
      { href: "/reports", label: "Reports", icon: ChartColumn }
    ]
  },
  {
    title: "Money out",
    items: [
      { href: "/expenses", label: "Expenses", icon: TrendingDown },
      { href: "/books", label: "Accounts", icon: BookOpen }
    ]
  },
  {
    title: "Create",
    items: [
      { href: "/invoice-generator", label: "Invoice", icon: FileText },
      { href: "/quotation-generator", label: "Quotation", icon: Quote },
      { href: "/purchase-order-generator", label: "Purchase order", icon: ShoppingCart },
      { href: "/receipt-generator", label: "Receipt", icon: Receipt }
    ]
  },
  {
    title: "Your business",
    items: [{ href: "/settings", label: "Business details", icon: Building2 }]
  },
  {
    title: "Work out",
    items: [
      { href: "/calculators", label: "Calculators", icon: Calculator },
      { href: "/hsn-code-finder", label: "HSN and SAC codes", icon: Search }
    ]
  }
];

export default function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const path = usePathname();
  useEffect(() => { onClose(); }, [path, onClose]);

  return (
    <>
      {open ? <div className="fixed inset-0 z-30 bg-ink/40 lg:hidden" onClick={onClose} aria-hidden="true" /> : null}
      <aside
        aria-label="Sections"
        className={`fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-line bg-white transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex h-14 items-center justify-between border-b border-line px-4">
          <Link href="/" aria-label="NXOne home"><Logo /></Link>
          <button type="button" className="rounded p-1 text-ink-faint hover:bg-canvas lg:hidden" onClick={onClose} aria-label="Close menu"><X size={18} /></button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {GROUPS.map((g) => (
            <div key={g.title} className="mb-6">
              <p className="mb-1 px-2 text-[0.68rem] font-semibold uppercase tracking-wider text-ink-faint">{g.title}</p>
              <ul className="space-y-0.5">
                {g.items.map((it) => {
                  const active = path === it.href;
                  return (
                    <li key={it.href}>
                      <Link
                        href={it.soon ? "#" : it.href}
                        aria-current={active ? "page" : undefined}
                        aria-disabled={it.soon}
                        className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium ${active ? "bg-forest text-white" : it.soon ? "cursor-not-allowed text-ink-faint" : "text-ink-soft hover:bg-canvas hover:text-ink"}`}
                      >
                        <it.icon size={16} aria-hidden="true" />
                        {it.label}
                        {it.soon ? <span className="ml-auto rounded bg-canvas px-1.5 py-0.5 text-[0.65rem] font-semibold text-ink-faint">Soon</span> : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-line p-3">
          <p className="rounded-lg bg-forest-pale p-3 text-xs text-ink-soft">
            Everything is worked out on this device. Nothing you type is uploaded.
          </p>
        </div>
      </aside>
    </>
  );
}
