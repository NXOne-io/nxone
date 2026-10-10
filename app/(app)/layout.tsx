"use client";
import { Menu } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";
import Sidebar from "@/components/Sidebar";

/** The working area: a fixed sidebar, a dense strip of controls, and the document beside the form. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex min-h-screen">
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-20 flex h-12 items-center gap-2 border-b border-line bg-white px-3 lg:hidden">
          <button type="button" onClick={() => setOpen(true)} className="rounded-lg p-1.5 hover:bg-canvas" aria-label="Open menu">
            <Menu size={20} />
          </button>
          <Link href="/" aria-label="NXOne home"><Logo /></Link>
        </div>
        <main id="main" className="flex-1">{children}</main>
      </div>
    </div>
  );
}
