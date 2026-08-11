import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.resolve(process.cwd()),

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.pokemontcg.io" },
      { protocol: "https", hostname: "assets.pokemon.com" },
      { protocol: "https", hostname: "assets.tcgdex.net" },
      // Photos de cartes : R2 aujourd'hui, Vercel Blob pour l'historique.
      { protocol: "https", hostname: "**.r2.dev" },
      { protocol: "https", hostname: "**.blob.vercel-storage.com" },
    ],
  },
};

export default nextConfig;
