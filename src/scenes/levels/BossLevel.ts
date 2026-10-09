import Phaser from 'phaser';
import { BOSS_MAP } from '../../data/maps';
import { BaseLevel } from './BaseLevel';
import { T } from '../../art/Textures';
import { Player, Interactable } from '../../entities/Player';
import { Slime } from '../../entities/Enemy';
import type { HUDScene } from '../HUDScene';
import { GAME_W } from '../../config';
import { txt } from '../../ui/text';
import { Audio } from '../../systems/Audio';

/**
 * Torre da Tempestade — luta contra o Nimbo.
 * Cristais de tempestade protegem o chefe: {p1} racha (espada) e {p2} estilhaça (magia) em até 4s.
 * Sem os três cristais, o Nimbo desce atordoado e fica vulnerável.
 * Legenda: C cristal · I pilar · ' ' céu (parede) · _ piso
 */

const PHASE_HP = 12;
const PHASES = 3;
const LINES_HIT = ['Ai! Isso dói!', 'Parem com isso!', 'Hmpf!', 'Não vale!'];

class StormCrystal implements Interactable {
  img: Phaser.GameObjects.Sprite;
  zone: Phaser.GameObjects.Zone;
  state: 'intact' | 'cracked' | 'gone' = 'intact';
  hp = 2;
  crackT = 0;
  x: number;
  y: number;
  reach = 2;
  private hintCd = 0;

  constructor(public L: BossLevel, tx: number, ty: number) {
    const c = L.tileCenter(tx, ty);
    this.x = c.x;
    this.y = c.y;
    this.img = L.add.sprite(c.x, c.y - 4, 'scrystal', 0).setDepth(c.y);
    this.zone = L.addSolid(tx, ty, this);
    L.tweens.add({ targets: this.img, y: c.y - 6, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  }

  selectable(): boolean { return false; }

  onStrike(p: Player, dmg: number): boolean {
    if (this.state !== 'intact') return false;
    if (p.id !== 0) return false;
    this.hp -= dmg;
    this.L.sfx('hit');
    this.L.burst(this.x, this.y - 6, 'fx_spark', 5, { speed: 40, tint: 0x9ce8ff });
    this.L.tweens.add({ targets: this.img, x: this.x + 1.5, yoyo: true, duration: 40, repeat: 2, onComplete: () => this.img.setX(this.x) });
    if (this.hp <= 0) {
      this.state = 'cracked';
      this.crackT = 4;
      this.img.setFrame(1);
      this.L.sfx('crystal');
      this.L.say({ x: this.x, y: this.y - 10 }, `Rachou! ${this.L.names[1]}, magia!`, 1600, '#ffd6e4');
    }
    return true;
  }

  onMagic(p: Player): boolean {
    if (this.state === 'gone') return false;
    if (p.id !== 1) return false;
    if (this.state === 'intact') {
      if (this.hintCd <= 0) { this.hintCd = 4; this.L.say(p, `Precisa rachar primeiro! ${this.L.names[0]}?`, 1600); }
      this.L.burst(this.x, this.y - 6, 'fx_spark', 4, { speed: 30 });
      return true;
    }
    this.state = 'gone';
    this.img.setVisible(false);
    this.L.setSolidEnabled(this.zone, false);
    this.L.sfx('crystal');
    this.L.cameras.main.shake(120, 0.005);
    this.L.burst(this.x, this.y - 6, 'fx_spark', 18, { speed: 90, lifespan: 600, tint: 0xff9cc2 });
    this.L.onCrystalShattered();
    return true;
  }

  update(dt: number): void {
    this.hintCd = Math.max(0, this.hintCd - dt);
    if (this.state === 'cracked') {
      this.crackT -= dt;
      this.img.setAlpha(this.crackT < 1.5 && Math.floor(this.crackT * 8) % 2 ? 0.5 : 1);
      this.L.drawBar(this.x, this.y + 10, Math.max(0, this.crackT / 4), 0xff7aa8);
      if (this.crackT <= 0) {
        this.state = 'intact';
        this.hp = 2;
        this.img.setFrame(0).setAlpha(1);
        this.L.say({ x: this.x, y: this.y - 10 }, 'Regenerou! Mais rápido!', 1400, '#bfe6ff');
      }
    }
  }

  respawn(): void {
    this.state = 'intact';
    this.hp = 2;
    this.img.setVisible(true).setFrame(0).setAlpha(0);
    this.L.tweens.add({ targets: this.img, alpha: 1, duration: 500 });
    this.L.setSolidEnabled(this.zone, true);
  }
}

export class BossLevel extends BaseLevel {
  boss!: Phaser.GameObjects.Sprite;
  bossHp = PHASE_HP * PHASES;
  crystals: StormCrystal[] = [];
  phase = 1;
  stunned = 0;
  private lightT = 3;
  private slimeT = 8;
  private hitCd = 0;
  private hpBar: Phaser.GameObjects.Graphics | null = null;
  private bossTarget!: Interactable;
  private bossHome = { x: 240, y: 30 };
  private flash!: Phaser.GameObjects.Rectangle;
  private rain: Phaser.GameObjects.Particles.ParticleEmitter | null = null;

  constructor() {
    super('BossLevel');
  }

  mapRows(): string[] {
    this.crystals = [];
    this.bossHp = PHASE_HP * PHASES;
    this.phase = 1;
    this.stunned = 0;
    this.lightT = 3;
    this.slimeT = 8;
    this.hitCd = 0;
    this.rain = null;
    this.defaultFloor = T.STONE_FLOOR;
    this.objectFloor = T.STONE_FLOOR;
    return BOSS_MAP;
  }

  spawn(ch: string, tx: number, ty: number): boolean {
    const c = this.tileCenter(tx, ty);
    if (ch === 'C') { this.crystals.push(new StormCrystal(this, tx, ty)); return true; }
    if (ch === 'I') { this.add.image(c.x, c.y - 8, 'pillar').setDepth(c.y + 8); this.addSolid(tx, ty); return true; }
    return false;
  }

  setup(): void {
    this.cameras.main.setBackgroundColor('#2a2a5a');
    // estrelas ao fundo (cobertas pelas nuvens)
    for (let i = 0; i < 40; i++) {
      const s = this.add.image(Phaser.Math.Between(0, 480), Phaser.Math.Between(0, 50), 'fx_spark').setScale(0.4).setAlpha(0.4).setDepth(-20);
      this.tweens.add({ targets: s, alpha: 0.1, duration: Phaser.Math.Between(500, 1500), yoyo: true, repeat: -1 });
    }
    this.boss = this.add.sprite(this.bossHome.x, this.bossHome.y, 'boss', 0).setDepth(9000);
    this.flash = this.add.rectangle(240, 136, 480, 272, 0xffffff, 0).setDepth(9999);
    const self = this;
    this.bossTarget = {
      get x() { return self.boss.x; },
      get y() { return self.boss.y + 14; },
      reach: 16,
      selectable: () => false,
      onStrike: (_p: Player, dmg: number) => this.hitBoss(dmg),
      onMagic: () => this.hitBoss(1),
    };
    this.interactables.push(...this.crystals, this.bossTarget);
  }

  onHudReady(hud: HUDScene): void {
    txt(hud, GAME_W / 2, 18, 'NIMBO, a Nuvem Rabugenta', 16, { color: '#d8c8e8' });
    this.hpBar = hud.add.graphics();
    hud.toast(`${this.names[0]} racha os cristais · ${this.names[1]} estilhaça com magia!`, '#ffd6e4', 3500);
  }

  private hitBoss(dmg: number): boolean {
    if (this.stunned <= 0 || this.bossHp <= 0) return false;
    if (this.hitCd > 0) return true;
    this.hitCd = 0.08;
    this.bossHp = Math.max(0, this.bossHp - dmg);
    this.sfx('hit');
    this.boss.setTintFill(0xffffff);
    this.time.delayedCall(70, () => this.boss.clearTint());
    this.burst(this.boss.x + Phaser.Math.Between(-10, 10), this.boss.y + 10, 'fx_spark', 4, { speed: 50 });
    if (Math.random() < 0.15) this.say({ x: this.boss.x, y: this.boss.y - 6 }, Phaser.Utils.Array.GetRandom(LINES_HIT), 900, '#d8d8e8');
    const newPhase = PHASES - Math.floor((this.bossHp - 1) / PHASE_HP);
    if (this.bossHp <= 0) this.win();
    else if (newPhase > this.phase) this.nextPhase(newPhase);
    return true;
  }

  onCrystalShattered(): void {
    if (this.crystals.every((c) => c.state === 'gone')) {
      this.stunned = 7;
      this.boss.setFrame(1);
      Audio.play('boss');
      this.hud?.banner('Agora!', 'O Nimbo está tonto: ataquem juntos!', 1300);
      this.tweens.add({ targets: this.boss, y: 92, duration: 600, ease: 'Bounce.Out' });
    }
  }

  private nextPhase(n: number): void {
    this.phase = n;
    this.stunned = 0.01; // encerra o atordoamento
    this.sfx('boss');
    this.cameras.main.shake(400, 0.01);
    this.hud?.banner(`Fase ${n}!`, n === 2 ? 'O Nimbo chama gelecas de chuva!' : 'Tempestade total! Fiquem juntos!', 1800);
    if (n === 3 && !this.rain) {
      this.rain = this.add.particles(0, -10, 'fx_rain', { x: { min: 0, max: 540 }, speedY: { min: 240, max: 300 }, speedX: -60, lifespan: 1300, frequency: 10, quantity: 2, alpha: 0.6 }).setDepth(9600);
    }
  }

  private win(): void {
    this.boss.setFrame(2);
    this.enemies.forEach((e) => e.die());
    this.tweens.add({ targets: this.boss, y: 70, scale: 1.2, duration: 800 });
    this.rain?.stop();
    const stars = 1 + (this.stats.faints === 0 ? 1 : 0) + (this.elapsed < 240 ? 1 : 0);
    const score = Math.max(0, Math.round(2000 - this.elapsed * 3 - this.stats.faints * 100));
    const mm = Math.floor(this.elapsed / 60);
    const ss = String(Math.floor(this.elapsed % 60)).padStart(2, '0');
    this.finish({
      win: true, stars, score, title: 'O céu está limpo!',
      lines: [`Tempo: ${mm}:${ss} ${this.elapsed < 240 ? '(estrela!)' : '(meta: 4:00)'}`, `Desmaios: ${this.stats.faints} ${this.stats.faints === 0 ? '(estrela!)' : ''}`, `Revividas: ${this.stats.revives} · Abraços: ${this.stats.hugs}`],
    });
  }

  private lightning(): void {
    const alive = this.players.filter((p) => !p.fainted);
    if (!alive.length) return;
    const count = this.phase >= 3 ? 2 : 1;
    for (let i = 0; i < count; i++) {
      const p = alive[i % alive.length];
      const tx = Phaser.Math.Clamp(p.x + Phaser.Math.Between(-14, 14), 24, 456);
      const ty = Phaser.Math.Clamp(p.y + Phaser.Math.Between(-10, 10), 70, 250);
      const mark = this.add.image(tx, ty, 'fx_target').setDepth(-3).setAlpha(0.9);
      this.tweens.add({ targets: mark, scale: { from: 1.4, to: 0.9 }, alpha: { from: 0.4, to: 1 }, duration: 1000 });
      this.time.delayedCall(1050, () => {
        mark.destroy();
        if (this.ended) return;
        this.strike(tx, ty);
      });
    }
  }

  private strike(x: number, y: number): void {
    const g = this.add.graphics().setDepth(9500);
    const pts: { x: number; y: number }[] = [];
    const cx = this.boss.x;
    const cy = this.boss.y + 16;
    const steps = 7;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      pts.push({ x: cx + (x - cx) * t + (i > 0 && i < steps ? Phaser.Math.Between(-8, 8) : 0), y: cy + (y - cy) * t });
    }
    g.lineStyle(3, 0xfff1a8, 1);
    g.beginPath();
    pts.forEach((pt, i) => (i ? g.lineTo(pt.x, pt.y) : g.moveTo(pt.x, pt.y)));
    g.strokePath();
    g.lineStyle(1, 0xffffff, 1);
    g.beginPath();
    pts.forEach((pt, i) => (i ? g.lineTo(pt.x, pt.y) : g.moveTo(pt.x, pt.y)));
    g.strokePath();
    this.tweens.add({ targets: g, alpha: 0, duration: 250, onComplete: () => g.destroy() });
    this.flash.setAlpha(0.35);
    this.tweens.add({ targets: this.flash, alpha: 0, duration: 200 });
    this.sfx('thunder');
    this.burst(x, y, 'fx_spark', 10, { speed: 70, lifespan: 350 });
    const scorch = this.add.ellipse(x, y, 18, 8, 0x2a2a3a, 0.5).setDepth(-4);
    this.tweens.add({ targets: scorch, alpha: 0, delay: 1500, duration: 800, onComplete: () => scorch.destroy() });
    for (const p of this.players) {
      if (Math.hypot(p.x - x, p.y - y) < 14) this.damagePlayer(p, 1, x, y);
    }
  }

  private spawnSlime(): void {
    if (this.enemies.length >= 3) return;
    const x = Phaser.Math.Between(40, 440);
    const e = new Slime(this, x, 80, 'slime_storm', 2, 40, 140);
    this.physics.add.collider(e.sprite, this.layer);
    this.physics.add.collider(e.sprite, this.solids);
    e.sprite.setAlpha(0);
    this.tweens.add({ targets: e.sprite, alpha: 1, duration: 400 });
    this.enemies.push(e);
    this.sfx('magic');
  }

  onEnemyKilled(e: Slime): void {
    if (Math.random() < 0.3) this.addPickup('heart', e.x, e.y);
  }

  tick(dt: number): void {
    this.hitCd = Math.max(0, this.hitCd - dt);
    for (const c of this.crystals) c.update(dt);
    const t = this.time.now / 1000;
    if (this.stunned > 0) {
      this.stunned -= dt;
      this.boss.x = this.bossHome.x + Math.sin(t * 6) * 3;
      if (this.stunned <= 0 && this.bossHp > 0) {
        this.boss.setFrame(0);
        this.tweens.add({ targets: this.boss, y: this.bossHome.y, duration: 700, ease: 'Sine.Out' });
        this.crystals.forEach((c) => c.respawn());
        this.say({ x: this.boss.x, y: this.boss.y + 40 }, 'Vocês não vão me pegar de novo!', 1600, '#d8d8e8');
        this.lightT = 2;
      }
    } else if (this.bossHp > 0) {
      this.boss.x = this.bossHome.x + Math.sin(t * 0.8) * 120;
      this.boss.y = this.bossHome.y + Math.sin(t * 2) * 4;
      this.lightT -= dt;
      if (this.lightT <= 0) {
        this.lightT = [2.6, 2.0, 1.6][this.phase - 1];
        this.lightning();
      }
      if (this.phase >= 2) {
        this.slimeT -= dt;
        if (this.slimeT <= 0) { this.slimeT = this.phase === 2 ? 9 : 7; this.spawnSlime(); }
      }
    }
    // barra de vida do chefe
    if (this.hpBar) {
      const w = 400;
      const x0 = (GAME_W - w) / 2;
      this.hpBar.clear();
      this.hpBar.fillStyle(0x1b1424, 0.85).fillRoundedRect(x0 - 6, 32, w + 12, 18, 6);
      this.hpBar.fillStyle(0x8a8aa8, 1).fillRect(x0, 37, (this.bossHp / (PHASE_HP * PHASES)) * w, 8);
      for (let i = 1; i < PHASES; i++) this.hpBar.fillStyle(0xfff4e0, 1).fillRect(x0 + (i * w) / PHASES - 1, 35, 2, 12);
      if (this.stunned > 0) this.hpBar.fillStyle(0xffd25e, 1).fillRect(x0, 47, (this.stunned / 7) * w, 2);
    }
  }
}
