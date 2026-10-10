import { RecipeId, ItemKind } from './recipes';
import { T } from '../art/tiles';
import type { ChapterTask } from '../ui/TaskList';

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
  /** Conjunto de receitas de panela/forno (ver COOKERS em recipes.ts). */
  cookers: string;
  /** Caracteres do mapa que viram cestas de ingredientes. */
  sources: Record<string, ItemKind>;
  /** Textura do forno ('st_oven' ou 'st_grill'). */
  ovenTex?: string;
  wind?: { first: number; every: number };
  crows?: { first: number; every: number; tex?: string; name?: string };
  rain?: { first: number; every: number; length: number };
  /** Algo atravessa uma linha do mapa e derruba quem estiver no caminho. */
  cart?: { row: number; first: number; every: number; tex?: string; warn?: string; lines?: string[]; fromX?: number };
  floor: number;
  objectFloor: number;
  tips: string[];
  /**
   * Tarefas do capítulo. Ids: orders (pedidos servidos), recipe:<id> (servir esse prato),
   * fish (peixes pescados), scare (bichos espantados), rings (alianças), dance (quadrilha).
   */
  tasks: ChapterTask[];
  /** Momento especial do capítulo: alianças no Italiano, quadrilha na festa junina. */
  special?: 'rings' | 'quadrilha';
  /** Plaquinhas com o nome do lugar. */
  plaques?: { tx: number; ty: number; text: string }[];
  /** Convidados que assistem e comentam (ex.: os pais do João). */
  guests?: { npc: string; tx: number; ty: number; lines: string[] }[];
}

/**
 * Legenda dos mapas de cozinha:
 *  c bancada  b tábua de corte  f fogão+panela  o forno/brasa  p pratos  t lixeira  D entrega
 *  1-9 cestas de ingredientes (ver `sources`)  G pier de pesca (só a Juliana pesca)
 *  T árvore  Y cerejeira  B arbusto  E mesa  I bandeira da Itália  U bandeirinhas  J fogueira  W cachoeira
 *  P/Q início dos jogadores · # árvores  w parede  ~ água  : piso de madeira  . chão
 */
export const KITCHENS: Record<string, KitchenConfig> = {
  italiano: {
    map: [
      'wwwwwwwwwwwwwwwwwwwwwwwwwwwwww',
      'w:::::::::::::::w::::::::::::w',
      'w:1:2:3:4:5::I::w::::::::::::w',
      'w:::::::::::::::w::E::::E::::w',
      'w:::::::::::::::c::::::::::::w',
      'w:::::::::::::::w::::::::::::w',
      'w:::::::::::::::w::::::::::::w',
      'w::cbbcffcootc::w::::::::::D:w',
      'w:::::::::::::::c::::::::::D:w',
      'w:::::::::::::::w::::::::::D:w',
      'w:::::::::::::p::::::::::::::w',
      'w:::::::::::::::w::::::::::::w',
      'w:::::P::Q::::::c::::::::::::w',
      'w:::::::::::::::w::E::::E::::w',
      'w:::::::::::::::w::::::::::::w',
      'w:::::::::::::::w::::::::::::w',
      'wwwwwwwwwwwwwwwwwwwwwwwwwwwwww',
    ],
    duration: 200,
    recipes: ['bruschetta', 'sugo'],
    unlocks: [{ at: 35, recipe: 'pizza' }],
    orderEvery: [13, 18],
    orderTime: 75,
    maxOrders: 4,
    stars: [80, 210, 350],
    fireTime: 40,
    cookers: 'italiano',
    sources: { '1': 'tomato', '2': 'pasta', '3': 'cheese', '4': 'bread', '5': 'dough' },
    cart: { row: 10, first: 30, every: 22, tex: 'waiter_run', warn: 'GARÇOM!', fromX: 17, lines: ['Licença, licença!', 'Olha a bandeja!', 'Quase!'] },
    floor: T.WOOD_FLOOR,
    objectFloor: T.WOOD_FLOOR,
    tips: [
      'Cozinha à esquerda, salão à direita: passem os pratos pelo balcão da parede!',
      'Pizza: massa + tomate picado + queijo ralado no forno aceso.',
      'Cuidado com o garçom apressado! E no meio do jantar... hora das alianças ♥',
    ],
    tasks: [
      { id: 'orders', text: 'Servir pedidos', goal: 6 },
      { id: 'recipe:pizza', text: 'Assar uma pizza' },
      { id: 'rings', text: 'Entregar as alianças (abraço!)' },
    ],
    special: 'rings',
    plaques: [{ tx: 22, ty: 1, text: 'RISTORANTE O ITALIANO' }],
  },
  junina: {
    map: [
      '##############################',
      '#..U......U......U......U....#',
      '#............................#',
      '#..1..2......................#',
      '#............................#',
      '#............................#',
      '#..........................D.#',
      '#........cbbcffcotpc.......D.#',
      '#..........................D.#',
      '#............................#',
      '#..........P......Q..........#',
      '#~~G~~G~.....................#',
      '#~~~~~~~.......J.............#',
      '#~~~~~~~.....................#',
      '#~~~~~~~.....................#',
      '#~~~~~~~.....................#',
      '##############################',
    ],
    duration: 200,
    recipes: ['milho', 'peixe_brasa'],
    unlocks: [{ at: 40, recipe: 'canjica' }],
    orderEvery: [13, 18],
    orderTime: 80,
    maxOrders: 4,
    stars: [80, 200, 330],
    fireTime: 38,
    cookers: 'junina',
    ovenTex: 'st_grill',
    sources: { '1': 'corn', '2': 'milk' },
    wind: { first: 70, every: 60 },
    cart: { row: 9, first: 40, every: 26, tex: 'quadrilha', warn: 'OLHA A QUADRILHA!', lines: ['Anarriê!', 'Olha a cobra!', 'É mentira!', 'Balancê!'] },
    floor: T.GRASS,
    objectFloor: T.GRASS,
    tips: [
      'Só a {p2} pesca: no pier, AÇÃO para jogar a linha e de novo quando aparecer o "!"',
      '{p1} limpa o peixe na tábua; a brasa precisa de fogo mágico.',
      'Canjica: leite e depois milho. Quando gritarem ANARRIÊ, os dois: HABILIDADE juntos!',
    ],
    tasks: [
      { id: 'fish', text: 'Pescar peixes (só {p2})', goal: 3 },
      { id: 'orders', text: 'Servir pedidos', goal: 5 },
      { id: 'dance', text: 'Dançar a quadrilha', goal: 2 },
    ],
    special: 'quadrilha',
    plaques: [{ tx: 9, ty: 2, text: 'ARRAIÁ DE BH' }],
    guests: [
      { npc: 'pai', tx: 22, ty: 3, lines: ['Esse peixe tá no ponto, filho!', 'Aprendeu a pescar rapidinho, hein, {p2}!', 'Capricha na canjica!'] },
      { npc: 'mae', tx: 24, ty: 3, lines: ['Que moça boa de cozinha!', 'Canjica igual à da vó!', 'Vocês dois juntos dão gosto de ver.'] },
    ],
  },
  roca: {
    map: [
      '##############################',
      '#................~~~~~~~~~~~~#',
      '#................~~~~~~~~~~~~#',
      '#.1..2..3..4.....~~~~~~~~~~~~#',
      '#................~~~G~~~~G~~~#',
      '#............................#',
      '#............................#',
      '#............................#',
      '#.....cbbcffcpctc............#',
      '#............................#',
      '#....................E....D..#',
      '#........P....Q...........D..#',
      '#.........................D..#',
      '#............B.......E.......#',
      '#..T.........................#',
      '#............................#',
      '##############################',
    ],
    duration: 200,
    recipes: ['salada_roca', 'tilapia'],
    unlocks: [{ at: 40, recipe: 'tropeiro' }],
    orderEvery: [13, 18],
    orderTime: 80,
    maxOrders: 4,
    stars: [80, 200, 330],
    fireTime: 40,
    cookers: 'roca',
    sources: { '1': 'beans', '2': 'flour', '3': 'lettuce', '4': 'tomato' },
    crows: { first: 35, every: 24, tex: 'chicken', name: 'A galinha' },
    floor: T.GRASS,
    objectFloor: T.GRASS,
    tips: [
      'Tilápia: a {p2} pesca na lagoa, o {p1} limpa, e vai pra panela.',
      'Tropeiro: feijão + farinha na panela do fogão a lenha.',
      'As galinhas da roça roubam comida da bancada: xô!',
    ],
    tasks: [
      { id: 'fish', text: 'Pescar tilápias (só {p2})', goal: 3 },
      { id: 'scare', text: 'Espantar galinhas ladras', goal: 3 },
      { id: 'recipe:tropeiro', text: 'Fazer um tropeiro' },
      { id: 'orders', text: 'Servir pedidos', goal: 5 },
    ],
    plaques: [{ tx: 6, ty: 13, text: 'RESTAURANTE DA ROÇA' }],
  },
};
