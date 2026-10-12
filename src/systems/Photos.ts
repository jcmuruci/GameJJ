import Phaser from 'phaser';
import type { Photo } from '../data/photos';

/**
 * Carrega fotos sob demanda e chama `done` quando todas estiverem prontas.
 * As fotos usam filtro suave (o jogo é pixel art, mas foto serrilhada fica feia).
 */
export function loadPhotos(scene: Phaser.Scene, photos: Photo[], done: () => void): void {
  const smooth = () => photos.forEach((p) => {
    if (scene.textures.exists(p.key)) scene.textures.get(p.key).setFilter(Phaser.Textures.FilterMode.LINEAR);
  });
  const missing = photos.filter((p) => !scene.textures.exists(p.key));
  if (!missing.length) { smooth(); done(); return; }
  let alive = true;
  const off = () => { alive = false; };
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, off);
  missing.forEach((p) => scene.load.image(p.key, p.src));
  scene.load.once(Phaser.Loader.Events.COMPLETE, () => {
    scene.events.off(Phaser.Scenes.Events.SHUTDOWN, off);
    if (!alive) return;
    smooth();
    done();
  });
  scene.load.start();
}

/** Miniatura nítida de uma foto (reduzida pelo navegador, com recorte central). */
export function photoThumb(scene: Phaser.Scene, photo: Photo, w: number, h: number): string {
  const key = `${photo.key}_thumb`;
  if (scene.textures.exists(key)) return key;
  const src = scene.textures.get(photo.key).getSourceImage() as HTMLImageElement;
  const tex = scene.textures.createCanvas(key, w, h)!;
  const ctx = tex.getContext();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  const k = Math.max(w / src.width, h / src.height);
  const sw = w / k;
  const sh = h / k;
  ctx.drawImage(src, (src.width - sw) / 2, (src.height - sh) / 2, sw, sh, 0, 0, w, h);
  tex.refresh();
  tex.setFilter(Phaser.Textures.FilterMode.LINEAR);
  return key;
}
