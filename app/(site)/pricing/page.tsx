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
          The product is free, including keeping your work safe and on every device you use. You pay for the parts that cost us money to run: chasing people by email for you, and reading your bills from a photograph.
        </p>
      </header>
      <div className="mt-8"><Pricing /></div>

      <section className="prose-ft mt-16 max-w-[68ch]">
        <h2 className="text-2xl">Why this is the split</h2>
        <p>Making an invoice costs us nothing, because your browser does the work. Holding a few thousand small records costs us very little, so we do that for free too: losing somebody's books because they cleared their browser would be a poor way to run a business that asks to be trusted with accounts.</p>
        <p>What genuinely costs money is sending email on your behalf and having a service read a photographed bill. Those are what Pro pays for.</p>
        <h2 className="mt-8 text-2xl">What happens when a trial ends</h2>
        <p>Your work stays where it is, on your devices and in the copy we hold. Reminders stop arriving and bills stop being read for you. Nothing is deleted, nothing is locked, and you can export everything at any time, including after you stop paying.</p>
        <h2 className="mt-8 text-2xl">Changing or stopping</h2>
        <p>Monthly plans stop at the end of the month you have paid for. There is no notice period and no fee for leaving, and your data leaves with you.</p>
        <h2 className="mt-8 text-2xl">Working without an account</h2>
        <p>You can still use the whole product without signing up at all. Nothing is held for you and nothing is sent anywhere, which also means this browser is the only copy of your work, so take a backup now and then.</p>
      </section>
    </div>
  );
}
