import type { Metadata } from "next";
import "./globals.css";
import ContactBanner from "@/components/ContactBanner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SiteBackground from "@/components/SiteBackground";
import SplashIntro from "@/components/SplashIntro";
import BackButton from "@/components/BackButton";
import ScrollToTop from "@/components/ScrollToTop";
import SessionProviderWrapper from "@/components/SessionProviderWrapper";
import GlobalSearchBar from "@/components/GlobalSearchBar";

export const metadata: Metadata = {
  title: {
    default: "PokeDel",
    template: "%s - PokeDel",
  },
  description:
    "PokeDel - vente de cartes Pokemon : blocs, series, cartes rares et singles a l'unite.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="min-h-screen flex flex-col">
        <SessionProviderWrapper>
          <SiteBackground />
          <SplashIntro />
          <Header />
          <ContactBanner />
          <GlobalSearchBar />
          <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
            <div className="mb-4">
              <BackButton />
            </div>
            {children}
          </main>
          <Footer />
          <ScrollToTop />
        </SessionProviderWrapper>
      </body>
    </html>
  );
}
