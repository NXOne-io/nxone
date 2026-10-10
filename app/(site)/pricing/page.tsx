import Pricing from "@/components/Pricing";
import { absoluteUrl } from "@/lib/config";

export const metadata = {
  title: { absolute: "NXOne Pricing: Free Invoicing, Paid Syncing" },
  description: "NXOne is free to use on one device, with everything included. Pay only to sync across devices and work with a team.",
  alternates: { canonical: absoluteUrl("/pricing") }
};

export default function Page() {
  return (
    <div className="wrap py-12">
      <header className="max-w-2xl">
        <h1 className="text-3xl font-semibold sm:text-4xl">Pricing</h1>
        <p className="mt-3 text-lg text-ink-soft">
          Everything that runs on your own device is free, and stays free. You pay when you want the same work on more than one device, or more than one person in it.
        </p>
      </header>
      <div className="mt-8"><Pricing /></div>

      <section className="prose-ft mt-16 max-w-[68ch]">
        <h2 className="text-2xl">Why this is the split</h2>
        <p>Making an invoice costs us nothing: your browser does the work. Holding a copy of your business for you, and keeping two devices in step, costs money every month. So that is the line, rather than taking away features you already rely on.</p>
        <h2 className="mt-8 text-2xl">What happens when a trial ends</h2>
        <p>Nothing disappears. The app carries on exactly as it did before you signed in, on the device you are using. Syncing pauses, and your copy on our side waits for you. You can export everything at any time, including after you stop paying.</p>
        <h2 className="mt-8 text-2xl">Changing or stopping</h2>
        <p>Monthly plans stop at the end of the month you have paid for. There is no notice period and no fee for leaving, and your data leaves with you.</p>
      </section>
    </div>
  );
}
