import Phaser from 'phaser';
import { PG, rng } from './pixel';

/**
 * Céu, horizonte, luz e transições: nuvens, serras e cidades ao longe, luz suave para a
 * noite, formas da íris (círculo e coração), borboletas, passarinhos e o vento nas árvores.
 */

function canvas(scene: Phaser.Scene, key: string, w: number, h: number, draw: (pg: PG, r: () => number) => void, seed = 31): void {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.createCanvas(key, w, h)!;
  const ctx = tex.getContext();
  ctx.imageSmoothingEnabled = false;
  draw(new PG(ctx), rng(seed));
  tex.refresh();
}

/** Folha com quadros lado a lado (para animações). */
function sheet(scene: Phaser.Scene, key: string, fw: number, fh: number, frames: ((pg: PG) => void)[]): void {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.createCanvas(key, fw * frames.length, fh)!;
  const ctx = tex.getContext();
  ctx.imageSmoothingEnabled = false;
  const pg = new PG(ctx);
  frames.forEach((f, i) => { pg.at(i * fw, 0); f(pg); tex.add(i, 0, i * fw, 0, fw, fh); });
  tex.refresh();
}

/** Linha de horizonte que emenda nas bordas (período = largura). */
function ridge(w: number, base: number, waves: [number, number, number][]): number[] {
  return Array.from({ length: w }, (_, x) => Math.round(base + waves.reduce((s, [amp, k, ph]) => s + amp * Math.sin((x / w) * Math.PI * 2 * k + ph), 0)));
}

/** Disco em degraus (estilo pixel): anéis com alfa decrescente. */
function softDisc(pg: PG, cx: number, cy: number, r: number, rings: number[]): void {
  const ctx = pg.ctx;
  const n = rings.length;
  for (let i = n - 1; i >= 0; i--) {
    const rr = (r * (i + 1)) / n;
    ctx.fillStyle = `rgba(255,255,255,${rings[i]})`;
    for (let y = -Math.ceil(rr); y <= Math.ceil(rr); y++) {
      const half = Math.floor(Math.sqrt(Math.max(0, rr * rr - y * y)));
      if (half <= 0) continue;
      ctx.clearRect(cx - half, cy + y, half * 2, 1);
      ctx.fillRect(cx - half, cy + y, half * 2, 1);
    }
  }
}

export function generateSkyTextures(scene: Phaser.Scene): void {
  // ---------------- nuvens
  canvas(scene, 'cloud_big', 48, 20, (pg) => {
    pg.ellipse(14, 12, 10, 6, '#ffffff'); pg.ellipse(26, 9, 11, 8, '#ffffff'); pg.ellipse(37, 12, 9, 6, '#ffffff');
    pg.rect(6, 14, 38, 4, '#ffffff');
    pg.rect(6, 17, 38, 2, '#dfe8f4'); pg.hline(10, 40, 16, '#eef3fa');
    pg.px(22, 3, '#ffffff'); pg.px(18, 6, '#f4f8fc');
  });
  /** Sombra de nuvem no chão: mancha arredondada (o alfa é dado na imagem). */
  canvas(scene, 'cloud_shadow', 64, 32, (pg) => {
    pg.ellipse(20, 17, 16, 11, '#000000'); pg.ellipse(38, 13, 18, 11, '#000000'); pg.ellipse(48, 19, 13, 9, '#000000');
  });

  // ---------------- horizonte (emenda nas bordas: rola como tileSprite)
  canvas(scene, 'far_hills', 160, 34, (pg) => {
    const back = ridge(160, 14, [[5, 1, 0.3], [3, 3, 1.1], [1.5, 7, 2]]);
    const front = ridge(160, 22, [[4, 2, 2.2], [2, 5, 0.4]]);
    for (let x = 0; x < 160; x++) {
      pg.rect(x, back[x], 1, 34 - back[x], '#9db8cf');
      pg.px(x, back[x], '#b8cede');
      pg.rect(x, front[x], 1, 34 - front[x], '#7fa489');
      pg.px(x, front[x], '#94b89a');
    }
  });
  canvas(scene, 'far_city', 160, 34, (pg, r) => {
    let x = 0;
    while (x < 160) {
      const w = Math.min(160 - x, 8 + Math.floor(r() * 12));
      const h = 10 + Math.floor(r() * 20);
      pg.rect(x, 34 - h, w, h, '#1c1c3a');
      pg.hline(x, x + w - 1, 34 - h, '#2a2a50');
      for (let wy = 34 - h + 3; wy < 32; wy += 4) for (let wx = x + 2; wx < x + w - 1; wx += 3) if (r() < 0.32) pg.px(wx, wy, r() < 0.7 ? '#ffd27a' : '#fff1c8');
      x += w + (r() < 0.4 ? 1 : 0);
    }
  }, 77);
  canvas(scene, 'far_bldgs', 160, 44, (pg, r) => {
    let x = 0;
    while (x < 160) {
      const w = Math.min(160 - x, 14 + Math.floor(r() * 14));
      const h = 18 + Math.floor(r() * 24);
      pg.rect(x, 44 - h, w, h, '#b9cbe2');
      pg.vline(x + w - 1, 44 - h, 43, '#a9bcd6');
      for (let wy = 44 - h + 4; wy < 42; wy += 5) for (let wx = x + 3; wx < x + w - 2; wx += 4) pg.rect(wx, wy, 2, 2, '#d4e2f2');
      x += w + 2 + Math.floor(r() * 4);
    }
  }, 12);

  // ---------------- luz (pincéis para a noite) e formas da íris
  // muitos anéis finos: o degradê fica suave mesmo ampliado
  canvas(scene, 'light_soft', 128, 128, (pg) => softDisc(pg, 64, 64, 64, Array.from({ length: 24 }, (_, i) => Math.pow(1 - i / 24, 1.6))));
  canvas(scene, 'light_cone', 96, 56, (pg) => {
    // facho do farol: abre para a direita, mais fraco no fim e nas bordas
    for (let x = 0; x < 96; x++) {
      const half = 3 + (x / 96) * 25;
      const a = Math.max(0.08, 1 - Math.pow(x / 96, 1.3));
      for (let y = -Math.round(half); y < Math.round(half); y++) {
        const edge = Math.abs(y + 0.5) / half;
        pg.ctx.fillStyle = `rgba(255,255,255,${(a * (edge > 0.7 ? 1 - (edge - 0.7) / 0.3 * 0.7 : 1)).toFixed(3)})`;
        pg.ctx.fillRect(x, 28 + y, 1, 1);
      }
    }
  });
  canvas(scene, 'iris_circle', 128, 128, (pg) => pg.ellipse(64, 64, 63, 63, '#ffffff'));
  canvas(scene, 'iris_heart', 128, 116, (pg) => {
    for (let y = 0; y < 116; y++) {
      for (let x = 0; x < 128; x++) {
        // coração clássico: (x² + y² - 1)³ - x² y³ <= 0
        const u = (x - 64) / 52;
        const v = -(y - 50) / 52;
        const a = u * u + v * v - 1;
        if (a * a * a - u * u * v * v * v <= 0) pg.px(x, y, '#ffffff');
      }
    }
  });

  // ---------------- bichinhos do ambiente
  sheet(scene, 'butterfly', 7, 5, [
    (pg) => { pg.rect(0, 0, 3, 2, '#ff9cc2'); pg.rect(4, 0, 3, 2, '#ff9cc2'); pg.rect(1, 2, 2, 2, '#ffd25e'); pg.rect(4, 2, 2, 2, '#ffd25e'); pg.vline(3, 0, 4, '#4a2a3a'); },
    (pg) => { pg.rect(2, 1, 1, 3, '#ff9cc2'); pg.rect(4, 1, 1, 3, '#ff9cc2'); pg.vline(3, 0, 4, '#4a2a3a'); },
  ]);
  sheet(scene, 'bird', 9, 5, [
    (pg) => { pg.px(0, 0, '#3a3248'); pg.px(1, 1, '#3a3248'); pg.px(2, 2, '#3a3248'); pg.rect(3, 2, 3, 1, '#3a3248'); pg.px(6, 1, '#3a3248'); pg.px(7, 0, '#3a3248'); pg.px(8, 0, '#3a3248'); },
    (pg) => { pg.rect(0, 2, 3, 1, '#3a3248'); pg.rect(3, 2, 3, 1, '#3a3248'); pg.rect(6, 2, 3, 1, '#3a3248'); pg.px(2, 3, '#3a3248'); pg.px(6, 3, '#3a3248'); },
  ]);
}

/** Texturas que balançam com o vento: segundo quadro com a copa 1 px para o lado. */
export const SWAY_KEYS = ['tree_big', 'tree_apple', 'tree_pink', 'tree_ipe', 'tree_jungle', 'bush'];

export function makeSwayTextures(scene: Phaser.Scene): void {
  for (const key of SWAY_KEYS) {
    if (!scene.textures.exists(key)) continue;
    const src = scene.textures.get(key).getSourceImage() as HTMLCanvasElement;
    const w = src.width;
    const h = src.height;
    const k = `${key}_sway`;
    if (scene.textures.exists(k)) scene.textures.remove(k);
    const tex = scene.textures.createCanvas(k, w, h)!;
    const ctx = tex.getContext();
    ctx.imageSmoothingEnabled = false;
    // a parte de cima da copa vai 1 px para a direita; o tronco fica
    const cut = Math.round(h * (key === 'bush' ? 0.45 : 0.4));
    ctx.drawImage(src, 0, cut, w, h - cut, 0, cut, w, h - cut);
    ctx.drawImage(src, 0, 0, w - 1, cut, 1, 0, w - 1, cut);
    tex.refresh();
  }
}
