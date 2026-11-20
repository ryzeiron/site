import { isAdmin } from "@/lib/admin/auth";
import { normalizeSiteUrl } from "@/lib/site-url";
import {
  DEFAULT_WHATNOT_OPTIONS,
  buildWhatnotCsv,
  type WhatnotExportOptions,
} from "@/lib/whatnot-export";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function text(params: URLSearchParams, key: string, fallback: string, max = 120) {
  const value = params.get(key);
  return value === null ? fallback : value.trim().slice(0, max);
}

function number(params: URLSearchParams, key: string, fallback: number, min: number, max: number) {
  const value = Number((params.get(key) ?? "").replace(",", "."));
  if (!params.get(key) || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

export async function GET(request: Request) {
  if (!(await isAdmin())) {
    return new Response("Non autorise.", { status: 401 });
  }

  const params = new URL(request.url).searchParams;
  const d = DEFAULT_WHATNOT_OPTIONS;
  const options: WhatnotExportOptions = {
    category: text(params, "category", d.category),
    subCategory: text(params, "subCategory", d.subCategory),
    type: params.get("type") === "Auction" ? "Auction" : "Buy it Now",
    shippingProfile: text(params, "shippingProfile", d.shippingProfile),
    offerable: params.has("submitted") ? params.get("offerable") === "1" : d.offerable,
    hazmat: text(params, "hazmat", d.hazmat),
    condition: text(params, "condition", d.condition),
    priceAdjustPercent: number(params, "priceAdjustPercent", d.priceAdjustPercent, -90, 300),
    minPrice: number(params, "minPrice", d.minPrice, 0, 100_000),
    maxQuantity: Math.round(number(params, "maxQuantity", d.maxQuantity, 0, 100_000)),
    scope: text(params, "scope", "", 80),
    // Whatnot telecharge les images : il faut l'adresse publique du site.
    siteUrl: normalizeSiteUrl(
      process.env.NEXT_PUBLIC_SITE_URL?.startsWith("https://")
        ? process.env.NEXT_PUBLIC_SITE_URL
        : "https://www.pokedel62.fr",
    ),
  };

  const { csv, rowCount } = await buildWhatnotCsv(options);
  const date = new Date().toISOString().slice(0, 10);
  const suffix = options.scope ? `-${options.scope.replace(/[^a-z0-9-]+/gi, "-")}` : "";

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="whatnot-inventaire${suffix}-${date}.csv"`,
      "Cache-Control": "no-store",
      "X-Export-Rows": String(rowCount),
    },
  });
}
