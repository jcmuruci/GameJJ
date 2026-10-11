import Phaser from 'phaser';

type Radius = number | { tl?: number; tr?: number; bl?: number; br?: number };
type Pt = { x: number; y: number };

/** Inset de cada degrau do canto (de fora para dentro), em múltiplos do passo. */
function steps(r: number, s: number): number[] {
  const n = Math.max(0, Math.round(r / s));
  const out: number[] = [];
  for (let k = 0; k < n; k++) {
    const dy = r - (k + 0.5) * s;
    const inset = r - Math.sqrt(Math.max(0, r * r - dy * dy));
    out.push(Math.round(inset / s) * s);
  }
  return out;
}

/**
 * Contorno de um retângulo com cantos em "escadinha" (como pixel art), no sentido horário.
 * Degraus de 2 px (o tamanho de um pixel da arte com o zoom do mundo) ou 1 px em raios pequenos.
 */
export function steppedRect(x: number, y: number, w: number, h: number, radius: Radius): Pt[] {
  const max = Math.min(w, h) / 2;
  const rad = (v: number | undefined) => Phaser.Math.Clamp(v ?? 0, 0, max);
  const R = typeof radius === 'number' ? { tl: radius, tr: radius, bl: radius, br: radius } : radius;
  const [tl, tr, br, bl] = [rad(R.tl), rad(R.tr), rad(R.br), rad(R.bl)];
  const pts: Pt[] = [];
  const corner = (r: number, f: (inset: number, k: number, s: number) => void, reverse: boolean) => {
    const s = r >= 6 ? 2 : 1;
    const ins = steps(r, s);
    const ks = ins.map((_, k) => k);
    if (reverse) ks.reverse();
    for (const k of ks) f(ins[k], k, s);
  };
  // cima-esquerda: subindo pela borda esquerda
  if (tl > 0) corner(tl, (i, k, s) => { pts.push({ x: x + i, y: y + (k + 1) * s }, { x: x + i, y: y + k * s }); }, true);
  else pts.push({ x, y });
  // cima-direita: descendo pela borda direita
  if (tr > 0) corner(tr, (i, k, s) => { pts.push({ x: x + w - i, y: y + k * s }, { x: x + w - i, y: y + (k + 1) * s }); }, false);
  else pts.push({ x: x + w, y });
  // baixo-direita
  if (br > 0) corner(br, (i, k, s) => { pts.push({ x: x + w - i, y: y + h - (k + 1) * s }, { x: x + w - i, y: y + h - k * s }); }, true);
  else pts.push({ x: x + w, y: y + h });
  // baixo-esquerda: subindo
  if (bl > 0) corner(bl, (i, k, s) => { pts.push({ x: x + i, y: y + h - k * s }, { x: x + i, y: y + h - (k + 1) * s }); }, false);
  else pts.push({ x, y: y + h });
  // remove pontos repetidos (degraus sem recuo)
  return pts.filter((p, i) => {
    const q = pts[(i + pts.length - 1) % pts.length];
    return p.x !== q.x || p.y !== q.y;
  });
}

/**
 * Todo painel arredondado do jogo (HUD, botões, balões, diálogos) passa a ter cantos
 * em degraus, no mesmo estilo pixel da arte, sem precisar mudar cada chamada.
 */
export function installPixelCorners(): void {
  const proto = Phaser.GameObjects.Graphics.prototype as unknown as {
    fillRoundedRect: (x: number, y: number, w: number, h: number, r?: Radius) => Phaser.GameObjects.Graphics;
    strokeRoundedRect: (x: number, y: number, w: number, h: number, r?: Radius) => Phaser.GameObjects.Graphics;
  };
  proto.fillRoundedRect = function (this: Phaser.GameObjects.Graphics, x, y, w, h, r = 20) {
    return this.fillPoints(steppedRect(x, y, w, h, r), true, true);
  };
  proto.strokeRoundedRect = function (this: Phaser.GameObjects.Graphics, x, y, w, h, r = 20) {
    return this.strokePoints(steppedRect(x, y, w, h, r), true, true);
  };
}
