import Phaser from 'phaser';
import { txt } from './text';
import { Input } from '../systems/InputManager';
import { Audio } from '../systems/Audio';

export interface MenuItem {
  label: string | (() => string);
  onSelect?: () => void;
  onLeft?: () => void;
  onRight?: () => void;
  disabled?: () => boolean;
}

/** Lista vertical navegável por qualquer jogador (teclado, controle ou mouse). */
export class MenuList {
  index = 0;
  texts: Phaser.GameObjects.Text[] = [];
  cursor: Phaser.GameObjects.Image;
  active = true;

  constructor(public scene: Phaser.Scene, public x: number, public y: number, public items: MenuItem[], public spacing = 44, size = 24) {
    this.texts = items.map((it, i) => {
      const t = txt(scene, x, y + i * spacing, this.labelOf(it), size, { color: '#fff4e0' });
      t.setInteractive({ useHandCursor: true });
      t.on('pointerover', () => { if (this.active && this.index !== i) { this.index = i; Audio.play('blip'); this.refresh(); } });
      t.on('pointerdown', () => { if (!this.active) return; this.index = i; Audio.unlock(); this.choose(); });
      return t;
    });
    this.cursor = scene.add.image(0, 0, 'fx_heart').setScale(3);
    scene.tweens.add({ targets: this.cursor, scale: 3.6, duration: 400, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    this.refresh();
  }

  labelOf(it: MenuItem): string {
    return typeof it.label === 'function' ? it.label() : it.label;
  }

  refresh(): void {
    this.texts.forEach((t, i) => {
      const it = this.items[i];
      const dis = it.disabled?.() ?? false;
      t.setText(this.labelOf(it));
      t.setColor(dis ? '#7a6a8a' : i === this.index ? '#ffd25e' : '#fff4e0');
      t.setScale(i === this.index ? 1.08 : 1);
    });
    const cur = this.texts[this.index];
    this.cursor.setPosition(cur.x - cur.width / 2 - 26, cur.y);
  }

  choose(): void {
    const it = this.items[this.index];
    if (it.disabled?.()) { Audio.play('wrong'); return; }
    if (it.onSelect) { Audio.play('confirm'); it.onSelect(); this.refresh(); }
    else if (it.onRight) { it.onRight(); Audio.play('select'); this.refresh(); }
  }

  update(): void {
    if (!this.active || Input.capturingText) return;
    if (Input.menuUp()) { this.index = (this.index + this.items.length - 1) % this.items.length; Audio.play('blip'); this.refresh(); }
    if (Input.menuDown()) { this.index = (this.index + 1) % this.items.length; Audio.play('blip'); this.refresh(); }
    const it = this.items[this.index];
    if (Input.menuLeft() && it.onLeft) { it.onLeft(); Audio.play('select'); this.refresh(); }
    if (Input.menuRight() && it.onRight) { it.onRight(); Audio.play('select'); this.refresh(); }
    if (Input.confirmPressed()) this.choose();
  }

  setVisible(v: boolean): void {
    this.texts.forEach((t) => t.setVisible(v));
    this.cursor.setVisible(v);
    this.active = v;
  }

  destroy(): void {
    this.texts.forEach((t) => t.destroy());
    this.cursor.destroy();
  }
}
