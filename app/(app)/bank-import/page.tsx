import BankImport from "@/components/BankImport";
export const metadata = { title: "Bank statement" };
export default function Page() {
  return <div className="mx-auto w-full max-w-[90rem] px-4 py-6 sm:px-6"><BankImport /></div>;
}
