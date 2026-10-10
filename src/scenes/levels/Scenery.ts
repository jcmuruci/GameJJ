import Phaser from 'phaser';
import { TILE, ZOOM, RES } from '../../config';
import type { BaseLevel } from './BaseLevel';

/**
 * Detalhes de cenário que deixam claro ONDE a cena acontece
 * (topo da pedra grande, academia de escalada, cânion, Topo do Mundo...).
 */

/** Plaquinha de madeira com texto, presa no chão do mapa. */
export function plaque(L: BaseLevel, tx: number, ty: number, text: string): void {
  const x = tx * TILE + 8;
  const y = ty * TILE + 8;
  const w = Math.max(60, text.length * 5 + 14);
  L.add.image(x, y, 'plaque').setDisplaySize(w, 16).setDepth(y + 4);
  L.add.text(x, y - 2, text, { fontFamily: 'monospace', fontSize: '7px', color: '#3a2414', fontStyle: 'bold' })
    .setOrigin(0.5).setDepth(y + 5).setResolution(ZOOM * RES + 1);
}

/** Topo arredondado da Pedra Grande: bordas que "caem", rachaduras, líquen, bromélias e uma poça. */
export function rockTop(L: BaseLevel, tx0: number, ty0: number, tx1: number, ty1: number, seed: string): void {
  const r = new Phaser.Math.RandomDataGenerator([seed]);
  const x0 = tx0 * TILE;
  const y0 = ty0 * TILE;
  const w = (tx1 - tx0 + 1) * TILE;
  const h = (ty1 - ty0 + 1) * TILE;
  const g = L.add.graphics().setDepth(-9);
  // brilho no centro (a pedra é um domo)
  g.fillStyle(0xdcd8d2, 0.12).fillEllipse(x0 + w * 0.45, y0 + h * 0.45, w * 0.8, h * 0.75);
  g.fillStyle(0xe8e4de, 0.1).fillEllipse(x0 + w * 0.4, y0 + h * 0.38, w * 0.45, h * 0.4);
  // bordas de cima e da direita escurecem: a pedra curva para baixo
  for (let x = x0; x < x0 + w; x += 4) {
    const d = 4 + Math.floor(r.frac() * 4);
    g.fillStyle(0x9a9690, 0.75).fillRect(x, y0, 4, d);
    g.fillStyle(0x86827e, 0.85).fillRect(x, y0, 4, Math.max(1, d - 3));
  }
  for (let y = y0; y < y0 + h; y += 4) {
    const d = 4 + Math.floor(r.frac() * 4);
    g.fillStyle(0x9a9690, 0.75).fillRect(x0 + w - d, y, d, 4);
    g.fillStyle(0x86827e, 0.85).fillRect(x0 + w - Math.max(1, d - 3), y, Math.max(1, d - 3), 4);
  }
  // rachaduras
  g.fillStyle(0x7e7a76, 1);
  for (let k = 0; k < 4; k++) {
    let x = x0 + 12 + r.frac() * (w - 30);
    let y = y0 + 10 + r.frac() * (h - 24);
    for (let i = 0; i < 14; i++) {
      g.fillRect(Math.round(x), Math.round(y), 1, 1);
      x += r.between(-1, 1);
      y += 1;
    }
  }
  // líquen (verde-claro e laranja)
  for (let k = 0; k < 9; k++) {
    const x = x0 + 6 + r.frac() * (w - 14);
    const y = y0 + 8 + r.frac() * (h - 14);
    const c = r.pick([0xc8c890, 0xd8a060, 0xb0b878]);
    g.fillStyle(c, 0.9).fillRect(Math.round(x), Math.round(y), 3, 2).fillRect(Math.round(x) + 1, Math.round(y) + 2, 2, 1);
  }
  // poça d'água da chuva numa cavidade
  g.fillStyle(0x7a8a98, 1).fillEllipse(x0 + w * 0.7, y0 + h * 0.62, 14, 6);
  g.fillStyle(0x9cc8e8, 1).fillEllipse(x0 + w * 0.7, y0 + h * 0.62, 12, 4);
  g.fillStyle(0xd8f0ff, 1).fillRect(Math.round(x0 + w * 0.7) - 3, Math.round(y0 + h * 0.62) - 1, 3, 1);
  // bromélias nas fendas
  for (let k = 0; k < 5; k++) {
    const x = x0 + 8 + r.frac() * (w - 16);
    const y = y0 + 10 + r.frac() * (h - 18);
    L.add.image(Math.round(x), Math.round(y), 'bromelia').setDepth(y - 2);
  }
}

/** Sombra que o paredão projeta no chão logo abaixo (dá a sensação de altura). */
export function cliffShadow(L: BaseLevel, ty: number, tx0: number, tx1: number): void {
  const g = L.add.graphics().setDepth(-9);
  const y = (ty + 1) * TILE;
  g.fillStyle(0x000000, 0.22).fillRect(tx0 * TILE, y, (tx1 - tx0 + 1) * TILE, 5);
  g.fillStyle(0x000000, 0.1).fillRect(tx0 * TILE, y + 5, (tx1 - tx0 + 1) * TILE, 4);
}

/**
 * Espalha enfeites (sem colisão) pelos tiles de chão '.' do mapa, longe de objetos.
 * `keys` são texturas; `density` é a chance por tile.
 */
export function scatter(L: BaseLevel, rows: string[], keys: string[], density: number, seed: string, floorChars = '.'): void {
  const r = new Phaser.Math.RandomDataGenerator([seed]);
  const free = (x: number, y: number) => floorChars.includes(rows[y]?.[x] ?? '#');
  for (let y = 1; y < rows.length - 1; y++) {
    for (let x = 1; x < rows[y].length - 1; x++) {
      if (!free(x, y) || r.frac() > density) continue;
      // nada colado em objetos ou paredes
      if (!free(x - 1, y) || !free(x + 1, y) || !free(x, y - 1) || !free(x, y + 1)) continue;
      const px = x * TILE + 3 + r.between(0, 10);
      const py = y * TILE + 4 + r.between(0, 8);
      L.add.image(px, py, r.pick(keys)).setDepth(py - 8).setAlpha(0.95);
    }
  }
}
