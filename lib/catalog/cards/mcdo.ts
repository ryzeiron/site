import type { Card, Serie } from "../../catalog";

export const MCDO_SERIES = [
  { id: "2011bw", blocId: "mcdo", code: "McDo 2011", name: "Collection McDonald's 2011", releaseYear: 2011 },
  { id: "2012bw", blocId: "mcdo", code: "McDo 2012", name: "Collection McDonald's 2012", releaseYear: 2012 },
  { id: "2013bw", blocId: "mcdo", code: "McDo 2013", name: "Collection McDonald's 2013", releaseYear: 2013 },
  { id: "2014xy", blocId: "mcdo", code: "McDo 2014", name: "Collection McDonald's 2014", releaseYear: 2014 },
  { id: "2015xy", blocId: "mcdo", code: "McDo 2015", name: "Collection McDonald's 2015", releaseYear: 2015 },
  { id: "2016xy", blocId: "mcdo", code: "McDo 2016", name: "Collection McDonald's 2016", releaseYear: 2016 },
  { id: "2017sm", blocId: "mcdo", code: "McDo 2017", name: "Collection McDonald's 2017", releaseYear: 2017 },
  { id: "2018sm-fr", blocId: "mcdo", code: "McDo 2018", name: "Collection McDonald's 2018 (France)", releaseYear: 2018 },
  { id: "2019sm-fr", blocId: "mcdo", code: "McDo 2019", name: "Collection McDonald's 2019 (France)", releaseYear: 2019 },
  { id: "2021swsh", blocId: "mcdo", code: "McDo 2021", name: "Collection McDonald's 2021", releaseYear: 2021 },
  { id: "2022swsh", blocId: "mcdo", code: "McDo 2022", name: "Collection McDonald's 2022", releaseYear: 2022 },
  { id: "2023sv", blocId: "mcdo", code: "McDo 2023", name: "Collection McDonald's 2023", releaseYear: 2023 },
  { id: "2024sv", blocId: "mcdo", code: "McDo 2024", name: "Collection McDonald's 2024", releaseYear: 2024 },
] satisfies Serie[];

export const MCDO_CARDS = [

  //MCDO 2011
  { id: "2011bw-01", serieId: "2011bw", name: "Vipélierre ", number: "01/12", rarity: "commune", condition: "Near Mint", language: "FR", price: 0.5, stock: 0, image: "/cartes/2011/1.png", },
  { id: "2011bw-02", serieId: "2011bw", name: "Maracachi ", number: "02/12", rarity: "commune", condition: "Near Mint", language: "FR", price: 0.5, stock: 0, image: "/cartes/2011/2.png", },
  { id: "2011bw-03", serieId: "2011bw", name: "Gruikui ", number: "03/12", rarity: "commune", condition: "Near Mint", language: "FR", price: 0.5, stock: 0, image: "/cartes/2011/3.png", },
  { id: "2011bw-04", serieId: "2011bw", name: "Moustillon ", number: "04/12", rarity: "commune", condition: "Near Mint", language: "FR", price: 0.5, stock: 0, image: "/cartes/2011/4.png", },
  { id: "2011bw-05", serieId: "2011bw", name: "Mamanbo ", number: "05/12", rarity: "commune", condition: "Near Mint", language: "FR", price: 0.5, stock: 0, image: "/cartes/2011/5.png", },
  { id: "2011bw-06", serieId: "2011bw", name: "Zébibron ", number: "06/12", rarity: "commune", condition: "Near Mint", language: "FR", price: 0.5, stock: 0, image: "/cartes/2011/6.png", },
  { id: "2011bw-07", serieId: "2011bw", name: "Munna ", number: "07/12", rarity: "commune", condition: "Near Mint", language: "FR", price: 0.5, stock: 0, image: "/cartes/2011/7.png", },
  { id: "2011bw-08", serieId: "2011bw", name: "Mascaïman ", number: "08/12", rarity: "commune", condition: "Near Mint", language: "FR", price: 0.5, stock: 0, image: "/cartes/2011/8.png", },
  { id: "2011bw-09", serieId: "2011bw", name: "Zorua ", number: "09/12", rarity: "commune", condition: "Near Mint", language: "FR", price: 0.5, stock: 0, image: "/cartes/2011/9.png", },
  { id: "2011bw-10", serieId: "2011bw", name: "Tic ", number: "10/12", rarity: "commune", condition: "Near Mint", language: "FR", price: 0.5, stock: 0, image: "/cartes/2011/10.png", },
  { id: "2011bw-11", serieId: "2011bw", name: "Poichigeon ", number: "11/12", rarity: "commune", condition: "Near Mint", language: "FR", price: 0.5, stock: 0, image: "/cartes/2011/11.png", },
  { id: "2011bw-12", serieId: "2011bw", name: "Nanméouïe ", number: "12/12", rarity: "commune", condition: "Near Mint", language: "FR", price: 0.5, stock: 0, image: "/cartes/2011/12.png", },
] as unknown as Card[];
