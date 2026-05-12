import { MEGA_EVOLUTION_CARDS } from "./catalog/cards/mega-evolution";  
import { ECARLATE_ET_VIOLET_CARDS } from "./catalog/cards/ecarlate-et-violet";
import { EPEE_ET_BOUCLIER_CARDS } from "./catalog/cards/epee-et-bouclier";
import { SOLEIL_ET_LUNE_CARDS } from "./catalog/cards/soleil-et-lune";
import { XY_CARDS } from "./catalog/cards/xy";
import { NOIR_ET_BLANC_CARDS } from "./catalog/cards/noir-et-blanc";
import { HEARTGOLD_SOULSILVER_CARDS } from "./catalog/cards/heartgold-soulsilver";
import { PLATINE_CARDS } from "./catalog/cards/platine"; 

// Catalogue : blocs > series > cartes 
// Prix en euros (ex: 15 = 15 EUR, 0.5 = 50 centimes)

export const CONDITIONS = [
  "Mint",
  "Near Mint",
  "Excellent",
  "Good",
  "Played",
] as const;

export type Condition = (typeof CONDITIONS)[number];

export function isCondition(value: string): value is Condition {
  return (CONDITIONS as readonly string[]).includes(value);
}


export const RARITIES = [
  "Promo",
  "Commune",
  "Reverse",
  "Reverse Pokéball",
  "Reverse Masterball",
  "Holo",
  "Holo Cracked Ice",
  "Holo ligne",
  "Holo Cosmos",
  "Holo Etoile",
  "Promo Holo Cosmos",
  "Stamp",
  "Rare Reverse",
  "Rare Holo",
  "Ultra Rare",
  "Secrete",
] as const;

export type Rarity = (typeof RARITIES)[number];

export function isRarity(value: string): value is Rarity {
  return (RARITIES as readonly string[]).includes(value);
}

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
  comingSoon?: boolean; // serie pas encore sortie - affiche "Prochainement"
};

export type CardVariant = {
  rarity: Rarity;
  price: number;
  stock: number;
};

export type NamedVariant = {
  key: string; // identifiant unique par carte (ex: "pokeball", "masterball", "cosmos")
  rarity: Rarity;
  price: number;
  stock: number;
};

export type VariantKey = string; // "base", "alt" ou cle custom

export const RESERVED_VARIANT_KEYS = new Set(["base", "alt"]);

export function isValidVariantKey(key: string): boolean {
  return /^[a-z][a-z0-9-]{0,30}$/.test(key);
}

export type Card = {
  id: string;
  serieId: string;
  name: string;
  number: string; // ex: 025/198
  rarity: Rarity;
  condition: Condition;
  language: "FR" | "EN" | "JP";
  price: number;
  stock: number;
  image?: string;
  imageBack?: string; // image du dos / 2e face (optionnelle)
  description?: string;
  weightGrams?: number; // poids unitaire en grammes (pour calcul livraison)
  altVariant?: CardVariant; // deuxieme version "alt" (legacy + raccourci)
  extraVariants?: NamedVariant[]; // variantes supplementaires identifiees par cle
};

export function resolveVariant(card: Card, key: VariantKey = "base"): CardVariant {
  if (key === "alt" && card.altVariant) return card.altVariant;
  if (key !== "base" && key !== "alt" && card.extraVariants) {
    const v = card.extraVariants.find((x) => x.key === key);
    if (v) return { rarity: v.rarity, price: v.price, stock: v.stock };
  }
  return { rarity: card.rarity, price: card.price, stock: card.stock };
}

export function listVariants(card: Card): { key: VariantKey; variant: CardVariant }[] {
  const out: { key: VariantKey; variant: CardVariant }[] = [
    { key: "base", variant: { rarity: card.rarity, price: card.price, stock: card.stock } },
  ];
  if (card.altVariant) {
    out.push({ key: "alt", variant: card.altVariant });
  }
  if (card.extraVariants) {
    for (const v of card.extraVariants) {
      out.push({
        key: v.key,
        variant: { rarity: v.rarity, price: v.price, stock: v.stock },
      });
    }
  }
  return out;
}

export const BLOCS: Bloc[] = [
  {
    id: "mega-evolution",
    name: "Mega Evolution",
    tagline: "2025 - 2028",
    coverColor: "from-amber-400 to-orange-600",
    image: "/blocs/me.webp",
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
    image: "/blocs/soleil-et-lune.jpg",
  },
  {
    id: "xy",
    name: "XY",
    tagline: "2013 - 2016",
    coverColor: "from-emerald-500 to-teal-700",
    image: "/blocs/XY.webp",
    imageFit: "contain",
  },
  {
    id: "noir-et-blanc",
    name: "Noir et Blanc",
    tagline: "2011 - 2013",
    coverColor: "from-slate-600 to-slate-900",
    image: "/blocs/NB.webp",
    imageFit: "contain",
  },
  {
    id: "appel-des-legendes",
    name: "L'appel Des Legendes",
    tagline: "2011",
    coverColor: "from-slate-600 to-slate-900",
    image: "/blocs/ADL.webp",
    imageFit: "contain",
  },
  {
    id: "heartgold-soulsilver",
    name: "HeartGold SoulSilver",
    tagline: "2010 - 2011",
    coverColor: "from-slate-600 to-slate-900",
    image: "/blocs/HGSS.webp",
    imageFit: "contain",
  },
  {
    id: "platine",
    name: "Platine",
    tagline: "2009 - 2010",
    coverColor: "from-slate-600 to-slate-900",
    image: "/blocs/PT.webp",
    imageFit: "contain",
  },
  {
    id: "diamant-et-perle",
    name: "Diamant Et Perle",
    tagline: "2007 - 2009",
    coverColor: "from-slate-600 to-slate-900",
    image: "/blocs/DP.webp",
    imageFit: "contain",
  },
  {
    id: "ex",
    name: "EX",
    tagline: "2003 - 2008",
    coverColor: "from-slate-600 to-slate-900",
    image: "/blocs/EX.png",
    imageFit: "contain",
  },
];

export const SERIES: Serie[] = [
  // Mega Evolution
  { id: "me-promo", blocId: "mega-evolution", code: "Promo", name: "Mega-Evolution", releaseYear: 2025, image: "/series/ME/MEP.webp",},
  { id: "me01", blocId: "mega-evolution", code: "ME01", name: "Mega-Evolution", releaseYear: 2025, image: "/series/ME/me.webp",},
  { id: "me02", blocId: "mega-evolution", code: "ME02", name: "Flammes Fantasmagoriques", releaseYear: 2025, image: "/series/ME/PFL.webp",},
  { id: "me02.5", blocId: "mega-evolution", code: "ME02.5", name: "Heros Transcendants", releaseYear: 2026, image: "/series/ME/ASC.webp",},
  { id: "me03", blocId: "mega-evolution", code: "ME03", name: "Equilibre Parfait", releaseYear: 2026, image: "/series/ME/POR.webp",},
  { id: "me04", blocId: "mega-evolution", code: "ME04", name: "Chaos Ascendant", releaseYear: 2026, image: "/series/ME/CRI.webp",},
  { id: "me05", blocId: "mega-evolution", code: "ME05", name: "Nuit Noire", releaseYear: 2026, image: "/series/ME/me05.png", comingSoon: true },

  // Ecarlate et Violet
  { id: "promo", blocId: "ecarlate-et-violet", code: "Promo", name: "Ecarlate et Violet", releaseYear: 2023, image: "/series/EV/SVP.webp", },
  { id: "ev01", blocId: "ecarlate-et-violet", code: "EV01", name: "Ecarlate et Violet", releaseYear: 2023, image: "/series/EV/SVI.webp", },
  { id: "ev02", blocId: "ecarlate-et-violet", code: "EV02", name: "Evolutions a Paldea", releaseYear: 2023, image: "/series/EV/PAL.webp", },
  { id: "ev03", blocId: "ecarlate-et-violet", code: "EV03", name: "Flammes Obsidiennes", releaseYear: 2023, image: "/series/EV/OBF.webp", },
  { id: "ev03.5", blocId: "ecarlate-et-violet", code: "EV03.5", name: "151", releaseYear: 2023, image: "/series/EV/MEW.webp", },
  { id: "ev04", blocId: "ecarlate-et-violet", code: "EV04", name: "Faille Paradoxe", releaseYear: 2024, image: "/series/EV/PAR.webp", },
  { id: "ev04.5", blocId: "ecarlate-et-violet", code: "EV04.5", name: "Destinees de Paldea", releaseYear: 2024, image: "/series/EV/PAF.webp", },
  { id: "ev05", blocId: "ecarlate-et-violet", code: "EV05", name: "Forces Temporelles", releaseYear: 2024, image: "/series/EV/TEF.webp", },
  { id: "ev06", blocId: "ecarlate-et-violet", code: "EV06", name: "Mascarade Crepusculaire", releaseYear: 2024, image: "/series/EV/TWM.webp", },
  { id: "ev06.5", blocId: "ecarlate-et-violet", code: "EV06.5", name: "Fable Nebuleuse", releaseYear: 2024, image: "/series/EV/SFA.webp", },
  { id: "ev07", blocId: "ecarlate-et-violet", code: "EV07", name: "Couronne Stellaire", releaseYear: 2024, image: "/series/EV/SCR.webp", },
  { id: "ev08", blocId: "ecarlate-et-violet", code: "EV08", name: "Etincelles Deferlantes", releaseYear: 2024, image: "/series/EV/SSP.webp", },
  { id: "ev08.5", blocId: "ecarlate-et-violet", code: "EV08.5", name: "Evolutions Prismatiques", releaseYear: 2025, image: "/series/EV/PRE.webp", },
  { id: "ev09", blocId: "ecarlate-et-violet", code: "EV09", name: "Aventures Ensemble", releaseYear: 2025, image: "/series/EV/JTG.webp", },
  { id: "ev10", blocId: "ecarlate-et-violet", code: "EV10", name: "Rivalites Destines", releaseYear: 2025, image: "/series/EV/DRI.webp", },
  { id: "ev10.5", blocId: "ecarlate-et-violet", code: "EV10.5", name: "Flamme Blanche", releaseYear: 2025, image: "/series/EV/WHT.webp", },
  { id: "foudre-noire", blocId: "ecarlate-et-violet", code: "Foudre Noire", name: "Foudre Noire", releaseYear: 2025, image: "/series/EV/BLK.webp", },

  // Epee et Bouclier
  { id: "promo-eb", blocId: "epee-et-bouclier", code: "Promo", name: "Epee et Bouclier", releaseYear: 2020, image: "/series/EB/SWSH.jpg",},
  { id: "eb01", blocId: "epee-et-bouclier", code: "EB01", name: "Epee et Bouclier", releaseYear: 2020, image: "/series/EB/SWSH1.jpg",},
  { id: "eb02", blocId: "epee-et-bouclier", code: "EB02", name: "Clash Des Rebelles", releaseYear: 2020, image: "/series/EB/SWSH2.jpg", },
  { id: "eb03", blocId: "epee-et-bouclier", code: "EB03", name: "Tenebres Embrasees", releaseYear: 2020, image: "/series/EB/SWSH3.jpg", },
  { id: "eb03.5", blocId: "epee-et-bouclier", code: "EB03.5", name: "La Voie Du Maitre", releaseYear: 2020, image: "/series/EB/SWSH35.jpg", },
  { id: "eb04", blocId: "epee-et-bouclier", code: "EB04", name: "Voltage Eclatant", releaseYear: 2020, image: "/series/EB/SWSH4.jpg", },
  { id: "eb04.5", blocId: "epee-et-bouclier", code: "EB04.5", name: "Destinees Radieuse", releaseYear: 2021, image: "/series/EB/SWSH45.jpg", },
  { id: "eb05", blocId: "epee-et-bouclier", code: "EB05", name: "Styles de Combat", releaseYear: 2021, image: "/series/EB/SDC.jpg", },
  { id: "eb06", blocId: "epee-et-bouclier", code: "EB06", name: "Regne De Glace", releaseYear: 2021, image: "/series/EB/CRE.jpg", },
  { id: "eb07", blocId: "epee-et-bouclier", code: "EB07", name: "Evolution Celeste", releaseYear: 2021, image: "/series/EB/EVS.jpg", },
  { id: "eb07.5", blocId: "epee-et-bouclier", code: "EB07.5", name: "Celebrations", releaseYear: 2021, image: "/series/EB/CEL.jpg", },
  { id: "eb08", blocId: "epee-et-bouclier", code: "EB08", name: "Poing De Fusion", releaseYear: 2021, image: "/series/EB/FST.jpg", },
  { id: "eb09", blocId: "epee-et-bouclier", code: "EB09", name: "Stars Etincelantes", releaseYear: 2022, image: "/series/EB/BRS.jpg", },
  { id: "eb10", blocId: "epee-et-bouclier", code: "EB10", name: "Astres Radieux", releaseYear: 2022, image: "/series/EB/AR.jpg", },
  { id: "eb10.5", blocId: "epee-et-bouclier", code: "EB10.5", name: "Pokemon Go", releaseYear: 2022, image: "/series/EB/PGO.jpg", },
  { id: "eb11", blocId: "epee-et-bouclier", code: "EB11", name: "Origine Perdue", releaseYear: 2022, image: "/series/EB/LOR.jpg", },
  { id: "eb12", blocId: "epee-et-bouclier", code: "EB12", name: "Tempete Argentee", releaseYear: 2022, image: "/series/EB/SIT.jpg", },
  { id: "crown-zenith", blocId: "epee-et-bouclier", code: "EB12.5", name: "Zenith Supreme", releaseYear: 2023, image: "/series/EB/CRZ.jpg", },

  // Soleil et Lune
  { id: "PRSM", blocId: "soleil-et-lune", code: "Promo", name: "Soleil et Lune", releaseYear: 2016, image: "/series/SL/PRSM.webp", },
  { id: "sl01", blocId: "soleil-et-lune", code: "SL01", name: "Soleil et Lune", releaseYear: 2017, image: "/series/SL/SL01.webp", },
  { id: "sl02", blocId: "soleil-et-lune", code: "SL02", name: "Gardiens Ascendants", releaseYear: 2017, image: "/series/SL/SL02.webp", },
  { id: "sl03", blocId: "soleil-et-lune", code: "SL03", name: "Ombres Ardentes", releaseYear: 2017, image: "/series/SL/SL03.webp", },
  { id: "sl03.5", blocId: "soleil-et-lune", code: "SL03.5", name: "Légendes Brillantes", releaseYear: 2017, image: "/series/SL/SLE.webp", },
  { id: "sl04", blocId: "soleil-et-lune", code: "SL04", name: "Invasion Carmin", releaseYear: 2017, image: "/series/SL/SL04.webp", },
  { id: "sl05", blocId: "soleil-et-lune", code: "SL05", name: "Ultra Prisme", releaseYear: 2018, image: "/series/SL/SL05.webp", },
  { id: "sl06", blocId: "soleil-et-lune", code: "SL06", name: "Lumiere Interdite", releaseYear: 2018, image: "/series/SL/SL06.webp", },
  { id: "sl07", blocId: "soleil-et-lune", code: "SL07", name: "Tempete Celeste", releaseYear: 2018, image: "/series/SL/SL07.webp", },
  { id: "sl07.5", blocId: "soleil-et-lune", code: "SL07.5", name: "Majeste Des Dragons", releaseYear: 2018, image: "/series/SL/SL07.5.webp", },
  { id: "sl08", blocId: "soleil-et-lune", code: "SL08", name: "Tonnerre Perdu", releaseYear: 2018, image: "/series/SL/SL08.webp", },
  { id: "sl09", blocId: "soleil-et-lune", code: "SL09", name: "Duo De Choc", releaseYear: 2019, image: "/series/SL/SL09.webp", },
  { id: "sl10", blocId: "soleil-et-lune", code: "SL10", name: "Alliance Infaillibe", releaseYear: 2019, image: "/series/SL/SL10.webp", },
  { id: "sl11", blocId: "soleil-et-lune", code: "SL11", name: "Harmonie Des Esprits", releaseYear: 2019, image: "/series/SL/SL11.webp", },
  { id: "sl11.5", blocId: "soleil-et-lune", code: "SL11.5", name: "Destinees Occultes", releaseYear: 2019, image: "/series/SL/SL11.5.webp", },
  { id: "sl12", blocId: "soleil-et-lune", code: "SL12", name: "Eclipse Cosmique", releaseYear: 2019, image: "/series/SL/SL12.webp", },

  // XY
  { id: "prxy", blocId: "xy", code: "PRXY", name: "Promos XY", releaseYear: 2013, image: "/series/XY/PRXY.webp", },
  { id: "xy00", blocId: "xy", code: "XY00", name: "Bienvenue à Kalos", releaseYear: 2013, image: "/series/XY/KSS.webp", },
  { id: "xy01", blocId: "xy", code: "XY01", name: "XY", releaseYear: 2014, image: "/series/XY/XY.webp", },
  { id: "xy02", blocId: "xy", code: "XY02", name: "Etincelles", releaseYear: 2014, image: "/series/XY/FLF.webp", },
  { id: "xy03", blocId: "xy", code: "XY03", name: "Poings Furieux", releaseYear: 2014, image: "/series/XY/FFI.webp", },
  { id: "xy04", blocId: "xy", code: "XY04", name: "Vigueur Spectrale", releaseYear: 2014, image: "/series/XY/PHF.webp", },
  { id: "xy05", blocId: "xy", code: "XY05", name: "Primo Choc", releaseYear: 2015, image: "/series/XY/PRC.webp", },
  { id: "xy05.5", blocId: "xy", code: "XY05.5", name: "Double Danger", releaseYear: 2015, image: "/series/XY/DCR.webp", },
  { id: "xy06", blocId: "xy", code: "XY06", name: "Ciel Rugissant", releaseYear: 2015, image: "/series/XY/ROS.webp", },
  { id: "xy07", blocId: "xy", code: "XY07", name: "Origines Antiques", releaseYear: 2015, image: "/series/XY/AOR.webp", },
  { id: "xy08", blocId: "xy", code: "XY08", name: "Impulsion Turbo", releaseYear: 2015, image: "/series/XY/BKT.webp", },
  { id: "xy09", blocId: "xy", code: "XY09", name: "Rupture Turbo", releaseYear: 2016, image: "/series/XY/BKP.webp", },
  { id: "xy09.5", blocId: "xy", code: "XY09.5", name: "Generations", releaseYear: 2016, image: "/series/XY/GNR.webp", },
  { id: "xy10", blocId: "xy", code: "XY10", name: "Impact Des Destins", releaseYear: 2016, image: "/series/XY/FAC.webp", },
  { id: "xy11", blocId: "xy", code: "XY11", name: "Offensive Vapeur", releaseYear: 2016, image: "/series/XY/STS.webp", },
  { id: "xy12", blocId: "xy", code: "XY12", name: "Evolutions", releaseYear: 2016, image: "/series/XY/EVO.webp", },

  // Noir et Blanc
  { id: "prbw", blocId: "noir-et-blanc", code: "PRBW", name: "Noir et Blanc", releaseYear: 2011, image: "/series/NB/PRBW.webp", },
  { id: "nb01", blocId: "noir-et-blanc", code: "NB01", name: "Noir et Blanc", releaseYear: 2011, image: "/series/NB/NB.webp", },
  { id: "nb02", blocId: "noir-et-blanc", code: "NB02", name: "Pouvoirs Emergents", releaseYear: 2011, image: "/series/NB/EPO.webp", },
  { id: "nb03", blocId: "noir-et-blanc", code: "NB03", name: "Nobles Victoires", releaseYear: 2012, image: "/series/NB/NVI.webp", },
  { id: "nb04", blocId: "noir-et-blanc", code: "NB04", name: "Destinees Futures", releaseYear: 2012, image: "/series/NB/NXD.webp", },
  { id: "nb05", blocId: "noir-et-blanc", code: "NB05", name: "Explorateur Obscurs", releaseYear: 2012, image: "/series/NB/DEX.webp", },
  { id: "nb06", blocId: "noir-et-blanc", code: "NB06", name: "Dragons Exaltes", releaseYear: 2012, image: "/series/NB/DRX.webp", },
  { id: "nb07", blocId: "noir-et-blanc", code: "NB07", name: "Coffre Des Dragon", releaseYear: 2012, image: "/series/NB/DRV.webp", },
  { id: "nb07.5", blocId: "noir-et-blanc", code: "NB07.5", name: "Frontieres Franchies", releaseYear: 2013, image: "/series/NB/BCR.webp", },
  { id: "nb08", blocId: "noir-et-blanc", code: "NB08", name: "Tempete Plasma", releaseYear: 2013, image: "/series/NB/PLS.webp", },
  { id: "nb09", blocId: "noir-et-blanc", code: "NB09", name: "Glaciation Plasma", releaseYear: 2013, image: "/series/NB/PLF.webp", },
  { id: "nb10", blocId: "noir-et-blanc", code: "NB10", name: "Explosion Plasma", releaseYear: 2013, image: "/series/NB/PLB.webp", },

  // L'appel Des legendes
  { id: "hs04", blocId: "appel-des-legendes", code: "HS04", name: "L'appel Des Legendes", releaseYear: 2011, image: "/series/ADL/ADL.webp", },

  // HeartGold SoulSilver
  { id: "prhgss", blocId: "heartgold-soulsilver", code: "PRHGSS", name: "Promos HGSS", releaseYear: 2010, image: "/series/HGSS/PRHS.webp",  },
  { id: "HGSS01", blocId: "heartgold-soulsilver", code: "HGSS01", name: "HeartGold SoulSilver", releaseYear: 2010, image: "/series/HGSS/HGSS.webp",  },
  { id: "HGSS02", blocId: "heartgold-soulsilver", code: "HGSS02", name: "Dechainement", releaseYear: 2010, image: "/series/HGSS/UL.webp",  },
  { id: "HGSS03", blocId: "heartgold-soulsilver", code: "HGSS03", name: "Indomptable", releaseYear: 2010, image: "/series/HGSS/UD.webp",  },
  { id: "HGSS04", blocId: "heartgold-soulsilver", code: "HGSS04", name: "Triomphe", releaseYear: 2011, image: "/series/HGSS/TM.webp",  },

  // Platine
  { id: "PT01", blocId: "platine", code: "PT01", name: "Platine", releaseYear: 2009, image: "/series/PT/PT.webp",   },
  { id: "PT02", blocId: "platine", code: "PT02", name: "Rivaux Emergants", releaseYear: 2009, image: "/series/PT/RR.webp",   },
  { id: "PT03", blocId: "platine", code: "PT03", name: "Vainqueurs Supremes", releaseYear: 2010, image: "/series/PT/SV.webp",   },
  { id: "PT04", blocId: "platine", code: "PT04", name: "Arceus", releaseYear: 2010, image: "/series/PT/AR.webp",   },

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
  ...MEGA_EVOLUTION_CARDS,
  ...ECARLATE_ET_VIOLET_CARDS,
  ...EPEE_ET_BOUCLIER_CARDS,
  ...SOLEIL_ET_LUNE_CARDS,
  ...XY_CARDS,
  ...NOIR_ET_BLANC_CARDS,
  ...HEARTGOLD_SOULSILVER_CARDS,
  ...PLATINE_CARDS,
];

// Helpers

export function getBloc(id: string): Bloc | undefined {
  return BLOCS.find((b) => b.id === id);
}

export function getSerie(id: string): Serie | undefined {
  return SERIES.find((s) => s.id === id);
}

export function getCard(id: string): Card | undefined {
  return CARDS.find((c) => c?.id === id);
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
  return [...CARDS].sort((a, b) => b.price - a.price).slice(0, limit);
}
