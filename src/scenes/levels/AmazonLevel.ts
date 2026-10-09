import Phaser from 'phaser';
import { AMAZON_MAP } from '../../data/maps';
import { PuzzleLevel } from './PuzzleLevel';
import { T } from '../../art/tiles';
import { Player, Interactable } from '../../entities/Player';
import { Item } from '../../entities/Item';
import { Slime } from '../../entities/Enemy';
import type { HUDScene } from '../HUDScene';
import { GAME_W, TILE } from '../../config';
import { txt } from '../../ui/text';

const GATOR_LINES = ['Oi, jacarezinho!', 'Que fofura!!', 'Meu sonho!', 'Vem, lindão!', 'Amo jacarés!'];
const GATOR_TIME = 10;

/** Jacaré que vira ponte quando {p2} o chama com magia. */
class Gator implements Interactable {
  x: number;
  y: number;
  up = false;
  t = 0;
  bubbles: Phaser.GameObjects.Image;
  sprite: Phaser.GameObjects.Sprite;
  private hintCd = 0;
  constructor(public L: AmazonLevel, public tx: number, public ty: number) {
    const c = L.tileCenter(tx, ty);
    this.x = c.x;
    this.y = c.y;
    L.layer.putTileAt(T.WATER, tx, ty);
    this.bubbles = L.add.image(c.x, c.y, 'bubbles').setDepth(-5);
    L.tweens.add({ targets: this.bubbles, y: c.y - 1.5, alpha: 0.6, duration: 600, yoyo: true, repeat: -1 });
    this.sprite = L.add.sprite(c.x, c.y, 'gator', 0).setDepth(-6).setVisible(false);
    if (Math.random() < 0.5) this.sprite.setFlipX(true);
  }

  selectable(): boolean { return false; }

  occupied(): boolean {
    return this.L.players.some((p) => Math.abs(p.x - this.x) < 10 && Math.abs(p.y - this.y) < 10);
  }

  onMagic(p: Player): boolean {
    if (p.id !== 1) return false;
    if (this.up) { this.t = GATOR_TIME; return false; } // já está de pé: a magia segue para o próximo
    this.up = true;
    this.t = GATOR_TIME;
    this.L.layer.getTileAt(this.tx, this.ty)?.setCollision(false, false, false, false);
    this.bubbles.setVisible(false);
    this.sprite.setVisible(true).setAlpha(0).setScale(0.6).play('gator-blink');
    this.L.tweens.add({ targets: this.sprite, alpha: 1, scale: 1, duration: 300, ease: 'Back.Out' });
    this.L.sfx('gator');
    this.L.sfx('splash');
    this.L.burst(this.x, this.y, 'fx_pixel', 8, { speed: 40, tint: 0xbfe9ff });
    this.L.floatHeart(this.x, this.y - 12);
    if (Math.random() < 0.6) this.L.say(p, Phaser.Utils.Array.GetRandom(GATOR_LINES), 1400);
    this.L.gatorsCalled++;
    return true;
  }

  onStrike(p: Player): boolean {
    if (this.hintCd > 0) return true;
    this.hintCd = 4;
    this.L.say(p, this.up ? `Ei! Ele é amigo da ${this.L.names[1]}!` : `Só aparecem pra ${this.L.names[1]}...`, 1600);
    return true;
  }

  update(dt: number): void {
    this.hintCd = Math.max(0, this.hintCd - dt);
    if (!this.up) return;
    if (this.occupied()) this.t = Math.max(this.t, 0.6);
    this.t -= dt;
    this.sprite.setAlpha(this.t < 2 && Math.floor(this.t * 8) % 2 ? 0.5 : 1);
    if (this.t <= 2) this.L.drawBar(this.x, this.y + 9, this.t / 2, 0x8be07a);
    if (this.t <= 0) {
      this.up = false;
      this.L.layer.getTileAt(this.tx, this.ty)?.setCollision(true, true, true, true);
      this.L.tweens.add({ targets: this.sprite, alpha: 0, scale: 0.6, duration: 250, onComplete: () => this.sprite.setVisible(false) });
      this.bubbles.setVisible(true);
      this.L.sfx('splash');
    }
  }
}

/** Epílogo: Amazônia — devolver os 3 filhotes à mamãe jacaré e voltar de canoa. */
export class AmazonLevel extends PuzzleLevel {
  gators: Gator[] = [];
  delivered = 0;
  gatorsCalled = 0;
  private babyText: Phaser.GameObjects.Text | null = null;

  constructor() {
    super('AmazonLevel');
  }

  mapRows(): string[] {
    this.resetPuzzle();
    this.gators = [];
    this.delivered = 0;
    this.gatorsCalled = 0;
    this.boulderTex = 'log_big';
    this.boulderFillsWater = true;
    this.defaultFloor = T.DARK_GRASS;
    this.objectFloor = T.DARK_GRASS;
    this.signTexts = [
      'Amazônia! Os jacarés só aparecem pra {p2}: MAGIA nas bolhinhas e eles viram ponte por alguns segundos.',
      'Um filhote ficou preso na ilha do lago! Chamem os jacarés um de cada vez.',
      'Troncos: {p1} empurra para dentro do rio e eles viram ponte para sempre!',
      'A canoa de volta! Mas só depois de levar os 3 filhotes até a mamãe jacaré.',
      'Ninho da Mamãe Jacaré: tragam os 3 filhotes perdidos (AÇÃO para carregar).',
    ];
    return AMAZON_MAP;
  }

  spawn(ch: string, tx: number, ty: number): boolean {
    const c = this.tileCenter(tx, ty);
    switch (ch) {
      case 'J': { const g = new Gator(this, tx, ty); this.gators.push(g); this.interactables.push(g); return true; }
      case 'q': this.layer.putTileAt(T.WATER, tx, ty); this.add.image(c.x, c.y, 'lily').setDepth(-5); return true;
      case 'j': this.placeFloorItem(new Item(this, 'baby', c.x, c.y), c.x, c.y); return true;
      case 'm': this.enemies.push(new Slime(this, c.x, c.y, 'mosquito', 1, 42, 80)); return true;
      case 'Z': this.add.image(c.x, c.y - 13, 'tree_jungle').setDepth(c.y + 6); this.addSolid(tx, ty); return true;
      case 'V': this.spawnVines(tx, ty); return true;
      case 'N': this.spawnNest(tx, ty); return true;
      case 'X': {
        const img = this.add.image(c.x, c.y, 'canoe').setDepth(c.y - 4);
        this.tweens.add({ targets: img, y: c.y + 1, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
        this.exits.push({ x: c.x, y: c.y, img });
        return true;
      }
      default:
        return this.spawnPuzzle(ch, tx, ty);
    }
  }

  private spawnNest(tx: number, ty: number): void {
    const c = this.tileCenter(tx, ty);
    const img = this.add.image(c.x, c.y - 4, 'nest').setDepth(c.y + 4);
    this.addSolid(tx, ty);
    this.addSolid(tx - 1, ty);
    this.addSolid(tx + 1, ty);
    this.tweens.add({ targets: img, scaleY: 1.03, duration: 900, yoyo: true, repeat: -1 });
    this.interactables.push({
      x: c.x, y: c.y, reach: 10, priority: 3,
      interact: (p: Player) => {
        if (p.held?.kind === 'baby') {
          p.held.destroy();
          p.held = null;
          this.delivered++;
          this.sfx('gator');
          this.sfx('deliver');
          for (let i = 0; i < 8; i++) this.time.delayedCall(i * 80, () => this.floatHeart(c.x + Phaser.Math.Between(-14, 14), c.y - 16));
          const baby = this.add.image(c.x + Phaser.Math.Between(-10, 10), c.y + 2, 'item_baby').setDepth(c.y + 5);
          this.tweens.add({ targets: baby, y: baby.y - 2, duration: 400, yoyo: true, repeat: -1 });
          this.babyText?.setText(`${this.delivered} / 3 filhotes`);
          if (this.delivered >= 3) {
            this.hud?.banner('Família reunida!', 'Agora voltem juntos para a canoa', 2200);
            this.say({ x: c.x, y: c.y - 14 }, 'Obrigada, casal mais lindo da Amazônia!', 2600, '#d8f0c8');
          } else {
            this.say({ x: c.x, y: c.y - 14 }, Phaser.Utils.Array.GetRandom(['Meu bebê! Obrigada!', 'Que alívio!', 'Vocês são demais!']), 1800, '#d8f0c8');
          }
          return true;
        }
        this.say({ x: c.x, y: c.y - 14 }, `Ajudem a achar meus ${3 - this.delivered} filhotes, por favor!`, 2000, '#d8f0c8');
        return true;
      },
    });
  }

  setup(): void {
    this.enemyColliders();
    // araras voando e vaga-lumes
    for (let i = 0; i < 4; i++) this.time.addEvent({ delay: 4000 + i * 3500, loop: true, callback: () => this.macaw() });
    this.add.particles(0, 0, 'fx_spark', {
      x: { min: 0, max: this.cols * TILE }, y: { min: 0, max: this.rows * TILE }, lifespan: 3000, speed: { min: 2, max: 8 },
      scale: { start: 0.5, end: 0 }, alpha: { start: 0.8, end: 0 }, frequency: 150, tint: 0xd8ffa8,
    }).setDepth(9500);
  }

  private macaw(): void {
    const cam = this.cameras.main.worldView;
    const y = cam.y + Phaser.Math.Between(10, 80);
    const m = this.add.image(cam.x - 10, y, 'macaw').setDepth(9600).setFlipX(true);
    this.tweens.add({ targets: m, x: cam.x + cam.width + 20, y: y + Phaser.Math.Between(-20, 20), duration: 3500, onComplete: () => m.destroy() });
  }

  onHudReady(hud: HUDScene): void {
    const g = hud.add.graphics();
    g.fillStyle(0x1b1424, 0.75).fillRoundedRect(GAME_W / 2 - 110, 8, 220, 40, 10);
    hud.add.image(GAME_W / 2 - 80, 28, 'item_baby').setScale(2.2);
    this.babyText = txt(hud, GAME_W / 2 + 10, 28, '0 / 3 filhotes', 18, { color: '#d8f0c8' });
    hud.toast('Um ano depois... Amazônia! Ajudem a mamãe jacaré.', '#d8f0c8', 3200);
  }

  onEnemyKilled(e: Slime): void {
    if (Math.random() < 0.3) this.addPickup(Math.random() < 0.5 ? 'coin' : 'heart', e.x, e.y);
  }

  tick(dt: number): void {
    for (const g of this.gators) g.update(dt);
    this.updatePuzzle(dt);
  }

  onExit(): void {
    if (this.delivered < 3) {
      this.say(this.players[0], `Faltam ${3 - this.delivered} filhote(s) para a mamãe!`, 1800);
      return;
    }
    const stars = 1 + (this.stats.faints === 0 ? 1 : 0) + (this.elapsed < 360 ? 1 : 0);
    const score = Math.max(0, Math.round(2000 - this.elapsed * 3 + this.stats.coins * 5));
    const mm = Math.floor(this.elapsed / 60);
    const ss = String(Math.floor(this.elapsed % 60)).padStart(2, '0');
    this.finish({
      win: true, stars, score, title: 'Família jacaré reunida!',
      lines: [
        `Tempo: ${mm}:${ss} ${this.elapsed < 360 ? '(estrela!)' : '(meta: 6:00)'}`,
        `Desmaios: ${this.stats.faints} ${this.stats.faints === 0 ? '(estrela!)' : ''}`,
        `Jacarés chamados por ${this.names[1]}: ${this.gatorsCalled}`,
      ],
    });
  }
}
