import type Phaser from 'phaser';
import { hexToRgb } from './pixel';

/**
 * Paleta do jogo: rampas de cor do escuro para o claro. As pontas mudam de tom
 * (sombra puxando para o azul/roxo, luz puxando para o amarelo), como em pixel art.
 * Texturas novas devem tirar as cores daqui.
 */
export const RAMP = {
  grass: ['#2a5a3a', '#3f8a3e', '#4f9a4a', '#62b048', '#7ccf5a', '#9be070', '#d2f08a'],
  dirt: ['#5e4434', '#8a6a44', '#b88c58', '#c49a64', '#d8b07a', '#e8c890', '#f4e0b0'],
  sand: ['#a88a68', '#d4b47a', '#d8bc80', '#e4c88c', '#f0d8a0', '#f8ead0'],
  water: ['#1b3f6e', '#2f78b0', '#3f98d8', '#4aa8e8', '#6cc4ff', '#8fd8ff', '#e6f6ff'],
  wood: ['#4a2e24', '#6a4424', '#a8703a', '#c8915a', '#d0a06a', '#e8c090'],
  stone: ['#3e3e58', '#5a5a70', '#8a8aa0', '#aaaac0', '#c8c8dc'],
  granite: ['#5e5a62', '#76726f', '#8e8a88', '#9a9690', '#b8b4b0', '#cac6c2', '#e0dcd0'],
  canyon: ['#3e3030', '#5e4838', '#6e5644', '#9a7c60', '#b08e6c', '#c8aa88'],
  skyDay: ['#74c0ee', '#84c8f0', '#94d2f4', '#a6dcf6', '#b8e4f8', '#cdeffb'],
  skyDusk: ['#5a4a8a', '#8a5a8a', '#d8788a', '#f0a070', '#f8c890'],
  night: ['#080818', '#0c0e2c', '#12143a', '#181a46', '#1e2254', '#262a62'],
} as const;

export type RampName = keyof typeof RAMP;

/** Cor da rampa; índices negativos contam do fim (-1 = a mais clara). */
export function ramp(name: RampName, i: number): string {
  const r = RAMP[name];
  return r[(i % r.length + r.length) % r.length];
}

/** Matriz de Bayer 4x4: o padrão de pontilhado ordenado clássico. */
const BAYER4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

/** Escolhe entre duas cores num pixel, para misturar `t` (0..1) de `b` sobre `a` com pontilhado. */
export function ditherPick(x: number, y: number, t: number): boolean {
  return t * 16 > BAYER4[y & 3][x & 3] + 0.5;
}

/**
 * Degradê vertical pontilhado (sem faixas duras): as cores vão de cima para baixo e,
 * entre uma e outra, os pixels se misturam no padrão de Bayer.
 */
export function ditherGradient(ctx: CanvasRenderingContext2D, x0: number, y0: number, w: number, h: number, colors: readonly string[]): void {
  const rgb = colors.map(hexToRgb);
  const img = ctx.createImageData(w, h);
  const d = img.data;
  const n = rgb.length - 1;
  for (let y = 0; y < h; y++) {
    const t = h > 1 ? (y / (h - 1)) * n : 0;
    const i = Math.min(n - 1, Math.floor(t));
    const f = n > 0 ? t - i : 0;
    for (let x = 0; x < w; x++) {
      const c = n > 0 && ditherPick(x, y, f) ? rgb[i + 1] : rgb[Math.max(0, i)];
      const k = (y * w + x) * 4;
      d[k] = c[0]; d[k + 1] = c[1]; d[k + 2] = c[2]; d[k + 3] = 255;
    }
  }
  ctx.putImageData(img, x0, y0);
}

/** Textura de céu (ou qualquer faixa) com degradê pontilhado. */
export function gradientTexture(scene: Phaser.Scene, key: string, w: number, h: number, colors: readonly string[]): string {
  if (scene.textures.exists(key)) return key;
  const tex = scene.textures.createCanvas(key, w, h)!;
  ditherGradient(tex.getContext(), 0, 0, w, h, colors);
  tex.refresh();
  return key;
}
