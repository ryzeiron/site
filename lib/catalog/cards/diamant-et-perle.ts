import type { Card, Rarity } from "../../catalog";

type CardKind = "holo" | "rare" | "uncommon" | "common" | "ultra" | "secret";
type Entry = [number | string, string, CardKind];

const reverseVariant = { rarity: "Reverse", price: 1, stock: 0 } as const;
const rareReverseVariant = { rarity: "Rare Reverse", price: 1, stock: 0 } as const;

function parseEntries(raw: string): Entry[] {
  return raw
    .trim()
    .split("\n")
    .map((line) => {
      const [number, name, kind] = line.split("|").map((part) => part.trim());
      return [/^\d+$/.test(number) ? Number(number) : number, name, kind as CardKind];
    });
}

function rarityFor(kind: CardKind): Rarity {
  if (kind === "holo") return "Rare Holo";
  if (kind === "rare") return "Rare Reverse";
  if (kind === "common") return "Commune";
  if (kind === "ultra") return "Ultra Rare";
  if (kind === "secret") return "Secrete";
  return "Reverse";
}

function altFor(kind: CardKind): Card["altVariant"] | undefined {
  if (kind === "holo") return rareReverseVariant;
  if (kind === "common") return reverseVariant;
  return undefined;
}

function cardNumber(localId: number | string, total: number): string {
  if (typeof localId === "number") return `${String(localId).padStart(3, "0")}/${total}`;
  return localId;
}

function cardSlug(localId: number | string): string {
  return typeof localId === "number" ? String(localId).padStart(3, "0") : localId.toLowerCase();
}

function localImage(prefix: string, localId: number | string): string {
  return `/cartes/${prefix}/${cardSlug(localId)}.png`;
}

function makeCards(
  serieId: string,
  prefix: string,
  _pokemonSetCode: string,
  total: number,
  entries: Entry[],
): Card[] {
  return entries.map(([localId, name, kind]) => {
    const altVariant = altFor(kind);

    return {
      id: `${prefix}-${cardSlug(localId)}`,
      serieId,
      name,
      number: cardNumber(localId, total),
      rarity: rarityFor(kind),
      condition: "Near Mint",
      language: "FR",
      price: 1,
      stock: 0,
      image: localImage(prefix, localId),
      ...(altVariant ? { altVariant } : {}),
    };
  });
}


// DP01 - Diamant & Perle
const DIAMANT_ET_PERLE_BASE = parseEntries(`
1|Dialga|holo
2|Noctunoir|holo
3|Elekable|holo
4|Pingoléon|holo
5|Simiabraz|holo
6|Lucario|holo
7|Luxray|holo
8|Magnézone|holo
9|Manaphy|holo
10|Magirêve|holo
11|Palkia|holo
12|Rhinastoc|holo
13|Roserade|holo
14|Tengalice|holo
15|Moufflair|holo
16|Etouraptor|holo
17|Torterra|holo
18|Azumarill|rare
19|Charmillon|rare
20|Castorno|rare
21|Vortente|rare
22|Melodelfe|rare
23|Drascore|rare
24|Grodrive|rare
25|Papinox|rare
26|Mustéflott|rare
27|Ectoplasma|rare
28|Scarhino|rare
29|Hippodocus|rare
30|Lockpin|rare
31|Mackogneur|rare
32|Charmina|rare
33|Goinfrex|rare
34|Noarfang|rare
35|Pachirisu|rare
36|Chaffreux|rare
37|Ronflex|rare
38|Steelix|rare
39|Apireine|rare
40|Dimoret|rare
41|Qulbutoké|rare
42|Okéoké|rare
43|Rozbouton|uncommon
44|Blindalys|uncommon
45|Ceriflor|uncommon
46|Baudrive|uncommon
47|Teraclope|uncommon
48|Elekid|uncommon
49|Boskara|uncommon
50|Spectrum|uncommon
51|Hippopotas|uncommon
52|Luxio|uncommon
53|Machopeur|uncommon
54|Magneton|uncommon
55|Babimanta|uncommon
56|Chimpenfeu|uncommon
57|Pifeuil|uncommon
58|Prinplouf|uncommon
59|Galopa|uncommon
60|Rhinoféros|uncommon
61|Riolu|uncommon
62|Poissoroy|uncommon
63|Armulys|uncommon
64|Etourvol|uncommon
65|Zarbi A|uncommon
66|Zarbi B|uncommon
67|Zarbi C|uncommon
68|Zarbi D|uncommon
69|Azurill|common
70|Keunotor|common
71|Manzai|common
72|Mustébouée|common
73|Laporeille|common
74|Pijako|common
75|Ceribou|common
76|Ouisticram|common
77|Melofée|common
78|Melo|common
79|Apitrini|common
80|Skélénox|common
81|Elektek|common
82|Fantominus|common
83|Chaglam|common
84|Poissirène|common
85|Hoothoot|common
86|Machoc|common
87|Magneti|common
88|Marill|common
89|Meditikka|common
90|Mime Jr.|common
91|Feuforêve|common
92|Onix|common
93|Tiplouf|common
94|Ponyta|common
95|Rhinocorne|common
96|Roselia|common
97|Grainipiot|common
98|Lixy|common
99|Rapion|common
100|Farfuret|common
101|Etourmi|common
102|Moufouette|common
103|Tortipouss|common
104|Chenipotte|common
105|Double guérison totale|uncommon
106|Restauration d'énergie|uncommon
107|Échange d'énergie|uncommon
108|Centre Pokémon de Nuit|uncommon
109|PlusPower|uncommon
110|Poké Ball|uncommon
111|Pokédex HANDY910is|uncommon
112|Prof. Sorbier|uncommon
113|Rival|uncommon
114|Stade Rapide|uncommon
115|Super rappel|uncommon
116|Point d'échange|uncommon
117|Recherche d'énergie|common
118|Potion|common
119|Échange|common
120|Pingoléon|ultra
121|Simiabraz|ultra
122|Torterra|ultra
123|Énergie Plante|common
124|Énergie Feu|common
125|Énergie Eau|common
126|Énergie Électrique|common
127|Énergie Psy|common
128|Énergie Combat|common
129|Énergie Obscurité|common
130|Énergie Métal|common
`);

// DP01.5 - Trésors Mystérieux
const TRESORS_MYSTERIEUX = parseEntries(`
1|Galeking|holo
2|Alakazam|holo
3|Capidextre|holo
4|Créfadet|holo
5|Leuphorie|holo
6|Archéodong|holo
7|Celebi|holo
8|Aligatueur|holo
9|Carchacrok|holo
10|Corboss|holo
11|Luminéon|holo
12|Maganon|holo
13|Meganium|holo
14|Créfollet|holo
15|Raichu|holo
16|Typhlosion|holo
17|Tyranocif|holo
18|Créhelf|holo
19|Blizzaroi|rare
20|Migalos|rare
21|Bastiodon|rare
22|Éoko|rare
23|Nostenfer|rare
24|Noadkoko|rare
25|Oniglali|rare
26|Leviator|rare
27|Mélokrik|rare
28|Elecsprint|rare
29|Demanta|rare
30|M. Mime|rare
31|Nidoqueen|rare
32|Feunard|rare
33|Charkos|rare
34|Monaflemit|rare
35|Simularbre|rare
36|Coatox|rare
37|Zarbi I|rare
38|Ursaring|rare
39|Kaimorse|rare
40|Barbicha|rare
41|Macronium|uncommon
42|Korillon|uncommon
43|Kranidos|uncommon
44|Crocrodil|uncommon
45|Lamantine|uncommon
46|Dodrio|uncommon
47|Insolourdo|uncommon
48|Carmache|uncommon
49|Girafarig|uncommon
50|Nosferalto|uncommon
51|Gravalanch|uncommon
52|Ptiravi|uncommon
53|Galegon|uncommon
54|Magmar|uncommon
55|Maskadra|uncommon
56|Nidorina|uncommon
57|Octillery|uncommon
58|Parasect|uncommon
59|Ymphect|uncommon
60|Feurisson|uncommon
61|Sablaireau|uncommon
62|Phogleur|uncommon
63|Dinoclier|uncommon
64|Tropius|uncommon
65|Zarbi E|uncommon
66|Zarbi M|uncommon
67|Zarbi T|uncommon
68|Vigoroth|uncommon
69|Abra|common
70|Capumain|common
71|Galekid|common
72|Barloche|common
73|Keunotor|common
74|Archéomire|common
75|Mustébouée|common
76|Leveinard|common
77|Germignon|common
78|Cradopaud|common
79|Héricendre|common
80|Doduo|common
81|Dynavolt|common
82|Noeunoeuf|common
83|Ecayon|common
84|Racaillou|common
85|Griknot|common
86|Crikzik|common
87|Embrylex|common
88|Magby|common
89|Magicarpe|common
90|Cornèbre|common
91|Nidoran♀|common
92|Paras|common
93|Pichu|common
94|Pikachu|common
95|Remoraid|common
96|Sabelette|common
97|Otaria|common
98|Lixy|common
99|Parecool|common
100|Stalgamin|common
101|Blizzi|common
102|Obalie|common
103|Mimigal|common
104|Arakdo|common
105|Teddiursa|common
106|Kaiminus|common
107|Goupix|common
108|Nosferapti|common
109|La recherche d'Amelle|uncommon
110|Balle crépusculaire|uncommon
111|Excavateur de fossiles|uncommon
112|Berge du lac|uncommon
113|Maintenance nocturne|uncommon
114|Rapide Ball|uncommon
115|Le pari de l'équipe Galaxie|uncommon
116|Fossile armure|common
117|Fossile crâne|common
118|Énergies multiples|rare
119|Énergie Obscurité|uncommon
120|Énergie Métal|uncommon
121|Elekable|ultra
122|Lucario|ultra
123|Maganon|ultra
124|Altération espace-temps|secret
`);

// DP02 - Merveilles Secrètes
const MERVEILLES_SECRETES = parseEntries(`
1|Pharamp|holo
2|Tortank|holo
3|Dracaufeu|holo
4|Entei|holo
5|Libegon|holo
6|Gallame|holo
7|Gardevoir|holo
8|Tritosor Mer Orient|holo
9|Tritosor Mer Occident|holo
10|Ho-Oh|holo
11|Cotovol|holo
12|Coudlangue|holo
13|Ludicolo|holo
14|Lugia|holo
15|Mew|holo
16|Raikou|holo
17|Roserade|holo
18|Drattak|holo
19|Suicune|holo
20|Florizarre|holo
21|Absol|rare
22|Arcanin|rare
23|Branette|rare
24|Triopikeur|rare
25|Elekable|rare
26|Electrode|rare
27|Fouinar|rare
28|Akwakwak|rare
29|Grolem|rare
30|Lippoutou|rare
31|Maganon|rare
32|Negapi|rare
33|Papilord|rare
34|Nidoking|rare
35|Roucarnage|rare
36|Posipi|rare
37|Sharpedo|rare
38|Heliatronc|rare
39|Zarbi S|rare
40|Dimoret|rare
41|Cheniselle Cape Plante|rare
42|Cheniselle Cape Sable|rare
43|Cheniselle Cape Déchet|rare
44|Xatu|rare
45|Chapignon|uncommon
46|Reptincel|uncommon
47|Crustabri|uncommon
48|Donphan|uncommon
49|Canarticho|uncommon
50|Lainergie|uncommon
51|Herbizarre|uncommon
52|Kecleon|uncommon
53|Kirlia|uncommon
54|Lombre|uncommon
55|Écrémeuh|uncommon
56|Grotadmorv|uncommon
57|Nidorino|uncommon
58|Roucoups|uncommon
59|Scarabrute|uncommon
60|Maraiste|uncommon
61|Rattatac|uncommon
62|Roselia|uncommon
63|Ténéfix|uncommon
64|Drackhaus|uncommon
65|Floravol|uncommon
66|Queulorior|uncommon
67|Lippouti|uncommon
68|Zarbi K|uncommon
69|Zarbi N|uncommon
70|Zarbi O|uncommon
71|Zarbi X|uncommon
72|Zarbi Z|uncommon
73|Aéromite|uncommon
74|Vibraninf|uncommon
75|Carabaffe|uncommon
76|Draby|common
77|Bulbizarre|common
78|Cheniti Cape Plante|common
79|Cheniti Cape Sable|common
80|Cheniti Cape Déchet|common
81|Carvanha|common
82|Salamèche|common
83|Mélofée|common
84|Corayon|common
85|Taupiqueur|common
86|Skélénox|common
87|Elektek|common
88|Tadmorv|common
89|Caninos|common
90|Granivol|common
91|Excelangue|common
92|Nénupiot|common
93|Magmar|common
94|Wattouat|common
95|Cornèbre|common
96|Natu|common
97|Nidoran♂|common
98|Phanpy|common
99|Roucool|common
100|Psykokwak|common
101|Qwilfish|common
102|Tarsal|common
103|Rattata|common
104|Fouinette|common
105|Kokiyas|common
106|Sancoki Mer Orient|common
107|Sancoki Mer Occident|common
108|Balignon|common
109|Caratroc|common
110|Polichombr|common
111|Spinda|common
112|Carapuce|common
113|Cerfrousse|common
114|Tournegrin|common
115|Kraknoix|common
116|Mimitoss|common
117|Voltorbe|common
118|Axoloto|common
119|La recherche d'Amelle|uncommon
120|Maintenance nocturne|uncommon
121|PlusPower|uncommon
122|La visite du Prof. Chen|uncommon
123|Prof. Sorbier|uncommon
124|Rival|uncommon
125|La recherche de Rose|uncommon
126|Mars de la Team Galaxie|uncommon
127|Potion|common
128|Échange|common
129|Énergie Obscurité|uncommon
130|Énergie Métal|uncommon
131|Gardevoir|ultra
132|Corboss|ultra
`);

// DP03 - Duels au Sommet
const DUELS_AU_SOMMET = parseEntries(`
1|Brasegali|holo
2|Cresselia|holo
3|Darkrai|holo
4|Darkrai|holo
5|Pachirisu|holo
6|Porygon-Z|holo
7|Motisma|holo
8|Jungko|holo
9|Laggron|holo
10|Bouldeneu|holo
11|Togekiss|holo
12|Altaria|rare
13|Dardargnan|rare
14|Papilusion|rare
15|Kaorine|rare
16|Dialga|rare
17|Brouhabam|rare
18|Demolosse|rare
19|Hypnomade|rare
20|Krabboss|rare
21|Lokhlass|rare
22|Latias|rare
23|Latios|rare
24|Mysdibule|rare
25|Milobellus|rare
26|Palkia|rare
27|Colossinge|rare
28|Roigada|rare
29|Zarbi H|rare
30|Wailord|rare
31|Smogogo|rare
32|Grodoudou|rare
33|Arbok|uncommon
34|Cacturne|uncommon
35|Galifeu|uncommon
36|Cadoizo|uncommon
37|Mustéflott|uncommon
38|Rosabyss|uncommon
39|Granbull|uncommon
40|Massko|uncommon
41|Hariyama|uncommon
42|Serpang|uncommon
43|Lineon|uncommon
44|Ramboum|uncommon
45|Volcaropod|uncommon
46|Flobio|uncommon
47|Chrysacier|uncommon
48|Bekipan|uncommon
49|Porygon2|uncommon
50|Chaffreux|uncommon
51|Relicanth|uncommon
52|Seviper|uncommon
53|Airmure|uncommon
54|Flagadoss|uncommon
55|Togetic|uncommon
56|Zarbi F|uncommon
57|Zarbi G|uncommon
58|Wailmer|uncommon
59|Mangriff|uncommon
60|Balbuto|common
61|Mustébouée|common
62|Cacnea|common
63|Chenipan|common
64|Coquiperl|common
65|Soporifik|common
66|Abo|common
67|Barpau|common
68|Chaglam|common
69|Malosse|common
70|Toudoudou|common
71|Lumivole|common
72|Rondoudou|common
73|Coconfort|common
74|Smogo|common
75|Krabby|common
76|Seleroc|common
77|Lovdisc|common
78|Makuhita|common
79|Férosinge|common
80|Gobou|common
81|Porygon|common
82|Ramoloss|common
83|Limagma|common
84|Snubbull|common
85|Solaroc|common
86|Tylton|common
87|Saquedeneu|common
88|Togepi|common
89|Poussifeu|common
90|Arcko|common
91|Zarbi L|common
92|Muciole|common
93|Aspicot|common
94|Chuchmur|common
95|Goelise|common
96|Zigzaton|common
97|Pièce rune|uncommon
98|Le dessin de Felicity|uncommon
99|Restes|uncommon
100|Stade clair de lune|uncommon
101|Honor Ball|uncommon
102|Super bonbon|uncommon
103|Cresselia|ultra
104|Darkrai|ultra
105|Dialga|ultra
106|Palkia|ultra
`);

// DP04 - Aube Majestueuse
const AUBE_MAJESTUEUSE = parseEntries(`
1|Artikodin|holo
2|Cresselia|holo
3|Darkrai|holo
4|Dialga|holo
5|Givrali|holo
6|Kabutops|holo
7|Phyllali|holo
8|Manaphy|holo
9|Mewtwo|holo
10|Sulfura|holo
11|Palkia|holo
12|Phione|holo
13|Motisma|holo
14|Electhor|holo
15|Ptera|rare
16|Archéodong|rare
17|Pingoléon|rare
18|Mentali|rare
19|Pyroli|rare
20|Givrali|rare
21|Hippodocus|rare
22|Simiabraz|rare
23|Voltali|rare
24|Phyllali|rare
25|Negapi|rare
26|Amonistar|rare
27|Phione|rare
28|Posipi|rare
29|Cizayox|rare
30|Torterra|rare
31|Coatox|rare
32|Noctali|rare
33|Zarbi P|rare
34|Aquali|rare
35|Capidextre|uncommon
36|Rapasdepic|uncommon
37|Boskara|uncommon
38|Kangourex|uncommon
39|Excelangue|uncommon
40|Elecsprint|uncommon
41|Chimpenfeu|uncommon
42|Papilord|uncommon
43|Pachirisu|uncommon
44|Prinplouf|uncommon
45|Raichu|uncommon
46|Insécateur|uncommon
47|Étourvol|uncommon
48|Simularbre|uncommon
49|Zarbi Q|uncommon
50|Capumain|common
51|Capumain|common
52|Archéomire|common
53|Laporeille|common
54|Cheniti Cape Sable|common
55|Pijako|common
56|Ouisticram|common
57|Ouisticram|common
58|Korillon|common
59|Apitrini|common
60|Cradopaud|common
61|Baudrive|common
62|Evoli|common
63|Evoli|common
64|Dynavolt|common
65|Chaglam|common
66|Hippopotas|common
67|Kabuto|common
68|Goinfrex|common
69|Amonita|common
70|Pikachu|common
71|Tiplouf|common
72|Tiplouf|common
73|Sancoki Mer Orient|common
74|Piafabec|common
75|Étourmi|common
76|Moufouette|common
77|Tortipouss|common
78|Tortipouss|common
79|Stade crépuscule|uncommon
80|Sombre Ball|uncommon
81|Restauration d'énergie|uncommon
82|Excavateur de fossiles|uncommon
83|La gentillesse de Maman|uncommon
84|Vieil Ambre|uncommon
85|Poké Ball|uncommon
86|Rapide Ball|uncommon
87|Super rappel|uncommon
88|Point d'échange|uncommon
89|Fossile Dôme|common
90|Recherche d'énergie|common
91|Fossile Nautile|common
92|Appel à l'énergie|uncommon
93|Énergie Obscurité|uncommon
94|Énergie santé|uncommon
95|Énergie Métal|uncommon
96|Énergie guérison|uncommon
97|Carchacrok|ultra
98|Givrali|ultra
99|Phyllali|ultra
100|Porygon-Z|ultra
`);

// DP05 - Éveil des Légendes
const EVEIL_DES_LEGENDES = parseEntries(`
1|Deoxys Forme Normale|holo
2|Dracolosse|holo
3|Momartik|holo
4|Giratina|holo
5|Scorvol|holo
6|Heatran|holo
7|Hyporoi|holo
8|Luxray|holo
9|Mammochon|holo
10|Metalosse|holo
11|Mewtwo|holo
12|Tarpaud|holo
13|Tarinorme|holo
14|Rayquaza|holo
15|Regigigas|holo
16|Spiritomb|holo
17|Yanmega|holo
18|Armaldo|rare
19|Créfadet|rare
20|Joliflor|rare
21|Vacilys|rare
22|Colhomard|rare
23|Delcatty|rare
24|Deoxys Forme Attaque|rare
25|Deoxys Forme Défense|rare
26|Deoxys Forme Vitesse|rare
27|Metamorph|rare
28|Forretress|rare
29|Groudon|rare
30|Heatran|rare
31|Jirachi|rare
32|Kyogre|rare
33|Lockpin|rare
34|Créfollet|rare
35|Tartard|rare
36|Regice|rare
37|Regigigas|rare
38|Regirock|rare
39|Registeel|rare
40|Munja|rare
41|Chartor|rare
42|Zarbi !|rare
43|Créhelf|rare
44|Empiflor|rare
45|Rafflesia|rare
46|Anorith|uncommon
47|Camerupt|uncommon
48|Morpheo|uncommon
49|Morpheo Pluie|uncommon
50|Morpheo Neige|uncommon
51|Morpheo Soleil|uncommon
52|Draco|uncommon
53|Grodrive|uncommon
54|Noadkoko|uncommon
55|Scorvol|uncommon
56|Groret|uncommon
57|Demolosse|uncommon
58|Lanturn|uncommon
59|Lanturn|uncommon
60|Coxyclaque|uncommon
61|Lucario|uncommon
62|Luxio|uncommon
63|Ossatueur|uncommon
64|Metang|uncommon
65|Metang|uncommon
66|Grahyena|uncommon
67|Ninjask|uncommon
68|Persian|uncommon
69|Cochignon|uncommon
70|Hypocean|uncommon
71|Staross|uncommon
72|Avaltout|uncommon
73|Heledelle|uncommon
74|Tauros|uncommon
75|Tentacruel|uncommon
76|Zarbi J|uncommon
77|Zarbi R|uncommon
78|Zarbi U|uncommon
79|Zarbi V|uncommon
80|Zarbi W|uncommon
81|Zarbi Y|uncommon
82|Zarbi ?|uncommon
83|Terhal|common
84|Terhal|common
85|Chetiflor|common
86|Laporeille|common
87|Loupio|common
88|Loupio|common
89|Ecrapince|common
90|Osselait|common
91|Minidraco|common
92|Baudrive|common
93|Noeunoeuf|common
94|Scorplane|common
95|Scorplane|common
96|Ortide|common
97|Ortide|common
98|Gloupti|common
99|Tygnon|common
100|Kicklee|common
101|Kapoera|common
102|Hypotrempe|common
103|Malosse|common
104|Coxy|common
105|Lilia|common
106|Miaouss|common
107|Feuforeve|common
108|Ningale|common
109|Tarinor|common
110|Chamallot|common
111|Mystherbe|common
112|Mystherbe|common
113|Pomdepik|common
114|Ptitard|common
115|Tetarte|common
116|Medhyena|common
117|Riolu|common
118|Lixy|common
119|Skitty|common
120|Farfuret|common
121|Spoink|common
122|Stari|common
123|Marcracrin|common
124|Nirondelle|common
125|Tentacool|common
126|Debugant|common
127|Boustiflor|common
128|Yanma|common
129|Manteau bulle|uncommon
130|L'entrainement de Cornil|uncommon
131|Les sentiments de Cynthia|uncommon
132|Collecte d'Énergie|uncommon
133|Poké radar|uncommon
134|Temple Frimapic|uncommon
135|Mont Abrupt|uncommon
136|Machine Technique TS-1|uncommon
137|Machine Technique TS-2|uncommon
138|Fossile griffe|common
139|Fossile racine|common
140|Créfadet|ultra
141|Scorvol|ultra
142|Magnézone|ultra
143|Créfollet|ultra
144|Mewtwo|ultra
145|Rhinastoc|ultra
146|Créhelf|ultra
`);

// DP06 - Tempête
const TEMPETE = parseEntries(`
1|Noctunoir|holo
2|Pingoléon|holo
3|Simiabraz|holo
4|Luminéon|holo
5|Magnézone|holo
6|Magnézone|holo
7|Magirêve|holo
8|Raichu|holo
9|Regigigas|holo
10|Jungko|holo
11|Torterra|holo
12|Blizzaroi|rare
13|Archéodong|rare
14|Ceriflor|rare
15|Drascore|rare
16|Grodrive|rare
17|Noctunoir|rare
18|Ectoplasma|rare
19|Leviator|rare
20|Mackogneur|rare
21|Mammochon|rare
22|Galopa|rare
23|Roserade|rare
24|Drattak|rare
25|Cizayox|rare
26|Moufflair|rare
27|Etouraptor|rare
28|Steelix|rare
29|Bouldeneu|rare
30|Tyranocif|rare
31|Apireine|rare
32|Castorno|uncommon
33|Rozbouton|uncommon
34|Teraclope|uncommon
35|Teraclope|uncommon
36|Electrode|uncommon
37|Electrode|uncommon
38|Canarticho|uncommon
39|Massko|uncommon
40|Spectrum|uncommon
41|Machopeur|uncommon
42|Magneton|uncommon
43|Magneton|uncommon
44|Écrémeuh|uncommon
45|Pichu|uncommon
46|Cochignon|uncommon
47|Ymphect|uncommon
48|Ténéfix|uncommon
49|Insécateur|uncommon
50|Drackhaus|uncommon
51|Airmure|uncommon
52|Etourvol|uncommon
53|Draby|common
54|Keunotor|common
55|Archéomire|common
56|Ceribou|common
57|Apitrini|common
58|Baudrive|common
59|Skélénox|common
60|Skélénox|common
61|Ecayon|common
62|Fantominus|common
63|Embrylex|common
64|Machoc|common
65|Magicarpe|common
66|Magneti|common
67|Magneti|common
68|Feuforêve|common
69|Onix|common
70|Pikachu|common
71|Ponyta|common
72|Roselia|common
73|Rapion|common
74|Blizzi|common
75|Etourmi|common
76|Moufouette|common
77|Marcacrin|common
78|Saquedeneu|common
79|Arcko|common
80|Voltorbe|common
81|Voltorbe|common
82|Carrière conductrice|uncommon
83|Chaîne d'énergie|uncommon
84|Échange d'Énergie|uncommon
85|Super Ball|uncommon
86|Luxe Ball|uncommon
87|La requête de Vivianne|uncommon
88|Poké Coup +|uncommon
89|Poké Pioche +|uncommon
90|Poké Guérison +|uncommon
91|Honor Ball|uncommon
92|Potion|common
93|Échange|common
94|Énergie Cyclone|uncommon
95|Énergie de Distorsion|uncommon
96|Noctunoir|ultra
97|Heatran|ultra
98|Mackogneur|ultra
99|Raichu|ultra
100|Regigigas|ultra
SH1|Baudrive|secret
SH2|Skélénox|secret
SH3|Voltorbe|secret
`);

export const DIAMANT_ET_PERLE_CARDS: Card[] = [
  ...makeCards("DP01", "dp01", "DP1", 130, DIAMANT_ET_PERLE_BASE),
  ...makeCards("DP01.5", "dp01-5", "DP2", 123, TRESORS_MYSTERIEUX),
  ...makeCards("DP02", "dp02", "DP3", 132, MERVEILLES_SECRETES),
  ...makeCards("DP03", "dp03", "DP4", 106, DUELS_AU_SOMMET),
  ...makeCards("DP04", "dp04", "DP5", 100, AUBE_MAJESTUEUSE),
  ...makeCards("DP05", "dp05", "DP6", 146, EVEIL_DES_LEGENDES),
  ...makeCards("DP06", "dp06", "DP7", 100, TEMPETE),
];
