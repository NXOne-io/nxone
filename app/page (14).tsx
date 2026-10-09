import ProfileForm from "@/components/ProfileForm";
import DataControls from "@/components/DataControls";
import SyncPanel from "@/components/SyncPanel";

export const metadata = { title: "Your business details" };

export default function Page() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6">
      <header className="max-w-2xl">
        <h1 className="text-2xl font-semibold sm:text-3xl">Your business</h1>
        <p className="mt-2 text-ink-soft">Fill this in once and every invoice, quotation, purchase order and receipt starts from it. All of it stays on this device.</p>
      </header>
      <div className="mt-6"><ProfileForm /></div>
      <div className="mt-10 space-y-6"><SyncPanel /><DataControls /></div>
    </div>
  );
}
