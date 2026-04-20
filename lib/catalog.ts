// Catalogue : blocs > series > cartes
// Prix en centimes d'euro (ex: 1500 = 15,00 EUR)
// Ajoute / modifie librement.

export type Condition = "Mint" | "Near Mint" | "Excellent" | "Good" | "Played";
export type Rarity =
  | "Reverse"
  | "Holo"
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
  // Pour les cartes rares disponibles aussi en version Rare Holo :
  // rareHolo: { priceCents: 500, stock: 1, image: "/cartes/xxx-holo.jpg" },
  rareHolo?: { priceCents: number; stock: number; image?: string };
};

export type Variant = "base" | "holo";

export type ResolvedVariant = {
  card: Card;
  variant: Variant;
  priceCents: number;
  stock: number;
  image?: string;
  rarityLabel: string;
};

export function resolveVariant(card: Card, variant: Variant = "base"): ResolvedVariant {
  if (variant === "holo" && card.rareHolo) {
    return {
      card,
      variant: "holo",
      priceCents: card.rareHolo.priceCents,
      stock: card.rareHolo.stock,
      image: card.rareHolo.image ?? card.image,
      rarityLabel: "Rare Holo",
    };
  }
  return {
    card,
    variant: "base",
    priceCents: card.priceCents,
    stock: card.stock,
    image: card.image,
    rarityLabel: card.rarity,
  };
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
    id: "ecarlate-et-violet",
    name: "Ecarlate et Violet",
    tagline: "2023 - 2025 ",
    coverColor: "from-rose-500 to-violet-600",
    image: "/blocs/ecarlate-violet.jpg", // exemple - remplace par ta propre image
  },
  {
    id: "epee-et-bouclier",
    name: "Epee et Bouclier",
    tagline: "Galar, V, VMAX, VSTAR.",
    coverColor: "from-sky-500 to-indigo-600",
    image: "/blocs/SWSH1.jpg",
    imageFit: "contain",
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
  { id: "eb01", blocId: "epee-et-bouclier", code: "EB01", name: "Epee et Bouclier", releaseYear: 2020, image: "/blocs/SWSH1.jpg", },
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

  // Zenith Supreme (EB12.5) - 230 cartes a completer
  { id: "crown-zenith-001", serieId: "crown-zenith", name: "Mystherbe", number: "001/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/1.jpg",},
  { id: "crown-zenith-002", serieId: "crown-zenith", name: "Ortide", number: "002/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/2.jpg",},
  { id: "crown-zenith-003", serieId: "crown-zenith", name: "Joliflor", number: "003/230", rarity: "Rare", condition: "Near Mint", language: "FR", priceCents: 100, stock: 2, image: "/cartes/3.jpg", rareHolo: { priceCents: 250, stock: 1 }, },
  { id: "crown-zenith-004", serieId: "crown-zenith", name: "Saquedeneu", number: "004/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/4.jpg",},
  { id: "crown-zenith-005", serieId: "crown-zenith", name: "Bouldeneu", number: "005/230", rarity: "Rare", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/5.jpg", },
  { id: "crown-zenith-006", serieId: "crown-zenith", name: "Insécateur", number: "006/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image:"/cartes/6.jpg",},
  { id: "crown-zenith-007", serieId: "crown-zenith", name: "Tournegrin", number: "007/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/7.jpg", },
  { id: "crown-zenith-008", serieId: "crown-zenith", name: "Yanma", number: "008/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/8.jpg", },
  { id: "crown-zenith-009", serieId: "crown-zenith", name: "Yanmega", number: "009/230", rarity: "Rare", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/9.jpg", },
  { id: "crown-zenith-010", serieId: "crown-zenith", name: "Crikzik", number: "010/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/10.jpg", },
  { id: "crown-zenith-011", serieId: "crown-zenith", name: "Ceribou", number: "011/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/11.jpg", },
  { id: "crown-zenith-012", serieId: "crown-zenith", name: "Vortente", number: "012/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/12.jpg", },
  { id: "crown-zenith-013", serieId: "crown-zenith", name: "Phyllali V", number: "013/230", rarity: "Ultra Rare", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/13.jpg", },
  { id: "crown-zenith-014", serieId: "crown-zenith", name: "Phyllali Vstar", number: "014/230", rarity: "Ultra Rare", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/14.jpg", },
  { id: "crown-zenith-015", serieId: "crown-zenith", name: "Larvibule", number: "015/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/15.jpg", },
  { id: "crown-zenith-016", serieId: "crown-zenith", name: "Zarude", number: "016/230", rarity: "Rare", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/16.jpg", },
  { id: "crown-zenith-017", serieId: "crown-zenith", name: "Sylveroy", number: "017/230", rarity: "Rare", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/17.jpg", },
  { id: "crown-zenith-018", serieId: "crown-zenith", name: "Dracaufeu V", number: "018/230", rarity: "Ultra Rare", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/18.jpg", },
  { id: "crown-zenith-019", serieId: "crown-zenith", name: "Dracaufeu Vstar", number: "019/230", rarity: "Ultra Rare", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/19.jpg", },
  { id: "crown-zenith-020", serieId: "crown-zenith", name: "Dracaufeu Radieux", number: "020/230", rarity: "Ultra Rare", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/20.jpg", },
  { id: "crown-zenith-021", serieId: "crown-zenith", name: "Entei", number: "021/230", rarity: "Rare", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/21.jpg", },
  { id: "crown-zenith-022", serieId: "crown-zenith", name: "Flamoutan V", number: "022/230", rarity: "Ultra Rare", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/22.jpg", },
  { id: "crown-zenith-023", serieId: "crown-zenith", name: "Flamoutan Vstar", number: "023/230", rarity: "Ultra Rare", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/23.jpg", },
  { id: "crown-zenith-024", serieId: "crown-zenith", name: "Pyronille", number: "024/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/24.jpg", },
  { id: "crown-zenith-025", serieId: "crown-zenith", name: "Pyrax", number: "025/230", rarity: "Rare", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/25.jpg", },
  { id: "crown-zenith-026", serieId: "crown-zenith", name: "Volcanion", number: "026/230", rarity: "Rare", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/26.jpg", },
  { id: "crown-zenith-027", serieId: "crown-zenith", name: "Tritox", number: "027/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/27.jpg", },
  { id: "crown-zenith-028", serieId: "crown-zenith", name: "Malamandre", number: "028/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/28.jpg", },
  { id: "crown-zenith-029", serieId: "crown-zenith", name: "Otaria", number: "029/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/29.jpg", },
  { id: "crown-zenith-030", serieId: "crown-zenith", name: "M. Mime de galar", number: "030/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/30.jpg", },
  { id: "crown-zenith-031", serieId: "crown-zenith", name: "Wailmer", number: "031/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/31.jpg", },
  { id: "crown-zenith-032", serieId: "crown-zenith", name: "Wailord", number: "032/230", rarity: "Rare", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/32.jpg", },
  { id: "crown-zenith-033", serieId: "crown-zenith", name: "Ecrapince", number: "033/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/33.jpg", },
  { id: "crown-zenith-034", serieId: "crown-zenith", name: "Stalgamin", number: "034/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/34.jpg", },
  { id: "crown-zenith-035", serieId: "crown-zenith", name: "Lovdisc", number: "035/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/35.jpg", },
  { id: "crown-zenith-036", serieId: "crown-zenith", name: "Kyogre", number: "036/230", rarity: "Rare", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/36.jpg", },
  { id: "crown-zenith-037", serieId: "crown-zenith", name: "Kyogre V", number: "037/230", rarity: "Ultra Rare", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/37.jpg", },
  { id: "crown-zenith-038", serieId: "crown-zenith", name: "Givrali V", number: "038/230", rarity: "Ultra Rare", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/38.jpg", },
  { id: "crown-zenith-039", serieId: "crown-zenith", name: "Lixy", number: "039/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/39.jpg", },
  { id: "crown-zenith-040", serieId: "crown-zenith", name: "Lixy", number: "040/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/40.jpg", },
  { id: "crown-zenith-041", serieId: "crown-zenith", name: "Luxio", number: "041/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/41.jpg", },
  { id: "crown-zenith-042", serieId: "crown-zenith", name: "Luxio", number: "042/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/42.jpg", },
  { id: "crown-zenith-043", serieId: "crown-zenith", name: "Luxray", number: "043/230", rarity: "Rare", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/43.jpg", },
  { id: "crown-zenith-044", serieId: "crown-zenith", name: "Luxray", number: "044/230", rarity: "Rare", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/44.jpg", },
  { id: "crown-zenith-045", serieId: "crown-zenith", name: "Motisma V", number: "045/230", rarity: "Ultra Rare", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/45.jpg", },
  { id: "crown-zenith-046", serieId: "crown-zenith", name: "Motisma Vstar", number: "046/230", rarity: "Ultra Rare", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/46.jpg", },
  { id: "crown-zenith-047", serieId: "crown-zenith", name: "Emolga", number: "047/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/47.jpg", },
  { id: "crown-zenith-048", serieId: "crown-zenith", name: "Lampéroie", number: "048/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/48.jpg", },
  { id: "crown-zenith-049", serieId: "crown-zenith", name: "Galvaran", number: "049/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/49.jpg", },
  { id: "crown-zenith-050", serieId: "crown-zenith", name: "Igulta", number: "050/230", rarity: "Rare", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/50.jpg", },
  { id: "crown-zenith-051", serieId: "crown-zenith", name: "Chrysapile Radieux", number: "051/230", rarity: "Ultra Rare", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/51.jpg", },
  { id: "crown-zenith-052", serieId: "crown-zenith", name: "Zeraora", number: "052/230", rarity: "Rare", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/52.jpg", },
  { id: "crown-zenith-053", serieId: "crown-zenith", name: "Zeraora V", number: "053/230", rarity: "Ultra Rare", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/53.jpg", },
  { id: "crown-zenith-054", serieId: "crown-zenith", name: "Zeraora Vmax", number: "054/230", rarity: "Ultra Rare", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/54.jpg", },
  { id: "crown-zenith-055", serieId: "crown-zenith", name: "Zeraoa Vstar", number: "055/230", rarity: "Ultra Rare", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/55.jpg", },
  { id: "crown-zenith-056", serieId: "crown-zenith", name: "Wattpik", number: "056/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/56.jpg", },
  { id: "crown-zenith-057", serieId: "crown-zenith", name: "NoeuNoeuf", number: "057/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/57.jpg", },
  { id: "crown-zenith-058", serieId: "crown-zenith", name: "Noadkoko", number: "058/230", rarity: "Rare", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/58.jpg", },
  { id: "crown-zenith-059", serieId: "crown-zenith", name: "Mewtwo", number: "059/230", rarity: "Rare", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/89.jpg", },
  { id: "crown-zenith-060", serieId: "crown-zenith", name: "Mew V", number: "060/230", rarity: "Ultra Rare", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/60.jpg", },
  { id: "crown-zenith-061", serieId: "crown-zenith", name: "Girafarig", number: "061/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/61.jpg", },
  { id: "crown-zenith-062", serieId: "crown-zenith", name: "Séléroc", number: "062/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/62.jpg", },
  { id: "crown-zenith-063", serieId: "crown-zenith", name: "Téraclope", number: "063/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/63.jpg", },
  { id: "crown-zenith-064", serieId: "crown-zenith", name: "Tokopyon", number: "064/230", rarity: "Rare", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/64.jpg", },
  { id: "crown-zenith-065", serieId: "crown-zenith", name: "Sorcilence V", number: "065/230", rarity: "Ultra Rare", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/65.jpg", },
  { id: "crown-zenith-066", serieId: "crown-zenith", name: "Sorcilence Vmax", number: "066/230", rarity: "Ultra Rare", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/66.jpg", },
  { id: "crown-zenith-067", serieId: "crown-zenith", name: "Amovénus", number: "067/230", rarity: "Rare", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/67.jpg", },
  { id: "crown-zenith-068", serieId: "crown-zenith", name: "Gravalanch", number: "068/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/68.jpg", },
  { id: "crown-zenith-069", serieId: "crown-zenith", name: "Solaroc", number: "069/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/69.jpg", },
  { id: "crown-zenith-070", serieId: "crown-zenith", name: "Balbuto", number: "070/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/70.jpg", },
  { id: "crown-zenith-071", serieId: "crown-zenith", name: "Riolu", number: "071/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/71.jpg", },
  { id: "crown-zenith-072", serieId: "crown-zenith", name: "Pandespiègle", number: "072/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/72.jpg", },
  { id: "crown-zenith-073", serieId: "crown-zenith", name: "Rocabot", number: "073/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/73.jpg", },
  { id: "crown-zenith-074", serieId: "crown-zenith", name: "Lougaroc", number: "074/230", rarity: "Rare", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/74.jpg", },
  { id: "crown-zenith-075", serieId: "crown-zenith", name: "Smogo", number: "075/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/75.jpg", },
  { id: "crown-zenith-076", serieId: "crown-zenith", name: "Absol", number: "076/230", rarity: "Rare", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/76.jpg", },
  { id: "crown-zenith-077", serieId: "crown-zenith", name: "Chacripan", number: "077/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/77.jpg", },
  { id: "crown-zenith-078", serieId: "crown-zenith", name: "Léopardus", number: "078/230", rarity: "Rare", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/78.jpg", },
  { id: "crown-zenith-079", serieId: "crown-zenith", name: "Escroco", number: "079/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/79.jpg", },
  { id: "crown-zenith-080", serieId: "crown-zenith", name: "Pandarbare", number: "080/230", rarity: "Rare", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/80.jpg", },
  { id: "crown-zenith-081", serieId: "crown-zenith", name: "Venalgue", number: "081/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/81.jpg", },
  { id: "crown-zenith-082", serieId: "crown-zenith", name: "Kravarech", number: "082/230", rarity: "Rare", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/82.jpg", },
  { id: "crown-zenith-083", serieId: "crown-zenith", name: "Hoopa", number: "083/230", rarity: "Rare", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/83.jpg", },
  { id: "crown-zenith-084", serieId: "crown-zenith", name: "Miaouss de galar", number: "084/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/84.jpg", },
  { id: "crown-zenith-085", serieId: "crown-zenith", name: "Berserkatt de galar", number: "085/230", rarity: "Rare", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/85.jpg", },
  { id: "crown-zenith-086", serieId: "crown-zenith", name: "Cizayox", number: "086/230", rarity: "Rare", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/86.jpg", },
  { id: "crown-zenith-087", serieId: "crown-zenith", name: "Galekid", number: "087/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/87.jpg", },
  { id: "crown-zenith-088", serieId: "crown-zenith", name: "Galegon", number: "088/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/88.jpg", },
  { id: "crown-zenith-089", serieId: "crown-zenith", name: "Galeking", number: "089/230", rarity: "Rare", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/89.jpg", },
  { id: "crown-zenith-090", serieId: "crown-zenith", name: "Métang", number: "090/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/90.jpg", },
  { id: "crown-zenith-091", serieId: "crown-zenith", name: "Scalpion", number: "091/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/91.jpg", },
  { id: "crown-zenith-092", serieId: "crown-zenith", name: "Scalpion", number: "092/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/92.jpg", },
  { id: "crown-zenith-093", serieId: "crown-zenith", name: "Scalproie", number: "093/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/93.jpg", },
  { id: "crown-zenith-094", serieId: "crown-zenith", name: "Zcian", number: "094/230", rarity: "Rare", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/94.jpg", },
  { id: "crown-zenith-095", serieId: "crown-zenith", name: "Zcian V", number: "095/230", rarity: "Ultra Rare", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/95.jpg", },
  { id: "crown-zenith-096", serieId: "crown-zenith", name: "Zcian Vstar", number: "096/230", rarity: "Ultra Rare", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/96.jpg", },
  { id: "crown-zenith-097", serieId: "crown-zenith", name: "Zamazenta", number: "097/230", rarity: "Rare", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/97.jpg", },
  { id: "crown-zenith-098", serieId: "crown-zenith", name: "Zamazenta V", number: "098/230", rarity: "Ultra Rare", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/98.jpg", },
  { id: "crown-zenith-099", serieId: "crown-zenith", name: "Zamazenta Vstar", number: "099/230", rarity: "Ultra Rare", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/99.jpg", },
  { id: "crown-zenith-100", serieId: "crown-zenith", name: "Rayquaza V", number: "100/230", rarity: "Ultra Rare", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1, image: "/cartes/100.jpg", },
  { id: "crown-zenith-101", serieId: "crown-zenith", name: "Carte 101", number: "101/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-102", serieId: "crown-zenith", name: "Carte 102", number: "102/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-103", serieId: "crown-zenith", name: "Carte 103", number: "103/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-104", serieId: "crown-zenith", name: "Carte 104", number: "104/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-105", serieId: "crown-zenith", name: "Carte 105", number: "105/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-106", serieId: "crown-zenith", name: "Carte 106", number: "106/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-107", serieId: "crown-zenith", name: "Carte 107", number: "107/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-108", serieId: "crown-zenith", name: "Carte 108", number: "108/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-109", serieId: "crown-zenith", name: "Carte 109", number: "109/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-110", serieId: "crown-zenith", name: "Carte 110", number: "110/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-111", serieId: "crown-zenith", name: "Carte 111", number: "111/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-112", serieId: "crown-zenith", name: "Carte 112", number: "112/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-113", serieId: "crown-zenith", name: "Carte 113", number: "113/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-114", serieId: "crown-zenith", name: "Carte 114", number: "114/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-115", serieId: "crown-zenith", name: "Carte 115", number: "115/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-116", serieId: "crown-zenith", name: "Carte 116", number: "116/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-117", serieId: "crown-zenith", name: "Carte 117", number: "117/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-118", serieId: "crown-zenith", name: "Carte 118", number: "118/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-119", serieId: "crown-zenith", name: "Carte 119", number: "119/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-120", serieId: "crown-zenith", name: "Carte 120", number: "120/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-121", serieId: "crown-zenith", name: "Carte 121", number: "121/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-122", serieId: "crown-zenith", name: "Carte 122", number: "122/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-123", serieId: "crown-zenith", name: "Carte 123", number: "123/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-124", serieId: "crown-zenith", name: "Carte 124", number: "124/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-125", serieId: "crown-zenith", name: "Carte 125", number: "125/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-126", serieId: "crown-zenith", name: "Carte 126", number: "126/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-127", serieId: "crown-zenith", name: "Carte 127", number: "127/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-128", serieId: "crown-zenith", name: "Carte 128", number: "128/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-129", serieId: "crown-zenith", name: "Carte 129", number: "129/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-130", serieId: "crown-zenith", name: "Carte 130", number: "130/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-131", serieId: "crown-zenith", name: "Carte 131", number: "131/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-132", serieId: "crown-zenith", name: "Carte 132", number: "132/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-133", serieId: "crown-zenith", name: "Carte 133", number: "133/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-134", serieId: "crown-zenith", name: "Carte 134", number: "134/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-135", serieId: "crown-zenith", name: "Carte 135", number: "135/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-136", serieId: "crown-zenith", name: "Carte 136", number: "136/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-137", serieId: "crown-zenith", name: "Carte 137", number: "137/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-138", serieId: "crown-zenith", name: "Carte 138", number: "138/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-139", serieId: "crown-zenith", name: "Carte 139", number: "139/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-140", serieId: "crown-zenith", name: "Carte 140", number: "140/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-141", serieId: "crown-zenith", name: "Carte 141", number: "141/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-142", serieId: "crown-zenith", name: "Carte 142", number: "142/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-143", serieId: "crown-zenith", name: "Carte 143", number: "143/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-144", serieId: "crown-zenith", name: "Carte 144", number: "144/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-145", serieId: "crown-zenith", name: "Carte 145", number: "145/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-146", serieId: "crown-zenith", name: "Carte 146", number: "146/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-147", serieId: "crown-zenith", name: "Carte 147", number: "147/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-148", serieId: "crown-zenith", name: "Carte 148", number: "148/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-149", serieId: "crown-zenith", name: "Carte 149", number: "149/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-150", serieId: "crown-zenith", name: "Carte 150", number: "150/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-151", serieId: "crown-zenith", name: "Carte 151", number: "151/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-152", serieId: "crown-zenith", name: "Carte 152", number: "152/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-153", serieId: "crown-zenith", name: "Carte 153", number: "153/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-154", serieId: "crown-zenith", name: "Carte 154", number: "154/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-155", serieId: "crown-zenith", name: "Carte 155", number: "155/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-156", serieId: "crown-zenith", name: "Carte 156", number: "156/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-157", serieId: "crown-zenith", name: "Carte 157", number: "157/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-158", serieId: "crown-zenith", name: "Carte 158", number: "158/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-159", serieId: "crown-zenith", name: "Carte 159", number: "159/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-160", serieId: "crown-zenith", name: "Carte 160", number: "160/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-161", serieId: "crown-zenith", name: "Carte 161", number: "161/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-162", serieId: "crown-zenith", name: "Carte 162", number: "162/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-163", serieId: "crown-zenith", name: "Carte 163", number: "163/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-164", serieId: "crown-zenith", name: "Carte 164", number: "164/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-165", serieId: "crown-zenith", name: "Carte 165", number: "165/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-166", serieId: "crown-zenith", name: "Carte 166", number: "166/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-167", serieId: "crown-zenith", name: "Carte 167", number: "167/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-168", serieId: "crown-zenith", name: "Carte 168", number: "168/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-169", serieId: "crown-zenith", name: "Carte 169", number: "169/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-170", serieId: "crown-zenith", name: "Carte 170", number: "170/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-171", serieId: "crown-zenith", name: "Carte 171", number: "171/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-172", serieId: "crown-zenith", name: "Carte 172", number: "172/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-173", serieId: "crown-zenith", name: "Carte 173", number: "173/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-174", serieId: "crown-zenith", name: "Carte 174", number: "174/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-175", serieId: "crown-zenith", name: "Carte 175", number: "175/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-176", serieId: "crown-zenith", name: "Carte 176", number: "176/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-177", serieId: "crown-zenith", name: "Carte 177", number: "177/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-178", serieId: "crown-zenith", name: "Carte 178", number: "178/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-179", serieId: "crown-zenith", name: "Carte 179", number: "179/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-180", serieId: "crown-zenith", name: "Carte 180", number: "180/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-181", serieId: "crown-zenith", name: "Carte 181", number: "181/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-182", serieId: "crown-zenith", name: "Carte 182", number: "182/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-183", serieId: "crown-zenith", name: "Carte 183", number: "183/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-184", serieId: "crown-zenith", name: "Carte 184", number: "184/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-185", serieId: "crown-zenith", name: "Carte 185", number: "185/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-186", serieId: "crown-zenith", name: "Carte 186", number: "186/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-187", serieId: "crown-zenith", name: "Carte 187", number: "187/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-188", serieId: "crown-zenith", name: "Carte 188", number: "188/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-189", serieId: "crown-zenith", name: "Carte 189", number: "189/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-190", serieId: "crown-zenith", name: "Carte 190", number: "190/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-191", serieId: "crown-zenith", name: "Carte 191", number: "191/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-192", serieId: "crown-zenith", name: "Carte 192", number: "192/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-193", serieId: "crown-zenith", name: "Carte 193", number: "193/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-194", serieId: "crown-zenith", name: "Carte 194", number: "194/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-195", serieId: "crown-zenith", name: "Carte 195", number: "195/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-196", serieId: "crown-zenith", name: "Carte 196", number: "196/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-197", serieId: "crown-zenith", name: "Carte 197", number: "197/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-198", serieId: "crown-zenith", name: "Carte 198", number: "198/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-199", serieId: "crown-zenith", name: "Carte 199", number: "199/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-200", serieId: "crown-zenith", name: "Carte 200", number: "200/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-201", serieId: "crown-zenith", name: "Carte 201", number: "201/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-202", serieId: "crown-zenith", name: "Carte 202", number: "202/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-203", serieId: "crown-zenith", name: "Carte 203", number: "203/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-204", serieId: "crown-zenith", name: "Carte 204", number: "204/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-205", serieId: "crown-zenith", name: "Carte 205", number: "205/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-206", serieId: "crown-zenith", name: "Carte 206", number: "206/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-207", serieId: "crown-zenith", name: "Carte 207", number: "207/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-208", serieId: "crown-zenith", name: "Carte 208", number: "208/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-209", serieId: "crown-zenith", name: "Carte 209", number: "209/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-210", serieId: "crown-zenith", name: "Carte 210", number: "210/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-211", serieId: "crown-zenith", name: "Carte 211", number: "211/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-212", serieId: "crown-zenith", name: "Carte 212", number: "212/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-213", serieId: "crown-zenith", name: "Carte 213", number: "213/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-214", serieId: "crown-zenith", name: "Carte 214", number: "214/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-215", serieId: "crown-zenith", name: "Carte 215", number: "215/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-216", serieId: "crown-zenith", name: "Carte 216", number: "216/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-217", serieId: "crown-zenith", name: "Carte 217", number: "217/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-218", serieId: "crown-zenith", name: "Carte 218", number: "218/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-219", serieId: "crown-zenith", name: "Carte 219", number: "219/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-220", serieId: "crown-zenith", name: "Carte 220", number: "220/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-221", serieId: "crown-zenith", name: "Carte 221", number: "221/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-222", serieId: "crown-zenith", name: "Carte 222", number: "222/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-223", serieId: "crown-zenith", name: "Carte 223", number: "223/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-224", serieId: "crown-zenith", name: "Carte 224", number: "224/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-225", serieId: "crown-zenith", name: "Carte 225", number: "225/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-226", serieId: "crown-zenith", name: "Carte 226", number: "226/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-227", serieId: "crown-zenith", name: "Carte 227", number: "227/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-228", serieId: "crown-zenith", name: "Carte 228", number: "228/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-229", serieId: "crown-zenith", name: "Carte 229", number: "229/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },
  { id: "crown-zenith-230", serieId: "crown-zenith", name: "Carte 230", number: "230/230", rarity: "Reverse", condition: "Near Mint", language: "FR", priceCents: 100, stock: 1 },

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
