import Phaser from 'phaser';
import { GAME_W, GAME_H } from '../config';
import { txt, panel } from '../ui/text';
import { MenuList } from '../ui/MenuList';
import { Input } from '../systems/InputManager';
import { Audio } from '../systems/Audio';
import { controlsPanel } from '../ui/controlsPanel';

/** Pausa: continuar, reiniciar, ver controles ou sair. */
export class PauseScene extends Phaser.Scene {
  private list!: MenuList;
  private levelKey = '';
  private levelId = '';
  private overlay: Phaser.GameObjects.Container | null = null;

  constructor() {
    super('Pause');
  }

  init(d: { levelKey: string; levelId: string }): void {
    this.levelKey = d.levelKey;
    this.levelId = d.levelId;
    this.overlay = null;
  }

  create(): void {
    this.add.graphics().fillStyle(0x1b1424, 0.6).fillRect(0, 0, GAME_W, GAME_H);
    panel(this, GAME_W / 2 - 200, 100, 400, 350);
    txt(this, GAME_W / 2, 140, 'Pausa', 36, { color: '#ffd6e4' });
    this.list = new MenuList(this, GAME_W / 2, 200, [
      { label: 'Continuar', onSelect: () => this.resume() },
      { label: 'Reiniciar fase', onSelect: () => this.restart() },
      { label: 'Como jogar', onSelect: () => { this.list.setVisible(false); this.overlay = controlsPanel(this); this.time.delayedCall(250, () => this.input.once('pointerdown', () => this.closeOverlay())); } },
      { label: 'Sair para o mapa', onSelect: () => this.quit() },
      { label: 'Menu principal', onSelect: () => this.quit('Menu') },
    ], 46, 22);
  }

  private resume(): void {
    this.scene.resume(this.levelKey);
    this.scene.resume('HUD');
    this.scene.stop();
  }

  private restart(): void {
    this.scene.stop('HUD');
    this.scene.get(this.levelKey).scene.restart({ levelId: this.levelId });
    this.scene.stop();
  }

  private quit(to: 'Map' | 'Menu' = 'Map'): void {
    Audio.music(null);
    this.scene.stop('HUD');
    this.scene.stop(this.levelKey);
    this.scene.start(to, { select: this.levelId });
  }

  update(): void {
    if (this.overlay) {
      if (Input.confirmPressed() || Input.backPressed() || Input.pausePressed) {
        this.closeOverlay();
      }
      return;
    }
    if (Input.pausePressed) { Audio.play('back'); this.resume(); return; }
    this.list.update();
  }

  private closeOverlay(): void {
    if (!this.overlay) return;
    this.overlay.destroy();
    this.overlay = null;
    this.list.setVisible(true);
    Audio.play('back');
  }
}
