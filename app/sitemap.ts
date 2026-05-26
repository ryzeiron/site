import type { MetadataRoute } from "next";
import { BLOCS, CARDS, SERIES } from "@/lib/catalog";

const SITE_URL = "https://www.pokedel62.fr";

function route(path: string, priority = 0.7): MetadataRoute.Sitemap[number] {
  return {
    url: `${SITE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority,
  };
}

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = [
    route("/", 1),
    route("/blocs", 0.9),
    route("/nouveautes", 0.8),
    route("/sleeve", 0.8),
    route("/avis", 0.7),
    route("/contact", 0.5),
    route("/cgv", 0.4),
    route("/mentions-legales", 0.4),
    route("/politique-confidentialite", 0.4),
  ];

  const blocRoutes = BLOCS.map((bloc) => route(`/blocs/${bloc.id}`, 0.8));

  const serieRoutes = SERIES.filter((serie) => !serie.comingSoon).map((serie) =>
    route(`/blocs/${serie.blocId}/${serie.id}`, 0.8),
  );

  const cardRoutes = CARDS.map((card) => route(`/carte/${card.id}`, 0.6));

  return [...staticRoutes, ...blocRoutes, ...serieRoutes, ...cardRoutes];
}
