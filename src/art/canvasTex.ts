import type Phaser from 'phaser';
import { PG, rng } from './pixel';

/** Função de desenho de uma textura: o pincel e um aleatório determinístico. */
export type Draw = (pg: PG, r: () => number) => void;

/** Cria (ou recria) uma textura de canvas desenhada com o pincel `PG`. */
export function makeCanvas(scene: Phaser.Scene, key: string, w: number, h: number, draw: Draw, o: { outline?: boolean; seed?: number } = {}): Phaser.Textures.CanvasTexture {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.createCanvas(key, w, h)!;
  const ctx = tex.getContext();
  ctx.imageSmoothingEnabled = false;
  const pg = new PG(ctx);
  draw(pg, rng(o.seed ?? 7));
  if (o.outline) pg.at(0, 0).outline(0, 0, w, h);
  tex.refresh();
  return tex;
}

/** Folha com quadros lado a lado; cada quadro vira um frame (0, 1, 2...). */
export function makeSheet(scene: Phaser.Scene, key: string, fw: number, fh: number, frames: Draw[], o: { outline?: boolean; seed?: number } = {}): Phaser.Textures.CanvasTexture {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.createCanvas(key, fw * frames.length, fh)!;
  const ctx = tex.getContext();
  ctx.imageSmoothingEnabled = false;
  const pg = new PG(ctx);
  frames.forEach((f, i) => {
    pg.at(i * fw, 0);
    f(pg, rng((o.seed ?? 13) + i));
    if (o.outline ?? true) pg.outline(0, 0, fw, fh);
    tex.add(i, 0, i * fw, 0, fw, fh);
  });
  pg.at(0, 0);
  tex.refresh();
  return tex;
}
