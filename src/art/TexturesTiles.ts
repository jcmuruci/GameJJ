import Phaser from 'phaser';
import { PG, rng } from './pixel';
import { T, TILE_COUNT } from './tiles';

/**
 * Tiles do chão. Cada tile tem uma função de desenho que recebe `v` (variação):
 * a variação 0 é a arte original e as outras acrescentam detalhes (nós na madeira,
 * trincas, pedrinhas...), para o chão não repetir sempre o mesmo quadrado.
 */
export const TILE_VARIANTS = 3;

type TileDraw = (pg: PG, r: () => number, v: number) => void;

const grass = (pg: PG, r: () => number, base = '#7ccf5a', dark = '#62b048', light = '#9be070') => {
  pg.rect(0, 0, 16, 16, base);
  for (let i = 0; i < 14; i++) pg.px(Math.floor(r() * 16), Math.floor(r() * 16), r() > 0.5 ? dark : light);
};
const at = (r: () => number, n = 12) => Math.floor(r() * n);
/** Pedrinha de 2 px com sombra. */
const pebble = (pg: PG, r: () => number, light = '#b8b4b0', dark = '#8e8a88') => {
  const x = 2 + at(r, 11); const y = 2 + at(r, 11);
  pg.rect(x, y, 2, 1, light); pg.px(x, y + 1, dark); pg.px(x + 1, y + 1, dark);
};
/** Trinca fininha em zigue-zague. */
const crack = (pg: PG, r: () => number, c: string) => {
  let x = 2 + at(r, 10); let y = 2 + at(r, 6);
  for (let i = 0; i < 5; i++) { pg.px(x, y, c); x += r() > 0.5 ? 1 : 0; y += 1; }
};

const TILE_DRAW: Record<number, TileDraw> = {
  [T.GRASS]: (pg, r) => grass(pg, r),
  [T.GRASS_FLOWERS]: (pg, r) => {
    grass(pg, r);
    ([[3, 4, '#ffffff'], [11, 9, '#ffd25e'], [6, 12, '#ff8fb1']] as [number, number, string][]).forEach(([x, y, c]) => {
      pg.px(x - 1, y, '#fff7f0'); pg.px(x + 1, y, '#fff7f0'); pg.px(x, y - 1, '#fff7f0'); pg.px(x, y + 1, '#fff7f0'); pg.px(x, y, c);
    });
  },
  [T.GRASS_TUFT]: (pg, r) => {
    grass(pg, r);
    [[4, 6], [10, 11], [12, 3]].forEach(([x, y]) => { pg.px(x, y, '#4a9a3a'); pg.px(x - 1, y + 1, '#4a9a3a'); pg.px(x + 1, y + 1, '#4a9a3a'); pg.px(x, y + 1, '#4a9a3a'); });
  },
  [T.PATH]: (pg, r, v) => {
    pg.rect(0, 0, 16, 16, '#d8b07a');
    for (let i = 0; i < 18; i++) pg.px(Math.floor(r() * 16), Math.floor(r() * 16), r() > 0.5 ? '#c49a64' : '#e8c890');
    if (v >= 1) pebble(pg, r, '#e8dcc8', '#a88a64');
    if (v === 2) { pebble(pg, r, '#c8c0b0', '#9a7c58'); pg.hline(3 + at(r, 6), 8 + at(r, 4), 4 + at(r, 9), '#c49a64'); }
  },
  [T.WATER]: (pg, r) => {
    pg.rect(0, 0, 16, 16, '#4aa8e8');
    pg.rect(0, 0, 16, 2, '#6cc4ff');
    for (let i = 0; i < 4; i++) { const x = Math.floor(r() * 12); const y = 3 + Math.floor(r() * 12); pg.hline(x, x + 3, y, '#8fd8ff'); }
  },
  [T.TREE]: (pg, r) => {
    grass(pg, r);
    pg.ellipse(8, 7, 7, 7, '#2f7a3a'); pg.ellipse(7, 6, 6, 5, '#3f9a48'); pg.ellipse(6, 5, 3, 2, '#5bbf4a');
    pg.px(4, 4, '#9be070'); pg.px(10, 9, '#2a6a30');
    pg.rect(7, 14, 3, 2, '#5a3a24');
  },
  [T.HEDGE]: (pg, r) => {
    grass(pg, r);
    pg.ellipse(8, 8, 8, 7, '#3a8a40'); pg.ellipse(8, 7, 7, 6, '#4aa84a');
    for (let i = 0; i < 6; i++) pg.px(2 + Math.floor(r() * 12), 2 + Math.floor(r() * 10), '#6cc85a');
  },
  [T.STONE_WALL]: (pg, r, v) => {
    pg.rect(0, 0, 16, 16, '#8a8aa0');
    if (v >= 1) { const by = 5 * at(r, 3); pg.rect(at(r, 2) * 8 + 1, by + 1, 6, 3, '#7e7e94'); }
    for (let y = 0; y < 16; y += 5) { pg.hline(0, 15, y, '#5a5a70'); const off = (y / 5) % 2 ? 4 : 0; for (let x = off; x < 16; x += 8) pg.vline(x, y, y + 4, '#5a5a70'); }
    pg.hline(0, 15, 1, '#aaaac0');
    if (v === 2) { crack(pg, r, '#5a5a70'); pg.px(1 + at(r, 13), 14, '#5bbf4a'); pg.px(2 + at(r, 12), 15, '#3f9a48'); }
  },
  [T.WOOD_FLOOR]: (pg, r, v) => {
    pg.rect(0, 0, 16, 16, '#c8915a');
    if (v >= 1) { const row = at(r, 4) * 4; pg.rect(0, row, 16, 3, v === 1 ? '#c0884f' : '#d09a62'); }
    for (let y = 0; y < 16; y += 4) pg.hline(0, 15, y + 3, '#a8703a');
    pg.vline(5, 0, 3, '#a8703a'); pg.vline(12, 4, 7, '#a8703a'); pg.vline(3, 8, 11, '#a8703a'); pg.vline(10, 12, 15, '#a8703a');
    if (v === 2) { const x = 2 + at(r, 10); const y = 4 * at(r, 4) + 1; pg.rect(x, y, 2, 1, '#9a6434'); pg.px(x + 2, y, '#b07a44'); }
  },
  [T.DARK_GRASS]: (pg, r) => grass(pg, r, '#4f9a4a', '#3f8a3e', '#62b048'),
  [T.CLIFF]: (pg, r) => {
    pg.rect(0, 0, 16, 16, '#7a6a5a');
    pg.rect(0, 0, 16, 4, '#5bbf4a'); pg.rect(0, 4, 16, 1, '#3f8a3e');
    for (let i = 0; i < 5; i++) { const x = Math.floor(r() * 14); const y = 6 + Math.floor(r() * 9); pg.hline(x, x + 2, y, '#5a4a3a'); }
  },
  [T.BRIDGE]: (pg) => {
    pg.rect(0, 0, 16, 16, '#4aa8e8');
    pg.rect(1, 0, 14, 16, '#b07a4a');
    for (let y = 0; y < 16; y += 4) pg.hline(1, 14, y, '#7a4a2a');
    pg.vline(1, 0, 15, '#5a3a24'); pg.vline(14, 0, 15, '#5a3a24');
  },
  [T.SAND]: (pg, r, v) => {
    pg.rect(0, 0, 16, 16, '#f0d8a0');
    for (let i = 0; i < 12; i++) pg.px(Math.floor(r() * 16), Math.floor(r() * 16), '#d8bc80');
    if (v === 1) { const x = 3 + at(r, 9); const y = 3 + at(r, 9); pg.px(x, y, '#fff4e0'); pg.px(x + 1, y, '#f8c8b8'); }
    if (v === 2) { const y = 3 + at(r, 10); pg.hline(2 + at(r, 4), 9 + at(r, 4), y, '#e4c88c'); }
  },
  [T.FENCE]: (pg, r) => {
    grass(pg, r);
    pg.rect(0, 5, 16, 2, '#c8915a'); pg.rect(0, 10, 16, 2, '#c8915a');
    pg.rect(2, 2, 3, 13, '#e0b07a'); pg.rect(11, 2, 3, 13, '#e0b07a');
    pg.rect(4, 2, 1, 13, '#a8703a'); pg.rect(13, 2, 1, 13, '#a8703a');
  },
  [T.FLOWERBED]: (pg, r) => {
    pg.rect(0, 0, 16, 16, '#8a5a34');
    for (let i = 0; i < 7; i++) { const x = 1 + Math.floor(r() * 13); const y = 1 + Math.floor(r() * 13); pg.px(x, y + 1, '#3f9a48'); pg.px(x, y, ['#ff8fb1', '#ffd25e', '#ffffff', '#b25bd6'][i % 4]); }
  },
  [T.STONE_FLOOR]: (pg, r, v) => {
    pg.rect(0, 0, 16, 16, '#b8b0c8');
    if (v === 2) pg.rect(at(r, 2) * 8, at(r, 2) * 8, 7, 7, '#b0a8c0');
    pg.hline(0, 15, 7, '#9890a8'); pg.hline(0, 15, 15, '#9890a8'); pg.vline(7, 0, 7, '#9890a8'); pg.vline(15, 8, 15, '#9890a8');
    pg.px(3, 3, '#d0c8e0'); pg.px(11, 11, '#d0c8e0');
    if (v === 1) crack(pg, r, '#a098b0');
  },
  [T.SKY]: (pg, r) => {
    pg.rect(0, 0, 16, 16, '#2a2a5a');
    for (let i = 0; i < 3; i++) pg.px(Math.floor(r() * 16), Math.floor(r() * 16), '#fff1a8');
  },
  [T.CLOUD_EDGE]: (pg) => {
    pg.rect(0, 0, 16, 16, '#e8e8f8');
    pg.ellipse(4, 12, 4, 3, '#ffffff'); pg.ellipse(12, 4, 4, 3, '#ffffff'); pg.px(8, 8, '#d0d0e8');
  },
  [T.CARPET]: (pg) => {
    pg.rect(0, 0, 16, 16, '#fff7f0');
    for (let y = 0; y < 16; y += 4) for (let x = 0; x < 16; x += 4) if (((x + y) / 4) % 2 === 0) pg.rect(x, y, 4, 4, '#ff8fb1');
  },
  // granito do topo da pedrona: cinza claro, grãos e manchas de líquen
  [T.GRANITE]: (pg, r, v) => {
    pg.rect(0, 0, 16, 16, '#b8b4b0');
    for (let i = 0; i < 22; i++) pg.px(Math.floor(r() * 16), Math.floor(r() * 16), ['#a8a4a0', '#cac6c2', '#9a9690', '#d8d4cc'][i % 4]);
    if (r() > 0.4) { const x = Math.floor(r() * 11); const y = Math.floor(r() * 11); pg.rect(x, y, 3, 2, '#c8c890'); pg.px(x + 1, y + 2, '#b0b878'); }
    if (v === 2) crack(pg, r, '#9a9690');
  },
  // face de rocha: granito em placas verticais, com sombra e borda de cima clara
  [T.ROCK_FACE]: (pg, r) => {
    pg.rect(0, 0, 16, 16, '#8e8a88');
    pg.rect(0, 0, 16, 2, '#c4c0bc'); pg.hline(0, 15, 2, '#6e6a68');
    for (let i = 0; i < 4; i++) { const x = 2 + Math.floor(r() * 12); pg.vline(x, 4 + Math.floor(r() * 3), 13 + Math.floor(r() * 3), '#76726f'); pg.vline(x + 1, 5, 12, '#a29e9a'); }
    pg.hline(0, 15, 15, '#6e6a68');
  },
  // piso de academia: colchonete azul com costuras
  [T.GYM_FLOOR]: (pg, r, v) => {
    pg.rect(0, 0, 16, 16, '#3f6fb8');
    pg.hline(0, 15, 0, '#2f5a98'); pg.vline(0, 0, 15, '#2f5a98');
    pg.px(4, 4, '#5a88cc'); pg.px(11, 10, '#5a88cc'); pg.px(8, 7, '#e8eef8');
    if (v === 1) { const x = 3 + at(r, 9); const y = 3 + at(r, 9); pg.rect(x, y, 2, 2, '#6a8ec8'); pg.px(x + 2, y + 1, '#5a80c0'); }
  },
  // parede de escalada indoor: compensado com agarras coloridas
  [T.CLIMB_WALL]: (pg, r) => {
    pg.rect(0, 0, 16, 16, '#d8b88a');
    pg.hline(0, 15, 0, '#b8966a'); pg.vline(0, 0, 15, '#c8a87a');
    ([['#e8424a', 3, 3], ['#ffd25e', 11, 5], ['#3f9a48', 6, 9], ['#3f7fd6', 12, 12], ['#b25bd6', 2, 13]] as [string, number, number][]).forEach(([c, x, y]) => {
      if (r() > 0.25) { pg.rect(x, y, 2, 2, c); pg.px(x + 1, y + 2, '#7a5a3a'); }
    });
    pg.px(8, 2, '#8a8a8a'); pg.px(4, 8, '#8a8a8a');
  },
  // parede interna pintada (rodapé escuro)
  [T.INDOOR_WALL]: (pg, r, v) => {
    pg.rect(0, 0, 16, 16, '#e8dcc8');
    pg.rect(0, 12, 16, 4, '#6a5a7a'); pg.hline(0, 15, 11, '#c8bca8');
    pg.vline(15, 0, 11, '#d8ccb8');
    if (v === 1) { const x = 2 + at(r, 10); pg.px(x, 4 + at(r, 5), '#d8ccb6'); }
  },
  // paredão do cânion: blocos de rocha irregulares (ocre/cinza) com sombra e musgo
  [T.CANYON_WALL]: (pg, r) => {
    pg.rect(0, 0, 16, 16, '#9a7c60');
    ([[4, 4, 5, 4, '#b08e6c'], [12, 3, 4, 3, '#a8886a'], [3, 11, 4, 4, '#a4846a'], [11, 11, 5, 4, '#b4967a'], [8, 7, 3, 3, '#8e7058']] as [number, number, number, number, string][]).forEach(([x, y, rx, ry, c]) => {
      pg.ellipse(x, y, rx, ry, c);
      pg.hline(x - rx + 2, x + 1, y - ry + 1, '#c8aa88');
    });
    pg.hline(0, 15, 7, '#6e5644'); pg.px(7, 6, '#6e5644'); pg.vline(8, 0, 2, '#6e5644'); pg.vline(6, 8, 15, '#6e5644');
    for (let i = 0; i < 5; i++) pg.px(Math.floor(r() * 16), Math.floor(r() * 16), '#5e4838');
    if (r() > 0.5) { pg.px(2, 0, '#5bbf4a'); pg.px(3, 0, '#3f9a48'); pg.px(13, 8, '#5bbf4a'); }
  },
  // campo rupestre: grama baixa com pedrinhas
  [T.ROCKY_GRASS]: (pg, r) => {
    grass(pg, r, '#8cbf5a', '#74a84a', '#a8d070');
    for (let i = 0; i < 3; i++) { const x = 1 + Math.floor(r() * 13); const y = 1 + Math.floor(r() * 13); pg.rect(x, y, 2, 1, '#b8b4b0'); pg.px(x, y + 1, '#8e8a88'); }
  },
  // afloramento de rocha com arbusto
  [T.SHRUB_ROCK]: (pg, r) => {
    grass(pg, r, '#8cbf5a', '#74a84a', '#a8d070');
    pg.ellipse(8, 10, 7, 5, '#9a9690'); pg.ellipse(7, 9, 5, 3, '#b8b4b0'); pg.hline(3, 12, 14, '#6e6a68');
    pg.ellipse(11, 5, 4, 3, '#4a8a3a'); pg.ellipse(10, 4, 2, 2, '#62a848'); pg.px(13, 3, '#ffd25e');
  },
  // passarela suspensa: tábuas de madeira atravessadas, com frestas
  [T.WALKWAY]: (pg, r, v) => {
    pg.rect(0, 0, 16, 16, '#b8844e');
    if (v >= 1) pg.rect(0, at(r, 4) * 4, 16, 3, v === 1 ? '#ae7a46' : '#c08c56');
    for (let y = 0; y < 16; y += 4) { pg.hline(0, 15, y + 3, '#6a4424'); pg.hline(0, 15, y, '#d0a06a'); }
    for (let i = 0; i < 4; i++) pg.px(Math.floor(r() * 16), Math.floor(r() * 16), '#8a5a34');
    pg.px(2, 1, '#5a3a24'); pg.px(13, 1, '#5a3a24'); pg.px(2, 9, '#5a3a24'); pg.px(13, 9, '#5a3a24');
  },
  // rio lá embaixo: azul profundo com espuma correndo
  [T.RIVER_DEEP]: (pg, r) => {
    pg.rect(0, 0, 16, 16, '#24506e');
    for (let i = 0; i < 4; i++) { const x = Math.floor(r() * 10); const y = Math.floor(r() * 15); pg.hline(x, x + 4, y, '#3a7a9a'); }
    for (let i = 0; i < 3; i++) { const x = Math.floor(r() * 14); const y = Math.floor(r() * 15); pg.hline(x, x + 1, y, '#cfe8f0'); }
  },
  // desfiladeiro: parede de pedra caindo até o rio, mais escura embaixo
  [T.CHASM]: (pg, r) => {
    pg.rect(0, 0, 16, 16, '#6e5a48');
    for (let x = 0; x < 16; x += 3) { pg.vline(x, 0, 15, '#5a4838'); pg.vline(x + 1, 0, 15, '#7e6a56'); }
    pg.rect(0, 11, 16, 5, '#4a3a2e');
    for (let i = 0; i < 4; i++) pg.px(Math.floor(r() * 16), Math.floor(r() * 11), '#9a8670');
  },
};

function canvas(scene: Phaser.Scene, key: string, w: number, h: number, draw: (pg: PG) => void): void {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.createCanvas(key, w, h)!;
  const ctx = tex.getContext();
  ctx.imageSmoothingEnabled = false;
  draw(new PG(ctx));
  tex.refresh();
}

/** Faixa `tiles` (usada pelo mapa lógico e por ícones) e grade `tiles_v` com as variações (linha = variação). */
export function drawTiles(scene: Phaser.Scene): void {
  const draw = (pg: PG, i: number, v: number) => TILE_DRAW[i]?.(pg, rng(101 + i * 31 + v * 977), v);
  canvas(scene, 'tiles', 16 * TILE_COUNT, 16, (pg) => {
    for (let i = 0; i < TILE_COUNT; i++) draw(pg.at(i * 16, 0), i, 0);
  });
  canvas(scene, 'tiles_v', 16 * TILE_COUNT, 16 * TILE_VARIANTS, (pg) => {
    for (let v = 0; v < TILE_VARIANTS; v++) for (let i = 0; i < TILE_COUNT; i++) draw(pg.at(i * 16, v * 16), i, v);
  });
  drawWater(scene);
}

/** Água animada: 4 quadros de 32x32 que emendam nas bordas (brilhos que acendem e apagam). */
export const WATER_FRAMES = 4;
function drawWater(scene: Phaser.Scene): void {
  const r = rng(4242);
  const ripples = Array.from({ length: 12 }, () => ({ x: at(r, 32), y: at(r, 32), len: 2 + at(r, 4) }));
  for (let f = 0; f < WATER_FRAMES; f++) {
    canvas(scene, `water_${f}`, 32, 32, (pg) => {
      for (let y = 0; y < 32; y++) {
        for (let x = 0; x < 32; x++) {
          // manchas suaves (duas ondas cruzadas), não listras
          const a = (f * Math.PI) / 2;
          const wave = Math.sin((x / 32) * Math.PI * 2 + a) + 0.8 * Math.sin((y / 32) * Math.PI * 4 + (x / 32) * Math.PI * 2 - a);
          pg.px(x, y, wave > 1.45 ? '#52aeec' : wave < -1.5 ? '#45a3e4' : '#4aa8e8');
        }
      }
      ripples.forEach((rp, k) => {
        const p = (k + f) % WATER_FRAMES;
        const line = (x0: number, len: number, y: number, c: string) => { for (let i = 0; i < len; i++) pg.px((x0 + i) % 32, y % 32, c); };
        if (p === 0) line(rp.x, rp.len + 1, rp.y, '#8fd8ff');
        else if (p === 1) line(rp.x + 1, rp.len, rp.y, '#6cc4ff');
        if (p === 0 && k % 3 === 0) pg.px((rp.x + 1) % 32, (rp.y + 31) % 32, '#e6f6ff');
      });
    });
  }
}
