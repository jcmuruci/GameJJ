import Phaser from 'phaser';
import { GAME_W, GAME_H, PLAYER_COLORS, RES } from '../config';
import { txt, uiButton } from '../ui/text';
import { isTouchDevice } from '../systems/TouchControls';
import type { BaseLevel } from './levels/BaseLevel';
import { KEY_LABELS } from '../systems/InputManager';

interface Bubble {
  c: Phaser.GameObjects.Container;
  target: () => { x: number; y: number };
  until: number;
}

/** Camada de interface sobre a fase (em resolução cheia, texto nítido). */
export class HUDScene extends Phaser.Scene {
  level!: BaseLevel;
  ready = false;
  private bubbles: Bubble[] = [];
  private hearts: Phaser.GameObjects.Image[][] = [[], []];
  private cdBars: Phaser.GameObjects.Graphics[] = [];
  private toastText!: Phaser.GameObjects.Text;
  private toastTween: Phaser.Tweens.Tween | null = null;
  info!: Phaser.GameObjects.Text;
  private portraits: Phaser.GameObjects.Image[] = [];

  constructor() {
    super('HUD');
  }

  init(data: { level: BaseLevel }): void {
    this.level = data.level;
    this.lastBanner = [];
    this.ready = false;
    this.bubbles = [];
    this.hearts = [[], []];
    this.cdBars = [];
    this.portraits = [];
  }

  create(): void {
    // painéis dos jogadores (cantos inferiores)
    for (let i = 0; i < 2; i++) {
      const left = i === 0;
      const x = left ? 12 : GAME_W - 12;
      const y = GAME_H - 12;
      const g = this.add.graphics();
      const w = 200;
      const px = left ? x : x - w;
      g.fillStyle(0x1b1424, 0.72);
      g.fillRoundedRect(px, y - 54, w, 54, 10);
      g.lineStyle(2, Phaser.Display.Color.HexStringToColor(PLAYER_COLORS[i]).color, 0.9);
      g.strokeRoundedRect(px, y - 54, w, 54, 10);
      const portrait = this.add.image(left ? px + 26 : px + w - 26, y - 26, `char_${i}`, 0).setScale(2);
      this.portraits.push(portrait);
      txt(this, left ? px + 50 : px + w - 50, y - 44, this.level.names[i], 15, { color: PLAYER_COLORS[i], origin: [left ? 0 : 1, 0.5] });
      const abName = i === 0 ? 'Espada' : 'Magia';
      const ability = KEY_LABELS[i].ability === abName ? abName : `${KEY_LABELS[i].ability}: ${abName}`;
      txt(this, left ? px + 50 : px + w - 50, y - 10, ability, 11, { color: '#d8c8e8', origin: [left ? 0 : 1, 0.5], bold: false });
      const p = this.level.players[i];
      for (let h = 0; h < p.maxHp; h++) {
        const hx = left ? px + 56 + h * 16 : px + w - 56 - h * 16;
        this.hearts[i].push(this.add.image(hx, y - 26, 'ui_heart').setScale(2));
      }
      this.cdBars.push(this.add.graphics());
    }
    this.info = txt(this, GAME_W / 2, 24, '', 22, { color: '#fff4e0' });
    this.toastText = txt(this, GAME_W / 2, 92, '', 18, { color: '#fff4e0', wrap: 700 }).setAlpha(0).setDepth(50);
    // botão de pausa clicável (no celular a pausa fica nos controles de toque)
    if (!isTouchDevice()) uiButton(this, GAME_W / 2, GAME_H - 20, 'Pausa (Esc)', () => { if (!this.level.ended) this.level.openPause(); }, { size: 13 });
    this.ready = true;
    this.level.onHudReady(this);
  }

  worldToScreen(x: number, y: number): { x: number; y: number } {
    const cam = this.level.cameras.main;
    const k = cam.zoom / RES;
    return { x: (x - cam.worldView.x) * k, y: (y - cam.worldView.y) * k };
  }

  update(time: number): void {
    if (!this.ready || !this.level.players.length) return;
    for (let i = 0; i < 2; i++) {
      const p = this.level.players[i];
      this.hearts[i].forEach((h, k) => {
        const full = k < p.hp;
        h.setTexture(full ? 'ui_heart' : 'ui_heart_empty');
        h.setScale(full && p.hp === 1 ? 2 + Math.sin(time / 120) * 0.2 : 2);
      });
      this.portraits[i].setAngle(p.fainted ? 90 : 0).setTint(p.fainted ? 0x888899 : 0xffffff);
      const g = this.cdBars[i];
      g.clear();
      const left = i === 0;
      const bx = left ? 62 : GAME_W - 62 - 120;
      const by = GAME_H - 30;
      const frac = 1 - p.abilityCd / Math.max(0.01, p.abilityMax);
      g.fillStyle(0x000000, 0.4).fillRect(bx, by + 10, 120, 3);
      g.fillStyle(frac >= 1 ? 0x8be07a : 0xffd25e, 1).fillRect(bx, by + 10, 120 * Math.min(1, frac), 3);
    }
    const now = this.time.now;
    for (const b of this.bubbles) {
      const t = b.target();
      const s = this.worldToScreen(t.x, t.y);
      b.c.setPosition(Math.round(s.x), Math.round(s.y));
      if (now > b.until && b.c.alpha === 1) {
        this.tweens.add({ targets: b.c, alpha: 0, y: b.c.y - 10, duration: 200, onComplete: () => b.c.destroy() });
        b.c.setAlpha(0.99);
      }
    }
    this.bubbles = this.bubbles.filter((b) => b.c.active);
  }

  bubble(target: () => { x: number; y: number }, text: string, ms = 1800, color = '#fff4e0'): void {
    // remove outros balões do mesmo alvo próximo
    const t0 = target();
    for (const b of this.bubbles) {
      const t = b.target();
      if (Math.abs(t.x - t0.x) < 4 && Math.abs(t.y - t0.y) < 4) b.c.destroy();
    }
    const label = txt(this, 0, 0, text, 14, { color: '#2a1d2e', stroke: color, strokeW: 0, wrap: 240 });
    const w = Math.max(40, label.width + 18);
    const h = label.height + 10;
    const g = this.add.graphics();
    g.fillStyle(0x2a1d2e, 1);
    g.fillRoundedRect(-w / 2 - 2, -h - 2, w + 4, h + 4, 8);
    g.fillStyle(Phaser.Display.Color.HexStringToColor(color).color, 1);
    g.fillRoundedRect(-w / 2, -h, w, h, 7);
    g.fillTriangle(-5, -1, 5, -1, 0, 7);
    label.setPosition(0, -h / 2);
    const c = this.add.container(0, 0, [g, label]).setDepth(40);
    c.setScale(0.6);
    this.tweens.add({ targets: c, scale: 1, duration: 160, ease: 'Back.Out' });
    this.bubbles.push({ c, target, until: this.time.now + ms });
  }

  clearBubbles(): void {
    this.bubbles.forEach((b) => b.c.destroy());
    this.bubbles = [];
  }

  floatText(wx: number, wy: number, text: string, color = '#ffd25e'): void {
    if (!this.ready) return;
    const s = this.worldToScreen(wx, wy);
    const t = txt(this, s.x, s.y, text, 18, { color }).setDepth(45);
    this.tweens.add({ targets: t, y: s.y - 40, alpha: 0, duration: 1200, ease: 'Sine.Out', onComplete: () => t.destroy() });
  }

  toast(text: string, color = '#fff4e0', ms = 2400): void {
    if (!this.ready) return;
    this.toastTween?.stop();
    this.toastText.setText(text).setColor(color).setAlpha(1).setScale(0.8).setY(92);
    this.tweens.add({ targets: this.toastText, scale: 1, duration: 180, ease: 'Back.Out' });
    this.toastTween = this.tweens.add({ targets: this.toastText, alpha: 0, delay: ms, duration: 400 });
  }

  private lastBanner: Phaser.GameObjects.GameObject[] = [];

  banner(title: string, sub = '', ms = 1800): void {
    if (!this.ready) return;
    // um aviso novo substitui o anterior (nada de textos sobrepostos)
    this.lastBanner.forEach((o) => { this.tweens.killTweensOf(o); o.destroy(); });
    const g = this.add.graphics().setDepth(60);
    g.fillStyle(0x1b1424, 0.8).fillRect(0, GAME_H / 2 - 60, GAME_W, 120);
    g.fillStyle(0xff9cc2, 1).fillRect(0, GAME_H / 2 - 62, GAME_W, 3).fillRect(0, GAME_H / 2 + 59, GAME_W, 3);
    const t1 = txt(this, GAME_W / 2, GAME_H / 2 - 16, title, 40, { color: '#ffd6e4' }).setDepth(61);
    const t2 = txt(this, GAME_W / 2, GAME_H / 2 + 28, sub, 18, { color: '#fff4e0' }).setDepth(61);
    const all = [g, t1, t2];
    this.lastBanner = all;
    all.forEach((o) => o.setAlpha(0));
    this.tweens.add({ targets: all, alpha: 1, duration: 200 });
    this.tweens.add({ targets: t1, scale: { from: 1.4, to: 1 }, duration: 300, ease: 'Back.Out' });
    this.time.delayedCall(ms, () => { if (all[0].active) this.tweens.add({ targets: all, alpha: 0, duration: 300, onComplete: () => all.forEach((o) => o.destroy()) }); });
  }
}
