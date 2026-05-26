import type { MetadataRoute } from "next";

const SITE_URL = "https://www.pokedel62.fr";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin/",
          "/api/",
          "/compte/",
          "/favoris/",
          "/panier/",
          "/connexion/",
          "/inscription/",
          "/commande/",
          "/suivi-commande/",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
