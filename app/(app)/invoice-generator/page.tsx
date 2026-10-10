import Builder from "@/components/builder/Builder";

export const metadata = {
  title: "Free Invoice Generator - GST, VAT and Sales Tax Invoices",
  description: "Create a professional invoice with the correct tax format for India, the UK, US, UAE, Singapore, Australia or Canada. Free, no sign-up, and nothing is uploaded."
};

export default function Page() {
  return (
    <div className="mx-auto w-full max-w-[100rem] px-4 py-6 sm:px-6">
      <header className="max-w-3xl">
        <h1 className="text-2xl font-semibold sm:text-3xl">Invoice generator</h1>
        <p className="mt-2 max-w-2xl text-ink-soft">Fill in the left, watch the right. Add your logo and bank details, pick the HSN or SAC code by typing what you sell, and download the PDF when it looks right.</p>
      </header>
      <div className="mt-5"><Builder kind="invoice" /></div>
    </div>
  );
}
