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
};
