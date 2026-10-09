import Phaser from 'phaser';
import { PG, PAL, rng } from './pixel';

/** Arte das fases inspiradas na história do casal: rapel, moto amarela, cachoeiras, restaurante e Amazônia. */

type Draw = (pg: PG, r: () => number) => void;

function canvas(scene: Phaser.Scene, key: string, w: number, h: number, draw: Draw, outline = true): void {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.createCanvas(key, w, h)!;
  const ctx = tex.getContext();
  ctx.imageSmoothingEnabled = false;
  const pg = new PG(ctx);
  draw(pg, rng(31));
  if (outline) pg.at(0, 0).outline(0, 0, w, h);
  tex.refresh();
}

function sheet(scene: Phaser.Scene, key: string, fw: number, fh: number, frames: Draw[], outline = true): void {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.createCanvas(key, fw * frames.length, fh)!;
  const ctx = tex.getContext();
  ctx.imageSmoothingEnabled = false;
  const pg = new PG(ctx);
  frames.forEach((f, i) => {
    pg.at(i * fw, 0);
    f(pg, rng(57 + i));
    if (outline) pg.outline(0, 0, fw, fh);
    tex.add(i, 0, i * fw, 0, fw, fh);
  });
  tex.refresh();
}

export function generateExtraTextures(scene: Phaser.Scene): void {
  // ---------------------------------------------------------------- cachoeira (2 quadros)
  const fall = (k: number): Draw => (pg) => {
    pg.rect(0, 0, 32, 40, '#7a7a90');
    pg.rect(0, 0, 7, 40, '#8a8aa0'); pg.rect(25, 0, 7, 40, '#6a6a80');
    pg.rect(0, 0, 32, 3, '#5bbf4a'); pg.rect(2, 3, 4, 2, '#3f9a48'); pg.rect(26, 3, 4, 2, '#3f9a48');
    pg.rect(7, 0, 18, 40, '#4aa8e8');
    for (let i = 0; i < 9; i++) {
      const x = 8 + ((i * 5 + k * 3) % 16);
      const y = (i * 7 + k * 4) % 34;
      pg.vline(x, y, y + 5, '#bfe9ff');
    }
    pg.vline(9, 0, 39, '#8fd8ff'); pg.vline(22, 0, 39, '#3a8ad0');
    pg.ellipse(16, 43, 14, 4, '#ffffff'); pg.ellipse(16, 43, 10, 2, '#e0f6ff');
    pg.px(5 + k * 2, 41, '#ffffff'); pg.px(26 - k * 2, 42, '#ffffff');
  };
  sheet(scene, 'waterfall', 32, 48, [fall(0), fall(1)]);

  // ---------------------------------------------------------------- Pedra Grande + rapel
  canvas(scene, 'big_rock', 72, 56, (pg) => {
    pg.ellipse(36, 34, 34, 22, '#7a7a8a');
    pg.ellipse(34, 30, 31, 20, '#9a9aaa');
    pg.ellipse(28, 22, 18, 11, '#b4b4c4');
    pg.ellipse(22, 17, 7, 4, '#d0d0dc');
    pg.rect(4, 44, 64, 10, '#7a7a8a');
    pg.ellipse(14, 47, 8, 3, '#4a9a3a'); pg.ellipse(56, 46, 9, 3, '#4a9a3a');
    for (const [x, y] of [[44, 26], [50, 34], [40, 40], [20, 36]]) pg.hline(x, x + 5, y, '#6a6a7a');
    // corda de rapel descendo
    pg.vline(46, 10, 50, '#e8424a'); pg.px(45, 10, '#e8424a'); pg.px(47, 10, '#ffd25e');
  });
  canvas(scene, 'anchor', 16, 16, (pg) => {
    pg.ellipse(8, 11, 6, 3, '#6a6a80'); pg.ellipse(8, 10, 4, 2, '#a8a8b8');
    pg.ellipse(8, 6, 3, 3, '#d8d8e4'); pg.ellipse(8, 6, 1, 1, '#6a6a80');
    pg.ellipse(4, 12, 3, 2, '#e8424a'); pg.ellipse(4, 12, 1, 1, '#a8283a');
  });
  canvas(scene, 'rope_top', 16, 16, (pg) => {
    pg.rect(6, 0, 4, 3, '#a8a8b8'); pg.vline(8, 2, 15, '#e8424a'); pg.vline(9, 3, 15, '#a8283a');
  }, false);

  // ---------------------------------------------------------------- moto amarela (vista lateral)
  canvas(scene, 'moto', 40, 24, (pg) => {
    const wheel = (cx: number) => { pg.ellipse(cx, 18, 5, 5, '#2a2a34'); pg.ellipse(cx, 18, 2, 2, '#a8a8b8'); };
    wheel(8); wheel(32);
    pg.rect(8, 12, 24, 3, '#5a5a6a');                // chassi
    pg.ellipse(20, 10, 10, 4, '#ffd23a');              // tanque/carenagem
    pg.rect(10, 9, 22, 4, '#ffd23a');
    pg.rect(10, 8, 12, 2, '#3a3a48');                  // banco
    pg.rect(26, 6, 6, 6, '#ffd23a'); pg.rect(29, 3, 2, 4, '#5a5a6a'); pg.rect(27, 3, 6, 1, '#2a2a34'); // guidão
    pg.ellipse(34, 9, 2, 2, '#fff1a8');                // farol
    pg.rect(12, 10, 14, 1, '#fff4a0');                 // brilho
    pg.rect(2, 13, 7, 2, '#a8a8b8');                   // escapamento
    pg.rect(4, 9, 6, 3, '#ffd23a'); pg.rect(4, 9, 6, 1, '#e0a820'); // rabeta
  });
  canvas(scene, 'moto_map', 24, 14, (pg) => {
    pg.ellipse(5, 11, 3, 3, '#2a2a34'); pg.ellipse(19, 11, 3, 3, '#2a2a34');
    pg.rect(5, 6, 14, 4, '#ffd23a'); pg.rect(16, 3, 4, 4, '#ffd23a'); pg.rect(6, 5, 8, 2, '#3a3a48'); pg.px(21, 6, '#fff1a8');
  });
  canvas(scene, 'pothole', 22, 10, (pg) => {
    pg.ellipse(11, 5, 10, 4, '#4a4048'); pg.ellipse(11, 5, 8, 3, '#2a2228'); pg.ellipse(9, 4, 3, 1, '#3a3238');
  }, false);
  canvas(scene, 'cone', 10, 12, (pg) => {
    pg.rect(0, 10, 10, 2, '#e8642a');
    for (let y = 0; y < 10; y++) pg.hline(5 - Math.floor(y / 2.2), 4 + Math.floor(y / 2.2), y, y >= 4 && y <= 6 ? '#ffffff' : '#f08a3a');
  });
  const capi = (k: number): Draw => (pg) => {
    pg.ellipse(11, 8, 9, 5, '#a8703a'); pg.ellipse(10, 6, 7, 3, '#c08850');
    pg.ellipse(19, 6, 3, 3, '#a8703a'); pg.rect(20, 5, 3, 3, '#8a5a34'); pg.px(22, 5, '#2a1d2e');
    pg.px(18, 4, '#2a1d2e'); pg.px(16, 3, '#8a5a34');
    pg.rect(5 + k, 12, 2, 2, '#7a4a2a'); pg.rect(14 - k, 12, 2, 2, '#7a4a2a');
  };
  sheet(scene, 'capybara', 24, 15, [capi(0), capi(1)]);
  canvas(scene, 'tree_ipe', 32, 40, (pg) => {
    pg.rect(13, 26, 6, 12, '#7a4a2a'); pg.rect(13, 26, 2, 12, '#a8703a'); pg.rect(11, 36, 10, 2, '#5a3a24');
    pg.ellipse(16, 14, 14, 12, '#d8a020'); pg.ellipse(15, 13, 12, 10, '#ffd23a'); pg.ellipse(12, 9, 6, 4, '#fff1a8');
    pg.px(6, 16, '#fff7d0'); pg.px(24, 10, '#fff7d0'); pg.px(18, 20, '#fff7d0');
  });
  canvas(scene, 'photo_spot', 16, 20, (pg) => {
    pg.rect(7, 10, 2, 10, '#5a3a24'); pg.rect(1, 1, 14, 10, '#fff4e0'); pg.rect(1, 10, 14, 1, '#c8a878');
    pg.rect(4, 4, 8, 5, '#3a3a48'); pg.rect(6, 3, 3, 1, '#3a3a48'); pg.ellipse(8, 6, 1, 1, '#6cc4ff'); pg.px(11, 4, '#ff7aa8');
  });
  canvas(scene, 'road_dash', 32, 4, (pg) => { pg.rect(0, 1, 14, 2, '#fff4e0'); }, false);
  canvas(scene, 'sun', 40, 40, (pg) => { pg.ellipse(20, 20, 18, 18, '#ffb86a'); pg.ellipse(20, 20, 14, 14, '#ffd25e'); pg.ellipse(16, 15, 4, 3, '#fff1a8'); }, false);

  // ---------------------------------------------------------------- restaurante
  canvas(scene, 'table', 24, 20, (pg) => {
    pg.rect(1, 2, 4, 14, '#8a5a34'); pg.rect(19, 2, 4, 14, '#8a5a34');
    pg.ellipse(12, 9, 9, 5, '#fff7f0'); pg.ellipse(12, 10, 9, 5, '#e8424a'); pg.ellipse(12, 8, 8, 4, '#fff7f0');
    pg.rect(11, 3, 2, 4, '#fff4e0'); pg.px(11, 2, '#ffd25e'); pg.px(12, 1, '#ffb86a');
    pg.ellipse(8, 9, 2, 1, '#d8d8e4'); pg.ellipse(16, 9, 2, 1, '#d8d8e4');
  });

  // ---------------------------------------------------------------- Amazônia
  canvas(scene, 'tree_jungle', 32, 42, (pg) => {
    pg.rect(13, 26, 6, 14, '#5a3a24'); pg.rect(13, 26, 2, 14, '#7a4a2a'); pg.rect(10, 38, 12, 2, '#3a2a1a');
    pg.ellipse(16, 14, 15, 12, '#1f5a2a'); pg.ellipse(15, 12, 13, 10, '#2f7a3a'); pg.ellipse(11, 8, 6, 4, '#4aa84a');
    pg.vline(6, 18, 30, '#3f8a3e'); pg.vline(25, 20, 33, '#3f8a3e'); pg.px(25, 33, '#ff7aa8'); pg.px(6, 30, '#ffd25e');
  });
  canvas(scene, 'vines', 16, 16, (pg, r) => {
    for (let i = 0; i < 6; i++) {
      const x = 1 + i * 3 - 1 + Math.floor(r() * 2);
      pg.vline(x, 0, 11 + Math.floor(r() * 5), i % 2 ? '#2f7a3a' : '#3f9a48');
      pg.px(x + 1, 4 + Math.floor(r() * 8), '#6cc85a');
    }
    pg.px(4, 9, '#ff7aa8'); pg.px(11, 6, '#ffd25e');
  });
  canvas(scene, 'lily', 12, 8, (pg) => {
    pg.ellipse(6, 4, 5, 3, '#3f9a48'); pg.ellipse(6, 4, 4, 2, '#5bbf4a'); pg.px(6, 4, '#3f9a48'); pg.px(7, 4, '#4aa8e8');
    pg.px(4, 3, '#ff8fb1'); pg.px(3, 3, '#ffd6e4');
  }, false);
  const gator = (k: number): Draw => (pg) => {
    pg.ellipse(8, 8, 7, 4, '#3f7a34');
    pg.ellipse(8, 8, 5, 2, '#5a9a44');
    pg.rect(0, 7, 3, 3, '#3f7a34'); pg.rect(13, 7, 3, 2, '#2f5a2a'); pg.px(15, 9, '#2f5a2a');
    pg.px(3, 6, k ? '#3f7a34' : '#ffd25e'); pg.px(3, 10, k ? '#3f7a34' : '#ffd25e');
    for (let x = 5; x < 12; x += 2) { pg.px(x, 5, '#2f5a2a'); pg.px(x, 11, '#2f5a2a'); }
    pg.px(1, 7, '#2a1d2e');
  };
  sheet(scene, 'gator', 16, 16, [gator(0), gator(1)]);
  canvas(scene, 'bubbles', 16, 16, (pg) => {
    pg.ellipse(5, 9, 2, 2, '#bfe9ff'); pg.ellipse(10, 6, 1, 1, '#bfe9ff'); pg.ellipse(11, 11, 1, 1, '#e0f6ff');
    pg.px(4, 8, '#ffffff'); pg.px(3, 5, '#ffd25e'); pg.px(5, 5, '#ffd25e');
  }, false);
  canvas(scene, 'item_baby', 14, 10, (pg) => {
    pg.strings([
      '..ggggg.....',
      '.gyGgGggg...',
      'ggggggggGgg.',
      '.lllllllgG.g',
      '..g.g..g.g..',
    ], { ...PAL, g: '#5a9a44', G: '#3f7a34', l: '#bfe090', y: '#ffd25e' }, 1, 2);
  });
  canvas(scene, 'nest', 40, 30, (pg) => {
    pg.ellipse(20, 20, 18, 9, '#8a5a34'); pg.ellipse(20, 19, 15, 7, '#a8703a'); pg.ellipse(20, 19, 11, 5, '#5a3a24');
    for (let i = 0; i < 10; i++) pg.hline(4 + i * 3, 7 + i * 3, 14 + (i % 3), '#c8915a');
    // mamãe jacaré (cabeça grande)
    pg.ellipse(20, 10, 9, 6, '#3f7a34'); pg.ellipse(20, 11, 7, 4, '#5a9a44'); pg.rect(12, 9, 16, 4, '#3f7a34');
    pg.ellipse(15, 6, 2, 2, '#ffffff'); pg.ellipse(25, 6, 2, 2, '#ffffff'); pg.px(15, 6, '#2a1d2e'); pg.px(25, 6, '#2a1d2e');
    pg.hline(14, 26, 13, '#2f5a2a'); pg.px(16, 14, '#ffffff'); pg.px(24, 14, '#ffffff');
    pg.ellipse(11, 9, 1, 1, '#ff8fb1'); pg.ellipse(29, 9, 1, 1, '#ff8fb1');
    pg.px(20, 1, '#ff7aa8'); pg.px(19, 2, '#ff7aa8'); pg.px(21, 2, '#ff7aa8');
  });
  canvas(scene, 'canoe', 34, 16, (pg) => {
    pg.ellipse(17, 9, 16, 5, '#8a5a34'); pg.ellipse(17, 8, 14, 3, '#5a3a24'); pg.rect(3, 6, 28, 2, '#a8703a');
    pg.vline(24, 0, 9, '#c8915a'); pg.rect(23, 0, 3, 2, '#e8c890');
  });
  const mosq = (k: number): Draw => (pg) => {
    pg.ellipse(6, 7, 3, 2, '#5a5a6a'); pg.px(2, 7, '#e8424a'); pg.px(1, 8, '#e8424a');
    pg.ellipse(6, k ? 3 : 4, 3, 2, '#d8f0ff'); pg.ellipse(9, k ? 4 : 3, 2, 2, '#c8e8f8');
    pg.px(4, 6, '#ffffff'); pg.px(5, 10, '#3a3a48'); pg.px(8, 10, '#3a3a48');
  };
  sheet(scene, 'mosquito', 12, 12, [mosq(0), mosq(1)]);
  canvas(scene, 'macaw', 10, 8, (pg) => {
    pg.rect(2, 3, 5, 3, '#e8424a'); pg.rect(0, 3, 3, 2, '#e8424a'); pg.rect(6, 1, 3, 3, '#5aa8f0'); pg.rect(6, 4, 4, 2, '#ffd25e'); pg.px(1, 3, '#2a1d2e');
  });
}
