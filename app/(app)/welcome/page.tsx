import Onboarding from "@/components/Onboarding";

export const metadata = { title: "Set up your business" };

export default function Page() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold sm:text-3xl">Let us set you up</h1>
      <p className="mt-2 max-w-xl text-ink-soft">Three questions, about a minute. Everything stays on this device.</p>
      <div className="mt-6"><Onboarding /></div>
    </div>
  );
}
