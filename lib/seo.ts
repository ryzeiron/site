import { getPreferredDisplayVariant } from "@/lib/display-variants";
import type { Bloc, Card, Serie } from "@/lib/catalog";

export const SITE_URL = "https://www.pokedel62.fr";

export function absoluteUrl(path = "/") {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function formatEuro(value: number) {
  return value.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
  });
}

export function createCardSeoTitle(card: Card) {
  return `${card.name} ${card.number} FR - Carte Pokémon à l'unité`;
}

export function createCardSeoDescription(card: Card, serie?: Serie) {
  const { variant } = getPreferredDisplayVariant(card);
  const serieLabel = serie ? `${serie.name} (${serie.code})` : "sa série";
  const condition = variant.condition ?? card.condition;
  const stockText =
    variant.stock > 0 ? `${variant.stock} en stock` : "stock à vérifier";

  return `${card.name} ${card.number} en français à l'unité. Série ${serieLabel}, rareté ${variant.rarity}, état ${condition}, ${stockText}, prix ${formatEuro(variant.price)}.`;
}

export function createCardProductJsonLd(card: Card, serie?: Serie, bloc?: Bloc) {
  const { variant } = getPreferredDisplayVariant(card);
  const condition = variant.condition ?? card.condition;
  const url = absoluteUrl(`/carte/${card.id}`);
  const description = createCardSeoDescription(card, serie);

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${card.name} ${card.number}`,
    image: card.image ? [absoluteUrl(card.image)] : undefined,
    description,
    sku: card.id,
    brand: {
      "@type": "Brand",
      name: "Pokémon",
    },
    category: "Carte Pokémon à l'unité",
    additionalProperty: [
      { "@type": "PropertyValue", name: "Langue", value: card.language },
      { "@type": "PropertyValue", name: "État", value: condition },
      { "@type": "PropertyValue", name: "Rareté", value: variant.rarity },
      serie
        ? { "@type": "PropertyValue", name: "Série", value: serie.name }
        : undefined,
      bloc
        ? { "@type": "PropertyValue", name: "Bloc", value: bloc.name }
        : undefined,
    ].filter(Boolean),
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "EUR",
      price: variant.price.toFixed(2),
      availability:
        variant.stock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/UsedCondition",
    },
  };
}

export function serializeJsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
