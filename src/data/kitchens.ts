import { RecipeId } from './recipes';
import { T } from '../art/tiles';

export interface KitchenConfig {
  map: string[];
  duration: number;
  recipes: RecipeId[];
  unlocks: { at: number; recipe: RecipeId }[];
  orderEvery: [number, number];
  orderTime: number;
  maxOrders: number;
  stars: [number, number, number];
  fireTime: number;
  wind?: { first: number; every: number };
  crows?: { first: number; every: number };
  rain?: { first: number; every: number; length: number };
  cart?: { row: number; first: number; every: number };
  floor: number;
  objectFloor: number;
  tips: string[];
}

/**
 * Legenda dos mapas de cozinha:
 *  c bancada  b tábua de corte  f fogueira+panela  o forno  p pratos  t lixeira  D entrega
 *  A maçãs  R amoras  M cogumelos  F farinha   P/Q início dos jogadores
 *  T árvore  Y cerejeira  B arbusto  k toalha (decoração)  L lanterna  S barraca
 *  # árvores (parede) ~ água = ponte , caminho . chão
 */
export const KITCHENS: Record<string, KitchenConfig> = {
  picnic: {
    map: [
      '##############################',
      '#............................#',
      '#..........T.........Y...W...#',
      '#..A..R..M.............~~~~~.#',
      '#.......................~~~..#',
      '#............................#',
      '#.......................kk...#',
      '#........................D...#',
      '#........cbbcfcfcpct.....D...#',
      '#........................D...#',
      '#.......................kk...#',
      '#...........P....Q...........#',
      '#............................#',
      '#.~~~...B.............T......#',
      '#.~~~........................#',
      '#............................#',
      '##############################',
    ],
    duration: 180,
    recipes: ['apple_slices', 'fruit_salad'],
    unlocks: [{ at: 40, recipe: 'soup' }],
    orderEvery: [14, 20],
    orderTime: 70,
    maxOrders: 4,
    stars: [60, 170, 290],
    fireTime: 40,
    wind: { first: 75, every: 55 },
    crows: { first: 55, every: 38 },
    floor: T.GRASS,
    objectFloor: T.GRASS,
    tips: [
      '{p1} corta na tábua (segure AÇÃO).',
      '{p2} acende a fogueira com MAGIA.',
      'Monte o prato e leve à toalha xadrez, perto da cachoeira!',
    ],
  },
  festival: {
    map: [
      '##############################',
      '#.............~..............#',
      '#.............~..............#',
      '#.A..R..M..F..~...f.f..o.....#',
      '#.............c..............#',
      '#.............~..............#',
      '#..cbcbc......~...........D..#',
      '#.............~...........D..#',
      '#.............c...cpcc.t..D..#',
      '#.............~..............#',
      '#..t..........~...E......E...#',
      '#......P......c.......Q......#',
      '#.............~..............#',
      '#,,,,,,,,,,,,,=,,,,,,,,,,,,,,#',
      '#.............~..............#',
      '#.............~..............#',
      '##############################',
    ],
    duration: 210,
    recipes: ['fruit_salad', 'soup'],
    unlocks: [{ at: 30, recipe: 'pie' }],
    orderEvery: [12, 17],
    orderTime: 75,
    maxOrders: 4,
    stars: [90, 230, 380],
    fireTime: 35,
    crows: { first: 45, every: 32 },
    rain: { first: 70, every: 70, length: 20 },
    cart: { row: 13, first: 25, every: 19 },
    floor: T.GRASS,
    objectFloor: T.GRASS,
    tips: [
      'O riacho corta a cozinha: passem os itens pelas bancadas do meio!',
      'A ponte fica na rua... cuidado com as carroças! Mesas lotadas!',
      'Torta: farinha + amoras no forno aceso.',
    ],
  },
};
