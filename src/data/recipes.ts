/** Ingredientes, receitas e regras de cozinha (lógica pura — testável). */

export type ItemKind =
  | 'apple' | 'apple_cut' | 'berry' | 'mushroom' | 'mushroom_cut' | 'flour'
  | 'plate' | 'soup' | 'pie' | 'charcoal' | 'log' | 'firewood' | 'baby'
  // O Italiano
  | 'tomato' | 'tomato_cut' | 'pasta' | 'pasta_cooked' | 'cheese' | 'cheese_cut' | 'dough' | 'pizza' | 'bread' | 'bread_cut'
  // Festa junina / roça
  | 'corn' | 'corn_cooked' | 'milk' | 'canjica' | 'fish' | 'fish_cut' | 'fish_grilled' | 'fish_fried'
  | 'beans' | 'tropeiro' | 'lettuce' | 'lettuce_cut';

export type RecipeId =
  | 'apple_slices' | 'fruit_salad' | 'soup' | 'pie'
  | 'sugo' | 'pizza' | 'bruschetta'
  | 'milho' | 'canjica' | 'peixe_brasa'
  | 'tilapia' | 'tropeiro' | 'salada_roca';

export interface Recipe {
  id: RecipeId;
  name: string;
  needs: ItemKind[];
  base: number;
  /** Ícones exibidos no pedido. */
  icons: ItemKind[];
  how: string;
}

export const RECIPES: Record<RecipeId, Recipe> = {
  apple_slices: { id: 'apple_slices', name: 'Maçã Fatiada', needs: ['apple_cut'], base: 20, icons: ['apple_cut'], how: 'Maçã → tábua (corte) → prato' },
  fruit_salad: { id: 'fruit_salad', name: 'Salada de Frutas', needs: ['apple_cut', 'berry'], base: 32, icons: ['apple_cut', 'berry'], how: 'Maçã cortada + amoras no prato' },
  soup: { id: 'soup', name: 'Sopa de Cogumelo', needs: ['soup'], base: 38, icons: ['soup'], how: 'Cogumelo → corte → panela no fogo → prato' },
  pie: { id: 'pie', name: 'Torta de Amora', needs: ['pie'], base: 48, icons: ['pie'], how: 'Farinha + amoras → forno aceso → prato' },
  sugo: { id: 'sugo', name: 'Macarrão ao Sugo', needs: ['pasta_cooked', 'tomato_cut'], base: 40, icons: ['pasta_cooked', 'tomato_cut'], how: 'Massa na panela + tomate picado no prato' },
  pizza: { id: 'pizza', name: 'Pizza Margherita', needs: ['pizza'], base: 52, icons: ['pizza'], how: 'Massa + tomate picado + queijo ralado → forno' },
  bruschetta: { id: 'bruschetta', name: 'Bruschetta', needs: ['bread_cut', 'tomato_cut'], base: 28, icons: ['bread_cut', 'tomato_cut'], how: 'Pão fatiado + tomate picado no prato' },
  milho: { id: 'milho', name: 'Milho Cozido', needs: ['corn_cooked'], base: 24, icons: ['corn_cooked'], how: 'Milho → panela no fogo → prato' },
  canjica: { id: 'canjica', name: 'Canjica', needs: ['canjica'], base: 40, icons: ['canjica'], how: 'Leite + milho na panela (o leite primeiro!)' },
  peixe_brasa: { id: 'peixe_brasa', name: 'Peixe na Brasa', needs: ['fish_grilled'], base: 48, icons: ['fish_grilled'], how: '{p2} pesca → {p1} limpa na tábua → brasa' },
  tilapia: { id: 'tilapia', name: 'Tilápia Frita', needs: ['fish_fried'], base: 46, icons: ['fish_fried'], how: 'Pesca na lagoa → tábua → panela' },
  tropeiro: { id: 'tropeiro', name: 'Feijão Tropeiro', needs: ['tropeiro'], base: 42, icons: ['tropeiro'], how: 'Feijão + farinha na panela' },
  salada_roca: { id: 'salada_roca', name: 'Salada da Roça', needs: ['lettuce_cut', 'tomato_cut'], base: 26, icons: ['lettuce_cut', 'tomato_cut'], how: 'Alface + tomate picados no prato' },
};

export const ITEM_NAME: Record<ItemKind, string> = {
  apple: 'Maçã', apple_cut: 'Maçã cortada', berry: 'Amoras', mushroom: 'Cogumelo', mushroom_cut: 'Cogumelo picado',
  flour: 'Farinha', plate: 'Prato', soup: 'Sopa', pie: 'Torta', charcoal: 'Carvão', log: 'Tronco', firewood: 'Lenha', baby: 'Filhote de jacaré',
  tomato: 'Tomate', tomato_cut: 'Tomate picado', pasta: 'Massa', pasta_cooked: 'Macarrão', cheese: 'Queijo', cheese_cut: 'Queijo ralado',
  dough: 'Massa de pizza', pizza: 'Pizza', bread: 'Pão', bread_cut: 'Pão fatiado', corn: 'Milho', corn_cooked: 'Milho cozido', milk: 'Leite',
  canjica: 'Canjica', fish: 'Peixe', fish_cut: 'Peixe limpo', fish_grilled: 'Peixe na brasa', fish_fried: 'Peixe frito', beans: 'Feijão',
  tropeiro: 'Tropeiro', lettuce: 'Alface', lettuce_cut: 'Alface picada',
};

/** O que vira o quê na tábua de corte. */
export const CHOP: Partial<Record<ItemKind, ItemKind>> = {
  apple: 'apple_cut',
  mushroom: 'mushroom_cut',
  log: 'firewood',
  tomato: 'tomato_cut',
  cheese: 'cheese_cut',
  bread: 'bread_cut',
  fish: 'fish_cut',
  lettuce: 'lettuce_cut',
};

/** Itens que podem ir para o prato. */
export const PLATEABLE: ItemKind[] = [
  'apple_cut', 'berry', 'soup', 'pie', 'pasta_cooked', 'tomato_cut', 'pizza', 'bread_cut', 'corn_cooked', 'canjica',
  'fish_grilled', 'fish_fried', 'tropeiro', 'lettuce_cut',
];

export interface CookRecipe { inputs: ItemKind[]; output: ItemKind; time: number }

export const POT_RECIPES: CookRecipe[] = [{ inputs: ['mushroom_cut'], output: 'soup', time: 8 }];
export const OVEN_RECIPES: CookRecipe[] = [{ inputs: ['berry', 'flour'], output: 'pie', time: 10 }];

/** Panela/forno de cada cozinha (as fases usam conjuntos diferentes). */
export const COOKERS: Record<string, { pot: CookRecipe[]; oven: CookRecipe[] }> = {
  classic: { pot: POT_RECIPES, oven: OVEN_RECIPES },
  italiano: {
    pot: [{ inputs: ['pasta'], output: 'pasta_cooked', time: 7 }],
    oven: [{ inputs: ['dough', 'tomato_cut', 'cheese_cut'], output: 'pizza', time: 10 }],
  },
  junina: {
    pot: [{ inputs: ['corn'], output: 'corn_cooked', time: 7 }, { inputs: ['milk', 'corn'], output: 'canjica', time: 9 }],
    oven: [{ inputs: ['fish_cut'], output: 'fish_grilled', time: 9 }],
  },
  roca: {
    pot: [{ inputs: ['fish_cut'], output: 'fish_fried', time: 8 }, { inputs: ['beans', 'flour'], output: 'tropeiro', time: 9 }],
    oven: [],
  },
};

function sorted(a: readonly string[]): string[] {
  return [...a].sort();
}

/** `sub` é um sub-multiconjunto de `sup`? */
export function isSubMultiset(sub: readonly string[], sup: readonly string[]): boolean {
  const pool = [...sup];
  for (const s of sub) {
    const i = pool.indexOf(s);
    if (i < 0) return false;
    pool.splice(i, 1);
  }
  return true;
}

export function sameMultiset(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const sa = sorted(a);
  const sb = sorted(b);
  return sa.every((v, i) => v === sb[i]);
}

/** Pode adicionar `kind` a um prato com `contents`, considerando as receitas ativas? */
export function canAddToPlate(contents: readonly ItemKind[], kind: ItemKind, active: readonly RecipeId[]): boolean {
  if (!PLATEABLE.includes(kind)) return false;
  const next = [...contents, kind];
  return active.some((r) => isSubMultiset(next, RECIPES[r].needs));
}

/** Qual receita o prato completa (ou null). */
export function matchRecipe(contents: readonly ItemKind[], active: readonly RecipeId[]): RecipeId | null {
  for (const r of active) if (sameMultiset(contents, RECIPES[r].needs)) return r;
  return null;
}

/** Pode adicionar `kind` ao conteúdo de um caldeirão/forno? */
export function canAddToCooker(contents: readonly ItemKind[], kind: ItemKind, recipes: readonly CookRecipe[]): boolean {
  const next = [...contents, kind];
  return recipes.some((r) => isSubMultiset(next, r.inputs));
}

export function cookerResult(contents: readonly ItemKind[], recipes: readonly CookRecipe[]): CookRecipe | null {
  return recipes.find((r) => sameMultiset(contents, r.inputs)) ?? null;
}

/** Pontuação de uma entrega: base + gorjeta proporcional ao tempo restante. */
export function deliveryScore(recipe: RecipeId, timeLeft: number, total: number): { base: number; tip: number } {
  const base = RECIPES[recipe].base;
  const ratio = Math.max(0, Math.min(1, timeLeft / total));
  const tip = Math.round(ratio * 12);
  return { base, tip };
}

export function starsFor(score: number, thresholds: readonly [number, number, number]): number {
  let s = 0;
  for (const t of thresholds) if (score >= t) s++;
  return s;
}
