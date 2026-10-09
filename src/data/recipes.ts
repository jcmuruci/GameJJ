/** Ingredientes, receitas e regras de cozinha (lógica pura — testável). */

export type ItemKind =
  | 'apple' | 'apple_cut' | 'berry' | 'mushroom' | 'mushroom_cut' | 'flour'
  | 'plate' | 'soup' | 'pie' | 'charcoal' | 'log' | 'firewood';

export type RecipeId = 'apple_slices' | 'fruit_salad' | 'soup' | 'pie';

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
};

export const ITEM_NAME: Record<ItemKind, string> = {
  apple: 'Maçã', apple_cut: 'Maçã cortada', berry: 'Amoras', mushroom: 'Cogumelo', mushroom_cut: 'Cogumelo picado',
  flour: 'Farinha', plate: 'Prato', soup: 'Sopa', pie: 'Torta', charcoal: 'Carvão', log: 'Tronco', firewood: 'Lenha',
};

/** O que vira o quê na tábua de corte. */
export const CHOP: Partial<Record<ItemKind, ItemKind>> = {
  apple: 'apple_cut',
  mushroom: 'mushroom_cut',
  log: 'firewood',
};

/** Itens que podem ir para o prato. */
export const PLATEABLE: ItemKind[] = ['apple_cut', 'berry', 'soup', 'pie'];

export interface CookRecipe { inputs: ItemKind[]; output: ItemKind; time: number }

export const POT_RECIPES: CookRecipe[] = [{ inputs: ['mushroom_cut'], output: 'soup', time: 8 }];
export const OVEN_RECIPES: CookRecipe[] = [{ inputs: ['berry', 'flour'], output: 'pie', time: 10 }];

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
