import { describe, it, expect } from 'vitest';
import { TUTORIAL_MAP, CANYON_MAP, BOSS_MAP, AMAZON_MAP, CLIMB_MAP, ITACOLOMI_MAP, TOPO_MAP, FARM_MAP } from '../src/data/maps';
import { KITCHENS } from '../src/data/kitchens';

const all: Record<string, string[]> = { tutorial: TUTORIAL_MAP, canyon: CANYON_MAP, boss: BOSS_MAP, amazon: AMAZON_MAP, climb: CLIMB_MAP, itacolomi: ITACOLOMI_MAP, topo: TOPO_MAP, farm: FARM_MAP, ...Object.fromEntries(Object.entries(KITCHENS).map(([k, v]) => [k, v.map])) };

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

  it('cânion: saída e 3 cristais alcançáveis', () => {
    const r = reachable(CANYON_MAP, '#~hZYbi^l', 'P');
    const targets: string[] = [];
    CANYON_MAP.forEach((row, y) => [...row].forEach((c, x) => { if (c === 'X' || c === '*') targets.push(`${x},${y}`); }));
    expect(targets.length).toBe(4);
    targets.forEach((t) => expect(r.has(t), t).toBe(true));
  });

  it('cânion: cada portão tem gatilho', () => {
    const s = CANYON_MAP.join('');
    const trig: Record<string, string> = { A: '1', B: '2', C: '3', D: '4', E: '57', F: '68' };
    for (const g of 'ABCDEF') if (s.includes(g)) expect([...trig[g]].some((t) => s.includes(t)), g).toBe(true);
    expect(s.split('l').length - 1).toBe(2);
  });

  it('tutorial: penhasco só se atravessa pela corda de rapel', () => {
    const find = (c: string) => { let k = ''; TUTORIAL_MAP.forEach((row, y) => { const x = row.indexOf(c); if (x >= 0) k = `${x},${y}`; }); return k; };
    const [rx, ry] = find('R').split(',').map(Number);
    const top = reachable(TUTORIAL_MAP, '#h^R', 'P');
    expect(top.has(find('X'))).toBe(false);
    expect(top.has(`${rx},${ry - 1}`)).toBe(true);
    // a partir do pé da corda, a saída e uma ancoragem são alcançáveis
    const below = TUTORIAL_MAP.map((r, y) => (y === ry + 1 ? r.slice(0, rx) + 'P' + r.slice(rx + 1) : r.replace('P', '.')));
    const bot = reachable(below, '#h^R', 'P');
    expect(bot.has(find('X'))).toBe(true);
    const anchors: string[] = [];
    TUTORIAL_MAP.forEach((row, y) => [...row].forEach((c, x) => { if (c === 'S') anchors.push(`${x},${y}`); }));
    expect(anchors.some((a) => top.has(a))).toBe(true);
    expect(anchors.some((a) => bot.has(a))).toBe(true);
  });

  it('amazônia: filhotes, ninho e canoa alcançáveis (jacarés e troncos viram ponte)', () => {
    // a água é parede, exceto jacarés (J); o rio de 1 tile com tronco também é atravessável
    const m = AMAZON_MAP.map((r) => r);
    const r = reachable(m, '#~qZbiN', 'P');
    const targets: string[] = [];
    m.forEach((row, y) => [...row].forEach((c, x) => { if (c === 'j' || c === 'X') targets.push(`${x},${y}`); }));
    expect(targets.length).toBe(4);
    targets.forEach((t) => expect(r.has(t), t).toBe(true));
    // o ninho tem um vizinho alcançável
    let nest = [0, 0];
    m.forEach((row, y) => { const x = row.indexOf('N'); if (x >= 0) nest = [x, y]; });
    expect([[0, -1], [0, 1]].some(([dx, dy]) => r.has(`${nest[0] + dx},${nest[1] + dy}`))).toBe(true);
  });

  it('cozinhas: têm entrega, pratos e fontes', () => {
    for (const [name, k] of Object.entries(KITCHENS)) {
      const s = k.map.join('');
      for (const c of 'Dpb') expect(s.includes(c), `${name} sem ${c}`).toBe(true);
      for (const d of Object.keys(k.sources)) expect(s.includes(d), `${name} sem cesta ${d}`).toBe(true);
      // os dois jogadores alcançam a entrega
      const walls = '#w~cbfoptDTYBLhGIEJ123456789';
      const r = reachable(k.map, walls, 'P');
      const r2 = reachable(k.map, walls, 'Q');
      expect(r.size).toBeGreaterThan(20);
      expect(r2.size).toBeGreaterThan(20);
    }
  });
});
