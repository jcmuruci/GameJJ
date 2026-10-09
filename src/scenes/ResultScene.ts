import Phaser from 'phaser';
import { GAME_W, GAME_H } from '../config';
import { txt, panel } from '../ui/text';
import { MenuList } from '../ui/MenuList';
import { Save } from '../systems/SaveManager';
import { Audio } from '../systems/Audio';
import { LEVELS, levelById, levelIndex } from '../data/levels';
import { cozyBackground } from './MenuScene';
import { charFrame } from '../art/CharacterArt';

interface ResultData {
  levelId: string;
  win: boolean;
  stars: number;
  score: number;
  title: string;
  lines: string[];
  stats: { hugs: number; faints: number; revives: number; crystals: number; coins: number };
}

/** Tela de vitória/derrota com estrelas, moedas e próximas opções. */
export class ResultScene extends Phaser.Scene {
  private list!: MenuList;
  private ready = false;

  constructor() {
    super('Result');
  }

  create(d: ResultData): void {
    this.ready = false;
    const info = levelById(d.levelId);
    cozyBackground(this, d.win ? 0xffffff : 0x8a8aa8);
    this.add.graphics().fillStyle(0x1b1424, 0.4).fillRect(0, 0, GAME_W, GAME_H);
    panel(this, GAME_W / 2 - 300, 40, 600, 460);
    txt(this, GAME_W / 2, 84, d.win ? 'Vitória!' : 'Que pena!', 46, { color: d.win ? '#ffd25e' : '#ff9cc2' });
    txt(this, GAME_W / 2, 126, `${info.name} · ${d.title}`, 16, { color: '#fff4e0', bold: false });

    // personagens
    [0, 1].forEach((i) => {
      const s = this.add.sprite(GAME_W / 2 + (i === 0 ? -230 : 230), 210, `char_${i}`, charFrame('down', d.win ? 3 : 0)).setScale(4);
      if (d.win) this.tweens.add({ targets: s, y: 196, duration: 300, yoyo: true, repeat: -1, ease: 'Sine.Out', delay: i * 150 });
      else s.setAngle(i === 0 ? -8 : 8);
    });

    // estrelas
    for (let i = 0; i < 3; i++) {
      const filled = i < d.stars;
      const s = this.add.image(GAME_W / 2 + (i - 1) * 76, 200, 'ui_star_empty').setScale(5);
      if (filled) {
        this.time.delayedCall(400 + i * 350, () => {
          s.setTexture('ui_star');
          Audio.play('coin');
          this.tweens.add({ targets: s, scale: { from: 8, to: 5 }, duration: 300, ease: 'Back.Out' });
        });
      }
    }

    // recompensa
    let coins = 0;
    let newBest = false;
    if (d.win) {
      const prev = Save.data.levels[d.levelId]?.stars ?? 0;
      // moedas: por estrela (dobro para estrelas novas) + moedas coletadas
      coins = d.stars * info.coinsPerStar + Math.max(0, d.stars - prev) * info.coinsPerStar + d.stats.coins;
      newBest = Save.record(d.levelId, d.stars, d.score).newBest;
      Save.data.coins += coins;
      Save.save();
    }
    const lines = [...d.lines];
    if (d.win) lines.push(`Moedas ganhas: +${coins}${newBest && d.score ? '  (novo recorde!)' : ''}`);
    lines.forEach((l, i) => txt(this, GAME_W / 2, 268 + i * 26, l, 16, { bold: false, color: i === lines.length - 1 && d.win ? '#ffd25e' : '#fff4e0' }));

    const idx = levelIndex(d.levelId);
    const next = LEVELS[idx + 1]?.id ?? d.levelId;
    const items = [];
    if (d.win && info.endStory) items.push({ label: 'Ver o final ♥', onSelect: () => this.go('Story', { id: info.endStory, next: 'Map', nextData: { select: next } }) });
    else if (d.win) items.push({ label: 'Continuar', onSelect: () => this.go('Map', { select: next }) });
    items.push({ label: d.win ? 'Jogar de novo' : 'Tentar de novo', onSelect: () => this.go(info.scene, { levelId: d.levelId }) });
    items.push({ label: 'Voltar ao mapa', onSelect: () => this.go('Map', { select: d.levelId }) });
    this.list = new MenuList(this, GAME_W / 2, 400, items, 34, 20);
    this.list.setVisible(false);
    this.time.delayedCall(900, () => { this.list.setVisible(true); this.ready = true; });
    Audio.music(d.win ? 'map' : null);
  }

  private go(scene: string, data: object): void {
    this.ready = false;
    this.cameras.main.fadeOut(300, 27, 20, 36);
    this.time.delayedCall(320, () => this.scene.start(scene, data));
  }

  update(): void {
    if (this.ready) this.list.update();
  }
}
