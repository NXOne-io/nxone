import SignIn from "@/components/SignIn";

export const metadata = { title: "Sign in" };

export default function Page() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold sm:text-3xl">Sign in</h1>
      <p className="mt-2 max-w-xl text-ink-soft">An account exists for one reason: so the same invoices, customers and expenses are on your laptop and your phone.</p>
      <div className="mt-6"><SignIn /></div>
    </div>
  );
}
