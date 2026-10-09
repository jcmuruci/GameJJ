import Phaser from 'phaser';
import { PG, PAL } from './pixel';

/** Ingredientes e pratos das cozinhas da linha do tempo (O Italiano, Festa Junina, Roça). */

const P: Record<string, string> = {
  ...PAL,
  t: '#e8424a', T: '#a8283a', // tomate
  a: '#ffe08a', A: '#d8b050', // massa/macarrão
  q: '#ffd25e', Q: '#e0a020', // queijo
  m: '#f0d8a8', M: '#c8a070', // massa de pizza/pão
  c: '#ffd23a', C: '#c89a10', // milho
  z: '#fff7f0', Z: '#d8d8e4', // leite/branco
  f: '#8ab0c8', F: '#4a7a98', // peixe
  j: '#7a3a2a', J: '#4a2418', // feijão
  x: '#c88a3a', X: '#8a5a24', // tostado/frito
  g: '#5bbf4a', G: '#2f7a3a', // verde
};

const SPRITES: Record<string, string[]> = {
  tomato: [
    '....GgG.....',
    '...tGgGt....',
    '.tttttttt...',
    'tthtttttTt..',
    'thttttttTt..',
    'ttttttttTt..',
    'ttttttttTt..',
    '.tttttTTT...',
    '..TTTTT.....',
  ],
  tomato_cut: [
    '.ttt...ttt..',
    'tqtqt.tqtqt.',
    'tqtqt.tqtqt.',
    '.ttt...ttt..',
    '............',
    '....ttt.....',
    '...tqtqt....',
    '....ttt.....',
  ],
  pasta: [
    '..aAaAaAa...',
    '..aAaAaAa...',
    '..aAaAaAa...',
    '..BBBBBBB...',
    '..aAaAaAa...',
    '..aAaAaAa...',
    '..aAaAaAa...',
  ],
  pasta_cooked: [
    '..aa..aa....',
    '.a..aa..a...',
    'a.aa..aa.a..',
    '.a..aa..a...',
    'a.aattaa.a..',
    '.aattttaa...',
    '..atttta....',
  ],
  cheese: [
    '......qq....',
    '....qqqqq...',
    '..qqqQqqqq..',
    'qqqqqqqqqqq.',
    'qQqqqqqQqqq.',
    'qqqqqQqqqqq.',
    'QQQQQQQQQQQ.',
  ],
  cheese_cut: [
    '...q...q....',
    '.q...q...q..',
    '...qqQqq....',
    '..qQqqqQq...',
    '.qqqqQqqqq..',
    'qqQqqqqqQqq.',
  ],
  dough: [
    '...mmmmm....',
    '.mmmmmmmmm..',
    'mmhmmmmmmmM.',
    'mmmmmmmmmmM.',
    '.mmmmmmmMM..',
    '...MMMMM....',
  ],
  pizza: [
    '...xxxxx....',
    '.xxqtqqtqx..',
    'xqtqqgqqtqx.',
    'xqqqtqqgqqx.',
    'xqgqqtqqqqx.',
    '.xqqqqtqqx..',
    '...xxxxx....',
  ],
  bread: [
    '....xxxx....',
    '..xxXxxXxx..',
    '.xxxxxxxxxx.',
    'xXxxXxxXxxxX',
    '.xxxxxxxxxX.',
    '..XXXXXXXX..',
  ],
  bread_cut: [
    '.xxx..xxx...',
    'xmmmxxmmmx..',
    'xmmmxxmmmx..',
    'xmmmxxmmmx..',
    '.xxx..xxx...',
  ],
  corn: [
    '....GG......',
    '...GccG.....',
    '..GcCcG.....',
    '..GccCG.....',
    '..GcCcG.....',
    '..GccCG.....',
    '...GcG......',
    '....G.......',
  ],
  corn_cooked: [
    '..z...z.....',
    '...z.z......',
    '...cCc......',
    '..cCcCc.....',
    '..CcCcC.....',
    '..cCcCc.....',
    '..CcCcC.....',
    '...cCc......',
  ],
  milk: [
    '....SS......',
    '....zz......',
    '...zzzz.....',
    '..zzuuzz....',
    '..zuzzuz....',
    '..zzzzzz....',
    '..zzzzZz....',
    '..ZZZZZZ....',
  ],
  canjica: [
    '..zzzzzz....',
    '.zzczzczz...',
    'zzzzczzzzz..',
    'zczzzzzczz..',
    '.zzzzczzz...',
    '..BBBBBB....',
  ],
  fish: [
    '............',
    '..ffff....f.',
    '.fhfffff.ff.',
    'ffffffffff..',
    '.fFFFFFF.ff.',
    '..FFFF....F.',
  ],
  fish_cut: [
    '............',
    '..pppppp....',
    '.pphppppp...',
    '.pppppppPp..',
    '..pPPPPPP...',
  ],
  fish_grilled: [
    '............',
    '..xxxx....x.',
    '.xhXxXxx.xx.',
    'xxXxXxXxxx..',
    '.xXXXXXX.xx.',
    '..XXXX....X.',
  ],
  fish_fried: [
    '............',
    '..yyyy....y.',
    '.yhyYyyy.yy.',
    'yyYyyYyyyy..',
    '.yYYYYYY.yy.',
    '..YYYY....Y.',
  ],
  beans: [
    '....BB......',
    '...nBBn.....',
    '..nnnnnn....',
    '.nnjjjjnn...',
    '.njJjjJjn...',
    '.nnjjjjnn...',
    '..nnnnnn....',
  ],
  tropeiro: [
    '...xjxjx....',
    '.xjxgxjxx...',
    'xjxxjxxgjx..',
    'xxgjxjxjxx..',
    '.jxxjxgxj...',
    '..xxxxxx....',
  ],
  lettuce: [
    '...gggg.....',
    '.ggllggg....',
    'gglgllggg...',
    'glgllgllg...',
    'gglllllgg...',
    '.ggGGGgg....',
    '...GGG......',
  ],
  lettuce_cut: [
    '.gl...lg....',
    'glg.lgl.gl..',
    '.g.glg.lgl..',
    'lg.gl.glg...',
    '.glg.lg.g...',
  ],
};

function strSprite(scene: Phaser.Scene, key: string, rows: string[]): void {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const w = Math.max(...rows.map((r) => r.length)) + 2;
  const h = rows.length + 2;
  const tex = scene.textures.createCanvas(key, w, h)!;
  const pg = new PG(tex.getContext());
  pg.strings(rows, P, 1, 1);
  pg.outline(0, 0, w, h);
  tex.refresh();
}

function canvas(scene: Phaser.Scene, key: string, w: number, h: number, draw: (pg: PG) => void, outline = true): void {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.createCanvas(key, w, h)!;
  const ctx = tex.getContext();
  ctx.imageSmoothingEnabled = false;
  const pg = new PG(ctx);
  draw(pg);
  if (outline) pg.at(0, 0).outline(0, 0, w, h);
  tex.refresh();
}

export function generateFoodTextures(scene: Phaser.Scene): void {
  for (const [k, rows] of Object.entries(SPRITES)) strSprite(scene, `item_${k}`, rows);

  // cesta genérica sobre a bancada (o ícone do ingrediente flutua por cima)
  canvas(scene, 'src_basket', 16, 16, (pg) => {
    pg.rect(0, 0, 16, 12, '#c8915a'); pg.hline(0, 15, 0, '#e0b07a'); pg.hline(0, 15, 4, '#b07a48'); pg.hline(0, 15, 8, '#b07a48');
    pg.rect(0, 12, 16, 4, '#8a5a34'); pg.hline(0, 15, 12, '#5a3a24'); pg.hline(0, 15, 15, '#4a2a1a');
    pg.vline(0, 0, 15, '#5a3a24'); pg.vline(15, 0, 15, '#5a3a24');
    pg.ellipse(8, 7, 6, 3, '#a8703a'); pg.ellipse(8, 6, 5, 2, '#5a3a24'); pg.hline(2, 13, 9, '#8a5a34');
  }, false);

  // pier de pesca (sobre a água)
  canvas(scene, 'dock', 16, 16, (pg) => {
    pg.rect(0, 0, 16, 16, '#4aa8e8');
    pg.rect(0, 0, 16, 2, '#6cc4ff');
    pg.rect(1, 2, 14, 12, '#b07a4a');
    for (let y = 2; y < 14; y += 3) pg.hline(1, 14, y, '#7a4a2a');
    pg.rect(1, 13, 2, 3, '#5a3a24'); pg.rect(13, 13, 2, 3, '#5a3a24');
  }, false);
  canvas(scene, 'bobber', 6, 7, (pg) => { pg.rect(1, 0, 4, 3, '#e8424a'); pg.rect(1, 3, 4, 3, '#fff7f0'); });
  canvas(scene, 'rod', 16, 16, (pg) => { for (let i = 0; i < 12; i++) pg.px(2 + i, 13 - i, i < 3 ? '#5a3a24' : '#c8915a'); pg.px(14, 1, '#d8d8e4'); });

  // festa junina: fogueira grande e bandeirinhas
  canvas(scene, 'bonfire', 24, 24, (pg) => {
    for (let i = 0; i < 4; i++) { pg.rect(4 + i * 4, 10 - i, 3, 13 + i, '#8a5a34'); pg.vline(5 + i * 4, 10 - i, 22, '#a8703a'); }
    pg.rect(2, 20, 20, 3, '#5a3a24');
  });
  canvas(scene, 'bunting_j', 64, 12, (pg) => {
    for (let x = 0; x < 64; x++) pg.px(x, Math.round(1 + Math.sin((x / 64) * Math.PI) * 3), '#5a3a24');
    const cs = ['#e8424a', '#ffd25e', '#3f7fd6', '#5bbf4a', '#ff8fb1', '#f08a3a', '#b25bd6'];
    for (let i = 0; i < 10; i++) {
      const x = 2 + i * 6; const y = Math.round(2 + Math.sin(((x + 2) / 64) * Math.PI) * 3);
      for (let k = 0; k < 5; k++) pg.hline(x + Math.floor(k / 2), x + 4 - Math.floor(k / 2), y + k, cs[i % cs.length]);
    }
  }, false);
  canvas(scene, 'st_grill', 16, 16, (pg) => {
    pg.rect(1, 5, 14, 10, '#b8644a'); for (let y = 7; y < 15; y += 3) pg.hline(2, 13, y, '#8a4a3a');
    pg.rect(1, 3, 14, 3, '#3a3a48'); for (let x = 2; x < 15; x += 2) pg.vline(x, 3, 5, '#8a8aa0');
  });
  const hen = (k: number) => (pg: PG) => {
    pg.ellipse(8, 9, 5, 4, '#fff7f0'); pg.ellipse(4, 6, 2, 2, '#fff7f0'); pg.rect(3, 3, 2, 2, '#e8424a'); pg.px(1, 6, '#ffd25e'); pg.px(3, 6, '#2a1d2e');
    pg.px(3, 8, '#e8424a'); pg.rect(10, k ? 6 : 8, 4, 2, '#e8e0d0'); pg.px(7, 13, '#f08a3a'); pg.px(9, 13 - k, '#f08a3a');
  };
  {
    if (scene.textures.exists('chicken')) scene.textures.remove('chicken');
    const tex = scene.textures.createCanvas('chicken', 32, 16)!;
    const pg = new PG(tex.getContext());
    [hen(0), hen(1)].forEach((f, i) => { pg.at(i * 16, 0); f(pg); pg.outline(0, 0, 16, 16); tex.add(i, 0, i * 16, 0, 16, 16); });
    tex.refresh();
  }
  canvas(scene, 'flag_italy', 16, 20, (pg) => {
    pg.vline(2, 0, 19, '#8a5a34'); pg.rect(3, 1, 4, 8, '#2f9a4a'); pg.rect(7, 1, 4, 8, '#fff7f0'); pg.rect(11, 1, 4, 8, '#e8424a');
  });
}
