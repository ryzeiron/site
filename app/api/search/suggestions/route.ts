import { NextResponse } from "next/server";
import { CARDS, SERIES, getBloc, getSerie, type Card, type Serie } from "@/lib/catalog";
import { getSleeves } from "@/lib/sleeves";

export const dynamic = "force-dynamic";

const MAX_CARDS = 6;
const MAX_SERIES = 4;
const MAX_SLEEVES = 4;

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function cardSearchText(card: Card) {
  const serie = getSerie(card.serieId);
  const bloc = serie ? getBloc(serie.blocId) : undefined;

  return normalizeSearch(
    [
      card.name,
      card.number,
      card.rarity,
      card.condition,
      card.language,
      serie?.name,
      serie?.code,
      bloc?.name,
    ]
      .filter(Boolean)
      .join(" "),
  );
}

function serieSearchText(serie: Serie) {
  const bloc = getBloc(serie.blocId);

  return normalizeSearch([serie.name, serie.code, bloc?.name].filter(Boolean).join(" "));
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = (url.searchParams.get("q") ?? "").trim();
  const terms = normalizeSearch(query).split(/\s+/).filter(Boolean);

  if (terms.length === 0) {
    return NextResponse.json({ cards: [], series: [], sleeves: [] });
  }

  const cards = CARDS.filter((card) => {
    const text = cardSearchText(card);
    return terms.every((term) => text.includes(term));
  })
    .slice(0, MAX_CARDS)
    .map((card) => {
      const serie = getSerie(card.serieId);
      const bloc = serie ? getBloc(serie.blocId) : undefined;

      return {
        id: card.id,
        name: card.name,
        number: card.number,
        image: card.image ?? null,
        serieName: serie?.name ?? null,
        serieCode: serie?.code ?? null,
        blocName: bloc?.name ?? null,
      };
    });

  const series = SERIES.filter((serie) => {
    const text = serieSearchText(serie);
    return terms.every((term) => text.includes(term));
  })
    .slice(0, MAX_SERIES)
    .map((serie) => {
      const bloc = getBloc(serie.blocId);

      return {
        id: serie.id,
        name: serie.name,
        code: serie.code,
        image: serie.image ?? null,
        blocId: bloc?.id ?? serie.blocId,
        blocName: bloc?.name ?? null,
      };
    });

  const sleeves = (await getSleeves({ activeOnly: true, cache: true }))
    .filter((sleeve) => {
      const text = normalizeSearch(
        [sleeve.name, sleeve.description].filter(Boolean).join(" "),
      );
      return terms.every((term) => text.includes(term));
    })
    .slice(0, MAX_SLEEVES)
    .map((sleeve) => ({
      id: sleeve.id,
      name: sleeve.name,
      image: sleeve.image ?? null,
      stock: sleeve.stock,
      priceCents: sleeve.priceCents,
    }));

  return NextResponse.json({ cards, series, sleeves });
}
