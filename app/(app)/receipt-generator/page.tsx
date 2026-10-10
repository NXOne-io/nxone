import Builder from "@/components/builder/Builder";

export const metadata = {
  title: "Free Receipt Generator - Payment Receipt with Tax",
  description: "Create a payment receipt showing what was paid, when and for what, with tax where it applies. Free, no sign-up, and built in your browser."
};

export default function Page() {
  return (
    <div className="mx-auto w-full max-w-[100rem] px-4 py-6 sm:px-6">
      <header className="max-w-3xl">
        <h1 className="text-2xl font-semibold sm:text-3xl">Receipt generator</h1>
        <p className="mt-2 max-w-2xl text-ink-soft">Confirm money you have already been paid. Your customer needs it for their books, and you look organised, which never hurts.</p>
      </header>
      <div className="mt-5"><Builder kind="receipt" /></div>
    </div>
  );
}
