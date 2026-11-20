import "server-only";
import { getBloc, getSerie, listVariants, type Card } from "./catalog";
import { getAllCards } from "./custom-cards";
import { applyStockOverrides } from "./stock";
import { getDb } from "./db/client";
import { stockOverrides } from "./db/schema";
import { gt } from "drizzle-orm";

// Export de l'inventaire au format du modele CSV Whatnot (Seller Hub >
// Inventaire > Importer). Une ligne par carte ET par variante en stock.

export const WHATNOT_HEADERS = [
  "Category",
  "Sub Category",
  "Title",
  "Description",
  "Quantity",
  "Type",
  "Price",
  "Shipping Profile",
  "Offerable",
  "Hazmat",
  "Condition",
  "Cost Per Item",
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

export type WhatnotExportOptions = {
  category: string;
  subCategory: string;
  type: "Buy it Now" | "Auction";
  shippingProfile: string;
  offerable: boolean;
  hazmat: string;
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
  subCategory: "Pokémon Cards",
  type: "Buy it Now",
  shippingProfile: "0-1 oz",
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
      const price =
        Math.round(variant.price * (1 + options.priceAdjustPercent / 100) * 100) / 100;

      const title = truncate(
        `${card.name} ${card.number} ${variant.rarity} - ${serie?.name ?? ""} ${card.language}`
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
        price.toFixed(2),
        options.shippingProfile,
        options.offerable ? "TRUE" : "FALSE",
        options.hazmat,
        options.condition,
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

  // BOM : Excel ouvre correctement les accents.
  return { csv: `﻿${lines.join("\r\n")}\r\n`, rowCount, unitCount };
}
