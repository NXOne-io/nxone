import Payables from "@/components/Payables";
export const metadata = { title: "What you owe" };
export default function Page() {
  return <div className="mx-auto w-full max-w-[90rem] px-4 py-6 sm:px-6"><Payables /></div>;
}
