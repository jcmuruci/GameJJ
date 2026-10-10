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
  // arco de pedras do topo do Itacolomi (a cena do pedido)
  canvas(scene, 'stone_arch', 64, 56, (pg) => {
    // arco de pedra natural: contorno irregular, face interna sombreada, rachaduras e musgo
    const cx = 32, cy = 46;
    const hash = (x: number, y: number) => ((x * 73856093) ^ (y * 19349663)) >>> 0;
    const shape = (x: number, y: number): number => {
      // devolve a posição dentro da faixa de pedra: 0 = borda de dentro, 1 = borda de fora; -1 = fora da pedra
      const yy = Math.min(y, cy);
      const flare = Math.max(0, y - cy) * 0.7; // a base alarga como pedras assentadas
      const th = Math.atan2(cy - yy, x - cx);
      const ro = 1 + 0.05 * Math.sin(3 * th + 0.7) + 0.035 * Math.sin(7 * th + 2.1) + 0.02 * Math.sin(13 * th);
      const ri = 1 + 0.07 * Math.sin(4 * th + 1.3) + 0.03 * Math.sin(9 * th + 0.4);
      const dx = Math.abs(x + 0.5 - cx);
      const oa = 31 * ro + flare, ob = 42 * ro, ia = 17 * ri - flare * 0.3, ib = 25 * ri;
      const on = Math.sqrt((dx / oa) ** 2 + ((cy - yy) / ob) ** 2);
      const inn = Math.sqrt((dx / ia) ** 2 + ((cy - yy) / ib) ** 2);
      if (on > 1 || inn < 1) return -1;
      return Math.min(1, Math.max(0, (inn - 1) / (inn - 1 + 1 - on + 1e-6)));
    };
    for (let y = 2; y < 56; y++) {
      for (let x = 0; x < 64; x++) {
        const f = shape(x, y);
        if (f < 0) continue;
        const h = hash(x, y);
        const lit = (x < cx - 6 && y < 42) || y < 12;
        let c = x > cx + 10 ? '#8a8894' : '#9c9aa6';
        if (f < 0.2) c = '#5e5c6a'; // face interna, na sombra
        else if (f < 0.33) c = '#7a7886';
        else if (f > 0.86 && lit) c = '#c2c0ca'; // borda iluminada
        else if (f > 0.72 && lit) c = '#b0aeb8';
        else if (h % 11 === 0) c = '#84828e';
        else if (h % 17 === 0) c = '#b0aeb8';
        if (y > 51 && f >= 0.2 && h % 3 !== 0) c = '#84828e'; // base mais escura, encostada no chão
        pg.px(x, y, c);
      }
    }
    // rachaduras naturais
    const crack = (pts: [number, number][]) => pts.forEach(([x, y]) => { if (shape(x, y) > 0.25) pg.px(x, y, '#5e5c6a'); });
    crack([[9, 18], [10, 19], [10, 20], [11, 21], [11, 22], [12, 23]]);
    crack([[50, 14], [51, 15], [51, 16], [52, 17], [53, 18]]);
    crack([[4, 38], [5, 39], [6, 39], [7, 40]]);
    crack([[56, 34], [57, 35], [57, 36], [58, 37], [58, 38]]);
    crack([[30, 6], [31, 7], [31, 8]]);
    // musgo e capim no alto e nas fendas
    for (let x = 0; x < 64; x++) {
      for (let y = 2; y < 56; y++) {
        if (shape(x, y) < 0) continue;
        if (y < 34 && hash(x, 7) % 3 !== 0) {
          pg.px(x, y, hash(x, 3) % 2 ? '#5f9a4a' : '#78b858');
          if (hash(x, 5) % 2 === 0 && shape(x, y + 1) > 0.5) pg.px(x, y + 1, '#5f9a4a');
          if (hash(x, 9) % 4 === 0) pg.px(x, y - 1, '#78b858');
        }
        break;
      }
    }
    [[7, 33], [8, 33], [55, 29], [56, 30], [20, 44], [44, 47]].forEach(([x, y]) => { if (shape(x, y) > 0.3) pg.px(x, y, '#6aa850'); });
  });
  canvas(scene, 'stone_seat', 14, 7, (pg) => {
    pg.ellipse(7, 3, 6, 3, '#8e8c98');
    pg.hline(4, 9, 1, '#b8b6c2'); pg.px(3, 2, '#b0aeb8');
    pg.hline(2, 11, 5, '#6e6c7a'); pg.px(10, 3, '#7a7886');
  });
  // academia de escalada indoor
  canvas(scene, 'crash_pad', 30, 10, (pg) => {
    pg.rect(0, 2, 30, 8, '#2f5a98'); pg.rect(0, 0, 30, 3, '#5a88cc');
    pg.vline(10, 2, 9, '#244a80'); pg.vline(20, 2, 9, '#244a80'); pg.hline(1, 28, 1, '#7aa4dc');
  });
  canvas(scene, 'chalk_bag', 7, 8, (pg) => {
    pg.rect(1, 2, 5, 6, '#e8424a'); pg.rect(1, 1, 5, 2, '#ffffff'); pg.px(3, 0, '#ffffff'); pg.px(2, 4, '#ff7a80');
  });
  canvas(scene, 'gym_bench', 22, 9, (pg) => {
    pg.rect(0, 1, 22, 4, '#c8915a'); pg.hline(0, 21, 1, '#e0b07a');
    pg.rect(2, 5, 2, 4, '#5a5a6a'); pg.rect(18, 5, 2, 4, '#5a5a6a');
  });
  canvas(scene, 'hold_fall', 8, 7, (pg) => {
    pg.ellipse(4, 3, 3, 3, '#ffd25e'); pg.px(3, 2, '#fff1a8'); pg.px(5, 4, '#c8a040'); pg.px(4, 3, '#8a8a8a');
  });
  // bloco de espuma da academia (empurrável, no lugar da pedra)
  canvas(scene, 'foam_block', 16, 16, (pg) => {
    pg.rect(1, 3, 14, 12, '#e8424a'); pg.rect(1, 1, 14, 4, '#ff7a80'); pg.hline(2, 13, 2, '#ffb0b4');
    pg.rect(5, 7, 6, 5, '#ffd25e'); pg.px(6, 8, '#fff1a8');
  });
  canvas(scene, 'gym_light', 24, 6, (pg) => {
    pg.rect(0, 0, 24, 3, '#5a5a6a'); pg.rect(1, 3, 22, 2, '#fff7d0');
  });
  // Topo do Mundo: rampa de decolagem e biruta
  canvas(scene, 'takeoff_ramp', 44, 24, (pg) => {
    for (let x = 0; x < 44; x++) {
      const top = Math.round(4 + (x / 43) * 12);
      pg.vline(x, top, 23, x % 6 === 0 ? '#8a5a34' : '#c8915a');
      pg.px(x, top, '#e0b07a');
    }
    pg.vline(4, 6, 23, '#5a3a24'); pg.vline(20, 11, 23, '#5a3a24'); pg.vline(38, 15, 23, '#5a3a24');
  });
  canvas(scene, 'windsock', 18, 26, (pg) => {
    pg.vline(2, 2, 25, '#8a8a96'); pg.px(2, 1, '#c8c8d0');
    for (let i = 0; i < 4; i++) pg.rect(3 + i * 3, 3 + Math.floor(i / 2), 3, 5 - Math.floor(i / 2), i % 2 ? '#ffffff' : '#f08a3a');
  });
  // plaquinha de madeira genérica (o texto vai por cima)
  canvas(scene, 'plaque', 60, 16, (pg) => {
    pg.rect(0, 0, 60, 12, '#c8915a'); pg.hline(0, 59, 0, '#e0b07a'); pg.hline(0, 59, 11, '#8a5a34');
    pg.vline(10, 12, 15, '#5a3a24'); pg.vline(49, 12, 15, '#5a3a24');
  });
  // bromélia (planta das pedras)
  canvas(scene, 'bromelia', 10, 8, (pg) => {
    [[1, 7, 3, 3], [8, 7, 6, 3], [4, 7, 3, 0], [6, 7, 5, 1], [2, 7, 4, 1]].forEach(([x0, y0, x1, y1]) => {
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
      for (let i = 0; i <= n; i++) pg.px(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), i > n - 2 ? '#78b858' : '#3f8a3e');
    });
    pg.px(5, 2, '#e8424a');
  });
  // folha do poema dobrada (com corações)
  canvas(scene, 'item_poem', 12, 13, (pg) => {
    pg.rect(1, 1, 10, 11, '#fff7e6');
    pg.rect(1, 1, 10, 1, '#f0e2c4');
    for (let y = 3; y <= 9; y += 2) pg.hline(3, y === 9 ? 6 : 9, y, '#b8a8c8');
    pg.px(8, 9, '#ff7aa8'); pg.px(10, 9, '#ff7aa8'); pg.hline(8, 10, 10, '#ff7aa8'); pg.px(9, 11, '#ff7aa8');
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
