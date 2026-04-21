// Catalogue : blocs > series > cartes
// Prix en centimes d'euro (ex: 1500 = 15,00 EUR)
// Ajoute / modifie librement.

export type Condition = "Mint" | "Near Mint" | "Excellent" | "Good" | "Played";
export type Rarity =
  | "Reverse"
  | "Holo"
  | "Holo Cracked Ice"
  | "Holo ligne"
  | "Rare Reverse"
  | "Rare Holo"
  | "Ultra Rare"
  | "Secrete";

export type Bloc = {
  id: string;
  name: string;
  tagline: string;
  coverColor: string; // classes tailwind gradient
  image?: string;
  imageFit?: "cover" | "contain"; // cover (par defaut) remplit, contain affiche l'image entiere
};

export type Serie = {
  id: string;
  blocId: string;
  code: string; // ex: EV09
  name: string;
  releaseYear: number;
  image?: string;
};

export type CardVariant = {
  rarity: Rarity;
  priceCents: number;
  stock: number;
};

export type VariantKey = "base" | "alt";

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
  altVariant?: CardVariant; // deuxieme version (ex: Rare Holo a cote d'un Rare Reverse)
};

export function resolveVariant(card: Card, key: VariantKey = "base"): CardVariant {
  if (key === "alt" && card.altVariant) return card.altVariant;
  return { rarity: card.rarity, priceCents: card.priceCents, stock: card.stock };
}

// ===========================================================
// POUR AJOUTER UNE IMAGE A UN BLOC :
//   - Ajoute une ligne image: "..." dans l'objet du bloc
//   - Soit un fichier depose dans public/cartes/ (ou public/blocs/) :
//       image: "/blocs/ecarlate-violet.jpg"
//   - Soit une URL d'image deja en ligne :
//       image: "https://exemple.com/photo.jpg"
//   - Si tu n'en mets pas, le degrade de couleur coverColor s'affiche tout seul.
// ===========================================================
export const BLOCS: Bloc[] = [
  {
    id: "mega-evolution",
    name: "Mega Evolution",
    tagline: "2025 - 2028",
    coverColor: "from-amber-400 to-orange-600",
  },
  {
    id: "ecarlate-et-violet",
    name: "Ecarlate et Violet",
    tagline: "2023 - 2025 ",
    coverColor: "from-rose-500 to-violet-600",
    image: "/blocs/ecarlate-violet.jpg", // exemple - remplace par ta propre image
  },
  {
    id: "epee-et-bouclier",
    name: "Epee et Bouclier",
    tagline: "2020 - 2023",
    coverColor: "from-sky-500 to-indigo-600",
    image: "/blocs/SWSH1.jpg",
    imageFit: "contain",
  },
  {
    id: "soleil-et-lune",
    name: "Soleil et Lune",
    tagline: "2017 - 2019",
    coverColor: "from-amber-400 to-orange-600",
  },
  {
    id: "xy",
    name: "XY",
    tagline: "2013 - 2016",
    coverColor: "from-emerald-500 to-teal-700",
  },
  {
    id: "noir-et-blanc",
    name: "Noir et Blanc",
    tagline: "2011 - 2013",
    coverColor: "from-slate-600 to-slate-900",
  },
  {
    id: "appel-des-legendes",
    name: "L'appel Des Legendes",
    tagline: "2011",
    coverColor: "from-slate-600 to-slate-900",
  },
  {
    id: "heartgold-soulsilver",
    name: "HeartGold SoulSilver",
    tagline: "2010 - 2011",
    coverColor: "from-slate-600 to-slate-900",
  },
  {
    id: "platine",
    name: "Platine",
    tagline: "2009 - 2010",
    coverColor: "from-slate-600 to-slate-900",
  },
  {
    id: "diamant-et-perle",
    name: "Diamant Et Perle",
    tagline: "2007 - 2009",
    coverColor: "from-slate-600 to-slate-900",
  },
  {
    id: "ex",
    name: "EX",
    tagline: "2003 - 2008",
    coverColor: "from-slate-600 to-slate-900",
  },
];

export const SERIES: Serie[] = [
  // Mega Evolution
  { id: "me01", blocId: "mega-evolution", code: "ME01", name: "Mega-Evolution", releaseYear: 2025 },
  { id: "me02", blocId: "mega-evolution", code: "ME02", name: "Flammes Fantasmagoriques", releaseYear: 2025 },
  { id: "me02.5", blocId: "mega-evolution", code: "ME02.5", name: "Heros Transcendants", releaseYear: 2026 },
  { id: "me03", blocId: "mega-evolution", code: "ME03", name: "Equilibre Parfait", releaseYear: 2026 },
  { id: "me04", blocId: "mega-evolution", code: "ME04", name: "Chaos Ascendant", releaseYear: 2026 },
  
  // Ecarlate et Violet
  { id: "ev01", blocId: "ecarlate-et-violet", code: "EV01", name: "Ecarlate et Violet", releaseYear: 2023 },
  { id: "ev02", blocId: "ecarlate-et-violet", code: "EV02", name: "Evolutions a Paldea", releaseYear: 2023 },
  { id: "ev03", blocId: "ecarlate-et-violet", code: "EV03", name: "Flammes Obsidiennes", releaseYear: 2023 },
  { id: "ev04", blocId: "ecarlate-et-violet", code: "EV04", name: "Faille Paradoxe", releaseYear: 2024 },
  { id: "ev05", blocId: "ecarlate-et-violet", code: "EV05", name: "Forces Temporelles", releaseYear: 2024 },
  { id: "ev06", blocId: "ecarlate-et-violet", code: "EV06", name: "Masques du Crepuscule", releaseYear: 2024 },
  { id: "ev06.5", blocId: "ecarlate-et-violet", code: "EV06.5", name: "Fable Nebuleuse", releaseYear: 2024 },
  { id: "ev07", blocId: "ecarlate-et-violet", code: "EV07", name: "Fable Nebuleuse", releaseYear: 2024 },
  { id: "ev08", blocId: "ecarlate-et-violet", code: "EV08", name: "Etincelles Deferlantes", releaseYear: 2024 },
  { id: "ev08.5", blocId: "ecarlate-et-violet", code: "EV08.5", name: "Evolutions Prismatiques", releaseYear: 2025 },
  { id: "ev09", blocId: "ecarlate-et-violet", code: "EV09", name: "Aventures Ensemble", releaseYear: 2025 },
  { id: "ev10", blocId: "ecarlate-et-violet", code: "EV10", name: "Rivalites Destines", releaseYear: 2025 },
  { id: "ev10.5", blocId: "ecarlate-et-violet", code: "EV10.5", name: "Flamme Blanche", releaseYear: 2025 },
  { id: "foudre-noire", blocId: "ecarlate-et-violet", code: "Foudre Noire", name: "Foudre Noire", releaseYear: 2025 },

  // Epee et Bouclier
  { id: "eb01", blocId: "epee-et-bouclier", code: "EB01", name: "Epee et Bouclier", releaseYear: 2020, image: "/series/SWSH1.jpg",},
  { id: "eb02", blocId: "epee-et-bouclier", code: "EB02", name: "Clash Des Rebelles", releaseYear: 2020, image: "/series/SWSH2.jpg", },
  { id: "eb03", blocId: "epee-et-bouclier", code: "EB03", name: "Tenebres Embrasees", releaseYear: 2020, image: "/series/SWSH3.jpg", },
  { id: "eb03.5", blocId: "epee-et-bouclier", code: "EB03.5", name: "La Voie Du Maitre", releaseYear: 2020, image: "/series/SWSH35.jpg", },
  { id: "eb04", blocId: "epee-et-bouclier", code: "EB04", name: "Voltage Eclatant", releaseYear: 2020, image: "/series/SWSH4.jpg", },
  { id: "eb04.5", blocId: "epee-et-bouclier", code: "EB04.5", name: "Destinees Radieuse", releaseYear: 2021, image: "/series/SWSH45.jpg", },
  { id: "eb05", blocId: "epee-et-bouclier", code: "EB05", name: "Styles de Combat", releaseYear: 2021, image: "/series/SDC.jpg", },
  { id: "eb06", blocId: "epee-et-bouclier", code: "EB06", name: "Regne De Glace", releaseYear: 2021, image: "/series/CRE.jpg", },
  { id: "eb07", blocId: "epee-et-bouclier", code: "EB07", name: "Evolution Celeste", releaseYear: 2021, image: "/series/EVS.jpg", },
  { id: "eb07.5", blocId: "epee-et-bouclier", code: "EB07.5", name: "Celebrations", releaseYear: 2021, image: "/series/CEL.jpg", },
  { id: "eb08", blocId: "epee-et-bouclier", code: "EB08", name: "Poing De Fusion", releaseYear: 2021, image: "/series/FST.jpg", },
  { id: "eb09", blocId: "epee-et-bouclier", code: "EB09", name: "Stars Etincelantes", releaseYear: 2022, image: "/series/BRS.jpg", },
  { id: "eb10", blocId: "epee-et-bouclier", code: "EB10", name: "Astres Radieux", releaseYear: 2022, image: "/series/AR.jpg", },
  { id: "eb10.5", blocId: "epee-et-bouclier", code: "EB10.5", name: "Pokemon Go", releaseYear: 2022, image: "/series/PGO.jpg", },
  { id: "eb11", blocId: "epee-et-bouclier", code: "EB11", name: "Origine Perdue", releaseYear: 2022, image: "/series/LOR.jpg", },
  { id: "eb12", blocId: "epee-et-bouclier", code: "EB12", name: "Tempete Argentee", releaseYear: 2022, image: "/series/SIT.jpg", },
  { id: "crown-zenith", blocId: "epee-et-bouclier", code: "EB12.5", name: "Zenith Supreme", releaseYear: 2023, image: "/series/CRZ.jpg", },

  // Soleil et Lune
  { id: "sl01", blocId: "soleil-et-lune", code: "SL01", name: "Soleil et Lune", releaseYear: 2017 },
  { id: "sl01.5", blocId: "soleil-et-lune", code: "SL01.5", name: "Gardiens Ascendants", releaseYear: 2017 },
  { id: "sl02", blocId: "soleil-et-lune", code: "SL02", name: "Ombres Ardentes", releaseYear: 2017 },
  { id: "sl03", blocId: "soleil-et-lune", code: "SL03", name: "Ombres Ardentes", releaseYear: 2017 },
  { id: "sl03.5", blocId: "soleil-et-lune", code: "SL03.5", name: "Legendes Brillantes", releaseYear: 2017 },
  { id: "sl04", blocId: "soleil-et-lune", code: "SL04", name: "Ultra Prisme", releaseYear: 2018 },
  { id: "sl05", blocId: "soleil-et-lune", code: "SL05", name: "Lumiere Interdite", releaseYear: 2018 },
  { id: "sl06", blocId: "soleil-et-lune", code: "SL06", name: "Tempete Celeste", releaseYear: 2018 },
  { id: "sl06.5", blocId: "soleil-et-lune", code: "SL06.5", name: "Majeste Des Dragons", releaseYear: 2018 },
  { id: "sl07", blocId: "soleil-et-lune", code: "SL07", name: "Tonnerre Perdu", releaseYear: 2018 },
  { id: "sl08", blocId: "soleil-et-lune", code: "SL08", name: "Duo De Choc", releaseYear: 2019 },
  { id: "sl09", blocId: "soleil-et-lune", code: "SL09", name: "Alliance Infaillibe", releaseYear: 2019 },
  { id: "sl10", blocId: "soleil-et-lune", code: "SL10", name: "Harmonie Des Esprits", releaseYear: 2019 },
  { id: "sl11", blocId: "soleil-et-lune", code: "SL11", name: "Destinees Occultes", releaseYear: 2019 },
  { id: "sl12", blocId: "soleil-et-lune", code: "SL12", name: "Eclipse Cosmique", releaseYear: 2019 },

  // XY
  { id: "xy00", blocId: "xy", code: "XY00", name: "Bienvenue à Kalos", releaseYear: 2013 },
  { id: "xy01", blocId: "xy", code: "XY01", name: "XY", releaseYear: 2014 },
  { id: "xy02", blocId: "xy", code: "XY02", name: "Etincelles", releaseYear: 2014 },
  { id: "xy03", blocId: "xy", code: "XY03", name: "Poings Furieux", releaseYear: 2014 },
  { id: "xy04", blocId: "xy", code: "XY04", name: "Vigueur Spectrale", releaseYear: 2014 },
  { id: "xy05", blocId: "xy", code: "XY05", name: "Primo Choc", releaseYear: 2015 },
  { id: "xy05.5", blocId: "xy", code: "XY05.5", name: "Double Danger", releaseYear: 2015 },
  { id: "xy06", blocId: "xy", code: "XY06", name: "Ciel Rugissant", releaseYear: 2015 },
  { id: "xy07", blocId: "xy", code: "XY07", name: "Origines Antiques", releaseYear: 2015 },
  { id: "xy08", blocId: "xy", code: "XY08", name: "Impulsion Turbo", releaseYear: 2015 },
  { id: "xy09", blocId: "xy", code: "XY09", name: "Rupture Turbo", releaseYear: 2016 },
  { id: "xy09.5", blocId: "xy", code: "XY09.5", name: "Generations", releaseYear: 2016 },
  { id: "xy10", blocId: "xy", code: "XY10", name: "Impact Des Destins", releaseYear: 2016 },
  { id: "xy11", blocId: "xy", code: "XY11", name: "Offensive Vapeur", releaseYear: 2016 },
  { id: "xy12", blocId: "xy", code: "XY12", name: "Evolutions", releaseYear: 2016 },

  // Noir et Blanc
  { id: "nb01", blocId: "noir-et-blanc", code: "NB01", name: "Noir et Blanc", releaseYear: 2011 },
  { id: "nb02", blocId: "noir-et-blanc", code: "NB02", name: "Pouvoirs Emergents", releaseYear: 2011 },
  { id: "nb03", blocId: "noir-et-blanc", code: "NB03", name: "Nobles Victoires", releaseYear: 2012 },
  { id: "nb04", blocId: "noir-et-blanc", code: "NB04", name: "Destinees Futures", releaseYear: 2012 },
  { id: "nb05", blocId: "noir-et-blanc", code: "NB05", name: "Explorateur Obscurs", releaseYear: 2012 },
  { id: "nb06", blocId: "noir-et-blanc", code: "NB06", name: "Dragons Exaltes", releaseYear: 2012 },
  { id: "nb07", blocId: "noir-et-blanc", code: "NB07", name: "Coffre Des Dragon", releaseYear: 2012 },
  { id: "nb07.5", blocId: "noir-et-blanc", code: "NB07.5", name: "Frontieres Franchies", releaseYear: 2013 },
  { id: "nb08", blocId: "noir-et-blanc", code: "NB08", name: "Tempete Plasma", releaseYear: 2013 },
  { id: "nb09", blocId: "noir-et-blanc", code: "NB09", name: "Glaciation Plasma", releaseYear: 2013 },
  { id: "nb10", blocId: "noir-et-blanc", code: "NB10", name: "Explosion Plasma", releaseYear: 2013 },

  // L'appel Des legendes
  { id: "hs04", blocId: "appel-des-legendes", code: "HS04", name: "L'appel Des Legendes", releaseYear: 2011 },

  // HeartGold SoulSilver
  { id: "HGSS01", blocId: "heartgold-soulsilver", code: "HGSS01", name: "HeartGold SoulSilver", releaseYear: 2010 },
  { id: "HGSS02", blocId: "heartgold-soulsilver", code: "HGSS02", name: "Dechainement", releaseYear: 2010 },
  { id: "HGSS03", blocId: "heartgold-soulsilver", code: "HGSS03", name: "Indomptable", releaseYear: 2010 },
  { id: "HGSS04", blocId: "heartgold-soulsilver", code: "HGSS04", name: "Triomphe", releaseYear: 2011 },

  // Platine
  { id: "PT01", blocId: "platine", code: "PT01", name: "Platine", releaseYear: 2009 },
  { id: "PT02", blocId: "platine", code: "PT02", name: "Rivaux Emergants", releaseYear: 2009 },
  { id: "PT03", blocId: "platine", code: "PT03", name: "Vainqueurs Supremes", releaseYear: 2010 },

  // Diamant Et Perle
  { id: "DP01", blocId: "diamant-et-perle", code: "DP01", name: "Diamant Et Perle", releaseYear: 2007 },
  { id: "DP01.5", blocId: "diamant-et-perle", code: "DP01.5", name: "Tresors Mysterieux", releaseYear: 2008 },
  { id: "DP02", blocId: "diamant-et-perle", code: "DP02", name: "Merveilles Secretes", releaseYear: 2008 },
  { id: "DP03", blocId: "diamant-et-perle", code: "DP03", name: "Duels Au Sommet", releaseYear: 2008 },
  { id: "DP04", blocId: "diamant-et-perle", code: "DP04", name: "Aube Majestueuse", releaseYear: 2008 },
  { id: "DP05", blocId: "diamant-et-perle", code: "DP05", name: "Eveil Des Legendes", releaseYear: 2009 },
  { id: "DP06", blocId: "diamant-et-perle", code: "DP06", name: "Tempete", releaseYear: 2009 },

  // EX
  { id: "EX01", blocId: "ex", code: "EX01", name: "Rubis Et Saphir", releaseYear: 2003 },
  { id: "EX02", blocId: "ex", code: "EX02", name: "Tempete De Sable", releaseYear: 2004 },
  { id: "EX03", blocId: "ex", code: "EX03", name: "Dragon", releaseYear: 2004 },
  { id: "EX04", blocId: "ex", code: "EX04", name: "Legendes Oubliees", releaseYear: 2005 },
  { id: "EX05", blocId: "ex", code: "EX05", name: "Rouge Feu & Vert Feuilles", releaseYear: 2005 },
  { id: "EX06", blocId: "ex", code: "EX06", name: "Deoxys", releaseYear: 2005 },
  { id: "EX07", blocId: "ex", code: "EX07", name: "Team Magma vs Team Aqua", releaseYear: 2005 },
  { id: "EX08", blocId: "ex", code: "EX08", name: "Emeraude", releaseYear: 2005 },
  { id: "EX09", blocId: "ex", code: "EX09", name: "Forces Cachees", releaseYear: 2006 },
  { id: "EX010", blocId: "ex", code: "EX010", name: "Especes Delta", releaseYear: 2006 },
  { id: "EX011", blocId: "ex", code: "EX011", name: "Createur De Legendes", releaseYear: 2006 },
  { id: "EX012", blocId: "ex", code: "EX012", name: "Fantomes Holon", releaseYear: 2006 },
  { id: "EX013", blocId: "ex", code: "EX013", name: "Gardiens De Cristal", releaseYear: 2007 },
  { id: "EX014", blocId: "ex", code: "EX014", name: "Iles Des Dragon", releaseYear: 2007 },
  { id: "EX015", blocId: "ex", code: "EX015", name: "Gardiens Du Pouvoir", releaseYear: 2007 },

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
    id: "ev09-000",                // identifiant unique (bloc-serie-numero suffit)
    serieId: "ev09",                   // la carte appartient a la serie EV09
    name: "Chenipan",           // ex: "Pikachu ex"
    number: "001/159",                 // numero imprime sur la carte
    rarity: "Reverse",               // rarete (voir type Rarity)
    condition: "Near Mint",            // etat de la carte (voir type Condition)
    language: "FR",                    // langue : FR, EN ou JP
    priceCents: 50,                // prix en centimes : 1000 = 10,00 EUR
    stock: 1,                          // nombre d'exemplaires en stock
    image: "/cartes/chenipan.jpg", // photo de la carte
  //  description: "Description libre de la carte (facultatif).", //
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
    rarity: "Reverse",
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
    rarity: "Reverse",
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
    rarity: "Rare Holo",
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

  // Zenith Supreme (EB12.5) - 230 cartes a completer
  { id: "crown-zenith-001", serieId: "crown-zenith", name: "Mystherbe", number: "001/159", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 0, image: "/cartes/eb12.5/1.jpg",},
  { id: "crown-zenith-002", serieId: "crown-zenith", name: "Ortide", number: "002/159", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 1, image: "/cartes/eb12.5/2.jpg",},
  { id: "crown-zenith-003", serieId: "crown-zenith", name: "Joliflor", number: "003/159", rarity: "Rare Holo", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0, image: "/cartes/eb12.5/3.jpg" },
  { id: "crown-zenith-004", serieId: "crown-zenith", name: "Saquedeneu", number: "004/159", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 0, image: "/cartes/eb12.5/4.jpg",},
  { id: "crown-zenith-005", serieId: "crown-zenith", name: "Bouldeneu", number: "005/159", rarity: "Rare Holo", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0, image: "/cartes/eb12.5/5.jpg" },
  { id: "crown-zenith-006", serieId: "crown-zenith", name: "Insécateur", number: "006/159", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 2, image:"/cartes/eb12.5/6.jpg",},
  { id: "crown-zenith-007", serieId: "crown-zenith", name: "Tournegrin", number: "007/159", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 0, image: "/cartes/eb12.5/7.jpg", },
  { id: "crown-zenith-008", serieId: "crown-zenith", name: "Yanma", number: "008/159", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 0, image: "/cartes/eb12.5/8.jpg", },
  { id: "crown-zenith-009", serieId: "crown-zenith", name: "Yanmega", number: "009/159", rarity: "Rare Holo", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0, image: "/cartes/eb12.5/9.jpg" },
  { id: "crown-zenith-010", serieId: "crown-zenith", name: "Crikzik", number: "010/159", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 0, image: "/cartes/eb12.5/10.jpg", },
  { id: "crown-zenith-011", serieId: "crown-zenith", name: "Ceribou", number: "011/159", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 0, image: "/cartes/eb12.5/11.jpg", },
  { id: "crown-zenith-012", serieId: "crown-zenith", name: "Vortente", number: "012/159", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock:0, image: "/cartes/eb12.5/12.jpg", },
  { id: "crown-zenith-013", serieId: "crown-zenith", name: "Phyllali V", number: "013/159", rarity: "Ultra Rare", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0, image: "/cartes/eb12.5/13.jpg", },
  { id: "crown-zenith-014", serieId: "crown-zenith", name: "Phyllali Vstar", number: "014/159", rarity: "Ultra Rare", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0, image: "/cartes/eb12.5/14.jpg", },
  { id: "crown-zenith-015", serieId: "crown-zenith", name: "Larvibule", number: "015/159", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 0, image: "/cartes/eb12.5/15.jpg", },
  { id: "crown-zenith-016", serieId: "crown-zenith", name: "Zarude", number: "016/159", rarity: "Rare Holo", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0, image: "/cartes/eb12.5/16.jpg" },
  { id: "crown-zenith-017", serieId: "crown-zenith", name: "Sylveroy", number: "017/159", rarity: "Rare Holo", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/eb12.5/17.jpg" },
  { id: "crown-zenith-018", serieId: "crown-zenith", name: "Dracaufeu V", number: "018/159", rarity: "Ultra Rare", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/eb12.5/18.jpg", },
  { id: "crown-zenith-019", serieId: "crown-zenith", name: "Dracaufeu Vstar", number: "019/159", rarity: "Ultra Rare", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/eb12.5/19.jpg", },
  { id: "crown-zenith-020", serieId: "crown-zenith", name: "Dracaufeu Radieux", number: "020/159", rarity: "Ultra Rare", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/eb12.5/20.jpg", },
  { id: "crown-zenith-021", serieId: "crown-zenith", name: "Entei", number: "021/159", rarity: "Rare Holo", condition: "Near Mint", language: "FR", priceCents: 100, stock: 2, image: "/cartes/eb12.5/21.jpg" },
  { id: "crown-zenith-022", serieId: "crown-zenith", name: "Flamoutan V", number: "022/159", rarity: "Ultra Rare", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/eb12.5/22.jpg", },
  { id: "crown-zenith-023", serieId: "crown-zenith", name: "Flamoutan Vstar", number: "023/159", rarity: "Ultra Rare", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/eb12.5/23.jpg", },
  { id: "crown-zenith-024", serieId: "crown-zenith", name: "Pyronille", number: "024/159", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 1, image: "/cartes/eb12.5/24.jpg", },
  { id: "crown-zenith-025", serieId: "crown-zenith", name: "Pyrax", number: "025/159", rarity: "Rare Holo", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0, image: "/cartes/eb12.5/25.jpg" },
  { id: "crown-zenith-026", serieId: "crown-zenith", name: "Volcanion", number: "026/159", rarity: "Rare Holo", condition: "Near Mint", language: "FR", priceCents: 100, stock: 2, image: "/cartes/eb12.5/26.jpg" },
  { id: "crown-zenith-027", serieId: "crown-zenith", name: "Tritox", number: "027/159", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 1, image: "/cartes/eb12.5/27.jpg", },
  { id: "crown-zenith-028", serieId: "crown-zenith", name: "Malamandre", number: "028/159", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 1, image: "/cartes/eb12.5/28.jpg", },
  { id: "crown-zenith-029", serieId: "crown-zenith", name: "Otaria", number: "029/159", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 0, image: "/cartes/eb12.5/29.jpg", },
  { id: "crown-zenith-030", serieId: "crown-zenith", name: "M. Mime de galar", number: "030/159", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 0, image: "/cartes/eb12.5/30.jpg", },
  { id: "crown-zenith-031", serieId: "crown-zenith", name: "Wailmer", number: "031/159", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 1, image: "/cartes/eb12.5/31.jpg", },
  { id: "crown-zenith-032", serieId: "crown-zenith", name: "Wailord", number: "032/159", rarity: "Rare Holo", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0, image: "/cartes/eb12.5/32.jpg" },
  { id: "crown-zenith-033", serieId: "crown-zenith", name: "Ecrapince", number: "033/159", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 0, image: "/cartes/eb12.5/33.jpg", },
  { id: "crown-zenith-034", serieId: "crown-zenith", name: "Stalgamin", number: "034/159", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 0, image: "/cartes/eb12.5/34.jpg", },
  { id: "crown-zenith-035", serieId: "crown-zenith", name: "Lovdisc", number: "035/159", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 0, image: "/cartes/eb12.5/35.jpg", },
  { id: "crown-zenith-036", serieId: "crown-zenith", name: "Kyogre", number: "036/159", rarity: "Rare Holo", condition: "Near Mint", language: "FR", priceCents: 100, stock: 2, image: "/cartes/eb12.5/36.jpg" },
  { id: "crown-zenith-037", serieId: "crown-zenith", name: "Kyogre V", number: "037/159", rarity: "Ultra Rare", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0, image: "/cartes/eb12.5/37.jpg", },
  { id: "crown-zenith-038", serieId: "crown-zenith", name: "Givrali V", number: "038/159", rarity: "Ultra Rare", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0, image: "/cartes/eb12.5/38.jpg", },
  { id: "crown-zenith-039", serieId: "crown-zenith", name: "Lixy", number: "039/159", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 0, image: "/cartes/eb12.5/39.jpg", },
  { id: "crown-zenith-040", serieId: "crown-zenith", name: "Lixy", number: "040/159", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 0, image: "/cartes/eb12.5/40.jpg", },
  { id: "crown-zenith-041", serieId: "crown-zenith", name: "Luxio", number: "041/159", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 0, image: "/cartes/eb12.5/41.jpg", },
  { id: "crown-zenith-042", serieId: "crown-zenith", name: "Luxio", number: "042/159", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 0, image: "/cartes/eb12.5/42.jpg", },
  { id: "crown-zenith-043", serieId: "crown-zenith", name: "Luxray", number: "043/159", rarity: "Rare Holo", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0, image: "/cartes/eb12.5/43.jpg" },
  { id: "crown-zenith-044", serieId: "crown-zenith", name: "Luxray", number: "044/159", rarity: "Rare Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/eb12.5/44.jpg" },
  { id: "crown-zenith-045", serieId: "crown-zenith", name: "Motisma V", number: "045/159", rarity: "Ultra Rare", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0, image: "/cartes/eb12.5/45.jpg", },
  { id: "crown-zenith-046", serieId: "crown-zenith", name: "Motisma Vstar", number: "046/159", rarity: "Ultra Rare", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0, image: "/cartes/eb12.5/46.jpg", },
  { id: "crown-zenith-047", serieId: "crown-zenith", name: "Emolga", number: "047/159", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 0, image: "/cartes/eb12.5/47.jpg", },
  { id: "crown-zenith-048", serieId: "crown-zenith", name: "Lampéroie", number: "048/159", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 0, image: "/cartes/eb12.5/48.jpg", },
  { id: "crown-zenith-049", serieId: "crown-zenith", name: "Galvaran", number: "049/159", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 0, image: "/cartes/eb12.5/49.jpg", },
  { id: "crown-zenith-050", serieId: "crown-zenith", name: "Igulta", number: "050/159", rarity: "Rare Holo", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0, image: "/cartes/eb12.5/50.jpg" },
  { id: "crown-zenith-051", serieId: "crown-zenith", name: "Chrysapile Radieux", number: "051/159", rarity: "Ultra Rare", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0, image: "/cartes/eb12.5/51.jpg", },
  { id: "crown-zenith-052", serieId: "crown-zenith", name: "Zeraora", number: "052/159", rarity: "Rare Holo", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0, image: "/cartes/eb12.5/52.jpg" },
  { id: "crown-zenith-053", serieId: "crown-zenith", name: "Zeraora V", number: "053/159", rarity: "Ultra Rare", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0, image: "/cartes/eb12.5/53.jpg", },
  { id: "crown-zenith-054", serieId: "crown-zenith", name: "Zeraora Vmax", number: "054/159", rarity: "Ultra Rare", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0, image: "/cartes/eb12.5/54.jpg", },
  { id: "crown-zenith-055", serieId: "crown-zenith", name: "Zeraoa Vstar", number: "055/159", rarity: "Ultra Rare", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0, image: "/cartes/eb12.5/55.jpg", },
  { id: "crown-zenith-056", serieId: "crown-zenith", name: "Wattpik", number: "056/159", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 0, image: "/cartes/eb12.5/56.jpg", },
  { id: "crown-zenith-057", serieId: "crown-zenith", name: "NoeuNoeuf", number: "057/159", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 0, image: "/cartes/eb12.5/57.jpg", },
  { id: "crown-zenith-058", serieId: "crown-zenith", name: "Noadkoko", number: "058/159", rarity: "Rare Holo", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0, image: "/cartes/eb12.5/58.jpg" },
  { id: "crown-zenith-059", serieId: "crown-zenith", name: "Mewtwo", number: "059/159", rarity: "Rare Holo", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0, image: "/cartes/eb12.5/59.jpg" },
  { id: "crown-zenith-060", serieId: "crown-zenith", name: "Mew V", number: "060/159", rarity: "Ultra Rare", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0, image: "/cartes/eb12.5/60.jpg", },
  { id: "crown-zenith-061", serieId: "crown-zenith", name: "Girafarig", number: "061/159", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 2, image: "/cartes/eb12.5/61.jpg", },
  { id: "crown-zenith-062", serieId: "crown-zenith", name: "Séléroc", number: "062/159", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 0, image: "/cartes/eb12.5/62.jpg", },
  { id: "crown-zenith-063", serieId: "crown-zenith", name: "Téraclope", number: "063/159", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 0, image: "/cartes/eb12.5/63.jpg", },
  { id: "crown-zenith-064", serieId: "crown-zenith", name: "Tokopyon", number: "064/159", rarity: "Rare Holo", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0, image: "/cartes/eb12.5/64.jpg" },
  { id: "crown-zenith-065", serieId: "crown-zenith", name: "Sorcilence V", number: "065/159", rarity: "Ultra Rare", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0, image: "/cartes/eb12.5/65.jpg", },
  { id: "crown-zenith-066", serieId: "crown-zenith", name: "Sorcilence Vmax", number: "066/159", rarity: "Ultra Rare", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0, image: "/cartes/eb12.5/66.jpg", },
  { id: "crown-zenith-067", serieId: "crown-zenith", name: "Amovénus", number: "067/159", rarity: "Rare Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 1, image: "/cartes/eb12.5/67.jpg" },
  { id: "crown-zenith-068", serieId: "crown-zenith", name: "Gravalanch", number: "068/159", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 0, image: "/cartes/eb12.5/68.jpg", },
  { id: "crown-zenith-069", serieId: "crown-zenith", name: "Solaroc", number: "069/159", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 0, image: "/cartes/eb12.5/69.jpg", },
  { id: "crown-zenith-070", serieId: "crown-zenith", name: "Balbuto", number: "070/159", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 0, image: "/cartes/eb12.5/70.jpg", },
  { id: "crown-zenith-071", serieId: "crown-zenith", name: "Riolu", number: "071/159", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 0, image: "/cartes/eb12.5/71.jpg", },
  { id: "crown-zenith-072", serieId: "crown-zenith", name: "Pandespiègle", number: "072/159", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 0, image: "/cartes/eb12.5/72.jpg", },
  { id: "crown-zenith-073", serieId: "crown-zenith", name: "Rocabot", number: "073/159", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 0, image: "/cartes/eb12.5/73.jpg", },
  { id: "crown-zenith-074", serieId: "crown-zenith", name: "Lougaroc", number: "074/159", rarity: "Rare Holo", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0, image: "/cartes/eb12.5/74.jpg" },
  { id: "crown-zenith-075", serieId: "crown-zenith", name: "Smogo", number: "075/159", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 0, image: "/cartes/eb12.5/75.jpg", },
  { id: "crown-zenith-076", serieId: "crown-zenith", name: "Absol", number: "076/159", rarity: "Rare Holo", condition: "Near Mint", language: "FR", priceCents: 100, stock: 2, image: "/cartes/eb12.5/76.jpg" },
  { id: "crown-zenith-077", serieId: "crown-zenith", name: "Chacripan", number: "077/159", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 1, image: "/cartes/eb12.5/77.jpg", },
  { id: "crown-zenith-078", serieId: "crown-zenith", name: "Léopardus", number: "078/159", rarity: "Rare Holo", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/eb12.5/78.jpg" },
  { id: "crown-zenith-079", serieId: "crown-zenith", name: "Escroco", number: "079/159", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 0, image: "/cartes/eb12.5/79.jpg", },
  { id: "crown-zenith-080", serieId: "crown-zenith", name: "Pandarbare", number: "080/159", rarity: "Rare Holo", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0, image: "/cartes/eb12.5/80.jpg" },
  { id: "crown-zenith-081", serieId: "crown-zenith", name: "Venalgue", number: "081/159", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 1, image: "/cartes/eb12.5/81.jpg", },
  { id: "crown-zenith-082", serieId: "crown-zenith", name: "Kravarech", number: "082/159", rarity: "Rare Holo", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0, image: "/cartes/eb12.5/82.jpg" },
  { id: "crown-zenith-083", serieId: "crown-zenith", name: "Hoopa", number: "083/159", rarity: "Rare Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 2, image: "/cartes/eb12.5/83.jpg",
    altVariant: { rarity: "Rare Holo", priceCents: 300, stock: 1 },
  },
  { id: "crown-zenith-084", serieId: "crown-zenith", name: "Miaouss de galar", number: "084/159", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 0, image: "/cartes/eb12.5/84.jpg", },
  { id: "crown-zenith-085", serieId: "crown-zenith", name: "Berserkatt de galar", number: "085/159", rarity: "Rare Holo", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0, image: "/cartes/eb12.5/85.jpg" },
  { id: "crown-zenith-086", serieId: "crown-zenith", name: "Cizayox", number: "086/159", rarity: "Rare Holo", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0, image: "/cartes/eb12.5/86.jpg" },
  { id: "crown-zenith-087", serieId: "crown-zenith", name: "Galekid", number: "087/159", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 0, image: "/cartes/eb12.5/87.jpg", },
  { id: "crown-zenith-088", serieId: "crown-zenith", name: "Galegon", number: "088/159", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 0, image: "/cartes/eb12.5/88.jpg", },
  { id: "crown-zenith-089", serieId: "crown-zenith", name: "Galeking", number: "089/159", rarity: "Rare Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/eb12.5/89.jpg",
    altVariant: { rarity: "Rare Holo", priceCents: 300, stock: 2 },
  },
  { id: "crown-zenith-090", serieId: "crown-zenith", name: "Métang", number: "090/159", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 1, image: "/cartes/eb12.5/90.jpg", },
  { id: "crown-zenith-091", serieId: "crown-zenith", name: "Scalpion", number: "091/159", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 1, image: "/cartes/eb12.5/91.jpg", },
  { id: "crown-zenith-092", serieId: "crown-zenith", name: "Scalpion", number: "092/159", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 0, image: "/cartes/eb12.5/92.jpg", },
  { id: "crown-zenith-093", serieId: "crown-zenith", name: "Scalproie", number: "093/159", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 0, image: "/cartes/eb12.5/93.jpg", },
  { id: "crown-zenith-094", serieId: "crown-zenith", name: "Zcian", number: "094/159", rarity: "Rare Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/eb12.5/94.jpg" },
  { id: "crown-zenith-095", serieId: "crown-zenith", name: "Zcian V", number: "095/159", rarity: "Ultra Rare", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0, image: "/cartes/eb12.5/95.jpg", },
  { id: "crown-zenith-096", serieId: "crown-zenith", name: "Zcian Vstar", number: "096/159", rarity: "Ultra Rare", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0, image: "/cartes/eb12.5/96.jpg", },
  { id: "crown-zenith-097", serieId: "crown-zenith", name: "Zamazenta", number: "097/159", rarity: "Rare Holo", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0, image: "/cartes/eb12.5/97.jpg" },
  { id: "crown-zenith-098", serieId: "crown-zenith", name: "Zamazenta V", number: "098/159", rarity: "Ultra Rare", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0, image: "/cartes/eb12.5/98.jpg", },
  { id: "crown-zenith-099", serieId: "crown-zenith", name: "Zamazenta Vstar", number: "099/159", rarity: "Ultra Rare", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0, image: "/cartes/eb12.5/99.jpg", },
  { id: "crown-zenith-100", serieId: "crown-zenith", name: "Rayquaza V", number: "100/159", rarity: "Ultra Rare", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0, image: "/cartes/eb12.5/100.jpg", },
  { id: "crown-zenith-101", serieId: "crown-zenith", name: "Rayquaza Vmax", number: "101/159", rarity: "Ultra Rare", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0, image: "/cartes/eb12.5/101.jpg", },
  { id: "crown-zenith-102", serieId: "crown-zenith", name: "Rayquaza Vmax", number: "102/159", rarity: "Ultra Rare", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0, image: "/cartes/eb12.5/102.jpg", },
  { id: "crown-zenith-103", serieId: "crown-zenith", name: "Duralugon V", number: "103/159", rarity: "Ultra Rare", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0, image: "/cartes/eb12.5/103.jpg", },
  { id: "crown-zenith-104", serieId: "crown-zenith", name: "Duralugon Vvmax", number: "104/159", rarity: "Ultra Rare", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0, image: "/cartes/eb12.5/104.jpg", },
  { id: "crown-zenith-105", serieId: "crown-zenith", name: "Éthernatos Radieux", number: "105/159", rarity: "Ultra Rare", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0, image: "/cartes/eb12.5/105.jpg", },
  { id: "crown-zenith-106", serieId: "crown-zenith", name: "Tauros", number: "106/159", rarity: "Rare Holo", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0, image: "/cartes/eb12.5/106.jpg", },
  { id: "crown-zenith-107", serieId: "crown-zenith", name: "Métamorph", number: "107/159", rarity: "Rare Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/eb12.5/107.jpg",
    altVariant: { rarity: "Rare Holo", priceCents: 300, stock: 2 },
  },
  { id: "crown-zenith-108", serieId: "crown-zenith", name: "Evoli V", number: "108/159", rarity: "Ultra Rare", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0, image: "/cartes/eb12.5/108.jpg", },
  { id: "crown-zenith-109", serieId: "crown-zenith", name: "Ronflex", number: "109/159", rarity: "Rare Holo", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0, image: "/cartes/eb12.5/109.jpg", },
  { id: "crown-zenith-110", serieId: "crown-zenith", name: "Etourmi", number: "110/159", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 0, image: "/cartes/eb12.5/110.jpg", },
  { id: "crown-zenith-111", serieId: "crown-zenith", name: "Keunotor", number: "111/159", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 4, image: "/cartes/eb12.5/111.jpg", },
  { id: "crown-zenith-112", serieId: "crown-zenith", name: "Pijako", number: "112/159", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 0, image: "/cartes/eb12.5/112.jpg", },
  { id: "crown-zenith-113", serieId: "crown-zenith", name: "Regigigas V", number: "113/159", rarity: "Ultra Rare", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0, image: "/cartes/eb12.5/113.jpg", },
  { id: "crown-zenith-114", serieId: "crown-zenith", name: "Regigigas Vstar", number: "114/159", rarity: "Ultra Rare", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0, image: "/cartes/eb12.5/114.jpg", },
  { id: "crown-zenith-115", serieId: "crown-zenith", name: "Shaymin", number: "115/159", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 2, image: "/cartes/eb12.5/115.jpg", },
  { id: "crown-zenith-116", serieId: "crown-zenith", name: "Mastouffe V", number: "116/159", rarity: "Ultra Rare", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0, image: "/cartes/eb12.5/116.jpg", },
  { id: "crown-zenith-117", serieId: "crown-zenith", name: "Manglouton", number: "117/159", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 1, image: "/cartes/eb12.5/117.jpg", },
  { id: "crown-zenith-118", serieId: "crown-zenith", name: "Argouste", number: "118/159", rarity: "Rare Holo", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0, image: "/cartes/eb12.5/118.jpg", },
  { id: "crown-zenith-119", serieId: "crown-zenith", name: "Gouroutan", number: "119/159", rarity: "Rare Holo", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0, image: "/cartes/eb12.5/119.jpg", },
  { id: "crown-zenith-120", serieId: "crown-zenith", name: "Rongrigou V", number: "120/159", rarity: "Ultra Rare", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0, image: "/cartes/eb12.5/120.jpg", },
  { id: "crown-zenith-121", serieId: "crown-zenith", name: "Moumouton", number: "121/159", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 2, image: "/cartes/eb12.5/121.jpg", },
  { id: "crown-zenith-122", serieId: "crown-zenith", name: "Moumouflon", number: "122/159", rarity: "Rare Holo", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0, image: "/cartes/eb12.5/122.jpg", },
  { id: "crown-zenith-123", serieId: "crown-zenith", name: "Faïza", number: "123/159", rarity: "Rare Holo", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0, image: "/cartes/eb12.5/123.jpg", },
  { id: "crown-zenith-124", serieId: "crown-zenith", name: "Travis", number: "124/159", rarity: "Rare Holo", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0, image: "/cartes/eb12.5/124.jpg", },
  { id: "crown-zenith-125", serieId: "crown-zenith", name: "Maillet Ecransant", number: "125/159", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 0, image: "/cartes/eb12.5/125.jpg", },
  { id: "crown-zenith-126", serieId: "crown-zenith", name: "Trou Brothers", number: "126/159", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 0, image: "/cartes/eb12.5/126.jpg", },
  { id: "crown-zenith-127", serieId: "crown-zenith", name: "Récupération d'Energie", number: "127/159", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 1, image: "/cartes/eb12.5/127.jpg", },
  { id: "crown-zenith-128", serieId: "crown-zenith", name: "Recherche d'Energie", number: "128/159", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 0, image: "/cartes/eb12.5/128.jpg", },
  { id: "crown-zenith-129", serieId: "crown-zenith", name: "Echange d'Energie", number: "129/159", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 0, image: "/cartes/eb12.5/129.jpg", },
  { id: "crown-zenith-130", serieId: "crown-zenith", name: "Amis De Hisui", number: "130/159", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 0, image: "/cartes/eb12.5/130.jpg", },
  { id: "crown-zenith-131", serieId: "crown-zenith", name: "Amis De Sinnoh", number: "131/159", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 0, image: "/cartes/eb12.5/131.jpg", },
  { id: "crown-zenith-132", serieId: "crown-zenith", name: "Super Ball", number: "132/159", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 2, image: "/cartes/eb12.5/132.jpg", },
  { id: "crown-zenith-133", serieId: "crown-zenith", name: "Nabil", number: "133/159", rarity: "Rare Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 2, image: "/cartes/eb12.5/133.jpg",
    altVariant: { rarity: "Rare Holo", priceCents: 300, stock: 2 },
  },
  { id: "crown-zenith-134", serieId: "crown-zenith", name: "Tarak", number: "134/159", rarity: "Rare Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 2, image: "/cartes/eb12.5/134.jpg",
    altVariant: { rarity: "Rare Holo", priceCents: 300, stock: 2 },
  },
  { id: "crown-zenith-135", serieId: "crown-zenith", name: "Aspirateur Perdu", number: "135/159", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 2, image: "/cartes/eb12.5/135.jpg", },
  { id: "crown-zenith-136", serieId: "crown-zenith", name: "Donna", number: "136/159", rarity: "Rare Holo", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/eb12.5/136.jpg", },
  { id: "crown-zenith-137", serieId: "crown-zenith", name: "Poké Ball", number: "137/159", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 1, image: "/cartes/eb12.5/137.jpg", },
  { id: "crown-zenith-138", serieId: "crown-zenith", name: "Attrape-Pokémon", number: "138/159", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 0, image: "/cartes/eb12.5/138.jpg", },
  { id: "crown-zenith-139", serieId: "crown-zenith", name: "Potion", number: "139/159", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 0, image: "/cartes/eb12.5/139.jpg", },
  { id: "crown-zenith-140", serieId: "crown-zenith", name: "Roy", number: "140/159", rarity: "Rare Holo", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/eb12.5/140.jpg", },
  { id: "crown-zenith-141", serieId: "crown-zenith", name: "Super Bonbon", number: "141/159", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 2, image: "/cartes/eb12.5/141.jpg", },
  { id: "crown-zenith-142", serieId: "crown-zenith", name: "Valise De Secours", number: "142/159", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 0, image: "/cartes/eb12.5/142.jpg", },
  { id: "crown-zenith-143", serieId: "crown-zenith", name: "Pierre Scellée Céleste", number: "143/159", rarity: "Rare Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 2, image: "/cartes/eb12.5/143.jpg",
    altVariant: { rarity: "Rare Holo", priceCents: 300, stock: 2 },
  },
  { id: "crown-zenith-144", serieId: "crown-zenith", name: "Echange", number: "144/159", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 2, image: "/cartes/eb12.5/144.jpg", },
  { id: "crown-zenith-145", serieId: "crown-zenith", name: "Chaussures de Randonnée", number: "145/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 2, image: "/cartes/eb12.5/145.jpg", },
  { id: "crown-zenith-146", serieId: "crown-zenith", name: "Hyper Ball", number: "146/159", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 0, image: "/cartes/eb12.5/146.jpg", },
  { id: "crown-zenith-147", serieId: "crown-zenith", name: "Eclat d'inezia", number: "147/159", rarity: "Ultra Rare", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/eb12.5/147.jpg", },
  { id: "crown-zenith-148", serieId: "crown-zenith", name: "Amis De Hisui", number: "148/159", rarity: "Ultra Rare", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/eb12.5/148.jpg", },
  { id: "crown-zenith-149", serieId: "crown-zenith", name: "Amis De Sinnoh", number: "149/159", rarity: "Ultra Rare", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/eb12.5/149.jpg", },
  { id: "crown-zenith-150", serieId: "crown-zenith", name: "Recherches Professorales", number: "150/159", rarity: "Ultra Rare", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/eb12.5/150.jpg", },
  { id: "crown-zenith-151", serieId: "crown-zenith", name: "Percupio", number: "151/159", rarity: "Ultra Rare", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/eb12.5/151.jpg", },
  { id: "crown-zenith-160", serieId: "crown-zenith", name: "Pikachu ", number: "160/159", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/eb12.5/160.jpg", },
  { id: "crown-zenith-161", serieId: "crown-zenith", name: "Voltorbe de Hisui ", number: "GG01/GG70", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/eb12.5/161.jpg", },
  { id: "crown-zenith-162", serieId: "crown-zenith", name: "Mélokrik ", number: "GG02/GG70", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/eb12.5/162.jpg", },
  { id: "crown-zenith-163", serieId: "crown-zenith", name: "Maganon ", number: "GG03/GG70", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/eb12.5/163.jpg", },
  { id: "crown-zenith-164", serieId: "crown-zenith", name: "Plumeline ", number: "GG04/GG70", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/eb12.5/164.jpg", },
  { id: "crown-zenith-165", serieId: "crown-zenith", name: "Lokhlass ", number: "GG05/GG70", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/eb12.5/165.jpg", },
  { id: "crown-zenith-166", serieId: "crown-zenith", name: "Manaphy", number: "GG06/GG70", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/eb12.5/166.jpg", },
  { id: "crown-zenith-167", serieId: "crown-zenith", name: "Keldeo ", number: "GG07/GG70", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/eb12.5/167.jpg", },
  { id: "crown-zenith-168", serieId: "crown-zenith", name: "Élekable ", number: "GG08/GG70", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/eb12.5/168.jpg", },
  { id: "crown-zenith-169", serieId: "crown-zenith", name: "Salarsen ", number: "GG09/GG70", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/eb12.5/169.jpg", },
  { id: "crown-zenith-170", serieId: "crown-zenith", name: "Mew ", number: "GG10/GG70", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/eb12.5/170.jpg", },
  { id: "crown-zenith-171", serieId: "crown-zenith", name: "Séléroc ", number: "GG11/GG70", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/eb12.5/171.jpg", },
  { id: "crown-zenith-172", serieId: "crown-zenith", name: "Deoxys ", number: "GG12/GG70", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/eb12.5/172.jpg", },
  { id: "crown-zenith-173", serieId: "crown-zenith", name: "Diancie ", number: "GG13/GG70", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/eb12.5/173.jpg", },
  { id: "crown-zenith-174", serieId: "crown-zenith", name: "Guérilande ", number: "GG14/GG70", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/eb12.5/174.jpg", },
  { id: "crown-zenith-175", serieId: "crown-zenith", name: "Solaroc ", number: "GG15/GG70", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/eb12.5/175.jpg", },
  { id: "crown-zenith-176", serieId: "crown-zenith", name: "Absol ", number: "GG16/GG70", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/eb12.5/176.jpg", },
  { id: "crown-zenith-177", serieId: "crown-zenith", name: "Roublenard ", number: "GG17/GG70", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/eb12.5/177.jpg", },
  { id: "crown-zenith-178", serieId: "crown-zenith", name: "Magnézone ", number: "GG18/GG70", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/eb12.5/178.jpg", },
  { id: "crown-zenith-179", serieId: "crown-zenith", name: "Altaria ", number: "GG19/GG70", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/eb12.5/179.jpg", },
  { id: "crown-zenith-180", serieId: "crown-zenith", name: "Latias ", number: "GG20/GG70", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/eb12.5/180.jpg", },
  { id: "crown-zenith-181", serieId: "crown-zenith", name: "Muplodocus de Hisui", number: "GG21/GG70", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/eb12.5/181.jpg", },
  { id: "crown-zenith-182", serieId: "crown-zenith", name: "Métamorph", number: "GG22/GG70", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/eb12.5/182.jpg", },
  { id: "crown-zenith-183", serieId: "crown-zenith", name: "Insolourdo ", number: "GG23/GG70", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/eb12.5/183.jpg", },
  { id: "crown-zenith-184", serieId: "crown-zenith", name: "Écrémeuh ", number: "GG24/GG70", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/eb12.5/184.jpg", },
  { id: "crown-zenith-185", serieId: "crown-zenith", name: "Castorno ", number: "GG25/GG70", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/eb12.5/185.jpg", },
  { id: "crown-zenith-186", serieId: "crown-zenith", name: "Riolu ", number: "GG26/GG70", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/eb12.5/186.jpg", },
  { id: "crown-zenith-187", serieId: "crown-zenith", name: "Tylton ", number: "GG27/GG70", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/eb12.5/187.jpg", },
  { id: "crown-zenith-188", serieId: "crown-zenith", name: "Skelénox ", number: "GG28/GG70", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/eb12.5/188.jpg", },
  { id: "crown-zenith-189", serieId: "crown-zenith", name: "Keunotor ", number: "GG29/GG70", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/eb12.5/189.jpg", },
  { id: "crown-zenith-190", serieId: "crown-zenith", name: "Pikachu ", number: "GG30/GG70", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/eb12.5/190.jpg", },
  { id: "crown-zenith-191", serieId: "crown-zenith", name: "Tortipouss ", number: "GG31/GG70", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/eb12.5/191.jpg", },
  { id: "crown-zenith-192", serieId: "crown-zenith", name: "Paras ", number: "GG32/GG70", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/eb12.5/192.jpg", },
  { id: "crown-zenith-193", serieId: "crown-zenith", name: "Medhyèna ", number: "GG33/GG70", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/eb12.5/193.jpg", },
  { id: "crown-zenith-194", serieId: "crown-zenith", name: "Wattouat ", number: "GG34/GG70", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/eb12.5/194.jpg", },
  { id: "crown-zenith-195", serieId: "crown-zenith", name: "Phyllali-VSTAR ", number: "GG35/GG70", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/eb12.5/195.jpg", },
  { id: "crown-zenith-196", serieId: "crown-zenith", name: "Entei-V ", number: "GG36/GG70", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/eb12.5/196.jpg", },
  { id: "crown-zenith-197", serieId: "crown-zenith", name: "Flamoutan-VSTAR ", number: "GG37/GG70", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/eb12.5/197.jpg", },
  { id: "crown-zenith-198", serieId: "crown-zenith", name: "Suicune-V ", number: "GG38/GG70", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/eb12.5/198.jpg", },
  { id: "crown-zenith-199", serieId: "crown-zenith", name: "Luminéon-V ", number: "GG39/GG70", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/eb12.5/199.jpg", },
  { id: "crown-zenith-200", serieId: "crown-zenith", name: "Givrali-VSTAR ", number: "GG40/GG70", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/eb12.5/200.jpg", },
  { id: "crown-zenith-201", serieId: "crown-zenith", name: "Raikou-V ", number: "GG41/GG70", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/eb12.5/201.jpg", },
  { id: "crown-zenith-202", serieId: "crown-zenith", name: "Zeraora-VMAX ", number: "GG42/GG70", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/eb12.5/201.jpg", },
  { id: "crown-zenith-203", serieId: "crown-zenith", name: "Zeraora-VSTAR ", number: "GG43/GG70", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/eb12.5/203.jpg", },
  { id: "crown-zenith-204", serieId: "crown-zenith", name: "Mewtwo-VSTAR ", number: "GG44/GG70", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/eb12.5/204.jpg", },
  { id: "crown-zenith-205", serieId: "crown-zenith", name: "Deoxys-VMAX ", number: "GG45/GG70", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/eb12.5/205.jpg", },
  { id: "crown-zenith-206", serieId: "crown-zenith", name: "Deoxys-VSTAR ", number: "GG46/GG70", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/eb12.5/206.jpg", },
  { id: "crown-zenith-207", serieId: "crown-zenith", name: "Sorcilence-VMAX ", number: "GG47/GG70", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/eb12.5/207.jpg", },
  { id: "crown-zenith-208", serieId: "crown-zenith", name: "Zacian-V ", number: "GG48/GG70", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/eb12.5/208.jpg", },
  { id: "crown-zenith-209", serieId: "crown-zenith", name: "Drascore-V ", number: "GG49/GG70", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/eb12.5/209.jpg", },
  { id: "crown-zenith-210", serieId: "crown-zenith", name: "Darkrai-VSTAR ", number: "GG50/GG70", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/eb12.5/210.jpg", },
  { id: "crown-zenith-211", serieId: "crown-zenith", name: "Clamiral de Hisui-V ", number: "GG51/GG70", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/eb12.5/211.jpg", },
  { id: "crown-zenith-212", serieId: "crown-zenith", name: "Clamiral de Hisui-VSTAR ", number: "GG52/GG70", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/eb12.5/212.jpg", },
  { id: "crown-zenith-213", serieId: "crown-zenith", name: "Hoopa-V", number: "GG53/GG70", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/eb12.5/213.jpg", },
  { id: "crown-zenith-214", serieId: "crown-zenith", name: "Zamazenta-V ", number: "GG54/GG70", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/eb12.5/214.jpg", },
  { id: "crown-zenith-215", serieId: "crown-zenith", name: "Regigigas-VSTAR ", number: "GG55/GG70", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/eb12.5/215.jpg", },
  { id: "crown-zenith-216", serieId: "crown-zenith", name: "Zoroark de Hisui-VSTAR ", number: "GG56/GG70", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/eb12.5/216.jpg", },
  { id: "crown-zenith-217", serieId: "crown-zenith", name: "Adamantin ", number: "GG57/GG70", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/eb12.5/217.jpg", },
  { id: "crown-zenith-218", serieId: "crown-zenith", name: "Attention de Tcheren ", number: "GG58/GG70", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/eb12.5/218.jpg", },
  { id: "crown-zenith-219", serieId: "crown-zenith", name: "Expérience de Nikolaï ", number: "GG59/GG70", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/eb12.5/219.jpg", },
  { id: "crown-zenith-220", serieId: "crown-zenith", name: "Ambition de Cynthia ", number: "GG60/GG70", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/eb12.5/220.jpg", },
  { id: "crown-zenith-221", serieId: "crown-zenith", name: "Vitalité de Flo ", number: "GG61/GG70", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/eb12.5/221.jpg", },
  { id: "crown-zenith-222", serieId: "crown-zenith", name: "Lino ", number: "GG62/GG70", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/eb12.5/222.jpg", },
  { id: "crown-zenith-223", serieId: "crown-zenith", name: "Nacchara ", number: "GG63/GG70", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/eb12.5/223.jpg", },
  { id: "crown-zenith-224", serieId: "crown-zenith", name: "Lona ", number: "GG64/GG70", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/eb12.5/224.jpg", },
  { id: "crown-zenith-225", serieId: "crown-zenith", name: "Roy ", number: "GG65/GG70", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/eb12.5/225.jpg", },
  { id: "crown-zenith-226", serieId: "crown-zenith", name: "Roxanne ", number: "GG66/GG70", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/eb12.5/226.jpg", },
  { id: "crown-zenith-227", serieId: "crown-zenith", name: "Palkia Originel-VSTAR ", number: "GG67/GG70", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/eb12.5/227.jpg", },
  { id: "crown-zenith-228", serieId: "crown-zenith", name: "Dialga Originel-VSTAR ", number: "GG68/GG70", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/eb12.5/228.jpg", },
  { id: "crown-zenith-229", serieId: "crown-zenith", name: "Giratina-VSTAR ", number: "GG69/GG70", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/eb12.5/229.jpg", },
  { id: "crown-zenith-230", serieId: "crown-zenith", name: "Arceus-VSTAR ", number: "GG70/GG70", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/eb12.5/230.jpg", },


  // Flamme Noire
  { id: "foudre-noire-001", serieId: "foudre-noire", name: "Vipélierre", number: "01/86", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 1, image: "/cartes/ev10.5(2)/1.webp",
    altVariant: { rarity: "Holo", priceCents: 300, stock: 1 },
  },
  { id: "foudre-noire-002", serieId: "foudre-noire", name: "Lianaja", number: "02/86", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 1, image: "/cartes/ev10.5(2)/2.webp", },
  { id: "foudre-noire-003", serieId: "foudre-noire", name: "Majaspic V", number: "03/86", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 0, image: "/cartes/ev10.5(2)/3.webp", },
  { id: "foudre-noire-004", serieId: "foudre-noire", name: "Feuillajou", number: "04/86", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 1, image: "/cartes/ev10.5(2)/4.webp", },
  { id: "foudre-noire-005", serieId: "foudre-noire", name: "Feuiloutan", number: "05/86", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 1, image: "/cartes/ev10.5(2)/5.webp", },
  { id: "foudre-noire-006", serieId: "foudre-noire", name: "Chlorobule", number: "06/86", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 1, image: "/cartes/ev10.5(2)/6.webp", },
  { id: "foudre-noire-007", serieId: "foudre-noire", name: "Fragilady", number: "07/86", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 0, image: "/cartes/ev10.5(2)/7.webp", },
  { id: "foudre-noire-008", serieId: "foudre-noire", name: "Maracachi", number: "08/86", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 1, image: "/cartes/ev10.5(2)/8.webp", },
  { id: "foudre-noire-009", serieId: "foudre-noire", name: "Carabing", number: "09/86", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 1, image: "/cartes/ev10.5(2)/9.webp", },
  { id: "foudre-noire-010", serieId: "foudre-noire", name: "Trompignon", number: "10/86", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 1, image: "/cartes/ev10.5(2)/10.webp", },
  { id: "foudre-noire-011", serieId: "foudre-noire", name: "Gaulet", number: "11/86", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 1, image: "/cartes/ev10.5(2)/11.webp",},
  { id: "foudre-noire-012", serieId: "foudre-noire", name: "Victini", number: "12/86", rarity: "Rare Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/ev10.5(2)/12.webp", },
  { id: "foudre-noire-013", serieId: "foudre-noire", name: "Darumarond", number: "13/86", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 1, image: "/cartes/ev10.5(2)/13.webp", },
  { id: "foudre-noire-014", serieId: "foudre-noire", name: "Darumacho", number: "14/86", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 1, image: "/cartes/ev10.5(2)/14.webp", },
  { id: "foudre-noire-015", serieId: "foudre-noire", name: "Pyronille", number: "15/86", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 1, image: "/cartes/ev10.5(2)/15.webp", },
  { id: "foudre-noire-016", serieId: "foudre-noire", name: "Pyrax", number: "16/86", rarity: "Rare Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/ev10.5(2)/16.webp",},
  { id: "foudre-noire-017", serieId: "foudre-noire", name: "Flotajou", number: "17/86", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 1, image: "/cartes/ev10.5(2)/17.webp", },
  { id: "foudre-noire-018", serieId: "foudre-noire", name: "Flotoutan", number: "18/86", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 1, image: "/cartes/ev10.5(2)/18.webp", },
  { id: "flamme-noire-019", serieId: "foudre-noire", name: "Tritonde", number: "19/86", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 1, image: "/cartes/ev10.5(2)/19.webp", },
  { id: "flamme-noire-020", serieId: "foudre-noire", name: "Batracé", number: "20/86", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 1, image: "/cartes/ev10.5(2)/20.webp", },
  { id: "flamme-noire-021", serieId: "foudre-noire", name: "Crapustule", number: "21/86", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 1, image: "/cartes/ev10.5(2)/21.webp", },
  { id: "flamme-noire-022", serieId: "foudre-noire", name: "Carapagos", number: "22/86", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 1, image: "/cartes/ev10.5(2)/22.webp", },
  { id: "flamme-noire-023", serieId: "foudre-noire", name: "Mégapagos", number: "23/86", rarity: "Rare Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 1, image: "/cartes/ev10.5(2)/23.webp", },
  { id: "flamme-noire-024", serieId: "foudre-noire", name: "Mamanbo", number: "24/86", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 1, image: "/cartes/ev10.5(2)/24.webp", },
  { id: "flamme-noire-025", serieId: "foudre-noire", name: "Polarhume", number: "25/86", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 1, image: "/cartes/ev10.5(2)/25.webp",},
  { id: "flamme-noire-026", serieId: "foudre-noire", name: "Polagriffe", number: "26/86", rarity: "Rare Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/ev10.5(2)/26.webp",},
  { id: "flamme-noire-027", serieId: "foudre-noire", name: "Hexagel", number: "27/86", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 1, image: "/cartes/ev10.5(2)/27.webp",},
  { id: "flamme-noire-028", serieId: "foudre-noire", name: "Kyurem EX", number: "28/86", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 1, image: "/cartes/ev10.5(2)/28.webp",},
  { id: "flamme-noire-029", serieId: "foudre-noire", name: "Emolga", number: "29/86", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 1, image: "/cartes/ev10.5(2)/29.webp",},
  { id: "flamme-noire-030", serieId: "foudre-noire", name: "Anchwatt", number: "30/86", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 1, image: "/cartes/ev10.5(2)/30.webp",},
  { id: "flamme-noire-031", serieId: "foudre-noire", name: "Lampéroie", number: "31/86", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 1, image: "/cartes/ev10.5(2)/31.webp",},
  { id: "flamme-noire-032", serieId: "foudre-noire", name: "Ohmassacre", number: "32/86", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 1, image: "/cartes/ev10.5(2)/32.webp",},
  { id: "flamme-noire-033", serieId: "foudre-noire", name: "Fulguris", number: "33/86", rarity: "Rare Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/ev10.5(2)/33.webp",},
  { id: "flamme-noire-034", serieId: "foudre-noire", name: "Zekrom EX", number: "34/86", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 0, image: "/cartes/ev10.5(2)/34.webp",},
  { id: "flamme-noire-035", serieId: "foudre-noire", name: "Munna", number: "35/86", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 1 , image: "/cartes/ev10.5(2)/35.webp",},
  { id: "flamme-noire-036", serieId: "foudre-noire", name: "Mushana", number: "36/86", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 1 , image: "/cartes/ev10.5(2)/36.webp",},
  { id: "flamme-noire-037", serieId: "foudre-noire", name: "Nucléos", number: "37/86", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 1 , image: "/cartes/ev10.5(2)/37.webp",},
  { id: "flamme-noire-038", serieId: "foudre-noire", name: "Méios", number: "38/86", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 1 , image: "/cartes/ev10.5(2)/38.webp",},
  { id: "flamme-noire-039", serieId: "foudre-noire", name: "Symbios", number: "39/86", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 1 , image: "/cartes/ev10.5(2)/39.webp",},
  { id: "flamme-noire-040", serieId: "foudre-noire", name: "Lewsor", number: "40/86", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 1 , image: "/cartes/ev10.5(2)/40.webp",},
  { id: "flamme-noire-041", serieId: "foudre-noire", name: "Neitram", number: "41/86", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 1 , image: "/cartes/ev10.5(2)/41.webp",},
  { id: "flamme-noire-042", serieId: "foudre-noire", name: "Gringolem", number: "42/86", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 1 , image: "/cartes/ev10.5(2)/42.webp",},
  { id: "flamme-noire-043", serieId: "foudre-noire", name: "Golemastoc", number: "43/86", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 1 , image: "/cartes/ev10.5(2)/43.webp",},
  { id: "flamme-noire-044", serieId: "foudre-noire", name: "Meloetta EX", number: "44/86", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 0 , image: "/cartes/ev10.5(2)/44.webp",},
  { id: "flamme-noire-045", serieId: "foudre-noire", name: "Rototaupe", number: "45/86", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 1 , image: "/cartes/ev10.5(2)/45.webp",},
  { id: "flamme-noire-046", serieId: "foudre-noire", name: "Minotaupe EX", number: "46/86", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 0 , image: "/cartes/ev10.5(2)/46.webp",},
  { id: "flamme-noire-047", serieId: "foudre-noire", name: "Charpenti", number: "47/86", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 1 , image: "/cartes/ev10.5(2)/47.webp",},
  { id: "flamme-noire-048", serieId: "foudre-noire", name: "Ouvrifier", number: "48/86", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 1 , image: "/cartes/ev10.5(2)/48.webp",},
  { id: "flamme-noire-049", serieId: "foudre-noire", name: "Bétochef", number: "49/86", rarity: "Rare Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 , image: "/cartes/ev10.5(2)/49.webp",},
  { id: "flamme-noire-050", serieId: "foudre-noire", name: "Judokrak", number: "50/86", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 1 , image: "/cartes/ev10.5(2)/50.webp",},
  { id: "flamme-noire-051", serieId: "foudre-noire", name: "Crabicoque", number: "51/86", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 1 , image: "/cartes/ev10.5(2)/51.webp",},
  { id: "flamme-noire-052", serieId: "foudre-noire", name: "Crabaraque", number: "52/86", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 1 , image: "/cartes/ev10.5(2)/52.webp",},
  { id: "flamme-noire-053", serieId: "foudre-noire", name: "Démétéros", number: "53/86", rarity: "Rare Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0 , image: "/cartes/ev10.5(2)/53.webp",},
  { id: "flamme-noire-054", serieId: "foudre-noire", name: "Venipatte", number: "54/86", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 1 , image: "/cartes/ev10.5(2)/54.webp",},
  { id: "flamme-noire-055", serieId: "foudre-noire", name: "Scobolide", number: "55/86", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 1 , image: "/cartes/ev10.5(2)/55.webp",},
  { id: "flamme-noire-056", serieId: "foudre-noire", name: "Brutapode", number: "56/86", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 1 , image: "/cartes/ev10.5(2)/56.webp",},
  { id: "flamme-noire-057", serieId: "foudre-noire", name: "Mascaïman", number: "57/86", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 1 , image: "/cartes/ev10.5(2)/57.webp",},
  { id: "flamme-noire-058", serieId: "foudre-noire", name: "Escroco", number: "58/86", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 1 , image: "/cartes/ev10.5(2)/58.webp",},
  { id: "flamme-noire-059", serieId: "foudre-noire", name: "Crocorible", number: "59/86", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 1 , image: "/cartes/ev10.5(2)/59.webp",},
  { id: "flamme-noire-060", serieId: "foudre-noire", name: "Lançargot", number: "60/86", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 1 , image: "/cartes/ev10.5(2)/60.webp",},
  { id: "flamme-noire-061", serieId: "foudre-noire", name: "Tic", number: "61/86", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 1 , image: "/cartes/ev10.5(2)/61.webp",},
  { id: "flamme-noire-062", serieId: "foudre-noire", name: "Clic", number: "62/86", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 1 , image: "/cartes/ev10.5(2)/62.webp",},
  { id: "flamme-noire-063", serieId: "foudre-noire", name: "Cliticlic", number: "63/86", rarity: "Rare Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 , image: "/cartes/ev10.5(2)/63.webp",},
  { id: "flamme-noire-064", serieId: "foudre-noire", name: "Scalpion", number: "64/86", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 1 , image: "/cartes/ev10.5(2)/64.webp",},
  { id: "flamme-noire-065", serieId: "foudre-noire", name: "Scalproie", number: "65/86", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 1, image: "/cartes/ev10.5(2)/65.webp",},
  { id: "flamme-noire-066", serieId: "foudre-noire", name: "Cobaltium", number: "66/86", rarity: "Rare Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 , image: "/cartes/ev10.5(2)/66.webp",},
  { id: "flamme-noire-067", serieId: "foudre-noire", name: "Genesect EX", number: "67/86", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 0 , image: "/cartes/ev10.5(2)/67.webp",},
  { id: "flamme-noire-068", serieId: "foudre-noire", name: "Coupenotte", number: "68/86", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 1 , image: "/cartes/ev10.5(2)/68.webp",},
  { id: "flamme-noire-069", serieId: "foudre-noire", name: "Inciache", number: "69/86", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 1 , image: "/cartes/ev10.5(2)/69.webp",},
  { id: "flamme-noire-070", serieId: "foudre-noire", name: "Tranchodon", number: "70/86", rarity: "Rare Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 , image: "/cartes/ev10.5(2)/70.webp",},
  { id: "flamme-noire-071", serieId: "foudre-noire", name: "Poichigeon", number: "71/86", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 1 , image: "/cartes/ev10.5(2)/71.webp",},
  { id: "flamme-noire-072", serieId: "foudre-noire", name: "Colombeau", number: "72/86", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 1 , image: "/cartes/ev10.5(2)/72.webp",},
  { id: "flamme-noire-073", serieId: "foudre-noire", name: "Déflaisan", number: "73/86", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 1 , image: "/cartes/ev10.5(2)/73.webp",},
  { id: "flamme-noire-074", serieId: "foudre-noire", name: "Nanméouïe", number: "74/86", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 1 , image: "/cartes/ev10.5(2)/74.webp",},
  { id: "flamme-noire-075", serieId: "foudre-noire", name: "Chinchidou", number: "75/86", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 1 , image: "/cartes/ev10.5(2)/75.webp",},
  { id: "flamme-noire-076", serieId: "foudre-noire", name: "Pashmilla", number: "76/86", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 1 , image: "/cartes/ev10.5(2)/76.webp",},
  { id: "flamme-noire-077", serieId: "foudre-noire", name: "Furaiglon", number: "77/86", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 1 , image: "/cartes/ev10.5(2)/77.webp",},
  { id: "flamme-noire-078", serieId: "foudre-noire", name: "Gueriaigle", number: "78/86", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 1 , image: "/cartes/ev10.5(2)/78.webp",},
  { id: "flamme-noire-079", serieId: "foudre-noire", name: "Ballon", number: "79/86", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 1 , image: "/cartes/ev10.5(2)/79.webp",},
  { id: "flamme-noire-080", serieId: "foudre-noire", name: "Fossile Plaque Ancien", number: "80/86", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 1 , image: "/cartes/ev10.5(2)/80.webp",},
  { id: "flamme-noire-081", serieId: "foudre-noire", name: "Pièce Energie", number: "81/86", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 1 , image: "/cartes/ev10.5(2)/81.webp",},
  { id: "flamme-noire-082", serieId: "foudre-noire", name: "Oryse", number: "82/86", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 1 , image: "/cartes/ev10.5(2)/82.webp",},
  { id: "flamme-noire-083", serieId: "foudre-noire", name: "Plan de N", number: "83/86", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 1, image: "/cartes/ev10.5(2)/83.webp",},
  { id: "flamme-noire-084", serieId: "foudre-noire", name: "Pokématos 3.0", number: "84/86", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 1 , image: "/cartes/ev10.5(2)/84.webp",},
  { id: "flamme-noire-085", serieId: "foudre-noire", name: "Recherches Professorales", number: "85/86", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 1 , image: "/cartes/ev10.5(2)/85.webp",},
  { id: "flamme-noire-086", serieId: "foudre-noire", name: "Energie Prisme", number: "86/86", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 50, stock: 1 , image: "/cartes/ev10.5(2)/86.webp",},
  { id: "flamme-noire-087", serieId: "foudre-noire", name: "Carte 87/86", number: "87/86", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0 },
  { id: "flamme-noire-088", serieId: "foudre-noire", name: "Carte 88/86", number: "88/86", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0 },
  { id: "flamme-noire-089", serieId: "foudre-noire", name: "Carte 89/86", number: "89/86", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0 },
  { id: "flamme-noire-090", serieId: "foudre-noire", name: "Carte 90/86", number: "90/86", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0 },
  { id: "flamme-noire-091", serieId: "foudre-noire", name: "Carte 91/86", number: "91/86", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0 },
  { id: "flamme-noire-092", serieId: "foudre-noire", name: "Carte 92/86", number: "92/86", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0 },
  { id: "flamme-noire-093", serieId: "foudre-noire", name: "Carte 93/86", number: "93/86", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0 },
  { id: "flamme-noire-094", serieId: "foudre-noire", name: "Carte 94/86", number: "94/86", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0 },
  { id: "flamme-noire-095", serieId: "foudre-noire", name: "Carte 95/86", number: "95/86", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0 },
  { id: "flamme-noire-096", serieId: "foudre-noire", name: "Carte 96/86", number: "96/86", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0 },
  { id: "flamme-noire-097", serieId: "foudre-noire", name: "Carte 97/86", number: "97/86", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0 },
  { id: "flamme-noire-098", serieId: "foudre-noire", name: "Carte 98/86", number: "98/86", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0 },
  { id: "flamme-noire-099", serieId: "foudre-noire", name: "Carte 99/86", number: "99/86", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0 },
  { id: "flamme-noire-100", serieId: "foudre-noire", name: "Carte 100/86", number: "100/86", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0 },
  { id: "flamme-noire-101", serieId: "foudre-noire", name: "Carte 101/86", number: "101/86", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0 },
  { id: "flamme-noire-102", serieId: "foudre-noire", name: "Carte 102/86", number: "102/86", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0 },
  { id: "flamme-noire-103", serieId: "foudre-noire", name: "Carte 103/86", number: "103/86", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0 },
  { id: "flamme-noire-104", serieId: "foudre-noire", name: "Carte 104/86", number: "104/86", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0 },
  { id: "flamme-noire-105", serieId: "foudre-noire", name: "Carte 105/86", number: "105/86", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0 },
  { id: "flamme-noire-106", serieId: "foudre-noire", name: "Carte 106/86", number: "106/86", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0 },
  { id: "flamme-noire-107", serieId: "foudre-noire", name: "Carte 107/86", number: "107/86", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0 },
  { id: "flamme-noire-108", serieId: "foudre-noire", name: "Carte 108/86", number: "108/86", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0 },
  { id: "flamme-noire-109", serieId: "foudre-noire", name: "Carte 109/86", number: "109/86", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0 },
  { id: "flamme-noire-110", serieId: "foudre-noire", name: "Carte 110/86", number: "110/86", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0 },
  { id: "flamme-noire-111", serieId: "foudre-noire", name: "Carte 111/86", number: "111/86", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0 },
  { id: "flamme-noire-112", serieId: "foudre-noire", name: "Carte 112/86", number: "112/86", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0 },
  { id: "flamme-noire-113", serieId: "foudre-noire", name: "Carte 113/86", number: "113/86", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0 },
  { id: "flamme-noire-114", serieId: "foudre-noire", name: "Carte 114/86", number: "114/86", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0 },
  { id: "flamme-noire-115", serieId: "foudre-noire", name: "Carte 115/86", number: "115/86", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0 },
  { id: "flamme-noire-116", serieId: "foudre-noire", name: "Carte 116/86", number: "116/86", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0 },
  { id: "flamme-noire-117", serieId: "foudre-noire", name: "Carte 117/86", number: "117/86", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0 },
  { id: "flamme-noire-118", serieId: "foudre-noire", name: "Carte 118/86", number: "118/86", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0 },
  { id: "flamme-noire-119", serieId: "foudre-noire", name: "Carte 119/86", number: "119/86", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0 },
  { id: "flamme-noire-120", serieId: "foudre-noire", name: "Carte 120/86", number: "120/86", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0 },
  { id: "flamme-noire-121", serieId: "foudre-noire", name: "Carte 121/86", number: "121/86", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0 },
  { id: "flamme-noire-122", serieId: "foudre-noire", name: "Carte 122/86", number: "122/86", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0 },
  { id: "flamme-noire-123", serieId: "foudre-noire", name: "Carte 123/86", number: "123/86", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0 },
  { id: "flamme-noire-124", serieId: "foudre-noire", name: "Carte 124/86", number: "124/86", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0 },
  { id: "flamme-noire-125", serieId: "foudre-noire", name: "Carte 125/86", number: "125/86", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0 },
  { id: "flamme-noire-126", serieId: "foudre-noire", name: "Carte 126/86", number: "126/86", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0 },
  { id: "flamme-noire-127", serieId: "foudre-noire", name: "Carte 127/86", number: "127/86", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0 },
  { id: "flamme-noire-128", serieId: "foudre-noire", name: "Carte 128/86", number: "128/86", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0 },
  { id: "flamme-noire-129", serieId: "foudre-noire", name: "Carte 129/86", number: "129/86", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0 },
  { id: "flamme-noire-130", serieId: "foudre-noire", name: "Carte 130/86", number: "130/86", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0 },
  { id: "flamme-noire-131", serieId: "foudre-noire", name: "Carte 131/86", number: "131/86", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0 },
  { id: "flamme-noire-132", serieId: "foudre-noire", name: "Carte 132/86", number: "132/86", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0 },
  { id: "flamme-noire-133", serieId: "foudre-noire", name: "Carte 133/86", number: "133/86", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0 },
  { id: "flamme-noire-134", serieId: "foudre-noire", name: "Carte 134/86", number: "134/86", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0 },
  { id: "flamme-noire-135", serieId: "foudre-noire", name: "Carte 135/86", number: "135/86", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0 },
  { id: "flamme-noire-136", serieId: "foudre-noire", name: "Carte 136/86", number: "136/86", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0 },
  { id: "flamme-noire-137", serieId: "foudre-noire", name: "Carte 137/86", number: "137/86", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0 },
  { id: "flamme-noire-138", serieId: "foudre-noire", name: "Carte 138/86", number: "138/86", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0 },
  { id: "flamme-noire-139", serieId: "foudre-noire", name: "Carte 139/86", number: "139/86", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0 },
  { id: "flamme-noire-140", serieId: "foudre-noire", name: "Carte 140/86", number: "140/86", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0 },
  { id: "flamme-noire-141", serieId: "foudre-noire", name: "Carte 141/86", number: "141/86", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0 },
  { id: "flamme-noire-142", serieId: "foudre-noire", name: "Carte 142/86", number: "142/86", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0 },
  { id: "flamme-noire-143", serieId: "foudre-noire", name: "Carte 143/86", number: "143/86", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0 },
  { id: "flamme-noire-144", serieId: "foudre-noire", name: "Carte 144/86", number: "144/86", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0 },
  { id: "flamme-noire-145", serieId: "foudre-noire", name: "Carte 145/86", number: "145/86", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0 },
  { id: "flamme-noire-146", serieId: "foudre-noire", name: "Carte 146/86", number: "146/86", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0 },
  { id: "flamme-noire-147", serieId: "foudre-noire", name: "Carte 147/86", number: "147/86", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0 },
  { id: "flamme-noire-148", serieId: "foudre-noire", name: "Carte 148/86", number: "148/86", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0 },
  { id: "flamme-noire-149", serieId: "foudre-noire", name: "Carte 149/86", number: "149/86", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0 },
  { id: "flamme-noire-150", serieId: "foudre-noire", name: "Carte 150/86", number: "150/86", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0 },
  { id: "flamme-noire-151", serieId: "foudre-noire", name: "Carte 151/86", number: "151/86", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0 },
  { id: "flamme-noire-152", serieId: "foudre-noire", name: "Carte 152/86", number: "152/86", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0 },
  { id: "flamme-noire-153", serieId: "foudre-noire", name: "Carte 153/86", number: "153/86", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0 },
  { id: "flamme-noire-154", serieId: "foudre-noire", name: "Carte 154/86", number: "154/86", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0 },
  { id: "flamme-noire-155", serieId: "foudre-noire", name: "Carte 155/86", number: "155/86", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0 },
  { id: "flamme-noire-156", serieId: "foudre-noire", name: "Carte 156/86", number: "156/86", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0 },
  { id: "flamme-noire-157", serieId: "foudre-noire", name: "Carte 157/86", number: "157/86", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0 },
  { id: "flamme-noire-158", serieId: "foudre-noire", name: "Carte 158/86", number: "158/86", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0 },
  { id: "flamme-noire-159", serieId: "foudre-noire", name: "Carte 159/86", number: "159/86", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0 },
  { id: "flamme-noire-160", serieId: "foudre-noire", name: "Carte 160/86", number: "160/86", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0 },
  { id: "flamme-noire-161", serieId: "foudre-noire", name: "Carte 161/86", number: "161/86", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0 },
  { id: "flamme-noire-162", serieId: "foudre-noire", name: "Carte 162/86", number: "162/86", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0 },
  { id: "flamme-noire-163", serieId: "foudre-noire", name: "Carte 163/86", number: "163/86", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0 },
  { id: "flamme-noire-164", serieId: "foudre-noire", name: "Carte 164/86", number: "164/86", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0 },
  { id: "flamme-noire-165", serieId: "foudre-noire", name: "Carte 165/86", number: "165/86", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0 },
  { id: "flamme-noire-166", serieId: "foudre-noire", name: "Carte 166/86", number: "166/86", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0 },
  { id: "flamme-noire-167", serieId: "foudre-noire", name: "Carte 167/86", number: "167/86", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0 },
  { id: "flamme-noire-168", serieId: "foudre-noire", name: "Carte 168/86", number: "168/86", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0 },
  { id: "flamme-noire-169", serieId: "foudre-noire", name: "Carte 169/86", number: "169/86", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0 },
  { id: "flamme-noire-170", serieId: "foudre-noire", name: "Carte 170/86", number: "170/86", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0 },
  { id: "flamme-noire-171", serieId: "foudre-noire", name: "Carte 171/86", number: "171/86", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0 },
  { id: "flamme-noire-172", serieId: "foudre-noire", name: "Carte 172/86", number: "172/86", rarity: "Secrete", condition: "Near Mint", language: "FR", priceCents: 100, stock: 0 },

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
