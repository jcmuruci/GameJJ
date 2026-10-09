import Phaser from 'phaser';
import { PG, PAL, rng, shade, OUTLINE } from './pixel';
import { generateExtraTextures } from './TexturesExtra';
import { generateFoodTextures } from './TexturesFood';
import { generateTrailTextures } from './TexturesTrail';
import { generateFarmTextures } from './TexturesFarm';

/**
 * Toda a arte do jogo é gerada aqui, por código, no carregamento.
 * Assim o jogo não depende de nenhum arquivo de imagem externo.
 */

import { TILE_COUNT } from './tiles';
export { T, TILE_COUNT, SOLID_TILES } from './tiles';

type Draw = (pg: PG, r: () => number) => void;

function canvas(scene: Phaser.Scene, key: string, w: number, h: number, draw: Draw, outline = false, seed = 7): void {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.createCanvas(key, w, h)!;
  const ctx = tex.getContext();
  ctx.imageSmoothingEnabled = false;
  const pg = new PG(ctx);
  draw(pg, rng(seed));
  if (outline) pg.at(0, 0).outline(0, 0, w, h);
  tex.refresh();
}

/** Folha com N quadros lado a lado. */
function sheet(scene: Phaser.Scene, key: string, fw: number, fh: number, frames: Draw[], outline = true): void {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.createCanvas(key, fw * frames.length, fh)!;
  const ctx = tex.getContext();
  ctx.imageSmoothingEnabled = false;
  const pg = new PG(ctx);
  frames.forEach((f, i) => {
    pg.at(i * fw, 0);
    f(pg, rng(13 + i));
    if (outline) pg.outline(0, 0, fw, fh);
    tex.add(i, 0, i * fw, 0, fw, fh);
  });
  tex.refresh();
}

function strSprite(scene: Phaser.Scene, key: string, rows: string[], pal = PAL): void {
  const w = Math.max(...rows.map((r) => r.length)) + 2;
  const h = rows.length + 2;
  canvas(scene, key, w, h, (pg) => pg.strings(rows, pal, 1, 1), true);
}

// ---------------------------------------------------------------- TILES
function drawTiles(scene: Phaser.Scene): void {
  canvas(scene, 'tiles', 16 * TILE_COUNT, 16, (pg, r) => {
    const grass = (ox: number, base = '#7ccf5a', dark = '#62b048', light = '#9be070') => {
      pg.at(ox, 0).rect(0, 0, 16, 16, base);
      for (let i = 0; i < 14; i++) pg.px(Math.floor(r() * 16), Math.floor(r() * 16), r() > 0.5 ? dark : light);
    };
    // 0 grama
    grass(0);
    // 1 grama com flores
    grass(16);
    pg.at(16, 0);
    [[3, 4, '#ffffff'], [11, 9, '#ffd25e'], [6, 12, '#ff8fb1']].forEach(([x, y, c]) => {
      pg.px(x as number, y as number, c as string); pg.px((x as number) - 1, y as number, '#fff7f0'); pg.px((x as number) + 1, y as number, '#fff7f0');
      pg.px(x as number, (y as number) - 1, '#fff7f0'); pg.px(x as number, (y as number) + 1, '#fff7f0'); pg.px(x as number, y as number, c as string);
    });
    // 2 tufo
    grass(32);
    pg.at(32, 0);
    [[4, 6], [10, 11], [12, 3]].forEach(([x, y]) => { pg.px(x, y, '#4a9a3a'); pg.px(x - 1, y + 1, '#4a9a3a'); pg.px(x + 1, y + 1, '#4a9a3a'); pg.px(x, y + 1, '#4a9a3a'); });
    // 3 caminho de terra
    pg.at(48, 0).rect(0, 0, 16, 16, '#d8b07a');
    for (let i = 0; i < 18; i++) pg.px(Math.floor(r() * 16), Math.floor(r() * 16), r() > 0.5 ? '#c49a64' : '#e8c890');
    // 4 água
    pg.at(64, 0).rect(0, 0, 16, 16, '#4aa8e8');
    pg.rect(0, 0, 16, 2, '#6cc4ff');
    for (let i = 0; i < 4; i++) { const x = Math.floor(r() * 12); const y = 3 + Math.floor(r() * 12); pg.hline(x, x + 3, y, '#8fd8ff'); }
    // 5 árvore (copa redonda sobre grama)
    grass(80);
    pg.at(80, 0);
    pg.ellipse(8, 7, 7, 7, '#2f7a3a');
    pg.ellipse(7, 6, 6, 5, '#3f9a48');
    pg.ellipse(6, 5, 3, 2, '#5bbf4a');
    pg.px(4, 4, '#9be070'); pg.px(10, 9, '#2a6a30');
    pg.rect(7, 14, 3, 2, '#5a3a24');
    // 6 sebe/arbusto
    grass(96);
    pg.at(96, 0);
    pg.ellipse(8, 8, 8, 7, '#3a8a40'); pg.ellipse(8, 7, 7, 6, '#4aa84a');
    for (let i = 0; i < 6; i++) pg.px(2 + Math.floor(r() * 12), 2 + Math.floor(r() * 10), '#6cc85a');
    // 7 muro de pedra
    pg.at(112, 0).rect(0, 0, 16, 16, '#8a8aa0');
    for (let y = 0; y < 16; y += 5) { pg.hline(0, 15, y, '#5a5a70'); const off = (y / 5) % 2 ? 4 : 0; for (let x = off; x < 16; x += 8) pg.vline(x, y, y + 4, '#5a5a70'); }
    pg.hline(0, 15, 1, '#aaaac0');
    // 8 piso de madeira
    pg.at(128, 0).rect(0, 0, 16, 16, '#c8915a');
    for (let y = 0; y < 16; y += 4) pg.hline(0, 15, y + 3, '#a8703a');
    pg.vline(5, 0, 3, '#a8703a'); pg.vline(12, 4, 7, '#a8703a'); pg.vline(3, 8, 11, '#a8703a'); pg.vline(10, 12, 15, '#a8703a');
    // 9 grama escura (floresta)
    grass(144, '#4f9a4a', '#3f8a3e', '#62b048');
    // 10 penhasco
    pg.at(160, 0).rect(0, 0, 16, 16, '#7a6a5a');
    pg.rect(0, 0, 16, 4, '#5bbf4a'); pg.rect(0, 4, 16, 1, '#3f8a3e');
    for (let i = 0; i < 5; i++) { const x = Math.floor(r() * 14); const y = 6 + Math.floor(r() * 9); pg.hline(x, x + 2, y, '#5a4a3a'); }
    // 11 ponte
    pg.at(176, 0).rect(0, 0, 16, 16, '#4aa8e8');
    pg.rect(1, 0, 14, 16, '#b07a4a');
    for (let y = 0; y < 16; y += 4) pg.hline(1, 14, y, '#7a4a2a');
    pg.vline(1, 0, 15, '#5a3a24'); pg.vline(14, 0, 15, '#5a3a24');
    // 12 areia
    pg.at(192, 0).rect(0, 0, 16, 16, '#f0d8a0');
    for (let i = 0; i < 12; i++) pg.px(Math.floor(r() * 16), Math.floor(r() * 16), '#d8bc80');
    // 13 cerca
    grass(208);
    pg.at(208, 0);
    pg.rect(0, 5, 16, 2, '#c8915a'); pg.rect(0, 10, 16, 2, '#c8915a');
    pg.rect(2, 2, 3, 13, '#e0b07a'); pg.rect(11, 2, 3, 13, '#e0b07a');
    pg.rect(4, 2, 1, 13, '#a8703a'); pg.rect(13, 2, 1, 13, '#a8703a');
    // 14 canteiro de flores
    pg.at(224, 0).rect(0, 0, 16, 16, '#8a5a34');
    for (let i = 0; i < 7; i++) { const x = 1 + Math.floor(r() * 13); const y = 1 + Math.floor(r() * 13); pg.px(x, y + 1, '#3f9a48'); pg.px(x, y, ['#ff8fb1', '#ffd25e', '#ffffff', '#b25bd6'][i % 4]); }
    // 15 piso de pedra
    pg.at(240, 0).rect(0, 0, 16, 16, '#b8b0c8');
    pg.hline(0, 15, 7, '#9890a8'); pg.hline(0, 15, 15, '#9890a8'); pg.vline(7, 0, 7, '#9890a8'); pg.vline(15, 8, 15, '#9890a8');
    pg.px(3, 3, '#d0c8e0'); pg.px(11, 11, '#d0c8e0');
    // 16 céu (vazio)
    pg.at(256, 0).rect(0, 0, 16, 16, '#2a2a5a');
    for (let i = 0; i < 3; i++) pg.px(Math.floor(r() * 16), Math.floor(r() * 16), '#fff1a8');
    // 17 borda de nuvem (chão de nuvem)
    pg.at(272, 0).rect(0, 0, 16, 16, '#e8e8f8');
    pg.ellipse(4, 12, 4, 3, '#ffffff'); pg.ellipse(12, 4, 4, 3, '#ffffff'); pg.px(8, 8, '#d0d0e8');
    // 18 tapete / toalha
    pg.at(288, 0).rect(0, 0, 16, 16, '#fff7f0');
    for (let y = 0; y < 16; y += 4) for (let x = 0; x < 16; x += 4) if (((x + y) / 4) % 2 === 0) pg.rect(x, y, 4, 4, '#ff8fb1');
  });
}

// ---------------------------------------------------------------- ITENS
const ITEM_SPRITES: Record<string, string[]> = {
  apple: [
    '.....BG.....',
    '....B.GG....',
    '..rrBrr.....',
    '.rrrrrrrr...',
    'rhrrrrrrrr..',
    'rhrrrrrrrR..',
    'rrrrrrrrrR..',
    'rrrrrrrrrR..',
    '.rrrrrrRR...',
    '..rRrRR.....',
  ],
  apple_cut: [
    '..r.....r...',
    '.rNr...rNr..',
    'rNNNr.rNNNr.',
    'rNBNr.rNBNr.',
    'rNNNr.rNNNr.',
    '.rrr...rrr..',
    '....r.......',
    '...rNr......',
    '..rNBNr.....',
    '..rNNNr.....',
    '...rrr......',
  ],
  berry: [
    '.....Gg.....',
    '....GlG.....',
    '..vvG.ii....',
    '.vhvvihii...',
    '.vvVvVii....',
    '..vVuuvv....',
    '..uhuuvhv...',
    '..uuUuvvV...',
    '...UU.VV....',
  ],
  mushroom: [
    '...rrrrr....',
    '..rhrrrhr...',
    '.rhhrrrrrr..',
    '.rrrrrhhrr..',
    'RRRRRRRRRRR.',
    '...mmmmm....',
    '...mmmmm....',
    '...mmmmN....',
    '..NmmmmmN...',
  ],
  mushroom_cut: [
    '.rrr...rrr..',
    'rRRRr.rRRRr.',
    '.mmm...mmm..',
    '.mNm...mNm..',
    '............',
    '....rrr.....',
    '...rRRRr....',
    '....mmm.....',
    '....mNm.....',
  ],
  flour: [
    '....BBB.....',
    '...N.B.N....',
    '..NNNNNNN...',
    '.NNNNNNNNN..',
    '.NNwwwwwNN..',
    '.NNwyywwNN..',
    '.NNwwywwNN..',
    '.NNwwwwwNN..',
    '.nNNNNNNNn..',
    '..nnnnnnn...',
  ],
  log: [
    '............',
    '.bbbbbbbnN..',
    'bBbbbBbbnNn.',
    'bbbBbbbbNbN.',
    'bbbbbbBbnNn.',
    '.bbbbbbbnN..',
  ],
  firewood: [
    '...........',
    '..bbbbbnN..',
    '.bBbbbBnNn.',
    '..bbbbbnN..',
    '.bbbbbnN...',
    'bBbbBbnNn..',
    '.bbbbbnN...',
  ],
  charcoal: [
    '...ddd......',
    '..dSddd.....',
    '.dddSdddd...',
    '.ddSdddSd...',
    '..dddddd....',
  ],
  soup: [
    '..YYYYYY....',
    '.YoYYYYoY...',
    'YYYmYYYYYY..',
    'YYYYYYmYYY..',
    '.YYYoYYYY...',
    '..YYYYYY....',
  ],
  pie: [
    '...nnnnn....',
    '.nNvNvNvNn..',
    'nNvvNvvNvNn.',
    'nvNvvNvvNvn.',
    'nNvvNvvNvNn.',
    '.nnNNNNNnn..',
    '..nnnnnnn...',
  ],
  coin: [
    '.yyyyy.',
    'yYhhyyY',
    'yhpypyY',
    'yypppyY',
    'yyypyyY',
    '.YYYYY.',
  ],
  heart: [
    '.rr.rr.',
    'rhrrrrr',
    'rrrrrrR',
    '.rrrrR.',
    '..rrR..',
    '...R...',
  ],
  crystal: [
    '...pp...',
    '..phPp..',
    '.phhpPp.',
    'phhppPPp',
    'pphpPPPp',
    '.ppPPPp.',
    '..pPPp..',
    '...pp...',
  ],
};

function drawItems(scene: Phaser.Scene): void {
  for (const [k, rows] of Object.entries(ITEM_SPRITES)) strSprite(scene, `item_${k}`, rows);
  // prato
  canvas(scene, 'item_plate', 16, 10, (pg) => {
    pg.ellipse(8, 5, 7, 3, '#d8d8e4');
    pg.ellipse(8, 4, 6, 2, '#fff7f0');
    pg.ellipse(8, 4, 4, 1, '#ececf4');
  }, true);
}

// ---------------------------------------------------------------- ESTAÇÕES
function counterBase(pg: PG): void {
  pg.rect(0, 0, 16, 12, '#c8915a');
  pg.hline(0, 15, 0, '#e0b07a');
  pg.hline(0, 15, 4, '#b07a48'); pg.hline(0, 15, 8, '#b07a48');
  pg.rect(0, 12, 16, 4, '#8a5a34');
  pg.hline(0, 15, 12, '#5a3a24');
  pg.hline(0, 15, 15, '#4a2a1a');
  pg.vline(0, 0, 15, '#5a3a24'); pg.vline(15, 0, 15, '#5a3a24');
}

function drawStations(scene: Phaser.Scene): void {
  canvas(scene, 'st_counter', 16, 16, (pg) => counterBase(pg));
  canvas(scene, 'st_board', 16, 16, (pg) => {
    counterBase(pg);
    pg.rect(2, 2, 12, 8, '#f0d8a8'); pg.rect(2, 9, 12, 1, '#c8a878'); pg.vline(2, 2, 9, '#c8a878');
    pg.rect(12, 3, 1, 3, '#e8e8f4'); pg.rect(12, 6, 1, 3, '#5a3a24');
  });
  canvas(scene, 'st_plates', 16, 16, (pg) => {
    counterBase(pg);
    for (let i = 0; i < 4; i++) { pg.ellipse(8, 8 - i * 1.5, 6, 2, '#d8d8e4'); pg.ellipse(8, 7 - i * 1.5, 5, 1, '#fff7f0'); }
  });
  canvas(scene, 'st_trash', 16, 16, (pg) => {
    pg.rect(3, 4, 10, 11, '#6a7a8a'); pg.rect(3, 4, 2, 11, '#8a9aaa'); pg.rect(11, 4, 2, 11, '#4a5a6a');
    pg.rect(2, 2, 12, 3, '#8a9aaa'); pg.rect(6, 1, 4, 1, '#4a5a6a');
    pg.vline(6, 7, 13, '#4a5a6a'); pg.vline(9, 7, 13, '#4a5a6a');
  }, true);
  canvas(scene, 'st_fire', 16, 16, (pg) => {
    // anel de pedras + panela
    pg.ellipse(8, 12, 7, 3, '#7a7a8a');
    pg.ellipse(8, 12, 5, 2, '#3a2a2a');
    pg.rect(3, 11, 10, 1, '#8a5a34'); pg.rect(5, 13, 6, 1, '#5a3a24');
    pg.ellipse(8, 6, 6, 4, '#2a2a34');
    pg.ellipse(8, 4, 6, 1, '#4a4a5a');
    pg.ellipse(8, 4, 5, 1, '#1a1a22');
    pg.px(3, 6, '#5a5a6a'); pg.px(4, 8, '#5a5a6a');
  }, true);
  canvas(scene, 'st_oven', 16, 16, (pg) => {
    pg.ellipse(8, 8, 7, 7, '#b8644a');
    pg.rect(1, 8, 14, 7, '#b8644a');
    for (let y = 3; y < 15; y += 3) pg.hline(2, 13, y, '#8a4a3a');
    pg.ellipse(8, 11, 4, 3, '#2a1a1a'); pg.rect(4, 11, 9, 4, '#2a1a1a');
    pg.rect(6, 0, 3, 3, '#7a7a8a');
  }, true);
  canvas(scene, 'st_deliver', 16, 16, (pg) => {
    for (let y = 0; y < 16; y += 4) for (let x = 0; x < 16; x += 4) pg.rect(x, y, 4, 4, ((x + y) / 4) % 2 === 0 ? '#e8424a' : '#fff7f0');
    pg.rect(0, 0, 16, 1, '#a8283a'); pg.rect(0, 15, 16, 1, '#a8283a'); pg.vline(0, 0, 15, '#a8283a'); pg.vline(15, 0, 15, '#a8283a');
  });
  canvas(scene, 'src_apple', 16, 16, (pg) => {
    counterBase(pg);
    pg.ellipse(8, 8, 6, 3, '#a8703a'); pg.ellipse(8, 7, 5, 2, '#5a3a24');
    [[5, 5], [8, 4], [11, 5], [7, 6], [10, 6]].forEach(([x, y]) => { pg.rect(x - 1, y - 1, 3, 3, '#e8424a'); pg.px(x - 1, y - 1, '#ff8a8a'); });
    pg.hline(2, 13, 9, '#8a5a34');
  });
  canvas(scene, 'src_mush', 16, 16, (pg) => {
    counterBase(pg);
    pg.ellipse(8, 8, 6, 3, '#a8703a'); pg.ellipse(8, 7, 5, 2, '#5a3a24');
    [[5, 5], [8, 4], [11, 5], [7, 7]].forEach(([x, y]) => { pg.rect(x - 1, y - 1, 3, 2, '#e8424a'); pg.px(x, y - 1, '#fff7f0'); pg.px(x, y + 1, '#f0e0c8'); });
    pg.hline(2, 13, 9, '#8a5a34');
  });
  canvas(scene, 'src_flour', 16, 16, (pg) => {
    counterBase(pg);
    pg.ellipse(8, 6, 5, 5, '#f0c890'); pg.rect(5, 1, 6, 2, '#d6a46a'); pg.rect(6, 5, 4, 3, '#fff7f0'); pg.px(8, 6, '#ffd25e');
  });
  canvas(scene, 'src_berry', 16, 16, (pg) => {
    pg.ellipse(8, 9, 7, 6, '#2f7a3a'); pg.ellipse(8, 8, 6, 5, '#4aa84a');
    [[4, 7], [9, 5], [11, 10], [6, 11], [12, 6], [7, 8]].forEach(([x, y]) => { pg.px(x, y, '#6a3a9a'); pg.px(x + 1, y, '#b25bd6'); pg.px(x, y + 1, '#b25bd6'); pg.px(x + 1, y + 1, '#5a4ab0'); });
  }, true);
  canvas(scene, 'st_woodpile', 16, 16, (pg) => {
    for (let i = 0; i < 3; i++) {
      const y = 10 - i * 3;
      for (let j = 0; j < 3 - i; j++) {
        const x = 3 + j * 4 + i * 2;
        pg.ellipse(x + 1, y + 1, 2, 2, '#8a5a34'); pg.px(x + 1, y + 1, '#f0c890');
      }
    }
  }, true);

  // fogo (2 quadros)
  sheet(scene, 'fire', 12, 12, [
    (pg) => { pg.ellipse(6, 8, 4, 3, '#f08a3a'); pg.ellipse(6, 6, 3, 4, '#f08a3a'); pg.ellipse(6, 8, 2, 2, '#ffd25e'); pg.px(6, 1, '#f08a3a'); pg.px(4, 3, '#e8424a'); },
    (pg) => { pg.ellipse(6, 8, 4, 3, '#f08a3a'); pg.ellipse(5, 5, 3, 4, '#f08a3a'); pg.ellipse(6, 8, 2, 2, '#ffd25e'); pg.px(7, 2, '#f08a3a'); pg.px(8, 4, '#e8424a'); },
  ], false);
}

// ---------------------------------------------------------------- PUZZLES / MUNDO
function drawWorld(scene: Phaser.Scene): void {
  canvas(scene, 'boulder', 16, 16, (pg) => {
    pg.ellipse(8, 9, 7, 6, '#7a7a90'); pg.ellipse(7, 8, 6, 5, '#9a9ab0'); pg.ellipse(5, 6, 2, 2, '#c0c0d0');
    pg.px(10, 11, '#5a5a70'); pg.px(11, 10, '#5a5a70'); pg.px(4, 12, '#5a5a70');
  }, true);
  canvas(scene, 'pplate_off', 16, 16, (pg) => {
    pg.rect(1, 2, 14, 13, '#6a6a80'); pg.rect(2, 3, 12, 11, '#9a9ab0'); pg.rect(4, 5, 8, 6, '#ffd25e'); pg.rect(4, 10, 8, 1, '#c89a3a'); pg.rect(4, 5, 8, 1, '#fff1a8');
  });
  canvas(scene, 'pplate_on', 16, 16, (pg) => {
    pg.rect(1, 2, 14, 13, '#6a6a80'); pg.rect(2, 3, 12, 11, '#8a8aa0'); pg.rect(4, 6, 8, 5, '#c89a3a'); pg.rect(4, 6, 8, 1, '#a87a2a');
  });
  canvas(scene, 'gate_closed', 16, 16, (pg) => {
    pg.rect(0, 0, 16, 16, '#5a4a3a');
    for (let x = 1; x < 16; x += 3) { pg.rect(x, 0, 2, 16, '#a8a8b8'); pg.vline(x, 0, 15, '#d8d8e4'); }
    pg.rect(0, 3, 16, 2, '#7a7a90'); pg.rect(0, 11, 16, 2, '#7a7a90');
  }, false);
  canvas(scene, 'gate_open', 16, 16, (pg) => {
    pg.rect(0, 0, 16, 3, '#5a4a3a');
    for (let x = 1; x < 16; x += 3) pg.rect(x, 0, 2, 2, '#a8a8b8');
    pg.rect(0, 13, 16, 3, '#6a5a4a');
  }, false);
  canvas(scene, 'thorns', 16, 16, (pg, r) => {
    for (let i = 0; i < 6; i++) {
      const x = 2 + Math.floor(r() * 12); const y = 2 + Math.floor(r() * 12);
      pg.ellipse(x, y, 3, 2, i % 2 ? '#5a3a6a' : '#3a6a3a');
    }
    for (let i = 0; i < 10; i++) pg.px(1 + Math.floor(r() * 14), 1 + Math.floor(r() * 14), '#d8c8e8');
    pg.px(5, 4, '#ff5c8a'); pg.px(11, 10, '#ff5c8a');
  }, true);
  canvas(scene, 'rock_cracked', 16, 16, (pg) => {
    pg.ellipse(8, 9, 7, 6, '#8a7a6a'); pg.ellipse(7, 8, 6, 5, '#a8988a'); pg.ellipse(5, 6, 2, 1, '#c8b8a8');
    pg.vline(8, 4, 7, '#4a3a2a'); pg.px(9, 8, '#4a3a2a'); pg.px(10, 9, '#4a3a2a'); pg.px(7, 9, '#4a3a2a'); pg.px(6, 10, '#4a3a2a');
  }, true);
  canvas(scene, 'rune_off', 16, 16, (pg) => {
    pg.ellipse(8, 8, 7, 6, '#c94a7a'); pg.ellipse(8, 8, 6, 5, '#7a4a9a'); pg.ellipse(8, 8, 3, 2, '#c94a7a');
    pg.px(8, 3, '#ffd6e4'); pg.px(8, 13, '#ffd6e4'); pg.px(2, 8, '#ffd6e4'); pg.px(14, 8, '#ffd6e4');
  });
  canvas(scene, 'rune_on', 16, 16, (pg) => {
    pg.ellipse(8, 8, 7, 6, '#ff9cc2'); pg.ellipse(8, 8, 6, 5, '#ffd6e4'); pg.ellipse(8, 8, 3, 2, '#ff7aa8');
    pg.px(8, 3, '#ffffff'); pg.px(8, 13, '#ffffff'); pg.px(2, 8, '#ffffff'); pg.px(14, 8, '#ffffff');
  });
  canvas(scene, 'lever_off', 16, 16, (pg) => {
    pg.rect(3, 11, 10, 4, '#6a6a80'); pg.rect(4, 11, 8, 1, '#9a9ab0');
    pg.vline(5, 4, 11, '#8a5a34'); pg.vline(6, 5, 11, '#5a3a24'); pg.ellipse(5, 4, 2, 2, '#e8424a');
  }, true);
  canvas(scene, 'lever_on', 16, 16, (pg) => {
    pg.rect(3, 11, 10, 4, '#6a6a80'); pg.rect(4, 11, 8, 1, '#9a9ab0');
    pg.vline(10, 4, 11, '#8a5a34'); pg.vline(11, 5, 11, '#5a3a24'); pg.ellipse(11, 4, 2, 2, '#5bbf4a');
  }, true);
  canvas(scene, 'exit', 16, 16, (pg) => {
    pg.ellipse(8, 8, 7, 7, '#ff9cc2'); pg.ellipse(8, 8, 5, 5, '#ffd6e4'); pg.ellipse(8, 8, 3, 3, '#ffffff');
    pg.px(6, 7, '#ff5c8a'); pg.px(7, 7, '#ff5c8a'); pg.px(9, 7, '#ff5c8a'); pg.px(10, 7, '#ff5c8a');
    pg.hline(6, 10, 8, '#ff5c8a'); pg.hline(7, 9, 9, '#ff5c8a'); pg.px(8, 10, '#ff5c8a');
  });
  canvas(scene, 'sign', 16, 16, (pg) => {
    pg.rect(7, 9, 2, 6, '#5a3a24'); pg.rect(2, 2, 12, 8, '#c8915a'); pg.rect(2, 9, 12, 1, '#8a5a34');
    pg.hline(4, 11, 4, '#5a3a24'); pg.hline(4, 9, 6, '#5a3a24');
  }, true);
  const flag = (c: string, d: string): Draw => (pg) => {
    pg.vline(4, 1, 15, '#8a5a34'); pg.rect(5, 1, 8, 6, c); pg.rect(5, 6, 8, 1, d); pg.px(12, 3, d); pg.rect(3, 14, 3, 2, '#5a3a24');
  };
  canvas(scene, 'flag_0', 16, 16, flag('#6cc4ff', '#3a7bd5'), true);
  canvas(scene, 'flag_1', 16, 16, flag('#ff9cc2', '#c94a7a'), true);
  canvas(scene, 'log_big', 16, 16, (pg) => {
    pg.rect(1, 6, 14, 8, '#8a5a34'); pg.rect(1, 6, 14, 2, '#a8703a'); pg.hline(3, 12, 10, '#6a4a2a');
    pg.ellipse(14, 10, 2, 4, '#f0c890'); pg.px(14, 10, '#c8915a');
  }, true);
  canvas(scene, 'chest', 16, 16, (pg) => {
    pg.rect(1, 5, 14, 10, '#a8703a'); pg.rect(1, 5, 14, 4, '#c8915a'); pg.rect(1, 9, 14, 1, '#5a3a24');
    pg.rect(7, 8, 2, 3, '#ffd25e');
  }, true);

  // decoração
  canvas(scene, 'tree_big', 32, 40, (pg) => {
    pg.rect(13, 26, 6, 12, '#7a4a2a'); pg.rect(13, 26, 2, 12, '#a8703a'); pg.rect(11, 36, 10, 2, '#5a3a24');
    pg.ellipse(16, 14, 14, 12, '#2f7a3a'); pg.ellipse(15, 13, 12, 10, '#3f9a48'); pg.ellipse(12, 9, 6, 4, '#5bbf4a'); pg.ellipse(10, 7, 2, 1, '#9be070');
    pg.ellipse(22, 18, 3, 2, '#2f7a3a');
  }, true);
  canvas(scene, 'tree_apple', 32, 40, (pg) => {
    pg.rect(13, 26, 6, 12, '#7a4a2a'); pg.rect(13, 26, 2, 12, '#a8703a'); pg.rect(11, 36, 10, 2, '#5a3a24');
    pg.ellipse(16, 14, 14, 12, '#2f7a3a'); pg.ellipse(15, 13, 12, 10, '#3f9a48'); pg.ellipse(12, 9, 6, 4, '#5bbf4a');
    [[8, 12], [20, 8], [23, 17], [12, 19], [17, 14]].forEach(([x, y]) => { pg.rect(x, y, 3, 3, '#e8424a'); pg.px(x, y, '#ff9a9a'); });
  }, true);
  canvas(scene, 'tree_pink', 32, 40, (pg) => {
    pg.rect(13, 26, 6, 12, '#7a4a2a'); pg.rect(13, 26, 2, 12, '#a8703a'); pg.rect(11, 36, 10, 2, '#5a3a24');
    pg.ellipse(16, 14, 14, 12, '#d4507a'); pg.ellipse(15, 13, 12, 10, '#ff8fb1'); pg.ellipse(12, 9, 6, 4, '#ffb8d0'); pg.ellipse(10, 7, 2, 1, '#ffffff');
  }, true);
  canvas(scene, 'bush', 16, 14, (pg) => {
    pg.ellipse(8, 8, 7, 5, '#2f7a3a'); pg.ellipse(7, 7, 6, 4, '#4aa84a'); pg.px(5, 5, '#9be070'); pg.px(9, 4, '#6cc85a');
  }, true);
  canvas(scene, 'rock_small', 12, 10, (pg) => {
    pg.ellipse(6, 6, 5, 3, '#8a8aa0'); pg.ellipse(5, 5, 3, 2, '#aaaac0');
  }, true);
  canvas(scene, 'lantern', 10, 14, (pg) => {
    pg.vline(5, 0, 2, '#5a3a24'); pg.ellipse(5, 7, 4, 5, '#e8424a'); pg.ellipse(5, 7, 2, 3, '#ffd25e'); pg.rect(3, 12, 5, 1, '#5a3a24');
  }, true);
  canvas(scene, 'bunting', 48, 10, (pg) => {
    for (let x = 0; x < 48; x++) pg.px(x, Math.round(1 + Math.sin((x / 48) * Math.PI) * 2), '#5a3a24');
    const cs = ['#e8424a', '#ffd25e', '#6cc4ff', '#5bbf4a', '#ff8fb1', '#b25bd6'];
    for (let i = 0; i < 8; i++) {
      const x = 2 + i * 6; const y = Math.round(2 + Math.sin(((x + 2) / 48) * Math.PI) * 2);
      for (let k = 0; k < 4; k++) pg.hline(x + Math.floor(k / 2), x + 4 - Math.floor(k / 2) - 1, y + k, cs[i % cs.length]);
    }
  }, false);
  canvas(scene, 'blanket', 32, 24, (pg) => {
    for (let y = 0; y < 24; y += 4) for (let x = 0; x < 32; x += 4) pg.rect(x, y, 4, 4, ((x + y) / 4) % 2 === 0 ? '#ff8fb1' : '#fff7f0');
  }, true);
  canvas(scene, 'basket', 14, 12, (pg) => {
    pg.rect(1, 5, 12, 6, '#c8915a'); pg.hline(1, 12, 7, '#a8703a'); pg.hline(1, 12, 9, '#a8703a');
    for (let x = 2; x < 12; x++) pg.px(x, Math.round(5 - Math.sin(((x - 2) / 9) * Math.PI) * 4), '#8a5a34');
  }, true);
  canvas(scene, 'stall', 48, 40, (pg) => {
    pg.rect(2, 16, 44, 22, '#c8915a'); pg.rect(2, 16, 44, 3, '#e0b07a'); pg.rect(2, 36, 44, 2, '#5a3a24');
    for (let x = 0; x < 48; x += 8) { pg.rect(x, 0, 8, 12, (x / 8) % 2 ? '#fff7f0' : '#e8424a'); pg.ellipse(x + 4, 12, 4, 2, (x / 8) % 2 ? '#fff7f0' : '#e8424a'); }
    pg.rect(3, 12, 2, 6, '#5a3a24'); pg.rect(43, 12, 2, 6, '#5a3a24');
  }, true);
  canvas(scene, 'cart', 32, 24, (pg) => {
    pg.rect(2, 4, 26, 12, '#a8703a'); pg.rect(2, 4, 26, 3, '#c8915a'); pg.hline(2, 27, 10, '#7a4a2a');
    pg.ellipse(8, 18, 4, 4, '#5a3a24'); pg.ellipse(8, 18, 2, 2, '#c8915a');
    pg.ellipse(22, 18, 4, 4, '#5a3a24'); pg.ellipse(22, 18, 2, 2, '#c8915a');
    pg.rect(4, 0, 6, 4, '#ffd25e'); pg.rect(12, 1, 6, 3, '#e8424a'); pg.rect(20, 0, 5, 4, '#5bbf4a');
    pg.rect(28, 8, 4, 2, '#5a3a24');
  }, true);
  canvas(scene, 'house', 64, 56, (pg) => {
    pg.rect(6, 22, 52, 32, '#f0d8b0'); pg.rect(6, 22, 52, 3, '#d8bc90');
    for (let y = 0; y < 22; y++) pg.hline(32 - y * 1.45 - 2, 32 + y * 1.45 + 1, y + 2, y % 4 === 3 ? '#a8283a' : '#d64545');
    pg.rect(27, 36, 10, 18, '#8a5a34'); pg.px(35, 45, '#ffd25e');
    pg.rect(12, 32, 10, 9, '#6cc4ff'); pg.rect(12, 36, 10, 1, '#fff7f0'); pg.vline(17, 32, 40, '#fff7f0');
    pg.rect(42, 32, 10, 9, '#6cc4ff'); pg.rect(42, 36, 10, 1, '#fff7f0'); pg.vline(47, 32, 40, '#fff7f0');
    pg.rect(11, 41, 12, 2, '#d64545'); pg.rect(41, 41, 12, 2, '#d64545');
    pg.rect(46, 4, 6, 10, '#8a6a5a');
  }, true);
  canvas(scene, 'pillar', 16, 32, (pg) => {
    pg.rect(3, 4, 10, 26, '#d0c8e0'); pg.rect(3, 4, 3, 26, '#e8e0f4'); pg.rect(10, 4, 3, 26, '#a8a0c0');
    pg.rect(1, 0, 14, 5, '#e8e0f4'); pg.rect(1, 28, 14, 4, '#a8a0c0');
  }, true);
}

// ---------------------------------------------------------------- PERSONAGENS NÃO-JOGÁVEIS / INIMIGOS
function drawCreatures(scene: Phaser.Scene): void {
  const slime = (squash: number, body: string, dark: string): Draw => (pg) => {
    pg.ellipse(8, 10 + squash, 6 + squash, 5 - squash, body);
    pg.ellipse(8, 12, 6 + squash, 2, dark);
    pg.ellipse(6, 8 + squash, 2, 1, '#ffffff');
    pg.rect(5, 9 + squash, 1, 2, '#2a1d2e'); pg.rect(10, 9 + squash, 1, 2, '#2a1d2e');
    pg.px(7, 12, '#2a1d2e'); pg.px(8, 12, '#2a1d2e');
  };
  sheet(scene, 'slime', 16, 16, [slime(0, '#7ad86a', '#4aa84a'), slime(1, '#7ad86a', '#4aa84a')]);
  sheet(scene, 'slime_storm', 16, 16, [slime(0, '#8aa8e8', '#5a78c8'), slime(1, '#8aa8e8', '#5a78c8')]);
  const crow = (up: boolean): Draw => (pg) => {
    pg.ellipse(8, 9, 4, 3, '#2a2a3a'); pg.ellipse(4, 7, 2, 2, '#2a2a3a'); pg.px(1, 7, '#ffd25e'); pg.px(2, 7, '#ffd25e'); pg.px(4, 6, '#ffffff');
    if (up) { pg.rect(7, 3, 6, 4, '#3a3a4a'); pg.px(13, 3, '#3a3a4a'); }
    else { pg.rect(7, 10, 6, 3, '#3a3a4a'); pg.px(13, 12, '#3a3a4a'); }
    pg.rect(11, 8, 3, 2, '#2a2a3a');
  };
  sheet(scene, 'crow', 16, 16, [crow(true), crow(false)]);

  const cloud = (mood: 'angry' | 'dizzy' | 'happy'): Draw => (pg) => {
    const base = mood === 'happy' ? '#ffffff' : '#8a8aa8';
    const hi = mood === 'happy' ? '#ffffff' : '#a8a8c8';
    const lo = mood === 'happy' ? '#d8e0f4' : '#6a6a88';
    pg.ellipse(32, 26, 28, 10, lo);
    pg.ellipse(18, 20, 12, 10, base); pg.ellipse(46, 20, 12, 10, base); pg.ellipse(32, 15, 15, 12, base);
    pg.ellipse(28, 10, 8, 5, hi); pg.ellipse(16, 16, 5, 3, hi);
    pg.ellipse(32, 25, 24, 8, base);
    // rosto
    if (mood === 'angry') {
      pg.rect(22, 18, 4, 5, '#2a1d2e'); pg.rect(38, 18, 4, 5, '#2a1d2e'); pg.px(23, 19, '#ffffff'); pg.px(39, 19, '#ffffff');
      pg.hline(20, 26, 16, '#2a1d2e'); pg.px(26, 17, '#2a1d2e'); pg.hline(38, 44, 16, '#2a1d2e'); pg.px(38, 17, '#2a1d2e');
      pg.hline(28, 36, 27, '#2a1d2e'); pg.px(27, 28, '#2a1d2e'); pg.px(37, 28, '#2a1d2e');
    } else if (mood === 'dizzy') {
      const x = (cx: number) => { pg.px(cx, 18, '#2a1d2e'); pg.px(cx + 2, 18, '#2a1d2e'); pg.px(cx + 1, 19, '#2a1d2e'); pg.px(cx, 20, '#2a1d2e'); pg.px(cx + 2, 20, '#2a1d2e'); };
      x(22); x(38);
      pg.ellipse(32, 27, 3, 2, '#2a1d2e');
    } else {
      pg.hline(21, 25, 19, '#2a1d2e'); pg.px(20, 20, '#2a1d2e'); pg.px(26, 20, '#2a1d2e');
      pg.hline(38, 42, 19, '#2a1d2e'); pg.px(37, 20, '#2a1d2e'); pg.px(43, 20, '#2a1d2e');
      pg.ellipse(18, 23, 2, 1, '#ff8fb1'); pg.ellipse(46, 23, 2, 1, '#ff8fb1');
      pg.hline(29, 35, 25, '#2a1d2e'); pg.hline(30, 34, 26, '#2a1d2e'); pg.hline(31, 33, 27, '#e8424a');
    }
  };
  sheet(scene, 'boss', 64, 40, [cloud('angry'), cloud('dizzy'), cloud('happy')]);

  sheet(scene, 'scrystal', 16, 24, [
    (pg) => { pg.rect(4, 20, 8, 4, '#5a5a70'); pg.strings(['...uu...', '..ucUu..', '.ucccUu.', '.ucccUu.', 'ucccUUUu', 'uccUUUUu', 'uccUUUUu', 'ucUUUUUu', '.uUUUUu.', '.uUUUUu.', '..uUUu..', '..uUUu..', '...uu...'], PAL, 4, 3); },
    (pg) => { pg.rect(4, 20, 8, 4, '#5a5a70'); pg.strings(['...uu...', '..ucUu..', '.uchcUu.', '.ukccUu.', 'ucckUUUu', 'uccUkUUu', 'uckUUkUu', 'ucUUkUUu', '.uUkUUu.', '.uUUkUu.', '..ukUu..', '..uUUu..', '...uu...'], { ...PAL, c: '#ffd6e4', u: '#ff7aa8', U: '#c94a7a' }, 4, 3); },
  ]);
}

// ---------------------------------------------------------------- EFEITOS E UI
function drawFx(scene: Phaser.Scene): void {
  strSprite(scene, 'fx_heart', ['.pp.pp.', 'phpppp.', 'pppppP.', '.pppP..', '..pP...']);
  strSprite(scene, 'fx_spark', ['..y..', '.yhy.', 'yhhhy', '.yhy.', '..y..'], PAL);
  canvas(scene, 'fx_smoke', 10, 10, (pg) => { pg.ellipse(5, 5, 4, 4, '#d8d8e4'); pg.ellipse(4, 4, 2, 2, '#ffffff'); });
  canvas(scene, 'fx_dust', 6, 6, (pg) => { pg.ellipse(3, 3, 2, 2, '#e8dcc8'); });
  canvas(scene, 'fx_rain', 2, 6, (pg) => { pg.rect(0, 0, 1, 6, '#9ce8ff'); pg.rect(1, 2, 1, 4, '#6cc4ff'); });
  canvas(scene, 'fx_leaf', 5, 4, (pg) => { pg.rect(0, 1, 4, 2, '#5bbf4a'); pg.px(4, 2, '#2f7a3a'); });
  canvas(scene, 'fx_pixel', 2, 2, (pg) => pg.rect(0, 0, 2, 2, '#ffffff'));
  canvas(scene, 'fx_slash', 28, 28, (pg) => {
    for (let a = -1.2; a <= 1.2; a += 0.02) {
      for (let rr = 9; rr <= 12; rr++) {
        const x = Math.round(14 + Math.cos(a) * rr); const y = Math.round(14 + Math.sin(a) * rr);
        pg.px(x, y, rr >= 11 ? '#ffffff' : '#bfe6ff');
      }
    }
  });
  canvas(scene, 'fx_bolt', 12, 12, (pg) => {
    pg.ellipse(6, 6, 5, 5, '#ff7aa8'); pg.ellipse(6, 6, 3, 3, '#ffd6e4'); pg.ellipse(5, 5, 1, 1, '#ffffff');
  });
  canvas(scene, 'fx_ring', 32, 32, (pg) => {
    for (let a = 0; a < Math.PI * 2; a += 0.03) { pg.px(Math.round(16 + Math.cos(a) * 14), Math.round(16 + Math.sin(a) * 14), '#ffffff'); }
  });
  canvas(scene, 'fx_target', 32, 20, (pg) => {
    for (let a = 0; a < Math.PI * 2; a += 0.03) { pg.px(Math.round(16 + Math.cos(a) * 14), Math.round(10 + Math.sin(a) * 8), '#ffd25e'); pg.px(Math.round(16 + Math.cos(a) * 13), Math.round(10 + Math.sin(a) * 7), '#f08a3a'); }
  });
  canvas(scene, 'shadow', 12, 5, (pg) => { pg.ellipse(6, 2, 5, 2, '#000000'); });
  canvas(scene, 'select', 18, 18, (pg) => {
    const c = '#ffffff';
    [[0, 0], [14, 0], [0, 14], [14, 14]].forEach(([x, y]) => {
      pg.rect(x, y, 4, 1, c); pg.rect(x, y + 3, 4, 1, c); pg.rect(x, y, 1, 4, c); pg.rect(x + 3, y, 1, 4, c);
    });
    pg.clear(1, 1, 2, 2); pg.clear(15, 1, 2, 2); pg.clear(1, 15, 2, 2); pg.clear(15, 15, 2, 2);
    pg.clear(3, 3); pg.clear(14, 3); pg.clear(3, 14); pg.clear(14, 14);
  });
  canvas(scene, 'bubble_bg', 8, 8, (pg) => { pg.rect(1, 0, 6, 8, '#fff7f0'); pg.rect(0, 1, 8, 6, '#fff7f0'); });

  // UI
  strSprite(scene, 'ui_heart', ['.rr.rr.', 'rhrrrrr', 'rrrrrrR', '.rrrrR.', '..rrR..', '...R...']);
  strSprite(scene, 'ui_heart_empty', ['.SS.SS.', 'SdddddS', 'SdddddS', '.SdddS.', '..SdS..', '...S...']);
  strSprite(scene, 'ui_star', ['....y....', '...yy....', '...yhy...', 'yyyyhyyyy', '.yyhhyyY.', '..yyyyY..', '..yyYyY..', '.yyY.YyY.', '.yY...YY.']);
  strSprite(scene, 'ui_star_empty', ['....S....', '...SS....', '...SdS...', 'SSSSdSSSS', '.SSddSSS.', '..SdddS..', '..SSdSS..', '.SSS.SSS.', '.SS...SS.']);
  strSprite(scene, 'ui_coin', ITEM_SPRITES.coin);
  strSprite(scene, 'ui_clock', ['..kkk..', '.kwwwk.', 'kwwkwwk', 'kwwkkwk', 'kwwwwwk', '.kwwwk.', '..kkk..']);
  canvas(scene, 'map_node', 20, 20, (pg) => { pg.ellipse(10, 10, 8, 8, '#fff7f0'); pg.ellipse(10, 10, 6, 6, '#ff9cc2'); pg.ellipse(8, 8, 2, 2, '#ffd6e4'); }, true);
  canvas(scene, 'map_node_locked', 20, 20, (pg) => { pg.ellipse(10, 10, 8, 8, '#8a8aa0'); pg.ellipse(10, 10, 6, 6, '#5a5a70'); pg.rect(8, 8, 4, 4, '#ffd25e'); pg.rect(9, 6, 2, 2, '#ffd25e'); }, true);
  void OUTLINE; void shade;
}

export function generateAllTextures(scene: Phaser.Scene): void {
  drawTiles(scene);
  drawItems(scene);
  drawStations(scene);
  drawWorld(scene);
  drawCreatures(scene);
  drawFx(scene);
  generateExtraTextures(scene);
  generateFoodTextures(scene);
  generateTrailTextures(scene);
  generateFarmTextures(scene);
}
