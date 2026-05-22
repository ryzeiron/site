export type CatalogSleeve = {
  id: string;
  name: string;
  description?: string;
  image?: string;
  defaultPriceCents: number;
  defaultStock: number;
  active?: boolean;
};

export const catalogSleeves: CatalogSleeve[] = [
  /*
  Exemple à copier pour ajouter un sleeve au catalogue :
  {
    id: "sleeve-pokemon-transparent",
    name: "Sleeves Pokémon transparentes",
    description: "Lot de sleeves pour protéger les cartes Pokémon.",
    image: "/sleeves/sleeve-pokemon-transparent.webp",
    defaultPriceCents: 500,
    defaultStock: 0,
    active: true,
  },
  */
];

export function getCatalogSleeves() {
  return catalogSleeves;
}

export function getCatalogSleeve(id: string) {
  return catalogSleeves.find((sleeve) => sleeve.id === id);
}
