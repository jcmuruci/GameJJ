import Phaser from 'phaser';
import { TILE } from '../config';
import { T, SOLID_TILES } from './tiles';
import { TILE_VARIANTS, WATER_FRAMES, WALL_TYPES } from './TexturesTiles';
import type { BaseLevel } from '../scenes/levels/BaseLevel';
import { RAMP } from './palette';

/** Rampas da paleta (escuro → claro). */
const { dirt: D, grass: G, sand: S, water: W } = RAMP;

/** Grama de cada tipo: [cor da franja, sombra/barranco]. */
const GRASSY: Record<number, [string, string]> = {
  [T.GRASS]: [G[4], '#4f9a3e'],
  [T.GRASS_FLOWERS]: [G[4], '#4f9a3e'],
  [T.GRASS_TUFT]: [G[4], '#4f9a3e'],
  [T.TREE]: [G[4], '#4f9a3e'],
  [T.HEDGE]: [G[4], '#4f9a3e'],
  [T.FENCE]: [G[4], '#4f9a3e'],
  [T.DARK_GRASS]: [G[2], '#3a7a36'],
  [T.ROCKY_GRASS]: ['#8cbf5a', '#6a9a44'],
  [T.SHRUB_ROCK]: ['#8cbf5a', '#6a9a44'],
};
/** Chão de terra/areia, onde a grama "invade" com uma franja. */
const SOIL: Record<number, string> = { [T.PATH]: D[2], [T.SAND]: S[1] };
/** Água rasa animada (a ponte também deixa ver a água pelos lados). */
const WATERY = new Set<number>([T.WATER, T.BRIDGE]);
/** Tiles altos: projetam sombra no chão logo abaixo e à direita. */
const TALL = new Set<number>([T.STONE_WALL, T.CLIFF, T.ROCK_FACE, T.CLIMB_WALL, T.INDOOR_WALL, T.CANYON_WALL, T.HEDGE, T.TREE, T.SHRUB_ROCK]);
const SOLID = new Set<number>(SOLID_TILES);

/** Hash determinístico (x, y, k) → [0, 1). */
function hash(seed: number, x: number, y: number, k: number): number {
  let h = Math.imul(seed ^ (x * 374761393) ^ (y * 668265263) ^ (k * 2246822519), 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1103515245);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/**
 * Chão desenhado: pinta o mapa inteiro numa textura, com variações de tile, franjas de
 * grama sobre a terra, margens com espuma, sombras das paredes e buracos onde a água
 * animada (por baixo) aparece. A camada de tiles continua cuidando da colisão.
 */
export class Ground {
  private tex: Phaser.Textures.CanvasTexture;
  private ctx: CanvasRenderingContext2D;
  private src: HTMLCanvasElement;
  private wall: HTMLCanvasElement;
  private seed: number;
  private water: Phaser.GameObjects.TileSprite | null = null;

  constructor(private L: BaseLevel, private flow: [number, number] = [4, 1.5]) {
    const key = `ground_${L.scene.key}`;
    if (L.textures.exists(key)) L.textures.remove(key);
    this.tex = L.textures.createCanvas(key, L.cols * TILE, L.rows * TILE)!;
    this.ctx = this.tex.getContext();
    this.ctx.imageSmoothingEnabled = false;
    this.src = L.textures.get('tiles_v').getSourceImage() as HTMLCanvasElement;
    this.wall = L.textures.get('tiles_wall').getSourceImage() as HTMLCanvasElement;
    this.seed = [...L.info.id].reduce((a, c) => Math.imul(a ^ c.charCodeAt(0), 16777619), 2166136261);
    for (let y = 0; y < L.rows; y++) for (let x = 0; x < L.cols; x++) this.drawCell(x, y);
    this.tex.refresh();
    L.add.image(0, 0, key).setOrigin(0).setDepth(-10);
    L.layer.setVisible(false);
    this.ensureWater();
  }

  /** Um tile mudou (pedra virou ponte, poça apareceu): redesenha ele e os vizinhos. */
  refresh(tx: number, ty: number): void {
    for (let y = ty - 1; y <= ty + 1; y++) for (let x = tx - 1; x <= tx + 1; x++) {
      if (x >= 0 && y >= 0 && x < this.L.cols && y < this.L.rows) this.drawCell(x, y);
    }
    this.tex.refresh();
    this.ensureWater();
  }

  private tile(x: number, y: number, fallback: number): number {
    if (x < 0 || y < 0 || x >= this.L.cols || y >= this.L.rows) return fallback;
    return this.L.layer.getTileAt(x, y)?.index ?? fallback;
  }

  /** Água por baixo do chão: textura que troca de quadro e escorre devagar. */
  private ensureWater(): void {
    if (this.water) return;
    let any = false;
    this.L.layer.forEachTile((t) => { if (WATERY.has(t.index)) any = true; });
    if (!any) return;
    const W = this.L.cols * TILE;
    const H = this.L.rows * TILE;
    const water = this.L.add.tileSprite(0, 0, W, H, 'water_0').setOrigin(0).setDepth(-11);
    this.water = water;
    let f = 0;
    const dt = 0.22;
    this.L.time.addEvent({
      delay: dt * 1000, loop: true, callback: () => {
        f = (f + 1) % WATER_FRAMES;
        water.setTexture(`water_${f}`);
        water.tilePositionX -= this.flow[0] * dt;
        water.tilePositionY -= this.flow[1] * dt;
      },
    });
  }

  private drawCell(x: number, y: number): void {
    const c = this.ctx;
    const px = x * TILE;
    const py = y * TILE;
    const t = this.tile(x, y, 0);
    const n = (dx: number, dy: number) => this.tile(x + dx, y + dy, t);
    c.clearRect(px, py, TILE, TILE);

    // 1) o tile, numa das variações (a água fica transparente: a animada aparece por baixo)
    const wallRow = (WALL_TYPES as readonly number[]).indexOf(t);
    if (wallRow >= 0) {
      // parede em 3/4: a fileira de baixo mostra a face; as de trás, o topo
      const face = n(0, 1) !== t;
      const v = hash(this.seed, x, y, 3) < 0.6 ? 0 : 1;
      c.drawImage(this.wall, (face ? 2 : 0) * 16 + v * 16, wallRow * 16, 16, 16, px, py, 16, 16);
      const dark = 'rgba(30,20,40,0.45)';
      const lite = 'rgba(255,255,255,0.18)';
      if (!face) {
        // bordas do alto do muro onde ele termina
        if (n(-1, 0) !== t) { c.fillStyle = dark; c.fillRect(px, py, 1, 16); c.fillStyle = lite; c.fillRect(px + 1, py, 1, 16); }
        if (n(1, 0) !== t) { c.fillStyle = dark; c.fillRect(px + 15, py, 1, 16); }
        if (n(0, -1) !== t) { c.fillStyle = dark; c.fillRect(px, py, 16, 1); c.fillStyle = lite; c.fillRect(px, py + 1, 16, 1); }
      } else {
        // quina: a lateral da face escurece onde a parede acaba
        if (n(-1, 0) !== t) { c.fillStyle = dark; c.fillRect(px, py, 1, 16); }
        if (n(1, 0) !== t) { c.fillStyle = dark; c.fillRect(px + 15, py, 1, 16); }
      }
    } else if (t !== T.WATER) {
      const r = hash(this.seed, x, y, 1);
      const v = r < 0.58 ? 0 : r < 0.82 ? 1 : 2;
      c.drawImage(this.src, t * 16, Math.min(v, TILE_VARIANTS - 1) * 16, 16, 16, px, py, 16, 16);
      if (t === T.BRIDGE) { c.clearRect(px, py, 1, TILE); c.clearRect(px + 15, py, 1, TILE); }
    }

    const fill = (color: string, rx: number, ry: number, w: number, h: number) => { c.fillStyle = color; c.fillRect(px + rx, py + ry, w, h); };
    const sides: [number, number][] = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    /** Pinta uma faixa colada à borda do lado `s` (0 cima, 1 direita, 2 baixo, 3 esquerda), a `d` pixels da borda. */
    const edge = (s: number, i: number, d: number, len: number, color: string) => {
      if (s === 0) fill(color, i, d, 1, len);
      else if (s === 2) fill(color, i, 15 - d - len + 1, 1, len);
      else if (s === 3) fill(color, d, i, len, 1);
      else fill(color, 15 - d - len + 1, i, len, 1);
    };

    // 2) grama invadindo a terra / areia: franja irregular com sombrinha
    if (SOIL[t]) {
      sides.forEach(([dx, dy], s) => {
        const g = GRASSY[n(dx, dy)];
        if (!g) return;
        for (let i = 0; i < 16; i++) {
          const d = 1 + Math.floor(hash(this.seed, x * 2 + dx, y * 2 + dy, i + s * 16) * 2.6);
          edge(s, i, 0, d, g[0]);
          edge(s, i, d, 1, SOIL[t]);
        }
      });
      // cantinhos: grama na diagonal, terra nos dois lados
      ([[-1, -1, 0, 0], [1, -1, 13, 0], [1, 1, 13, 13], [-1, 1, 0, 13]] as const).forEach(([dx, dy, cx, cy]) => {
        const g = GRASSY[n(dx, dy)];
        if (!g || GRASSY[n(dx, 0)] || GRASSY[n(0, dy)]) return;
        fill(g[0], cx, cy, 3, 3);
        fill(SOIL[t], dx < 0 ? cx + 2 : cx, dy < 0 ? cy + 2 : cy, 1, 1);
      });
    }

    // 3) margens: barranco escuro do lado da terra, contorno e espuma do lado da água
    const watery = WATERY.has(t);
    if (watery && t === T.WATER) {
      sides.forEach(([dx, dy], s) => {
        const o = n(dx, dy);
        if (WATERY.has(o)) return;
        for (let i = 0; i < 16; i++) {
          edge(s, i, 0, 1, W[1]);
          if (hash(this.seed, x, y, 40 + i + s * 16) > 0.3) edge(s, i, 1 + (hash(this.seed, y, x, i + s) > 0.7 ? 1 : 0), 1, 'rgba(230,246,255,0.85)');
        }
      });
      ([[-1, -1, 0, 0], [1, -1, 14, 0], [1, 1, 14, 14], [-1, 1, 0, 14]] as const).forEach(([dx, dy, cx, cy]) => {
        if (WATERY.has(n(dx, dy)) || !WATERY.has(n(dx, 0)) || !WATERY.has(n(0, dy))) return;
        fill(W[1], cx, cy, 2, 2);
        fill('rgba(230,246,255,0.85)', dx < 0 ? cx + 1 : cx, dy < 0 ? cy + 1 : cy, 1, 1);
      });
    } else if (!watery && t !== T.RIVER_DEEP && t !== T.CHASM) {
      const bank = GRASSY[t]?.[1] ?? 'rgba(40,30,20,0.35)';
      sides.forEach(([dx, dy], s) => {
        if (n(dx, dy) !== T.WATER) return;
        for (let i = 0; i < 16; i++) edge(s, i, 0, 1, bank);
      });
    }

    // 4) sombra das paredes / árvores no chão logo abaixo (e um pouco à direita)
    if (!SOLID.has(t) || t === T.WATER) {
      if (TALL.has(n(0, -1))) {
        [0.3, 0.22, 0.14, 0.07].forEach((a, k) => fill(`rgba(20,10,30,${a})`, 0, k, 16, 1));
      } else if (TALL.has(n(-1, -1))) {
        [0.22, 0.12].forEach((a, k) => fill(`rgba(20,10,30,${a})`, 0, k, 4 - k * 2, 1));
      }
      if (TALL.has(n(-1, 0))) [0.16, 0.08].forEach((a, k) => fill(`rgba(20,10,30,${a})`, k, 0, 1, 16));
    }
  }
}
