import Phaser from 'phaser';
import { GAME_W, GAME_H } from '../config';
import { txt } from '../ui/text';
import { Input } from '../systems/InputManager';
import { Audio } from '../systems/Audio';
import { Admin } from '../systems/Admin';
import { loadPhotos } from '../systems/Photos';
import type { Photo } from '../data/photos';

interface PhotoData {
  photos: Photo[];
  index?: number;
  /** Título acima da polaroid (ex.: "Lembrança real ♥"). */
  title?: string;
  /** Fase a pausar enquanto a foto está aberta (o HUD pausa junto). */
  pauseKey?: string;
}

/** Visualizador de fotos reais: polaroid por cima de tudo; fecha com AÇÃO, Esc ou clique. */
export class PhotoScene extends Phaser.Scene {
  private d!: PhotoData;
  private idx = 0;
  private card: Phaser.GameObjects.Container | null = null;
  private counter: Phaser.GameObjects.Text | null = null;
  private openedAt = 0;
  private closing = false;

  constructor() {
    super('Photo');
  }

  init(d: PhotoData): void {
    this.d = d;
    this.idx = d.index ?? 0;
    this.card = null;
    this.counter = null;
    this.closing = false;
  }

  create(): void {
    const dim = this.add.graphics().fillStyle(0x0c0a14, 0.84).fillRect(0, 0, GAME_W, GAME_H).setAlpha(0);
    this.tweens.add({ targets: dim, alpha: 1, duration: 250 });
    if (this.d.title) txt(this, GAME_W / 2, 26, this.d.title, 22, { color: '#ffd6e4' });
    const many = this.d.photos.length > 1;
    txt(this, GAME_W / 2, GAME_H - 16, many ? '◀ ▶ trocar foto · AÇÃO ou clique para continuar' : 'AÇÃO ou clique para continuar', 13, { color: '#d8c8e8', bold: false });
    if (many) this.counter = txt(this, GAME_W - 40, 26, '', 15, { color: '#fff4e0' });
    this.openedAt = this.time.now;
    loadPhotos(this, this.d.photos, () => this.show(0));
    this.input.on('pointerdown', () => this.close());
    if (Admin.on) this.time.delayedCall(2500, () => this.close());
    Audio.play('confirm');
  }

  private show(dir: number): void {
    const n = this.d.photos.length;
    const photo = this.d.photos[this.idx];
    this.counter?.setText(`${this.idx + 1}/${n}`);
    const old = this.card;
    if (old) this.tweens.add({ targets: old, x: old.x - dir * 120, alpha: 0, duration: 200, onComplete: () => old.destroy() });

    // a foto cabe na tela; a moldura é uma polaroid com a legenda embaixo
    const src = this.textures.get(photo.key).getSourceImage() as HTMLImageElement;
    const k = Math.min(620 / src.width, 372 / src.height);
    const w = Math.round(src.width * k);
    const h = Math.round(src.height * k);
    const pad = 14;
    const foot = 56;
    const fw = w + pad * 2;
    const fh = h + pad + foot;
    const frame = this.add.graphics();
    frame.fillStyle(0x000000, 0.35).fillRect(-fw / 2 + 6, -fh / 2 + 8, fw, fh);
    frame.fillStyle(0xfbf6ec, 1).fillRect(-fw / 2, -fh / 2, fw, fh);
    frame.fillStyle(0xe8e0d0, 1).fillRect(-fw / 2, fh / 2 - 3, fw, 3);
    const img = this.add.image(0, -fh / 2 + pad + h / 2, photo.key).setDisplaySize(w, h);
    const cap = txt(this, 0, fh / 2 - foot / 2, photo.caption, 15, { color: '#3a2a3a', strokeW: 0, bold: false, wrap: fw - 24 });
    const tape = this.add.graphics().fillStyle(0xffd6e4, 0.75).fillRect(-26, -fh / 2 - 8, 52, 16);
    const card = this.add.container(GAME_W / 2, GAME_H / 2 + 4, [frame, img, cap, tape]).setAngle(-1.5);
    card.setScale(0.9).setAlpha(0);
    if (dir) card.x += dir * 120;
    this.tweens.add({ targets: card, x: GAME_W / 2, scale: 1, alpha: 1, duration: 280, ease: 'Back.Out' });
    this.card = card;
  }

  update(): void {
    if (this.closing || !this.card) return;
    // um instante antes de aceitar teclas (o aperto que abriu a foto não fecha ela)
    if (this.time.now - this.openedAt < 450) return;
    const n = this.d.photos.length;
    if (n > 1 && (Input.menuLeft() || Input.menuRight())) {
      const dir = Input.menuRight() ? 1 : -1;
      this.idx = (this.idx + dir + n) % n;
      Audio.play('blip');
      this.show(dir);
      return;
    }
    const any = Input.players.some((p) => p.actionPressed || p.abilityPressed);
    if (any || Input.confirmPressed() || Input.backPressed() || Input.pausePressed) this.close();
  }

  private close(): void {
    if (this.closing || this.time.now - this.openedAt < 300) return;
    this.closing = true;
    Audio.play('back');
    this.tweens.add({
      targets: this.children.list, alpha: 0, duration: 220,
      onComplete: () => {
        const key = this.d.pauseKey;
        if (key) {
          this.scene.resume(key);
          if (this.scene.isPaused('HUD')) this.scene.resume('HUD');
        }
        this.scene.stop();
      },
    });
  }
}

/** Abre a foto por cima de uma fase, pausando a fase enquanto ela está aberta. */
export function openPhotoOverLevel(level: Phaser.Scene, photos: Photo[], title?: string): void {
  if (!photos.length || level.scene.isActive('Photo')) return;
  level.scene.launch('Photo', { photos, title, pauseKey: level.scene.key });
  level.scene.pause();
  if (level.scene.isActive('HUD')) level.scene.pause('HUD');
}
