import Phaser from 'phaser';
import { GAME_W, GAME_H } from '../config';
import { STORY, Line } from '../data/story';
import { txt, fillNames, uiButton } from '../ui/text';
import { Input } from '../systems/InputManager';
import { Audio } from '../systems/Audio';
import { Save } from '../systems/SaveManager';
import { cozyBackground } from './MenuScene';
import { charFrame } from '../art/CharacterArt';

interface StoryData {
  id: string;
  next: string;
  nextData?: object;
}

/** Cena de diálogo entre as fases. */
export class StoryScene extends Phaser.Scene {
  private lines: Line[] = [];
  private idx = 0;
  private shown = 0;
  private full = '';
  private body!: Phaser.GameObjects.Text;
  private nameT!: Phaser.GameObjects.Text;
  private portraits: Phaser.GameObjects.Sprite[] = [];
  private nimbo!: Phaser.GameObjects.Image;
  private vovo!: Phaser.GameObjects.Container;
  private mae!: Phaser.GameObjects.Image;
  private data_!: StoryData;
  private names!: [string, string];
  private done = false;

  constructor() {
    super('Story');
  }

  init(data: StoryData): void {
    this.data_ = data;
    this.lines = STORY[data.id] ?? [];
    this.idx = 0;
    this.done = false;
  }

  create(): void {
    this.names = [Save.data.looks[0].name, Save.data.looks[1].name];
    const night = this.data_.id === 'storm' || this.data_.id === 'ending';
    cozyBackground(this, night ? 0x5a5a9a : this.data_.id.startsWith('amazon') ? 0x9ac890 : 0xffffff);
    const shade = this.add.graphics();
    shade.fillStyle(0x1b1424, night ? 0.45 : 0.25).fillRect(0, 0, GAME_W, GAME_H);
    if (night) {
      for (let i = 0; i < 60; i++) {
        const s = this.add.image(Phaser.Math.Between(0, GAME_W), Phaser.Math.Between(0, 260), 'fx_spark').setScale(Phaser.Math.FloatBetween(0.5, 1.4));
        this.tweens.add({ targets: s, alpha: 0.2, duration: Phaser.Math.Between(600, 1600), yoyo: true, repeat: -1 });
      }
    }
    if (this.data_.id === 'ending') this.time.addEvent({ delay: 500, loop: true, callback: () => this.shootingStar() });

    const id = this.data_.id;
    if (id === 'moto') this.add.image(GAME_W / 2, 330, 'moto').setScale(4);
    if (id === 'tutorial' || id === 'intro') this.add.image(GAME_W / 2, 150, 'big_rock').setScale(3);
    if (id === 'picnic' || id === 'forest') this.add.sprite(GAME_W / 2, 220, 'waterfall', 0).setScale(3.5).play('waterfall-anim');
    if (id === 'festival') this.add.image(GAME_W / 2, 300, 'table').setScale(5);
    if (id.startsWith('amazon')) {
      [[120, 180], [840, 170], [480, 120]].forEach(([x, y]) => this.add.image(x, y, 'tree_jungle').setScale(4));
      this.add.sprite(GAME_W / 2, 330, 'gator', 0).setScale(5).play('gator-blink');
    }
    this.portraits = [0, 1].map((i) => this.add.sprite(i === 0 ? 260 : 700, 270, `char_${i}`, charFrame('down', 0)).setScale(7));
    this.nimbo = this.add.image(GAME_W / 2, 120, 'boss', this.data_.id === 'ending' ? 2 : 0).setScale(3).setAlpha(0);
    this.vovo = this.makeVovo();
    this.mae = this.add.image(GAME_W / 2, 230, 'nest').setScale(5).setAlpha(0);

    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.3).fillRoundedRect(44, GAME_H - 166, GAME_W - 80, 146, 14);
    g.fillStyle(0x2a1d3a, 0.95).fillRoundedRect(40, GAME_H - 170, GAME_W - 80, 146, 14);
    g.lineStyle(3, 0xffd6e4, 1).strokeRoundedRect(40, GAME_H - 170, GAME_W - 80, 146, 14);
    this.nameT = txt(this, 70, GAME_H - 170, '', 20, { origin: [0, 0.5], color: '#ffd25e' });
    this.body = txt(this, 70, GAME_H - 140, '', 20, { origin: [0, 0], wrap: GAME_W - 150, bold: false, lineSpacing: 6 });
    uiButton(this, GAME_W - 70, 30, 'Pular >', () => this.finish(), { size: 15 });
    this.input.on('pointerdown', (_p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => { if (!over.length) this.advance(); });
    const hint = txt(this, GAME_W - 70, GAME_H - 40, 'Toque ou AÇÃO: continuar · Esc: pular', 12, { origin: [1, 0.5], color: '#d8c8e8', bold: false });
    this.tweens.add({ targets: hint, alpha: 0.4, duration: 700, yoyo: true, repeat: -1 });

    const id2 = this.data_.id;
    Audio.music(night ? (id2 === 'ending' ? 'ending' : 'boss') : id2 === 'amazon_end' ? 'ending' : id2.startsWith('amazon') ? 'jungle' : id2 === 'moto' ? 'road' : 'map');
    this.cameras.main.fadeIn(300, 27, 20, 36);
    this.showLine();
  }

  private makeVovo(): Phaser.GameObjects.Container {
    // Vovó Rosa: personagem simples feito com formas
    const c = this.add.container(GAME_W / 2, 280).setAlpha(0);
    const g = this.add.graphics();
    g.fillStyle(0xb25bd6).fillRoundedRect(-30, 10, 60, 70, 12);
    g.fillStyle(0xf0c8a8).fillCircle(0, -10, 30);
    g.fillStyle(0xe8e8f0).fillCircle(0, -36, 22).fillCircle(-24, -22, 12).fillCircle(24, -22, 12);
    g.fillStyle(0x2a1d2e).fillRect(-12, -12, 5, 6).fillRect(8, -12, 5, 6);
    g.lineStyle(3, 0x2a1d2e).strokeCircle(-9, -9, 8).strokeCircle(10, -9, 8);
    g.fillStyle(0xff8fb1).fillCircle(-18, 4, 5).fillCircle(18, 4, 5);
    g.fillStyle(0xfff4e0).fillRect(-20, 30, 40, 40);
    c.add(g);
    return c;
  }

  private shootingStar(): void {
    const x = Phaser.Math.Between(100, GAME_W);
    const s = this.add.image(x, -10, 'fx_spark').setScale(1.5);
    this.tweens.add({ targets: s, x: x - 300, y: 260, alpha: 0, duration: 1200, onComplete: () => s.destroy() });
  }

  private speakerName(l: Line): string {
    if (l.who === 0 || l.who === 1) return this.names[l.who];
    if (l.who === 'nimbo') return 'Nimbo';
    if (l.who === 'vovo') return 'Vovó Rosa';
    if (l.who === 'mae') return 'Mamãe Jacaré';
    return '';
  }

  private showLine(): void {
    const l = this.lines[this.idx];
    if (!l) { this.finish(); return; }
    this.full = fillNames(l.text, this.names);
    this.shown = 0;
    this.nameT.setText(this.speakerName(l));
    this.body.setText('');
    this.body.setColor(l.who === 'n' ? '#d8c8e8' : '#fff4e0');
    this.body.setFontStyle(l.who === 'n' ? 'italic' : 'normal');
    this.portraits.forEach((p, i) => {
      const active = l.who === i;
      p.setTint(active ? 0xffffff : 0x8a80a0).setFrame(charFrame('down', active ? 3 : 0));
      if (active) this.tweens.add({ targets: p, y: { from: 262, to: 270 }, duration: 200, ease: 'Back.Out' });
    });
    this.tweens.add({ targets: this.nimbo, alpha: l.who === 'nimbo' || (this.data_.id === 'ending' && this.idx < 5) ? 1 : 0, duration: 250 });
    this.tweens.add({ targets: this.vovo, alpha: l.who === 'vovo' ? 1 : 0, duration: 250 });
    this.tweens.add({ targets: this.mae, alpha: l.who === 'mae' ? 1 : 0, duration: 250 });
    if (l.who === 'mae') Audio.play('gator');
    if (l.who === 'nimbo') Audio.play('boss');
  }

  private finish(): void {
    if (this.done) return;
    this.done = true;
    this.cameras.main.fadeOut(300, 27, 20, 36);
    this.time.delayedCall(320, () => this.scene.start(this.data_.next, this.data_.nextData ?? {}));
  }

  update(_t: number, delta: number): void {
    if (this.done) return;
    if (Input.backPressed() || Input.pausePressed) { this.finish(); return; }
    if (this.shown < this.full.length) {
      const prev = Math.floor(this.shown);
      this.shown = Math.min(this.full.length, this.shown + delta * 0.05);
      if (Math.floor(this.shown) !== prev && Math.floor(this.shown) % 3 === 0) Audio.play('blip');
      this.body.setText(this.full.slice(0, Math.floor(this.shown)));
    }
    if (Input.confirmPressed()) this.advance();
  }

  private advance(): void {
    if (this.done) return;
    if (this.shown < this.full.length) { this.shown = this.full.length; this.body.setText(this.full); }
    else { this.idx++; this.showLine(); }
  }
}
