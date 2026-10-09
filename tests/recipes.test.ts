import { describe, it, expect } from 'vitest';
import { canAddToPlate, matchRecipe, canAddToCooker, cookerResult, POT_RECIPES, OVEN_RECIPES, deliveryScore, starsFor, isSubMultiset } from '../src/data/recipes';

describe('receitas', () => {
  it('monta salada de frutas em qualquer ordem', () => {
    const active = ['apple_slices', 'fruit_salad'] as const;
    expect(canAddToPlate([], 'berry', active)).toBe(true);
    expect(canAddToPlate(['berry'], 'apple_cut', active)).toBe(true);
    expect(matchRecipe(['berry', 'apple_cut'], active)).toBe('fruit_salad');
    expect(matchRecipe(['apple_cut'], active)).toBe('apple_slices');
  });
  it('recusa ingredientes crus ou repetidos', () => {
    const active = ['apple_slices', 'fruit_salad'] as const;
    expect(canAddToPlate([], 'apple', active)).toBe(false);
    expect(canAddToPlate(['apple_cut'], 'apple_cut', active)).toBe(false);
    expect(canAddToPlate([], 'soup', active)).toBe(false); // sopa não está ativa
  });
  it('panela e forno', () => {
    expect(canAddToCooker([], 'mushroom_cut', POT_RECIPES)).toBe(true);
    expect(canAddToCooker([], 'mushroom', POT_RECIPES)).toBe(false);
    expect(cookerResult(['mushroom_cut'], POT_RECIPES)?.output).toBe('soup');
    expect(canAddToCooker(['flour'], 'berry', OVEN_RECIPES)).toBe(true);
    expect(canAddToCooker(['flour'], 'flour', OVEN_RECIPES)).toBe(false);
    expect(cookerResult(['berry', 'flour'], OVEN_RECIPES)?.output).toBe('pie');
    expect(cookerResult(['flour'], OVEN_RECIPES)).toBeNull();
  });
  it('pontuação e estrelas', () => {
    expect(deliveryScore('soup', 70, 70).tip).toBe(12);
    expect(deliveryScore('soup', 0, 70).tip).toBe(0);
    expect(starsFor(0, [10, 20, 30])).toBe(0);
    expect(starsFor(25, [10, 20, 30])).toBe(2);
    expect(isSubMultiset(['a', 'a'], ['a', 'b'])).toBe(false);
  });
});
