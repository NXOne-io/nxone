import Dashboard from "@/components/Dashboard";

export const metadata = { title: "Your money" };

export default function Page() {
  return (
    <div className="mx-auto w-full max-w-[90rem] px-4 py-6 sm:px-6">
      <Dashboard />
    </div>
  );
}
