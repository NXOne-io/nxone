import Builder from "@/components/builder/Builder";

export const metadata = {
  title: "Free Quotation Generator - Send a Price Before You Start",
  description: "Create a professional quotation or estimate with tax shown correctly for your country, then download it as a PDF. Free, no sign-up, nothing uploaded."
};

export default function Page() {
  return (
    <div className="mx-auto w-full max-w-[100rem] px-4 py-6 sm:px-6">
      <header className="max-w-3xl">
        <h1 className="text-2xl font-semibold sm:text-3xl">Quotation generator</h1>
        <p className="mt-2 max-w-2xl text-ink-soft">Say what you will do and what it costs, with a date the price expires so it does not follow you around for a year. When they say yes, the same details become the invoice.</p>
      </header>
      <div className="mt-5"><Builder kind="quote" /></div>
    </div>
  );
}
