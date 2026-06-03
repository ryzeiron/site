"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CARDS = exports.SERIES = exports.BLOCS = exports.RESERVED_VARIANT_KEYS = exports.RARITIES = exports.CONDITIONS = void 0;
exports.isCondition = isCondition;
exports.isRarity = isRarity;
exports.isValidVariantKey = isValidVariantKey;
exports.resolveVariant = resolveVariant;
exports.isVariantHidden = isVariantHidden;
exports.listVariants = listVariants;
exports.getBloc = getBloc;
exports.getSerie = getSerie;
exports.getCard = getCard;
exports.seriesForBloc = seriesForBloc;
exports.cardsForSerie = cardsForSerie;
exports.featuredCards = featuredCards;
const mega_evolution_1 = require("./catalog/cards/mega-evolution");
const ecarlate_et_violet_1 = require("./catalog/cards/ecarlate-et-violet");
const epee_et_bouclier_1 = require("./catalog/cards/epee-et-bouclier");
const soleil_et_lune_1 = require("./catalog/cards/soleil-et-lune");
const xy_1 = require("./catalog/cards/xy");
const noir_et_blanc_1 = require("./catalog/cards/noir-et-blanc");
const heartgold_soulsilver_1 = require("./catalog/cards/heartgold-soulsilver");
const platine_1 = require("./catalog/cards/platine");
const adl_1 = require("./catalog/cards/adl");
const diamant_et_perle_1 = require("./catalog/cards/diamant-et-perle");
const ex_1 = require("./catalog/cards/ex");
const mcdo_1 = require("./catalog/cards/mcdo");
// Catalogue : blocs > series > cartes 
// Prix en euros (ex: 15 = 15 EUR, 0.5 = 50 centimes)
exports.CONDITIONS = [
    "Mint",
    "Near Mint",
    "Excellent",
    "Good",
    "Played",
];
function isCondition(value) {
    return exports.CONDITIONS.includes(value);
}
exports.RARITIES = [
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
];
function isRarity(value) {
    return exports.RARITIES.includes(value);
}
exports.RESERVED_VARIANT_KEYS = new Set(["base", "alt"]);
function isValidVariantKey(key) {
    return /^[a-z][a-z0-9-]{0,30}$/.test(key);
}
function resolveVariant(card, key = "base") {
    let variant;
    if (key === "alt" && card.altVariant) {
        variant = card.altVariant;
    }
    else if (key !== "base" && key !== "alt" && card.extraVariants) {
        const v = card.extraVariants.find((x) => x.key === key);
        variant = v
            ? { rarity: v.rarity, condition: v.condition, price: v.price, stock: v.stock }
            : { rarity: card.rarity, price: card.price, stock: card.stock };
    }
    else {
        variant = {
            rarity: card.rarity,
            condition: card.condition,
            price: card.price,
            stock: card.stock,
        };
    }
    const withCondition = {
        ...variant,
        condition: variant.condition ?? card.condition,
    };
    if (isVariantHidden(card, key))
        return { ...withCondition, stock: 0 };
    return withCondition;
}
function isVariantHidden(card, key) {
    return card.hiddenVariants?.includes(key) ?? false;
}
function listVariants(card, options = {}) {
    const includeHidden = options.includeHidden ?? false;
    const out = [];
    if (includeHidden || !isVariantHidden(card, "base")) {
        out.push({
            key: "base",
            variant: {
                rarity: card.rarity,
                condition: card.condition,
                price: card.price,
                stock: card.stock,
            },
        });
    }
    if (card.altVariant && (includeHidden || !isVariantHidden(card, "alt"))) {
        out.push({
            key: "alt",
            variant: {
                ...card.altVariant,
                condition: card.altVariant.condition ?? card.condition,
            },
        });
    }
    if (card.extraVariants) {
        for (const v of card.extraVariants) {
            if (!includeHidden && isVariantHidden(card, v.key))
                continue;
            out.push({
                key: v.key,
                variant: {
                    rarity: v.rarity,
                    condition: v.condition ?? card.condition,
                    price: v.price,
                    stock: v.stock,
                },
            });
        }
    }
    return out;
}
exports.BLOCS = [
    {
        id: "mega-evolution",
        name: "Méga-Évolution",
        tagline: "2025 - 2028",
        coverColor: "from-amber-400 to-orange-600",
        image: "/blocs/me.webp",
    },
    {
        id: "ecarlate-et-violet",
        name: "Écarlate et Violet",
        tagline: "2023 - 2025 ",
        coverColor: "from-rose-500 to-violet-600",
        image: "/blocs/ecarlate-violet.jpg",
    },
    {
        id: "epee-et-bouclier",
        name: "Épée et Bouclier",
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
        name: "L'appel des Légendes",
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
        name: "Diamant et Perle",
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
    {
        id: "mcdo",
        name: "McDo",
        tagline: "2011 - 2024",
        coverColor: "from-yellow-400 to-red-600",
        image: "/blocs/mcdo.webp",
    },
];
exports.SERIES = [
    // Méga-Évolution
    { id: "me-promo", blocId: "mega-evolution", code: "Promo", name: "Méga-Évolution", releaseYear: 2025, image: "/series/ME/MEP.webp", },
    { id: "me01", blocId: "mega-evolution", code: "ME01", name: "Méga-Évolution", releaseYear: 2025, image: "/series/ME/me.webp", },
    { id: "me02", blocId: "mega-evolution", code: "ME02", name: "Flammes Fantasmagoriques", releaseYear: 2025, image: "/series/ME/PFL.webp", },
    { id: "me02.5", blocId: "mega-evolution", code: "ME02.5", name: "Héros Transcendants", releaseYear: 2026, image: "/series/ME/ASC.webp", },
    { id: "me03", blocId: "mega-evolution", code: "ME03", name: "Équilibre Parfait", releaseYear: 2026, image: "/series/ME/POR.webp", },
    { id: "me04", blocId: "mega-evolution", code: "ME04", name: "Chaos Ascendant", releaseYear: 2026, image: "/series/ME/CRI.webp", },
    { id: "me05", blocId: "mega-evolution", code: "ME05", name: "Nuit Noire", releaseYear: 2026, image: "/series/ME/me05.png", comingSoon: true },
    // Écarlate et Violet
    { id: "promo", blocId: "ecarlate-et-violet", code: "Promo", name: "Écarlate et Violet", releaseYear: 2023, image: "/series/EV/SVP.webp", },
    { id: "ev01", blocId: "ecarlate-et-violet", code: "EV01", name: "Écarlate et Violet", releaseYear: 2023, image: "/series/EV/SVI.webp", },
    { id: "ev02", blocId: "ecarlate-et-violet", code: "EV02", name: "Évolutions à Paldea", releaseYear: 2023, image: "/series/EV/PAL.webp", },
    { id: "ev03", blocId: "ecarlate-et-violet", code: "EV03", name: "Flammes Obsidiennes", releaseYear: 2023, image: "/series/EV/OBF.webp", },
    { id: "ev03.5", blocId: "ecarlate-et-violet", code: "EV03.5", name: "151", releaseYear: 2023, image: "/series/EV/MEW.webp", },
    { id: "ev04", blocId: "ecarlate-et-violet", code: "EV04", name: "Faille Paradoxe", releaseYear: 2024, image: "/series/EV/PAR.webp", },
    { id: "ev04.5", blocId: "ecarlate-et-violet", code: "EV04.5", name: "Destinées de Paldea", releaseYear: 2024, image: "/series/EV/PAF.webp", },
    { id: "ev05", blocId: "ecarlate-et-violet", code: "EV05", name: "Forces Temporelles", releaseYear: 2024, image: "/series/EV/TEF.webp", },
    { id: "ev06", blocId: "ecarlate-et-violet", code: "EV06", name: "Mascarade Crépusculaire", releaseYear: 2024, image: "/series/EV/TWM.webp", },
    { id: "ev06.5", blocId: "ecarlate-et-violet", code: "EV06.5", name: "Fable Nébuleuse", releaseYear: 2024, image: "/series/EV/SFA.webp", },
    { id: "ev07", blocId: "ecarlate-et-violet", code: "EV07", name: "Couronne Stellaire", releaseYear: 2024, image: "/series/EV/SCR.webp", },
    { id: "ev08", blocId: "ecarlate-et-violet", code: "EV08", name: "Étincelles Déferlantes", releaseYear: 2024, image: "/series/EV/SSP.webp", },
    { id: "ev08.5", blocId: "ecarlate-et-violet", code: "EV08.5", name: "Évolutions Prismatiques", releaseYear: 2025, image: "/series/EV/PRE.webp", },
    { id: "ev09", blocId: "ecarlate-et-violet", code: "EV09", name: "Aventures Ensemble", releaseYear: 2025, image: "/series/EV/JTG.webp", },
    { id: "ev10", blocId: "ecarlate-et-violet", code: "EV10", name: "Rivalités Destinées", releaseYear: 2025, image: "/series/EV/DRI.webp", },
    { id: "ev10.5", blocId: "ecarlate-et-violet", code: "EV10.5", name: "Flamme Blanche", releaseYear: 2025, image: "/series/EV/WHT.webp", },
    { id: "foudre-noire", blocId: "ecarlate-et-violet", code: "Foudre Noire", name: "Foudre Noire", releaseYear: 2025, image: "/series/EV/BLK.webp", },
    // Épée et Bouclier
    { id: "promo-eb", blocId: "epee-et-bouclier", code: "Promo", name: "Épée et Bouclier", releaseYear: 2020, image: "/series/EB/PRSWSH.webp", },
    { id: "eb01", blocId: "epee-et-bouclier", code: "EB01", name: "Épée et Bouclier", releaseYear: 2020, image: "/series/EB/SWSH1.jpg", },
    { id: "eb02", blocId: "epee-et-bouclier", code: "EB02", name: "Clash des Rebelles", releaseYear: 2020, image: "/series/EB/SWSH2.jpg", },
    { id: "eb03", blocId: "epee-et-bouclier", code: "EB03", name: "Ténèbres Embrasées", releaseYear: 2020, image: "/series/EB/SWSH3.jpg", },
    { id: "eb03.5", blocId: "epee-et-bouclier", code: "EB03.5", name: "La Voie du Maître", releaseYear: 2020, image: "/series/EB/SWSH35.jpg", },
    { id: "eb04", blocId: "epee-et-bouclier", code: "EB04", name: "Voltage Éclatant", releaseYear: 2020, image: "/series/EB/SWSH4.jpg", },
    { id: "eb04.5", blocId: "epee-et-bouclier", code: "EB04.5", name: "Destinées Radieuses", releaseYear: 2021, image: "/series/EB/SWSH45.jpg", },
    { id: "eb05", blocId: "epee-et-bouclier", code: "EB05", name: "Styles de Combat", releaseYear: 2021, image: "/series/EB/SDC.jpg", },
    { id: "eb06", blocId: "epee-et-bouclier", code: "EB06", name: "Règne de Glace", releaseYear: 2021, image: "/series/EB/CRE.jpg", },
    { id: "eb07", blocId: "epee-et-bouclier", code: "EB07", name: "Évolution Céleste", releaseYear: 2021, image: "/series/EB/EVS.jpg", },
    { id: "eb07.5", blocId: "epee-et-bouclier", code: "EB07.5", name: "Célébrations", releaseYear: 2021, image: "/series/EB/CEL.jpg", },
    { id: "eb08", blocId: "epee-et-bouclier", code: "EB08", name: "Poing de Fusion", releaseYear: 2021, image: "/series/EB/FST.jpg", },
    { id: "eb09", blocId: "epee-et-bouclier", code: "EB09", name: "Stars Étincelantes", releaseYear: 2022, image: "/series/EB/BRS.jpg", },
    { id: "eb10", blocId: "epee-et-bouclier", code: "EB10", name: "Astres Radieux", releaseYear: 2022, image: "/series/EB/AR.jpg", },
    { id: "eb10.5", blocId: "epee-et-bouclier", code: "EB10.5", name: "Pokémon Go", releaseYear: 2022, image: "/series/EB/PGO.jpg", },
    { id: "eb11", blocId: "epee-et-bouclier", code: "EB11", name: "Origine Perdue", releaseYear: 2022, image: "/series/EB/LOR.jpg", },
    { id: "eb12", blocId: "epee-et-bouclier", code: "EB12", name: "Tempête Argentée", releaseYear: 2022, image: "/series/EB/SIT.jpg", },
    { id: "crown-zenith", blocId: "epee-et-bouclier", code: "EB12.5", name: "Zénith Suprême", releaseYear: 2023, image: "/series/EB/CRZ.jpg", },
    // Soleil et Lune
    { id: "PRSM", blocId: "soleil-et-lune", code: "Promo", name: "Soleil et Lune", releaseYear: 2016, image: "/series/SL/PRSM.webp", },
    { id: "sl01", blocId: "soleil-et-lune", code: "SL01", name: "Soleil et Lune", releaseYear: 2017, image: "/series/SL/SL01.webp", },
    { id: "sl02", blocId: "soleil-et-lune", code: "SL02", name: "Gardiens Ascendants", releaseYear: 2017, image: "/series/SL/SL02.webp", },
    { id: "sl03", blocId: "soleil-et-lune", code: "SL03", name: "Ombres Ardentes", releaseYear: 2017, image: "/series/SL/SL03.webp", },
    { id: "sl03.5", blocId: "soleil-et-lune", code: "SL03.5", name: "Légendes Brillantes", releaseYear: 2017, image: "/series/SL/SLE.webp", },
    { id: "sl04", blocId: "soleil-et-lune", code: "SL04", name: "Invasion Carmin", releaseYear: 2017, image: "/series/SL/SL04.webp", },
    { id: "sl05", blocId: "soleil-et-lune", code: "SL05", name: "Ultra Prisme", releaseYear: 2018, image: "/series/SL/SL05.webp", },
    { id: "sl06", blocId: "soleil-et-lune", code: "SL06", name: "Lumière Interdite", releaseYear: 2018, image: "/series/SL/SL06.webp", },
    { id: "sl07", blocId: "soleil-et-lune", code: "SL07", name: "Tempête Céleste", releaseYear: 2018, image: "/series/SL/SL07.webp", },
    { id: "sl07.5", blocId: "soleil-et-lune", code: "SL07.5", name: "Majesté des Dragons", releaseYear: 2018, image: "/series/SL/SL07.5.webp", },
    { id: "sl08", blocId: "soleil-et-lune", code: "SL08", name: "Tonnerre Perdu", releaseYear: 2018, image: "/series/SL/SL08.webp", },
    { id: "sl09", blocId: "soleil-et-lune", code: "SL09", name: "Duo de Choc", releaseYear: 2019, image: "/series/SL/SL09.webp", },
    { id: "sl10", blocId: "soleil-et-lune", code: "SL10", name: "Alliance Infaillible", releaseYear: 2019, image: "/series/SL/SL10.webp", },
    { id: "sl11", blocId: "soleil-et-lune", code: "SL11", name: "Harmonie des Esprits", releaseYear: 2019, image: "/series/SL/SL11.webp", },
    { id: "sl11.5", blocId: "soleil-et-lune", code: "SL11.5", name: "Destinées Occultes", releaseYear: 2019, image: "/series/SL/SL11.5.webp", },
    { id: "sl12", blocId: "soleil-et-lune", code: "SL12", name: "Éclipse Cosmique", releaseYear: 2019, image: "/series/SL/SL12.webp", },
    // XY
    { id: "prxy", blocId: "xy", code: "PRXY", name: "Promos XY", releaseYear: 2013, image: "/series/XY/PRXY.webp", },
    { id: "xy00", blocId: "xy", code: "XY00", name: "Bienvenue à Kalos", releaseYear: 2013, image: "/series/XY/KSS.webp", },
    { id: "xy01", blocId: "xy", code: "XY01", name: "XY", releaseYear: 2014, image: "/series/XY/XY.webp", },
    { id: "xy02", blocId: "xy", code: "XY02", name: "Étincelles", releaseYear: 2014, image: "/series/XY/FLF.webp", },
    { id: "xy03", blocId: "xy", code: "XY03", name: "Poings Furieux", releaseYear: 2014, image: "/series/XY/FFI.webp", },
    { id: "xy04", blocId: "xy", code: "XY04", name: "Vigueur Spectrale", releaseYear: 2014, image: "/series/XY/PHF.webp", },
    { id: "xy05", blocId: "xy", code: "XY05", name: "Primo Choc", releaseYear: 2015, image: "/series/XY/PRC.webp", },
    { id: "xy05.5", blocId: "xy", code: "XY05.5", name: "Double Danger", releaseYear: 2015, image: "/series/XY/DCR.webp", },
    { id: "xy06", blocId: "xy", code: "XY06", name: "Ciel Rugissant", releaseYear: 2015, image: "/series/XY/ROS.webp", },
    { id: "xy07", blocId: "xy", code: "XY07", name: "Origines Antiques", releaseYear: 2015, image: "/series/XY/AOR.webp", },
    { id: "xy08", blocId: "xy", code: "XY08", name: "Impulsion Turbo", releaseYear: 2015, image: "/series/XY/BKT.webp", },
    { id: "xy09", blocId: "xy", code: "XY09", name: "Rupture Turbo", releaseYear: 2016, image: "/series/XY/BKP.webp", },
    { id: "xy09.5", blocId: "xy", code: "XY09.5", name: "Générations", releaseYear: 2016, image: "/series/XY/GNR.webp", },
    { id: "xy10", blocId: "xy", code: "XY10", name: "Impact des Destins", releaseYear: 2016, image: "/series/XY/FAC.webp", },
    { id: "xy11", blocId: "xy", code: "XY11", name: "Offensive Vapeur", releaseYear: 2016, image: "/series/XY/STS.webp", },
    { id: "xy12", blocId: "xy", code: "XY12", name: "Évolutions", releaseYear: 2016, image: "/series/XY/EVO.webp", },
    // Noir et Blanc
    { id: "prbw", blocId: "noir-et-blanc", code: "PRBW", name: "Noir et Blanc", releaseYear: 2011, image: "/series/NB/PRBW.webp", },
    { id: "nb01", blocId: "noir-et-blanc", code: "NB01", name: "Noir et Blanc", releaseYear: 2011, image: "/series/NB/NB.webp", },
    { id: "nb02", blocId: "noir-et-blanc", code: "NB02", name: "Pouvoirs Émergents", releaseYear: 2011, image: "/series/NB/EPO.webp", },
    { id: "nb03", blocId: "noir-et-blanc", code: "NB03", name: "Nobles Victoires", releaseYear: 2012, image: "/series/NB/NVI.webp", },
    { id: "nb04", blocId: "noir-et-blanc", code: "NB04", name: "Destinées Futures", releaseYear: 2012, image: "/series/NB/NXD.webp", },
    { id: "nb05", blocId: "noir-et-blanc", code: "NB05", name: "Explorateurs Obscurs", releaseYear: 2012, image: "/series/NB/DEX.webp", },
    { id: "nb06", blocId: "noir-et-blanc", code: "NB06", name: "Dragons Exaltés", releaseYear: 2012, image: "/series/NB/DRX.webp", },
    { id: "nb07", blocId: "noir-et-blanc", code: "NB07", name: "Coffre des Dragons", releaseYear: 2012, image: "/series/NB/DRV.webp", },
    { id: "nb07.5", blocId: "noir-et-blanc", code: "NB07.5", name: "Frontières Franchies", releaseYear: 2013, image: "/series/NB/BCR.webp", },
    { id: "nb08", blocId: "noir-et-blanc", code: "NB08", name: "Tempête Plasma", releaseYear: 2013, image: "/series/NB/PLS.webp", },
    { id: "nb09", blocId: "noir-et-blanc", code: "NB09", name: "Glaciation Plasma", releaseYear: 2013, image: "/series/NB/PLF.webp", },
    { id: "nb10", blocId: "noir-et-blanc", code: "NB10", name: "Explosion Plasma", releaseYear: 2013, image: "/series/NB/PLB.webp", },
    // L'appel Des legendes
    { id: "adl", blocId: "appel-des-legendes", code: "ADL", name: "L'appel des Légendes", releaseYear: 2011, image: "/series/ADL/ADL.webp", },
    // HeartGold SoulSilver
    { id: "prhgss", blocId: "heartgold-soulsilver", code: "PRHGSS", name: "Promos HGSS", releaseYear: 2010, image: "/series/HGSS/PRHS.webp", },
    { id: "HGSS01", blocId: "heartgold-soulsilver", code: "HGSS01", name: "HeartGold SoulSilver", releaseYear: 2010, image: "/series/HGSS/HGSS.webp", },
    { id: "HGSS02", blocId: "heartgold-soulsilver", code: "HGSS02", name: "Déchaînement", releaseYear: 2010, image: "/series/HGSS/UL.webp", },
    { id: "HGSS03", blocId: "heartgold-soulsilver", code: "HGSS03", name: "Indomptable", releaseYear: 2010, image: "/series/HGSS/UD.webp", },
    { id: "HGSS04", blocId: "heartgold-soulsilver", code: "HGSS04", name: "Triomphe", releaseYear: 2011, image: "/series/HGSS/TM.webp", },
    // Platine
    { id: "PT01", blocId: "platine", code: "PT01", name: "Platine", releaseYear: 2009, image: "/series/PT/PT.webp", },
    { id: "PT02", blocId: "platine", code: "PT02", name: "Rivaux Émergeants", releaseYear: 2009, image: "/series/PT/RR.webp", },
    { id: "PT03", blocId: "platine", code: "PT03", name: "Vainqueurs Suprêmes", releaseYear: 2010, image: "/series/PT/SV.webp", },
    { id: "PT04", blocId: "platine", code: "PT04", name: "Arceus", releaseYear: 2010, image: "/series/PT/AR.webp", },
    // Diamant et Perle
    // Diamant et Perle
    { id: "promo-dp", blocId: "diamant-et-perle", code: "Promo", name: "Promos Diamant et Perle", releaseYear: 2007, image: "/series/DP/DPP.webp", },
    { id: "dp01", blocId: "diamant-et-perle", code: "DP01", name: "Diamant et Perle", releaseYear: 2007, image: "/series/DP/DP1.webp", },
    { id: "dp02", blocId: "diamant-et-perle", code: "DP02", name: "Trésors Mystérieux", releaseYear: 2007, image: "/series/DP/DP2.webp", },
    { id: "dp03", blocId: "diamant-et-perle", code: "DP03", name: "Merveilles Secrètes", releaseYear: 2007, image: "/series/DP/DP3.webp", },
    { id: "dp04", blocId: "diamant-et-perle", code: "DP04", name: "Duels au Sommet", releaseYear: 2008, image: "/series/DP/DP4.webp", },
    { id: "dp05", blocId: "diamant-et-perle", code: "DP05", name: "Aube Majestueuse", releaseYear: 2008, image: "/series/DP/DP5.webp", },
    { id: "dp06", blocId: "diamant-et-perle", code: "DP06", name: "Éveil des Légendes", releaseYear: 2008, image: "/series/DP/DP6.webp", },
    { id: "dp07", blocId: "diamant-et-perle", code: "DP07", name: "Tempête", releaseYear: 2008, image: "/series/DP/DP7.webp", },
    // EX
    { id: "EX01", blocId: "ex", code: "EX01", name: "Rubis et Saphir", releaseYear: 2003, image: "/series/EX/RS.webp", },
    { id: "EX02", blocId: "ex", code: "EX02", name: "Tempête De Sable", releaseYear: 2004, image: "/series/EX/SS.webp", },
    { id: "EX03", blocId: "ex", code: "EX03", name: "Dragon", releaseYear: 2004, image: "/series/EX/DR.webp", },
    { id: "EX04", blocId: "ex", code: "EX04", name: "Légendes Oubliées", releaseYear: 2005, image: "/series/EX/HL.webp", },
    { id: "EX05", blocId: "ex", code: "EX05", name: "Rouge Feu & Vert Feuille", releaseYear: 2005, image: "/series/EX/RFVF.webp", },
    { id: "EX06", blocId: "ex", code: "EX06", name: "Deoxys", releaseYear: 2005, image: "/series/EX/DX.webp", },
    { id: "EX07", blocId: "ex", code: "EX07", name: "Team Magma vs Team Aqua", releaseYear: 2005, image: "/series/EX/TMTA.webp", },
    { id: "EX08", blocId: "ex", code: "EX08", name: "Émeraude", releaseYear: 2005, image: "/series/EX/EM.webp", },
    { id: "EX09", blocId: "ex", code: "EX09", name: "Forces Cachées", releaseYear: 2006, image: "/series/EX/UF.webp", },
    { id: "EX010", blocId: "ex", code: "EX10", name: "Espèces Delta", releaseYear: 2006, image: "/series/EX/DS.webp", },
    { id: "EX011", blocId: "ex", code: "EX11", name: "Créateur de Légendes", releaseYear: 2006, image: "/series/EX/LM.webp", },
    { id: "EX012", blocId: "ex", code: "EX12", name: "Fantômes Holon", releaseYear: 2006, image: "/series/EX/HP.webp", },
    { id: "EX013", blocId: "ex", code: "EX13", name: "Gardiens de Cristal", releaseYear: 2007, image: "/series/EX/CG.webp", },
    { id: "EX014", blocId: "ex", code: "EX14", name: "Île des Dragons", releaseYear: 2007, image: "/series/EX/DF.webp", },
    { id: "EX015", blocId: "ex", code: "EX15", name: "Gardiens du Pouvoir", releaseYear: 2007, image: "/series/EX/PK.webp", },
    { id: "2011bw", blocId: "mcdo", code: "McDo 2011", name: "Collection McDonald's 2011", releaseYear: 2011, image: "/series/mcdo/2011.webp", },
    { id: "2012bw", blocId: "mcdo", code: "McDo 2012", name: "Collection McDonald's 2012", releaseYear: 2012, image: "/series/mcdo/2012.webp", },
    { id: "2013bw", blocId: "mcdo", code: "McDo 2013", name: "Collection McDonald's 2013", releaseYear: 2013, image: "/series/mcdo/2013.webp", },
    { id: "2014xy", blocId: "mcdo", code: "McDo 2014", name: "Collection McDonald's 2014", releaseYear: 2014, image: "/series/mcdo/2014.webp", },
    { id: "2015xy", blocId: "mcdo", code: "McDo 2015", name: "Collection McDonald's 2015", releaseYear: 2015, image: "/series/mcdo/2015.webp", },
    { id: "2016xy", blocId: "mcdo", code: "McDo 2016", name: "Collection McDonald's 2016", releaseYear: 2016, image: "/series/mcdo/2016.webp", },
    { id: "2017sm", blocId: "mcdo", code: "McDo 2017", name: "Collection McDonald's 2017", releaseYear: 2017, image: "/series/mcdo/2017.webp", },
    { id: "2018sm-fr", blocId: "mcdo", code: "McDo 2018", name: "Collection McDonald's 2018 (France)", releaseYear: 2018, image: "/series/mcdo/2018.webp", },
    { id: "2019sm-fr", blocId: "mcdo", code: "McDo 2019", name: "Collection McDonald's 2019 (France)", releaseYear: 2019, image: "/series/mcdo/2019.webp", },
    { id: "2021swsh", blocId: "mcdo", code: "McDo 2021", name: "Collection McDonald's 2021", releaseYear: 2021, image: "/series/mcdo/2021.webp", },
    { id: "2022swsh", blocId: "mcdo", code: "McDo 2022", name: "Collection McDonald's 2022", releaseYear: 2022, image: "/series/mcdo/2022.webp", },
    { id: "2023sv", blocId: "mcdo", code: "McDo 2023", name: "Collection McDonald's 2023", releaseYear: 2023, image: "/series/mcdo/2023.webp", },
    { id: "2024sv", blocId: "mcdo", code: "McDo 2024", name: "Collection McDonald's 2024", releaseYear: 2024, image: "/series/mcdo/2024.webp", },
];
exports.CARDS = [
    ...mega_evolution_1.MEGA_EVOLUTION_CARDS,
    ...ecarlate_et_violet_1.ECARLATE_ET_VIOLET_CARDS,
    ...epee_et_bouclier_1.EPEE_ET_BOUCLIER_CARDS,
    ...soleil_et_lune_1.SOLEIL_ET_LUNE_CARDS,
    ...xy_1.XY_CARDS,
    ...mcdo_1.MCDO_CARDS,
    ...noir_et_blanc_1.NOIR_ET_BLANC_CARDS,
    ...heartgold_soulsilver_1.HEARTGOLD_SOULSILVER_CARDS,
    ...platine_1.PLATINE_CARDS,
    ...adl_1.ADL_CARDS,
    ...diamant_et_perle_1.DIAMANT_ET_PERLE_CARDS,
    ...ex_1.EX_CARDS
];
// Helpers
function getBloc(id) {
    return exports.BLOCS.find((b) => b.id === id);
}
function getSerie(id) {
    return exports.SERIES.find((s) => s.id === id);
}
function getCard(id) {
    return exports.CARDS.find((c) => c?.id === id);
}
function seriesForBloc(blocId) {
    return exports.SERIES.filter((s) => s.blocId === blocId).sort((a, b) => a.code.localeCompare(b.code, undefined, {
        numeric: true,
        sensitivity: "base",
    }));
}
function cardsForSerie(serieId) {
    return exports.CARDS.filter((c) => c.serieId === serieId);
}
function featuredCards(limit = 6) {
    return [...exports.CARDS].sort((a, b) => b.price - a.price).slice(0, limit);
}
