/** Utilitários de pixel art procedural (desenho em canvas). */

export const OUTLINE = '#2a1d2e';

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex(r: number, g: number, b: number): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** amt > 0 clareia, amt < 0 escurece (-1..1). */
export function shade(hex: string, amt: number): string {
  const [r, g, b] = hexToRgb(hex);
  if (amt >= 0) return rgbToHex(r + (255 - r) * amt, g + (255 - g) * amt, b + (255 - b) * amt);
  return rgbToHex(r * (1 + amt), g * (1 + amt), b * (1 + amt));
}

export function mix(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return rgbToHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}

export function hexNum(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
}

/** "Pincel" de pixels com origem deslocável. */
export class PG {
  ox = 0;
  oy = 0;
  constructor(public ctx: CanvasRenderingContext2D) {}

  at(ox: number, oy: number): this {
    this.ox = ox;
    this.oy = oy;
    return this;
  }

  px(x: number, y: number, c: string): void {
    this.ctx.fillStyle = c;
    this.ctx.fillRect(Math.round(this.ox + x), Math.round(this.oy + y), 1, 1);
  }

  rect(x: number, y: number, w: number, h: number, c: string): void {
    if (w <= 0 || h <= 0) return;
    this.ctx.fillStyle = c;
    this.ctx.fillRect(Math.round(this.ox + x), Math.round(this.oy + y), Math.round(w), Math.round(h));
  }

  hline(x1: number, x2: number, y: number, c: string): void {
    x1 = Math.round(x1); x2 = Math.round(x2);
    this.rect(Math.min(x1, x2), y, Math.abs(x2 - x1) + 1, 1, c);
  }

  vline(x: number, y1: number, y2: number, c: string): void {
    this.rect(x, Math.min(y1, y2), 1, Math.abs(y2 - y1) + 1, c);
  }

  clear(x: number, y: number, w = 1, h = 1): void {
    this.ctx.clearRect(this.ox + x, this.oy + y, w, h);
  }

  /** Círculo/elipse preenchido em pixels. */
  ellipse(cx: number, cy: number, rx: number, ry: number, c: string): void {
    for (let y = -ry; y <= ry; y++) {
      for (let x = -rx; x <= rx; x++) {
        if ((x * x) / (rx * rx + 0.3) + (y * y) / (ry * ry + 0.3) <= 1) this.px(cx + x, cy + y, c);
      }
    }
  }

  /** Desenha a partir de linhas de texto: cada caractere é uma cor da paleta ('.' = vazio). */
  strings(rows: string[], pal: Record<string, string>, x = 0, y = 0, flip = false): void {
    rows.forEach((row, j) => {
      const w = row.length;
      for (let i = 0; i < w; i++) {
        const ch = row[flip ? w - 1 - i : i];
        if (ch === '.' || ch === ' ') continue;
        const c = pal[ch];
        if (c) this.px(x + i, y + j, c);
      }
    });
  }

  /** Contorno de 1px ao redor dos pixels opacos dentro da área. */
  outline(x: number, y: number, w: number, h: number, color = OUTLINE, diagonal = false): void {
    const ctx = this.ctx;
    const X = this.ox + x;
    const Y = this.oy + y;
    const img = ctx.getImageData(X, Y, w, h);
    const d = img.data;
    const solid = (i: number, j: number) => i >= 0 && j >= 0 && i < w && j < h && d[(j * w + i) * 4 + 3] > 40;
    const marks: number[] = [];
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        if (solid(i, j)) continue;
        let n = solid(i - 1, j) || solid(i + 1, j) || solid(i, j - 1) || solid(i, j + 1);
        if (!n && diagonal) n = solid(i - 1, j - 1) || solid(i + 1, j - 1) || solid(i - 1, j + 1) || solid(i + 1, j + 1);
        if (n) marks.push(i, j);
      }
    }
    const [r, g, b] = hexToRgb(color);
    for (let k = 0; k < marks.length; k += 2) {
      const p = (marks[k + 1] * w + marks[k]) * 4;
      d[p] = r; d[p + 1] = g; d[p + 2] = b; d[p + 3] = 255;
    }
    ctx.putImageData(img, X, Y);
  }
}

/** Gerador pseudoaleatório determinístico (mesma arte a cada execução). */
export function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Paleta comum para sprites desenhados com strings. */
export const PAL: Record<string, string> = {
  k: OUTLINE,
  w: '#fff7f0',
  r: '#e8424a',
  R: '#a8283a',
  p: '#ff8fb1',
  P: '#d4507a',
  g: '#5bbf4a',
  G: '#2f7a3a',
  l: '#9be070',
  b: '#8a5a34',
  B: '#5a3a24',
  n: '#d6a46a',
  N: '#f0c890',
  y: '#ffd25e',
  Y: '#f08a3a',
  u: '#5aa8f0',
  U: '#2f5fa8',
  c: '#9ce8ff',
  v: '#b25bd6',
  V: '#6a3a9a',
  i: '#5a4ab0',
  s: '#a8a8b8',
  S: '#5a5a6a',
  e: '#d8d8e4',
  d: '#3a3a48',
  m: '#f0e0c8',
  o: '#c86a2a',
  h: '#ffffff',
};
