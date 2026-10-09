import Phaser from 'phaser';
import { GAME_W, GAME_H } from '../config';
import { STORY, Line, Speaker } from '../data/story';
import { LEVELS } from '../data/levels';
import { txt, fillNames, uiButton } from '../ui/text';
import { Input } from '../systems/InputManager';
import { Audio, TrackName } from '../systems/Audio';
import { Save } from '../systems/SaveManager';
import { cozyBackground } from './MenuScene';
import { Mood } from '../art/Portrait';

interface StoryData {
  id: string;
  next: string;
  nextData?: object;
}

/** Personagens secundários: retrato, nome e cor da etiqueta. */
const NPC: Partial<Record<Speaker, { tex: string; frame?: number; name: string; color: string; scale: number; y: number }>> = {
  garcom: { tex: 'portrait_garcom', name: 'Garçom', color: '#f0f0f0', scale: 4, y: 256 },
  paiJ: { tex: 'portrait_pai', name: 'Pai do {p1}', color: '#8be07a', scale: 4, y: 256 },
  maeJ: { tex: 'portrait_mae', name: 'Mãe do {p1}', color: '#ffb08a', scale: 4, y: 256 },
  avestruz: { tex: 'ostrich', name: 'Avestruz', color: '#ff9c9c', scale: 7, y: 270 },
  nimbo: { tex: 'boss', name: 'Nimbo', color: '#d8d8e8', scale: 3, y: 130 },
  mae: { tex: 'nest', name: 'Mamãe Jacaré', color: '#b8e8a0', scale: 5, y: 240 },
  vovo: { tex: 'portrait_mae', name: 'Vovó Rosa', color: '#d8c8e8', scale: 4, y: 256 },
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

/** Expressão do retrato a partir do texto da fala (estilo anime). */
export function moodOf(text: string): Mood {
  if (text.includes('♥')) return 3;
  if (/\?!|!!|QUÉ|CORRE|nervoso|Ah, não|pneu/i.test(text)) return 2;
  if (text.includes('!')) return 1;
  return 0;
}

/** Cena de diálogo entre as fases, no estilo visual novel de anime. */
export class StoryScene extends Phaser.Scene {
  private lines: Line[] = [];
  private idx = 0;
  private shown = 0;
  private full = '';
  private body!: Phaser.GameObjects.Text;
  private nameT!: Phaser.GameObjects.Text;
  private nameTag!: Phaser.GameObjects.Graphics;
  private next!: Phaser.GameObjects.Text;
  private portraits: Phaser.GameObjects.Image[] = [];
  private npcs: Partial<Record<Speaker, Phaser.GameObjects.Image>> = {};
  private data_!: StoryData;
  private names!: [string, string];
  private done = false;
  private titleCard = false;

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
    this.add.graphics().fillStyle(0x1b1424, night ? 0.45 : 0.28).fillRect(0, 0, GAME_W, GAME_H);
    if (night) {
      for (let i = 0; i < 60; i++) {
        const s = this.add.image(Phaser.Math.Between(0, GAME_W), Phaser.Math.Between(0, 260), 'fx_spark').setScale(Phaser.Math.FloatBetween(0.5, 1.4));
        this.tweens.add({ targets: s, alpha: 0.2, duration: Phaser.Math.Between(600, 1600), yoyo: true, repeat: -1 });
      }
    }
    for (const [key, x, y, sc] of DECOR[id] ?? []) {
      const img = this.add.image(x, y, key, 0).setScale(sc).setAlpha(0.95);
      if (key === 'paraglider') this.tweens.add({ targets: img, x: x + 40, y: y + 10, duration: 3000, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    }
    // pétalas de sakura caindo
    this.add.particles(0, -10, 'fx_heart', {
      x: { min: 0, max: GAME_W }, lifespan: 6000, speedY: { min: 30, max: 60 }, speedX: { min: -20, max: 25 },
      rotate: { min: 0, max: 360 }, scale: { min: 0.8, max: 1.6 }, alpha: { start: 0.85, end: 0.2 }, frequency: 260, tint: [0xffd6e4, 0xff9cc2, 0xffffff],
    }).setDepth(5);

    // retratos (estilo anime)
    this.portraits = [0, 1].map((i) => this.add.image(i === 0 ? 210 : 750, 256, `portrait_${i}`, 0).setScale(4).setDepth(10));
    for (const [who, n] of Object.entries(NPC) as [Speaker, NonNullable<typeof NPC[Speaker]>][]) {
      if (!this.lines.some((l) => l.who === who)) continue;
      this.npcs[who] = this.add.image(GAME_W / 2, n.y, n.tex, n.frame ?? 0).setScale(n.scale).setAlpha(0).setDepth(9);
    }

    // caixa de diálogo
    const g = this.add.graphics().setDepth(20);
    g.fillStyle(0x000000, 0.35).fillRoundedRect(44, GAME_H - 158, GAME_W - 80, 140, 16);
    g.fillStyle(0x2a1d3a, 0.96).fillRoundedRect(40, GAME_H - 162, GAME_W - 80, 140, 16);
    g.lineStyle(3, 0xffd6e4, 1).strokeRoundedRect(40, GAME_H - 162, GAME_W - 80, 140, 16);
    g.lineStyle(1, 0xffd6e4, 0.4).strokeRoundedRect(46, GAME_H - 156, GAME_W - 92, 128, 12);
    this.nameTag = this.add.graphics().setDepth(21);
    this.nameT = txt(this, 76, GAME_H - 168, '', 18, { origin: [0, 0.5], color: '#2a1d2e', stroke: '#ffffff', strokeW: 0 }).setDepth(22);
    this.body = txt(this, 70, GAME_H - 132, '', 20, { origin: [0, 0], wrap: GAME_W - 150, bold: false, lineSpacing: 6 }).setDepth(22);
    this.next = txt(this, GAME_W - 70, GAME_H - 40, '▼', 16, { color: '#ffd6e4' }).setDepth(22).setVisible(false);
    this.tweens.add({ targets: this.next, y: GAME_H - 36, yoyo: true, repeat: -1, duration: 300 });
    txt(this, GAME_W / 2, GAME_H - 12, 'Toque ou AÇÃO: continuar · Esc: pular', 11, { color: '#d8c8e8', bold: false }).setDepth(22);
    uiButton(this, GAME_W - 70, 30, 'Pular >', () => this.finish(), { size: 15 });
    this.input.on('pointerdown', (_p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => { if (!over.length) this.advance(); });

    Audio.music(this.musicFor(id));
    this.cameras.main.fadeIn(300, 27, 20, 36);
    const level = LEVELS.find((l) => l.story === id);
    if (level && !level.soon) this.showTitleCard(LEVELS.indexOf(level) + 1, level.month, level.name);
    else this.showLine();
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

  /** Cartão de título do capítulo, com linhas de velocidade (estilo abertura de anime). */
  private showTitleCard(n: number, month: string, name: string): void {
    this.titleCard = true;
    const c = this.add.container(0, 0).setDepth(50);
    const bg = this.add.graphics();
    bg.fillStyle(0x1b1424, 0.85).fillRect(0, GAME_H / 2 - 80, GAME_W, 160);
    for (let i = 0; i < 26; i++) {
      const y = GAME_H / 2 - 76 + Math.random() * 152;
      bg.fillStyle(0xffd6e4, Phaser.Math.FloatBetween(0.08, 0.3)).fillRect(Math.random() * GAME_W, y, Phaser.Math.Between(60, 240), 2);
    }
    bg.fillStyle(0xff9cc2, 1).fillRect(0, GAME_H / 2 - 82, GAME_W, 4).fillRect(0, GAME_H / 2 + 78, GAME_W, 4);
    c.add(bg);
    c.add(txt(this, GAME_W / 2, GAME_H / 2 - 36, `Capítulo ${n} · ${month}`, 20, { color: '#ffd25e' }));
    const title = txt(this, GAME_W / 2, GAME_H / 2 + 12, name, 46, { color: '#ffd6e4', strokeW: 8 });
    c.add(title);
    c.setAlpha(0);
    this.tweens.add({ targets: c, alpha: 1, duration: 250 });
    this.tweens.add({ targets: title, x: { from: GAME_W / 2 + 80, to: GAME_W / 2 }, duration: 450, ease: 'Back.Out' });
    Audio.play('bell');
    const close = () => {
      if (!this.titleCard) return;
      this.titleCard = false;
      this.tweens.add({ targets: c, alpha: 0, duration: 250, onComplete: () => c.destroy() });
      this.showLine();
    };
    this.time.delayedCall(1700, close);
    this.input.once('pointerdown', close);
  }

  private speakerName(l: Line): string {
    if (l.who === 0 || l.who === 1) return this.names[l.who];
    const n = NPC[l.who];
    return n ? fillNames(n.name, this.names) : '';
  }

  private speakerColor(l: Line): string {
    if (l.who === 0) return '#6cc4ff';
    if (l.who === 1) return '#ff9cc2';
    return NPC[l.who]?.color ?? '#d8c8e8';
  }

  private showLine(): void {
    const l = this.lines[this.idx];
    if (!l) { this.finish(); return; }
    this.full = fillNames(l.text, this.names);
    this.shown = 0;
    this.next.setVisible(false);
    const name = this.speakerName(l);
    this.nameT.setText(name);
    this.nameTag.clear();
    if (name) {
      const w = this.nameT.width + 28;
      this.nameTag.fillStyle(Phaser.Display.Color.HexStringToColor(this.speakerColor(l)).color, 1).fillRoundedRect(60, GAME_H - 184, w, 32, 10);
      this.nameTag.lineStyle(3, 0x2a1d2e, 1).strokeRoundedRect(60, GAME_H - 184, w, 32, 10);
    }
    this.body.setText('');
    this.body.setColor(l.who === 'n' ? '#d8c8e8' : '#fff4e0');
    this.body.setFontStyle(l.who === 'n' ? 'italic' : 'normal');
    const mood = moodOf(this.full);
    this.portraits.forEach((p, i) => {
      const active = l.who === i;
      p.setTint(active ? 0xffffff : 0x8a80a0).setFrame(active ? mood : 0);
      if (active) this.tweens.add({ targets: p, scale: { from: 4.25, to: 4 }, y: { from: 246, to: 256 }, duration: 220, ease: 'Back.Out' });
    });
    for (const [who, img] of Object.entries(this.npcs) as [Speaker, Phaser.GameObjects.Image][]) {
      const on = l.who === who;
      this.tweens.add({ targets: img, alpha: on ? 1 : 0, duration: 250 });
      if (on && img.texture.key.startsWith('portrait_')) img.setFrame(mood);
    }
    if (l.who === 'nimbo') Audio.play('boss');
    if (l.who === 'avestruz') { Audio.play('crow'); this.cameras.main.shake(300, 0.01); }
    if (l.who === 'mae') Audio.play('gator');
    if (mood === 3) for (let i = 0; i < 6; i++) this.time.delayedCall(i * 90, () => this.heartPop(l));
  }

  /** Coraçõezinhos saindo do retrato (momentos ♥). */
  private heartPop(l: Line): void {
    const x = l.who === 0 ? 210 : l.who === 1 ? 750 : GAME_W / 2;
    const h = this.add.image(x + Phaser.Math.Between(-80, 80), 220, 'fx_heart').setScale(3).setDepth(15);
    this.tweens.add({ targets: h, y: 120, alpha: 0, duration: 1200, onComplete: () => h.destroy() });
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
    if (this.titleCard) return;
    if (this.shown < this.full.length) {
      const prev = Math.floor(this.shown);
      this.shown = Math.min(this.full.length, this.shown + delta * 0.05);
      if (Math.floor(this.shown) !== prev && Math.floor(this.shown) % 3 === 0) Audio.play('blip');
      this.body.setText(this.full.slice(0, Math.floor(this.shown)));
      if (this.shown >= this.full.length) this.next.setVisible(true);
    }
    if (Input.confirmPressed()) this.advance();
  }

  private advance(): void {
    if (this.done || this.titleCard) return;
    if (this.shown < this.full.length) { this.shown = this.full.length; this.body.setText(this.full); this.next.setVisible(true); }
    else { this.idx++; this.showLine(); }
  }
}
