import { describe, it, expect } from 'vitest';
import { sanitize, defaultSave } from '../src/systems/SaveManager';

describe('save', () => {
  it('lixo vira save padrão', () => {
    expect(sanitize(null)).toEqual(defaultSave());
    expect(sanitize('abc')).toEqual(defaultSave());
  });
  it('mescla dados antigos/incompletos', () => {
    const s = sanitize({ coins: 42.7, levels: { picnic: { done: true, stars: 9, best: 100 } }, looks: [{ name: 'Ana' }, { name: 'Bia' }], looksRev: 3 });
    expect(s.coins).toBe(42);
    expect(s.levels.picnic.stars).toBe(3);
    expect(s.looks[0].name).toBe('Ana');
    expect(s.looks[0].skin).toMatch(/^#/);
    expect(s.upgrades.speed).toBe(0);
  });
  it('save antigo recebe a nova aparência da foto, mantendo os nomes', () => {
    const s = sanitize({ looks: [{ name: 'Ana', skin: '#000000', hairStyle: 'curto' }, { name: 'Bia' }] });
    expect(s.looks[0].name).toBe('Ana');
    expect(s.looks[0].hairStyle).toBe('careca');
    expect(s.looks[0].tattoo).toBe('braco_direito');
    expect(s.looks[1].accessory).toBe('colar_sol');
  });
});
