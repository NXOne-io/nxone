import Receivables from "@/components/Receivables";
export const metadata = { title: "Money owed to you" };
export default function Page() {
  return <div className="mx-auto w-full max-w-[90rem] px-4 py-6 sm:px-6"><Receivables /></div>;
}
