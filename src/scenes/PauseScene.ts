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
    panel(this, GAME_W / 2 - 200, 120, 400, 300);
    txt(this, GAME_W / 2, 160, 'Pausa', 36, { color: '#ffd6e4' });
    this.list = new MenuList(this, GAME_W / 2, 220, [
      { label: 'Continuar', onSelect: () => this.resume() },
      { label: 'Reiniciar fase', onSelect: () => this.restart() },
      { label: 'Como jogar', onSelect: () => { this.list.setVisible(false); this.overlay = controlsPanel(this); } },
      { label: 'Sair para o mapa', onSelect: () => this.quit() },
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

  private quit(): void {
    Audio.music(null);
    this.scene.stop('HUD');
    this.scene.stop(this.levelKey);
    this.scene.start('Map', { select: this.levelId });
  }

  update(): void {
    if (this.overlay) {
      if (Input.confirmPressed() || Input.backPressed() || Input.pausePressed) {
        this.overlay.destroy();
        this.overlay = null;
        this.list.setVisible(true);
        Audio.play('back');
      }
      return;
    }
    if (Input.pausePressed) { Audio.play('back'); this.resume(); return; }
    this.list.update();
  }
}
