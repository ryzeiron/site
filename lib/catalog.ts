// Catalogue : blocs > series > cartes
// Prix en centimes d'euro (ex: 1500 = 15,00 EUR)
// Ajoute / modifie librement.

export type Condition = "Mint" | "Near Mint" | "Excellent" | "Good" | "Played";
export type Rarity =
  | "Commune"
  | "Peu commune"
  | "Rare"
  | "Rare Holo"
  | "Ultra Rare"
  | "Secrete";

export type Bloc = {
  id: string;
  name: string;
  tagline: string;
  coverColor: string; // classes tailwind gradient
  image?: string;
};

export type Serie = {
  id: string;
  blocId: string;
  code: string; // ex: EV09
  name: string;
  releaseYear: number;
  image?: string;
};

export type Card = {
  id: string;
  serieId: string;
  name: string;
  number: string; // ex: 025/198
  rarity: Rarity;
  condition: Condition;
  language: "FR" | "EN" | "JP";
  priceCents: number;
  stock: number;
  image?: string;
  description?: string;
};

export const BLOCS: Bloc[] = [
  {
    id: "ecarlate-et-violet",
    name: "Ecarlate et Violet",
    tagline: "La 9e generation, de Paldea aux DLC.",
    coverColor: "from-rose-500 to-violet-600",
  },
  {
    id: "epee-et-bouclier",
    name: "Epee et Bouclier",
    tagline: "Galar, V, VMAX, VSTAR.",
    coverColor: "from-sky-500 to-indigo-600",
  },
  {
    id: "soleil-et-lune",
    name: "Soleil et Lune",
    tagline: "Alola et les cartes GX.",
    coverColor: "from-amber-400 to-orange-600",
  },
  {
    id: "xy",
    name: "XY",
    tagline: "Kalos et les Pokemon EX / Mega.",
    coverColor: "from-emerald-500 to-teal-700",
  },
  {
    id: "noir-et-blanc",
    name: "Noir et Blanc",
    tagline: "Unys, ere des Pokemon EX modernes.",
    coverColor: "from-slate-600 to-slate-900",
  },
];

export const SERIES: Serie[] = [
  // Ecarlate et Violet
  { id: "ev01", blocId: "ecarlate-et-violet", code: "EV01", name: "Ecarlate et Violet", releaseYear: 2023 },
  { id: "ev02", blocId: "ecarlate-et-violet", code: "EV02", name: "Evolutions a Paldea", releaseYear: 2023 },
  { id: "ev03", blocId: "ecarlate-et-violet", code: "EV03", name: "Flammes Obsidiennes", releaseYear: 2023 },
  { id: "ev04", blocId: "ecarlate-et-violet", code: "EV04", name: "Faille Paradoxe", releaseYear: 2024 },
  { id: "ev05", blocId: "ecarlate-et-violet", code: "EV05", name: "Forces Temporelles", releaseYear: 2024 },
  { id: "ev06", blocId: "ecarlate-et-violet", code: "EV06", name: "Masques du Crepuscule", releaseYear: 2024 },
  { id: "ev07", blocId: "ecarlate-et-violet", code: "EV07", name: "Fable Nebuleuse", releaseYear: 2024 },
  { id: "ev08", blocId: "ecarlate-et-violet", code: "EV08", name: "Etincelles Deferlantes", releaseYear: 2024 },
  { id: "ev09", blocId: "ecarlate-et-violet", code: "EV09", name: "Aventures Ensemble", releaseYear: 2025 },

  // Epee et Bouclier
  { id: "eb01", blocId: "epee-et-bouclier", code: "EB01", name: "Epee et Bouclier", releaseYear: 2020 },
  { id: "eb05", blocId: "epee-et-bouclier", code: "EB05", name: "Styles de Combat", releaseYear: 2021 },
  { id: "eb07", blocId: "epee-et-bouclier", code: "EB07", name: "Evolution Celeste", releaseYear: 2021 },
  { id: "eb10", blocId: "epee-et-bouclier", code: "EB10", name: "Astres Radieux", releaseYear: 2022 },
  { id: "eb12", blocId: "epee-et-bouclier", code: "EB12", name: "Tempete Argentee", releaseYear: 2022 },
  { id: "crown-zenith", blocId: "epee-et-bouclier", code: "EB12.5", name: "Zenith Supreme", releaseYear: 2023 },

  // Soleil et Lune
  { id: "sl01", blocId: "soleil-et-lune", code: "SL01", name: "Soleil et Lune", releaseYear: 2017 },
  { id: "sl03", blocId: "soleil-et-lune", code: "SL03", name: "Ombres Ardentes", releaseYear: 2017 },
  { id: "sl07", blocId: "soleil-et-lune", code: "SL07", name: "Tempete Celeste", releaseYear: 2018 },
  { id: "sl10", blocId: "soleil-et-lune", code: "SL10", name: "Alliance Infaillible", releaseYear: 2019 },
  { id: "sl12", blocId: "soleil-et-lune", code: "SL12", name: "Eclipse Cosmique", releaseYear: 2019 },

  // XY
  { id: "xy01", blocId: "xy", code: "XY01", name: "XY", releaseYear: 2014 },
  { id: "xy06", blocId: "xy", code: "XY06", name: "Ciel Rugissant", releaseYear: 2015 },
  { id: "xy09", blocId: "xy", code: "XY09", name: "Rupture Turbo", releaseYear: 2016 },
  { id: "xy11", blocId: "xy", code: "XY11", name: "Offensive Vapeur", releaseYear: 2016 },

  // Noir et Blanc
  { id: "nb01", blocId: "noir-et-blanc", code: "NB01", name: "Noir et Blanc", releaseYear: 2011 },
  { id: "nb05", blocId: "noir-et-blanc", code: "NB05", name: "Destinees Futures", releaseYear: 2012 },
  { id: "nb10", blocId: "noir-et-blanc", code: "NB10", name: "Explosion Plasma", releaseYear: 2013 },
];

export const CARDS: Card[] = [
  // ===========================================================
  // EXEMPLE DE CARTE - A DUPLIQUER POUR AJOUTER VOS PROPRES CARTES
  // -----------------------------------------------------------
  // Pour ajouter une carte :
  //   1. Copie tout le bloc entre { } ci-dessous (y compris la virgule finale)
  //   2. Colle-le juste apres, et modifie les valeurs
  //   3. "id" doit etre UNIQUE pour chaque carte (ex: ev09-004, ev09-005...)
  //   4. "serieId" doit correspondre a l'id d'une serie definie plus haut
  //        Blocs/series disponibles : voir BLOCS et SERIES au-dessus
  //   5. "priceCents" est en CENTIMES (1500 = 15,00 EUR)
  //   6. "stock" = nombre d'exemplaires en vente
  //   7. "rarity" doit etre l'une des valeurs du type Rarity (ligne 7)
  //   8. "condition" doit etre l'une des valeurs du type Condition (ligne 6)
  //   9. "language" : "FR", "EN" ou "JP"
  //  10. Sauvegarde le fichier -> le site se met a jour automatiquement
  //
  // POUR AJOUTER UNE PHOTO DE CARTE :
  //   - Option A (la plus simple) : mets ta photo dans le dossier public/cartes/
  //     puis ecris image: "/cartes/mon-fichier.jpg"
  //   - Option B : utilise une URL d'image deja en ligne, ex:
  //     image: "https://images.pokemontcg.io/sv8/6_hires.png"
  //   - Si tu ne mets pas de champ "image", le nom s'affiche a la place.
  // ===========================================================
  {
    id: "ev09-exemple",                // identifiant unique (bloc-serie-numero suffit)
    serieId: "ev09",                   // la carte appartient a la serie EV09
    name: "TEST",           // ex: "Pikachu ex"
    number: "001/159",                 // numero imprime sur la carte
    rarity: "Rare Holo",               // rarete (voir type Rarity)
    condition: "Near Mint",            // etat de la carte (voir type Condition)
    language: "FR",                    // langue : FR, EN ou JP
    priceCents: 100000,                // prix en centimes : 1000 = 10,00 EUR
    stock: 1,                          // nombre d'exemplaires en stock
    image: "/cartes/TEST.jpg", // photo de la carte
    description: "Description libre de la carte (facultatif).",
  },

  // EV09 - Aventures Ensemble
  {
    id: "ev09-001",
    serieId: "ev09",
    name: "Dracaufeu ex",
    number: "006/159",
    rarity: "Ultra Rare",
    condition: "Near Mint",
    language: "FR",
    priceCents: 4500,
    stock: 2,
    description: "Carte Dracaufeu ex brillante, edition EV09 Aventures Ensemble.",
  },
  {
    id: "ev09-002",
    serieId: "ev09",
    name: "Pikachu",
    number: "025/159",
    rarity: "Commune",
    condition: "Mint",
    language: "FR",
    priceCents: 150,
    stock: 20,
  },
  {
    id: "ev09-003",
    serieId: "ev09",
    name: "Mew ex",
    number: "151/159",
    rarity: "Secrete",
    condition: "Mint",
    language: "FR",
    priceCents: 6900,
    stock: 1,
  },

  // EV08 - Etincelles Deferlantes
  {
    id: "ev08-001",
    serieId: "ev08",
    name: "Pikachu ex",
    number: "238/191",
    rarity: "Secrete",
    condition: "Near Mint",
    language: "FR",
    priceCents: 12000,
    stock: 1,
    description: "Pikachu ex Full Art, tres recherchee.",
  },
  {
    id: "ev08-002",
    serieId: "ev08",
    name: "Magicarpe",
    number: "042/191",
    rarity: "Commune",
    condition: "Mint",
    language: "FR",
    priceCents: 100,
    stock: 30,
  },

  // EV03 - Flammes Obsidiennes
  {
    id: "ev03-001",
    serieId: "ev03",
    name: "Dracaufeu ex",
    number: "125/197",
    rarity: "Ultra Rare",
    condition: "Near Mint",
    language: "FR",
    priceCents: 8900,
    stock: 1,
  },

  // EB07 - Evolution Celeste
  {
    id: "eb07-001",
    serieId: "eb07",
    name: "Rayquaza VMAX",
    number: "218/203",
    rarity: "Secrete",
    condition: "Near Mint",
    language: "FR",
    priceCents: 15000,
    stock: 1,
  },
  {
    id: "eb07-002",
    serieId: "eb07",
    name: "Amphinobi V",
    number: "040/203",
    rarity: "Rare",
    condition: "Mint",
    language: "FR",
    priceCents: 450,
    stock: 5,
  },

  // SL03 - Ombres Ardentes
  {
    id: "sl03-001",
    serieId: "sl03",
    name: "Dracaufeu GX",
    number: "150/147",
    rarity: "Secrete",
    condition: "Excellent",
    language: "FR",
    priceCents: 22000,
    stock: 1,
    description: "Carte iconique, tres populaire chez les collectionneurs.",
  },

  // XY09 - Rupture Turbo
  {
    id: "xy09-001",
    serieId: "xy09",
    name: "Mega Dracaufeu EX",
    number: "013/122",
    rarity: "Ultra Rare",
    condition: "Excellent",
    language: "FR",
    priceCents: 7500,
    stock: 1,
  },
];

// Helpers

export function getBloc(id: string): Bloc | undefined {
  return BLOCS.find((b) => b.id === id);
}

export function getSerie(id: string): Serie | undefined {
  return SERIES.find((s) => s.id === id);
}

export function getCard(id: string): Card | undefined {
  return CARDS.find((c) => c.id === id);
}

export function seriesForBloc(blocId: string): Serie[] {
  return SERIES.filter((s) => s.blocId === blocId).sort((a, b) =>
    a.code.localeCompare(b.code),
  );
}

export function cardsForSerie(serieId: string): Card[] {
  return CARDS.filter((c) => c.serieId === serieId);
}

export function featuredCards(limit = 6): Card[] {
  return [...CARDS].sort((a, b) => b.priceCents - a.priceCents).slice(0, limit);
}
