import "server-only";
import { getBloc, getSerie, listVariants, type Card, type Condition } from "./catalog";
import { getAllCards } from "./custom-cards";
import { applyStockOverrides } from "./stock";
import { getDb } from "./db/client";
import { stockOverrides } from "./db/schema";
import { gt } from "drizzle-orm";

// Export de l'inventaire au format du modele CSV Whatnot (Seller Hub >
// Inventaire > Importer). Une ligne par carte ET par variante en stock.

// En-tetes exacts du modele francais "FR_Whatnot_quick_add_CSV_format".
export const WHATNOT_HEADERS = [
  "Catégorie",
  "Sous-catégorie",
  "Titre",
  "Description",
  "Quantité",
  "Type",
  "Prix",
  "Profil de livraison",
  "Offres Acceptées",
  "Matières dangereuses",
  "État",
  "Coût par article",
  "SKU",
  "Image URL 1",
  "Image URL 2",
  "Image URL 3",
  "Image URL 4",
  "Image URL 5",
  "Image URL 6",
  "Image URL 7",
  "Image URL 8",
] as const;

// Valeurs autorisees par le modele (listes deroulantes). Attention : les
// profils de livraison contiennent des espaces insecables (\u00a0).
const NBSP = "\u00a0";
export const WHATNOT_SHIPPING_PROFILES = [
  `De 0 à <20${NBSP}grammes`,
  `De 20${NBSP}g à <100${NBSP}g`,
  `De 100${NBSP}g à <250${NBSP}g`,
  `De 250${NBSP}g à <500${NBSP}g`,
  `De 500${NBSP}g à <750${NBSP}g`,
  `De 750${NBSP}g à <1${NBSP}kg`,
  `De 1${NBSP}kg à <2${NBSP}kg`,
  `De 0${NBSP}oz à 1${NBSP}oz`,
  `De 1${NBSP}oz à 3${NBSP}oz`,
  `De 4${NBSP}oz à 7${NBSP}oz`,
] as const;

export const WHATNOT_CONDITIONS = [
  "Near Mint",
  "Mint",
  "New",
  "Light Played",
  "Moderately Played",
  "Heavily Played",
  "Damaged",
  "Graded",
] as const;

// Etat du site -> valeur Whatnot (sous-categorie Cartes Pokemon).
export const SITE_TO_WHATNOT_CONDITION: Record<Condition, (typeof WHATNOT_CONDITIONS)[number]> = {
  Mint: "Mint",
  "Near Mint": "Near Mint",
  Excellent: "Light Played",
  Good: "Moderately Played",
  Played: "Heavily Played",
};

export const WHATNOT_TYPES = ["Buy it Now", "Auction", "Giveaway"] as const;
export type WhatnotType = (typeof WHATNOT_TYPES)[number];

export type WhatnotExportOptions = {
  category: string;
  subCategory: string;
  type: WhatnotType;
  shippingProfile: string;
  offerable: boolean;
  hazmat: string;
  // Utilise seulement si une carte n'a pas d'etat enregistre sur le site.
  condition: string;
  // Ajustement du prix du site en % (ex. 10 = +10 % pour couvrir les frais Whatnot).
  priceAdjustPercent: number;
  // Prix minimum (en euros) d'une carte pour etre exportee. 0 = toutes.
  minPrice: number;
  // Quantite max par ligne (0 = tout le stock). Utile pour garder du stock sur le site.
  maxQuantity: number;
  // Filtre : "" = tout, "bloc:<id>" ou "serie:<id>".
  scope: string;
  siteUrl: string;
};

export const DEFAULT_WHATNOT_OPTIONS: Omit<WhatnotExportOptions, "siteUrl"> = {
  category: "Trading Card Games",
  subCategory: "Cartes Pokémon",
  type: "Buy it Now",
  shippingProfile: WHATNOT_SHIPPING_PROFILES[0],
  offerable: true,
  hazmat: "Not Hazmat",
  condition: "Near Mint",
  priceAdjustPercent: 0,
  minPrice: 0,
  maxQuantity: 0,
  scope: "",
};

const TITLE_MAX = 80;
const DESCRIPTION_MAX = 1000;

function csvCell(value: string | number) {
  const text = String(value ?? "");
  return /[",\r\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function absoluteUrl(path: string | undefined, siteUrl: string) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith("data:")) return "";
  return `${siteUrl}${path.startsWith("/") ? "" : "/"}${encodeURI(path)}`;
}

function truncate(text: string, max: number) {
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}

function matchesScope(card: Card, scope: string) {
  if (!scope) return true;
  if (scope.startsWith("serie:")) return card.serieId === scope.slice(6);
  if (scope.startsWith("bloc:")) {
    return getSerie(card.serieId)?.blocId === scope.slice(5);
  }
  return true;
}

// Les cartes en stock sont celles qui ont du stock dans le catalogue statique
// ou une ligne de stock > 0 en base : inutile de charger les ~18 000 cartes.
async function getInStockCandidates(scope: string) {
  const allCards = (await getAllCards()).filter((card) => matchesScope(card, scope));
  const stockedIds = new Set(
    (
      await getDb()
        .select({ cardId: stockOverrides.cardId })
        .from(stockOverrides)
        .where(gt(stockOverrides.stock, 0))
    ).map((row) => row.cardId),
  );

  const candidates = allCards.filter(
    (card) =>
      stockedIds.has(card.id) ||
      card.stock > 0 ||
      Boolean(card.altVariant && card.altVariant.stock > 0) ||
      Boolean(card.extraVariants?.some((variant) => variant.stock > 0)),
  );

  return applyStockOverrides(candidates);
}

export async function buildWhatnotCsv(options: WhatnotExportOptions) {
  return buildWhatnotCsvFromCards(await getInStockCandidates(options.scope), options);
}

// Partie pure (sans base de donnees) : cartes deja a jour du stock -> CSV.
export function buildWhatnotCsvFromCards(cards: Card[], options: WhatnotExportOptions) {
  const lines: string[] = [WHATNOT_HEADERS.join(",")];
  let rowCount = 0;
  let unitCount = 0;

  for (const card of cards) {
    const serie = getSerie(card.serieId);
    const bloc = serie ? getBloc(serie.blocId) : undefined;

    for (const { key, variant } of listVariants(card)) {
      if (variant.stock <= 0 || variant.price <= 0) continue;
      if (options.minPrice > 0 && variant.price < options.minPrice) continue;

      const quantity =
        options.maxQuantity > 0
          ? Math.min(variant.stock, options.maxQuantity)
          : variant.stock;
      // Whatnot n'accepte que des prix entiers (pas de centimes). On arrondit a
      // l'euro superieur pour ne jamais vendre moins cher que sur le site,
      // avec 1 EUR minimum. Le -0,001 evite qu'un 2,00 calcule en 2,0000001
      // devienne 3.
      const adjusted = variant.price * (1 + options.priceAdjustPercent / 100);
      const price = Math.max(1, Math.ceil(adjusted - 0.001));

      // "Commune" n'apporte rien dans le titre ; Reverse, Holo, etc. restent.
      const rarityInTitle = variant.rarity === "Commune" ? "" : variant.rarity;
      const title = truncate(
        `${card.name} ${card.number} ${rarityInTitle} - ${serie?.name ?? ""} ${card.language}`
          .replace(/\s+/g, " ")
          .trim(),
        TITLE_MAX,
      );
      const description = truncate(
        [
          `Carte Pokémon ${card.name} ${card.number}`,
          serie ? `Série : ${serie.name}${serie.code ? ` (${serie.code})` : ""}` : "",
          bloc ? `Bloc : ${bloc.name}` : "",
          `Rareté : ${variant.rarity}`,
          `Langue : ${card.language === "FR" ? "Français" : card.language}`,
          card.description ?? "",
          "Vendu par PokeDel62 - pokedel62.fr",
        ]
          .filter(Boolean)
          .join(" | "),
        DESCRIPTION_MAX,
      );

      // Etat enregistre sur le site pour cette carte / variante.
      const siteCondition: Condition | undefined = variant.condition ?? card.condition;
      const whatnotCondition =
        (siteCondition && SITE_TO_WHATNOT_CONDITION[siteCondition]) || options.condition;

      const images = [
        absoluteUrl(variant.image ?? card.image, options.siteUrl),
        absoluteUrl(variant.imageBack ?? card.imageBack, options.siteUrl),
      ];

      const row = [
        options.category,
        options.subCategory,
        title,
        description,
        quantity,
        options.type,
        String(price),
        options.shippingProfile,
        options.offerable ? "TRUE" : "FALSE",
        options.hazmat,
        whatnotCondition,
        "",
        `${card.id}:${key}`,
        images[0],
        images[1],
        "",
        "",
        "",
        "",
        "",
        "",
      ];

      lines.push(row.map(csvCell).join(","));
      rowCount += 1;
      unitCount += quantity;
    }
  }

  // Pas de BOM : l'import Whatnot peut lire la 1re colonne comme
  // "<BOM>Category" au lieu de "Category". Le fichier reste en UTF-8.
  return { csv: `${lines.join("\r\n")}\r\n`, rowCount, unitCount };
}
