"use client";
import { Download, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { store } from "@/lib/store/db";

/** Your data is on this device, which means a backup is your responsibility and ours to make easy. */
export default function DataControls() {
  const file = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");

  const download = () => {
    const blob = new Blob([store.export()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nxone-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  };

  const upload = async (f: File | undefined) => {
    if (!f) return;
    try {
      const counts = store.import(await f.text());
      setMessage(`Restored. You now have ${counts.clients} clients, ${counts.items} saved items, ${counts.documents} documents and ${counts.expenses} expenses.`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "That file could not be read.");
    }
  };

  return (
    <section className="card p-5">
      <h2 className="font-display text-lg">Backup</h2>
      <p className="mt-1 max-w-2xl text-sm text-ink-soft">
        Everything lives in this browser, which is private but fragile: clearing your browser data removes it. Download a backup now and then, and use the same file to move to another computer.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" className="btn-ghost" onClick={download}><Download size={16} />Download a backup</button>
        <button type="button" className="btn-ghost" onClick={() => file.current?.click()}><Upload size={16} />Restore from a backup</button>
        <input ref={file} type="file" accept="application/json" className="sr-only" onChange={(e) => upload(e.target.files?.[0])} />
      </div>
      {message ? <p className="mt-3 text-sm text-ink-soft">{message}</p> : null}
      <p className="mt-4 text-xs text-ink-faint">Restoring merges with what is here rather than replacing it, keeping whichever copy was edited last.</p>
    </section>
  );
}
