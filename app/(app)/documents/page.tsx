import DocumentList from "@/components/DocumentList";

export const metadata = { title: "Your documents" };

export default function Page() {
  return (
    <div className="mx-auto w-full max-w-[90rem] px-4 py-6 sm:px-6">
      <header className="max-w-2xl">
        <h1 className="text-2xl font-semibold sm:text-3xl">Your documents</h1>
        <p className="mt-2 text-ink-soft">Everything you have saved on this device. Reopen one to change it, duplicate it for a repeat customer, or mark it paid when the money lands.</p>
      </header>
      <div className="mt-6"><DocumentList /></div>
    </div>
  );
}
