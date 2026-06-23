import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import ContactBanner from "@/components/ContactBanner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PromoBanner from "@/components/PromoBanner";
import SiteBackground from "@/components/SiteBackground";
import SplashIntro from "@/components/SplashIntro";
import BackButton from "@/components/BackButton";
import ScrollToTop from "@/components/ScrollToTop";
import SessionProviderWrapper from "@/components/SessionProviderWrapper";
import GlobalSearchBar from "@/components/GlobalSearchBar";
import PresenceHeartbeat from "@/components/PresenceHeartbeat";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.pokedel62.fr"),
  title: {
    default: "Pokedel62 - Boutique Pokemon",
    template: "%s - Pokedel62",
  },
  description:
    "Pokedel62 est une boutique Pokemon specialisee dans les cartes a l'unite, les blocs, les series, les raretes et les sleeves.",
  applicationName: "Pokedel62",
  keywords: [
    "Pokedel62",
    "PokeDel",
    "cartes Pokemon",
    "cartes Pokemon a l'unite",
    "boutique Pokemon",
    "sleeves Pokemon",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Pokedel62 - Boutique Pokemon",
    description:
      "Cartes Pokemon a l'unite, blocs, series, cartes rares et sleeves.",
    url: "https://www.pokedel62.fr",
    siteName: "Pokedel62",
    locale: "fr_FR",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
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
          <PromoBanner />
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
          <PresenceHeartbeat />
        </SessionProviderWrapper>
        <Analytics />
      </body>
    </html>
  );
}
