import { describe, it, expect } from 'vitest';
import { sanitize, defaultSave } from '../src/systems/SaveManager';

describe('save', () => {
  it('lixo vira save padrão', () => {
    expect(sanitize(null)).toEqual(defaultSave());
    expect(sanitize('abc')).toEqual(defaultSave());
  });
  it('mescla dados antigos/incompletos', () => {
    const s = sanitize({ coins: 42.7, levels: { picnic: { done: true, stars: 9, best: 100 } }, looks: [{ name: 'Ana' }, { name: 'Bia' }] });
    expect(s.coins).toBe(42);
    expect(s.levels.picnic.stars).toBe(3);
    expect(s.looks[0].name).toBe('Ana');
    expect(s.looks[0].skin).toMatch(/^#/);
    expect(s.upgrades.speed).toBe(0);
  });
});
