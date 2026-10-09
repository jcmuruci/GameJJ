import Phaser from 'phaser';
import { PG, shade } from './pixel';

/** Arte das trilhas da linha do tempo: escalada, cânion, Lavras Novas, Itacolomi, Topo do Mundo. */

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

export const HOUSE_COLORS = ['#ff8fb1', '#ffd25e', '#6cc4ff', '#8be07a', '#c8a0f0', '#f4a261'];

export function generateTrailTextures(scene: Phaser.Scene): void {
  // agarras coloridas sobre a parede de escalada
  canvas(scene, 'holds', 16, 16, (pg) => {
    [[3, 3, '#e8424a'], [11, 5, '#ffd25e'], [5, 10, '#3f7fd6'], [12, 12, '#5bbf4a'], [8, 7, '#ff8fb1']].forEach(([x, y, c]) => {
      pg.rect(x as number, y as number, 2, 2, c as string); pg.px((x as number) + 1, (y as number) + 1, shade(c as string, -0.35));
    });
    pg.vline(8, 0, 15, '#e8424a'); pg.vline(9, 0, 15, '#a8283a');
  }, false);
  canvas(scene, 'item_carabiner', 10, 12, (pg) => {
    pg.rect(2, 1, 6, 1, '#ffd25e'); pg.rect(2, 10, 6, 1, '#ffd25e'); pg.vline(1, 2, 9, '#ffd25e'); pg.vline(8, 2, 9, '#e0a020');
    pg.px(2, 2, '#fff1a8'); pg.vline(8, 4, 6, '#a8a8b8');
  });
  canvas(scene, 'item_flower', 11, 11, (pg) => {
    pg.vline(5, 6, 10, '#3f9a48'); pg.px(4, 8, '#5bbf4a');
    [[5, 2], [3, 4], [7, 4], [4, 6], [6, 6]].forEach(([x, y]) => pg.ellipse(x, y, 1, 1, '#ff8fb1'));
    pg.px(5, 4, '#ffd25e');
  });
  canvas(scene, 'paraglider', 28, 22, (pg) => {
    const cs = ['#e8424a', '#ffd25e', '#3f7fd6', '#5bbf4a', '#ff8fb1', '#f08a3a', '#b25bd6'];
    for (let i = 0; i < 26; i++) {
      const y = Math.round(5 - Math.sin((i / 25) * Math.PI) * 4);
      pg.rect(1 + i, y, 1, 4, cs[Math.floor(i / 4) % cs.length]);
    }
    for (let i = 0; i < 4; i++) { const sx = 3 + i * 7; for (let k = 0; k < 10; k++) pg.px(Math.round(sx + (14 - sx) * (k / 10)), 9 + k, '#d8d8e4'); }
    pg.rect(12, 18, 4, 3, '#3a3a48'); pg.px(13, 17, '#f0c2a2');
  });
  canvas(scene, 'itacolomi', 56, 64, (pg) => {
    // a "pedra" e o "menino" no alto do pico
    pg.rect(4, 52, 48, 12, '#6a6a7a');
    pg.ellipse(22, 34, 14, 26, '#8a8a9a'); pg.ellipse(20, 30, 10, 22, '#a8a8b8'); pg.ellipse(17, 18, 4, 8, '#c8c8d4');
    pg.ellipse(42, 44, 8, 14, '#8a8a9a'); pg.ellipse(41, 41, 6, 10, '#a8a8b8');
    pg.ellipse(14, 56, 8, 3, '#4a9a3a'); pg.ellipse(44, 57, 9, 3, '#4a9a3a');
    for (const [x, y] of [[26, 28], [22, 44], [44, 48], [16, 38]]) pg.hline(x, x + 4, y, '#6a6a7a');
  });
  canvas(scene, 'mirante', 40, 22, (pg) => {
    pg.rect(0, 12, 40, 4, '#a8703a'); pg.rect(0, 12, 40, 1, '#c8915a');
    for (let x = 1; x < 40; x += 6) pg.rect(x, 4, 2, 12, '#8a5a34');
    pg.rect(0, 4, 40, 2, '#c8915a');
    pg.rect(15, 16, 10, 6, '#5a3a24'); // banco
    pg.rect(30, 0, 4, 6, '#3a3a48'); pg.rect(29, 1, 6, 2, '#5a5a6a'); // binóculo
  });
  canvas(scene, 'big_stone', 32, 26, (pg) => {
    pg.ellipse(16, 15, 15, 10, '#7a7a8a'); pg.ellipse(14, 13, 12, 8, '#9a9aaa'); pg.ellipse(10, 9, 5, 3, '#c0c0cc');
    pg.ellipse(8, 22, 6, 2, '#4a9a3a');
  });
  canvas(scene, 'bakery', 48, 40, (pg) => {
    pg.rect(2, 12, 44, 26, '#fff4e0'); pg.rect(2, 36, 44, 2, '#c8a878');
    for (let x = 0; x < 48; x += 6) pg.rect(x, 8, 6, 6, (x / 6) % 2 ? '#fff7f0' : '#e8424a');
    pg.rect(8, 0, 32, 9, '#8a5a34'); pg.rect(10, 2, 28, 5, '#f0c890');
    pg.rect(14, 3, 8, 3, '#c88a3a'); pg.rect(26, 3, 8, 3, '#c88a3a');
    pg.rect(6, 18, 14, 12, '#6cc4ff'); pg.rect(8, 24, 10, 3, '#c88a3a'); pg.rect(28, 20, 10, 18, '#8a5a34'); pg.px(36, 29, '#ffd25e');
  });
  canvas(scene, 'condo', 48, 36, (pg) => {
    pg.rect(0, 10, 12, 26, '#d8d0c0'); pg.rect(36, 10, 12, 26, '#d8d0c0'); pg.rect(0, 6, 48, 5, '#8a8aa0');
    for (let x = 13; x < 36; x += 3) pg.vline(x, 14, 35, '#5a5a6a');
    pg.rect(12, 14, 24, 2, '#5a5a6a'); pg.rect(3, 16, 6, 6, '#6cc4ff');
    pg.rect(14, 0, 20, 6, '#3f7fd6'); pg.rect(16, 2, 16, 2, '#fff4e0');
  });
  canvas(scene, 'farmhouse', 56, 40, (pg) => {
    pg.rect(4, 14, 40, 24, '#f0e0c0'); pg.rect(4, 14, 40, 2, '#fff7f0');
    for (let y = 0; y < 13; y++) pg.hline(24 - y * 1.8 - 2, 24 + y * 1.8 + 1, y + 2, y % 3 === 2 ? '#7a4a2a' : '#a8643a');
    pg.rect(19, 24, 9, 14, '#3f7fd6'); pg.rect(8, 20, 7, 7, '#3f7fd6'); pg.rect(33, 20, 7, 7, '#3f7fd6');
    pg.ellipse(48, 34, 8, 4, '#4aa8e8'); pg.ellipse(47, 33, 5, 2, '#8fd8ff'); pg.px(46, 34, '#f08a3a');
  });
  // casinhas coloridas de Lavras Novas
  HOUSE_COLORS.forEach((wall, i) => {
    canvas(scene, `house_c${i}`, 44, 40, (pg) => {
      pg.rect(3, 16, 38, 22, wall); pg.rect(3, 16, 38, 2, shade(wall, 0.25)); pg.rect(3, 36, 38, 2, shade(wall, -0.3));
      for (let y = 0; y < 14; y++) pg.hline(22 - y * 1.6 - 1, 22 + y * 1.6, y + 3, y % 3 === 2 ? '#8a3a24' : '#b8543a');
      pg.rect(18, 24, 8, 14, '#5a3a24'); pg.rect(18, 24, 8, 2, shade(wall, -0.4)); pg.px(24, 31, '#ffd25e');
      pg.rect(7, 22, 7, 7, '#3a5a9a'); pg.rect(30, 22, 7, 7, '#3a5a9a'); pg.rect(7, 22, 7, 1, '#fff7f0'); pg.rect(30, 22, 7, 1, '#fff7f0');
      pg.vline(10, 22, 28, '#fff7f0'); pg.vline(33, 22, 28, '#fff7f0');
      pg.rect(6, 29, 9, 2, '#fff7f0'); pg.rect(29, 29, 9, 2, '#fff7f0');
      if (i % 2) { pg.ellipse(10, 32, 2, 1, '#e8424a'); pg.ellipse(34, 32, 2, 1, '#ff8fb1'); }
    });
  });
}
