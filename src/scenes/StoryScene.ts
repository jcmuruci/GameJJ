import Phaser from 'phaser';
import { GAME_W, GAME_H } from '../config';
import { STORY, Line, Speaker } from '../data/story';
import { LEVELS } from '../data/levels';
import { txt, fillNames, uiButton } from '../ui/text';
import { Input } from '../systems/InputManager';
import { Audio, TrackName } from '../systems/Audio';
import { Save } from '../systems/SaveManager';
import { cozyBackground } from './MenuScene';
import { charFrame } from '../art/CharacterArt';

interface StoryData {
  id: string;
  next: string;
  nextData?: object;
}

/** Personagens secundários: sprite, nome e posição. */
const NPC: Partial<Record<Speaker, { tex: string; frame?: number; name: string; scale: number; y: number }>> = {
  garcom: { tex: 'npc_garcom', frame: charFrame('down', 0), name: 'Garçom', scale: 7, y: 270 },
  paiJ: { tex: 'npc_pai', frame: charFrame('down', 0), name: 'Pai do {p1}', scale: 7, y: 270 },
  maeJ: { tex: 'npc_mae', frame: charFrame('down', 0), name: 'Mãe do {p1}', scale: 7, y: 270 },
  avestruz: { tex: 'ostrich', name: 'Avestruz', scale: 7, y: 270 },
  nimbo: { tex: 'boss', name: 'Nimbo', scale: 3, y: 120 },
  mae: { tex: 'nest', name: 'Mamãe Jacaré', scale: 5, y: 230 },
  vovo: { tex: 'npc_mae', frame: charFrame('down', 0), name: 'Vovó Rosa', scale: 7, y: 270 },
};

/** Decoração de fundo de cada capítulo. */
const DECOR: Record<string, [string, number, number, number][]> = {
  intro: [['big_rock', 480, 150, 3]],
  tutorial: [['big_rock', 480, 150, 3]],
  climb: [['mirante', 480, 110, 4]],
  canyon: [['waterfall', 380, 170, 3], ['house_c0', 560, 160, 2.2], ['house_c2', 660, 170, 2]],
  bread: [['bakery', 480, 150, 3], ['moto', 480, 360, 4]],
  itacolomi: [['itacolomi', 480, 170, 3]],
  itacolomi_end: [['itacolomi', 480, 170, 3]],
  italiano: [['table', 480, 330, 5], ['flag_italy', 600, 140, 3]],
  italiano_end: [['table', 480, 330, 5]],
  junina: [['bunting_j', 330, 60, 4], ['bunting_j', 630, 60, 4], ['bonfire', 480, 190, 4]],
  tire: [['moto', 480, 340, 4], ['big_rock', 680, 140, 2]],
  roca: [['farmhouse', 480, 160, 3]],
  topo: [['paraglider', 360, 100, 3], ['paraglider', 620, 70, 2.4], ['waterfall', 480, 230, 2.5]],
  farm: [['farmhouse', 480, 150, 3], ['goat', 330, 350, 4], ['horse', 640, 350, 3]],
  farm_end: [['pedalinho', 480, 330, 4]],
  amazon: [['tree_jungle', 120, 180, 4], ['tree_jungle', 840, 170, 4], ['gator', 480, 340, 5]],
  amazon_end: [['tree_jungle', 120, 180, 4], ['tree_jungle', 840, 170, 4], ['nest', 480, 330, 4]],
};

/** Cena de diálogo entre as fases. */
export class StoryScene extends Phaser.Scene {
  private lines: Line[] = [];
  private idx = 0;
  private shown = 0;
  private full = '';
  private body!: Phaser.GameObjects.Text;
  private nameT!: Phaser.GameObjects.Text;
  private portraits: Phaser.GameObjects.Sprite[] = [];
  private npcs: Partial<Record<Speaker, Phaser.GameObjects.Image | Phaser.GameObjects.Container>> = {};
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
    this.npcs = {};
  }

  create(): void {
    this.names = [Save.data.looks[0].name, Save.data.looks[1].name];
    const id = this.data_.id;
    const night = id === 'storm' || id === 'ending';
    cozyBackground(this, night ? 0x5a5a9a : id.startsWith('amazon') ? 0x9ac890 : 0xffffff);
    this.add.graphics().fillStyle(0x1b1424, night ? 0.45 : 0.25).fillRect(0, 0, GAME_W, GAME_H);
    if (night) {
      for (let i = 0; i < 60; i++) {
        const s = this.add.image(Phaser.Math.Between(0, GAME_W), Phaser.Math.Between(0, 260), 'fx_spark').setScale(Phaser.Math.FloatBetween(0.5, 1.4));
        this.tweens.add({ targets: s, alpha: 0.2, duration: Phaser.Math.Between(600, 1600), yoyo: true, repeat: -1 });
      }
    }
    if (id === 'ending') this.time.addEvent({ delay: 500, loop: true, callback: () => this.shootingStar() });
    for (const [key, x, y, sc] of DECOR[id] ?? []) {
      const img = this.add.image(x, y, key, 0).setScale(sc);
      if (key === 'paraglider') this.tweens.add({ targets: img, x: x + 40, y: y + 10, duration: 3000, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    }

    this.portraits = [0, 1].map((i) => this.add.sprite(i === 0 ? 260 : 700, 270, `char_${i}`, charFrame('down', 0)).setScale(7));
    for (const [who, n] of Object.entries(NPC) as [Speaker, NonNullable<typeof NPC[Speaker]>][]) {
      if (!this.lines.some((l) => l.who === who) && !(who === 'nimbo' && id === 'ending')) continue;
      const obj = who === 'vovo' ? this.makeVovo() : this.add.image(GAME_W / 2, n.y, n.tex, n.frame ?? (who === 'nimbo' && id === 'ending' ? 2 : 0)).setScale(n.scale);
      this.npcs[who] = obj.setAlpha(0);
    }

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
    const level = LEVELS.find((l) => l.story === id);
    if (level && !level.soon) txt(this, 40, 30, `${level.month} · ${level.name}`, 16, { origin: [0, 0.5], color: '#ffd6e4' });

    Audio.music(this.musicFor(id));
    this.cameras.main.fadeIn(300, 27, 20, 36);
    this.showLine();
  }

  private musicFor(id: string): TrackName {
    if (id === 'storm') return 'boss';
    if (id === 'ending' || id.endsWith('_end')) return 'ending';
    if (id.startsWith('amazon')) return 'jungle';
    if (id === 'bread' || id === 'tire') return 'road';
    if (id === 'junina') return 'festival';
    if (id === 'italiano' || id === 'roca') return 'kitchen';
    return 'map';
  }

  private makeVovo(): Phaser.GameObjects.Container {
    // Vovó Rosa: personagem simples feito com formas
    const c = this.add.container(GAME_W / 2, 280);
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
    const n = NPC[l.who];
    return n ? fillNames(n.name, this.names) : '';
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
    for (const [who, obj] of Object.entries(this.npcs) as [Speaker, Phaser.GameObjects.Image][]) {
      const on = l.who === who || (who === 'nimbo' && this.data_.id === 'ending' && this.idx < 5);
      this.tweens.add({ targets: obj, alpha: on ? 1 : 0, duration: 250 });
    }
    if (l.who === 'mae') Audio.play('gator');
    if (l.who === 'nimbo') Audio.play('boss');
    if (l.who === 'avestruz') { Audio.play('crow'); this.cameras.main.shake(300, 0.01); }
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
