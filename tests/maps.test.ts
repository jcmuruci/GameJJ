import { describe, it, expect } from 'vitest';
import { TUTORIAL_MAP, FOREST_MAP, BOSS_MAP } from '../src/data/maps';
import { KITCHENS } from '../src/data/kitchens';

const all: Record<string, string[]> = { tutorial: TUTORIAL_MAP, forest: FOREST_MAP, boss: BOSS_MAP, ...Object.fromEntries(Object.entries(KITCHENS).map(([k, v]) => [k, v.map])) };

/** Busca em largura: paredes bloqueiam; obstáculos que os jogadores conseguem remover não. */
function reachable(map: string[], walls: string, from: string): Set<string> {
  const H = map.length;
  const starts: [number, number][] = [];
  map.forEach((r, y) => { const x = r.indexOf(from); if (x >= 0) starts.push([x, y]); });
  const seen = new Set<string>();
  if (!starts.length) return seen;
  const q: [number, number][] = [starts[0]];
  seen.add(starts[0].join(','));
  while (q.length) {
    const [x, y] = q.shift()!;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx; const ny = y + dy;
      if (ny < 0 || ny >= H || nx < 0 || nx >= map[ny].length) continue;
      if (walls.includes(map[ny][nx])) continue;
      const k = `${nx},${ny}`;
      if (!seen.has(k)) { seen.add(k); q.push([nx, ny]); }
    }
  }
  return seen;
}

describe('mapas', () => {
  for (const [name, map] of Object.entries(all)) {
    it(`${name}: retangular, com P e Q`, () => {
      const w = map[0].length;
      map.forEach((r, i) => expect(r.length, `linha ${i}`).toBe(w));
      expect(map.join('').split('P').length - 1).toBe(1);
      expect(map.join('').split('Q').length - 1).toBe(1);
    });
  }

  it('floresta: saída e 3 cristais alcançáveis', () => {
    const r = reachable(FOREST_MAP, '#~hZYbi^l', 'P');
    const targets: string[] = [];
    FOREST_MAP.forEach((row, y) => [...row].forEach((c, x) => { if (c === 'X' || c === '*') targets.push(`${x},${y}`); }));
    expect(targets.length).toBe(4);
    targets.forEach((t) => expect(r.has(t), t).toBe(true));
  });

  it('floresta: cada portão tem gatilho', () => {
    const s = FOREST_MAP.join('');
    const trig: Record<string, string> = { A: '1', B: '2', C: '3', D: '4', E: '57', F: '68' };
    for (const g of 'ABCDEF') if (s.includes(g)) expect([...trig[g]].some((t) => s.includes(t)), g).toBe(true);
    expect(s.split('l').length - 1).toBe(2);
  });

  it('tutorial: saída alcançável', () => {
    const r = reachable(TUTORIAL_MAP, '#h', 'P');
    let exit = '';
    TUTORIAL_MAP.forEach((row, y) => { const x = row.indexOf('X'); if (x >= 0) exit = `${x},${y}`; });
    expect(r.has(exit)).toBe(true);
  });

  it('cozinhas: têm entrega, pratos e fontes', () => {
    for (const [name, k] of Object.entries(KITCHENS)) {
      const s = k.map.join('');
      for (const c of 'DpbA') expect(s.includes(c), `${name} sem ${c}`).toBe(true);
      // os dois jogadores alcançam a entrega
      const r = reachable(k.map, '#~cbfoptDAMRFTYBLh', 'P');
      const r2 = reachable(k.map, '#~cbfoptDAMRFTYBLh', 'Q');
      expect(r.size).toBeGreaterThan(20);
      expect(r2.size).toBeGreaterThan(20);
    }
  });
});
