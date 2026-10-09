import Footer from "@/components/Footer";
import Header from "@/components/Header";

/** The public pages: a plain header and footer around the content. */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main id="main" className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
