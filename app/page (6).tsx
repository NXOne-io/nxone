import Builder from "@/components/builder/Builder";

export const metadata = {
  title: "Free Purchase Order Generator - PO Format with Tax",
  description: "Create a purchase order for a supplier with quantities, rates and tax, and download it as a PDF. Free, no sign-up, and nothing leaves your browser."
};

export default function Page() {
  return (
    <div className="mx-auto w-full max-w-[100rem] px-4 py-6 sm:px-6">
      <header className="max-w-3xl">
        <h1 className="text-2xl font-semibold sm:text-3xl">Purchase order generator</h1>
        <p className="mt-2 max-w-2xl text-ink-soft">Put the order in writing before the goods turn up. It is much easier to argue about a price now than when the invoice arrives.</p>
      </header>
      <div className="mt-5"><Builder kind="purchase-order" /></div>
    </div>
  );
}
