import Phaser from 'phaser';
import type { BaseLevel } from '../scenes/levels/BaseLevel';
import type { Player } from './Player';
import { Audio } from '../systems/Audio';

/** Geleca saltitante: persegue o jogador mais próximo e causa dano ao encostar. */
export class Slime {
  sprite: Phaser.Physics.Arcade.Sprite;
  hp: number;
  dead = false;
  stun = 0;
  private hopT = Math.random() * 2;
  private wander = { x: 0, y: 0 };
  private flash = 0;

  constructor(public level: BaseLevel, x: number, y: number, public kind: 'slime' | 'slime_storm' = 'slime', hp = 2, public speed = 34, public aggro = 90) {
    this.hp = hp;
    this.sprite = level.physics.add.sprite(x, y, kind, 0);
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.setSize(10, 7).setOffset(3, 8);
    body.setCollideWorldBounds(true);
    this.sprite.setDepth(y);
  }

  get x(): number { return (this.sprite.body as Phaser.Physics.Arcade.Body).center.x; }
  get y(): number { return (this.sprite.body as Phaser.Physics.Arcade.Body).center.y; }

  update(dt: number, players: Player[]): void {
    if (this.dead) return;
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    this.hopT += dt;
    this.flash = Math.max(0, this.flash - dt);
    if (this.flash <= 0) this.sprite.clearTint();
    if (this.stun > 0) {
      this.stun -= dt;
      body.setVelocity(0, 0);
      this.sprite.setTint(0xffb8d8);
      return;
    }
    let target: Player | null = null;
    let best = this.aggro;
    for (const p of players) {
      if (p.fainted) continue;
      const d = Phaser.Math.Distance.Between(this.x, this.y, p.x, p.y);
      if (d < best) { best = d; target = p; }
    }
    const hopping = Math.sin(this.hopT * 7) > -0.2;
    this.sprite.setFrame(hopping ? 0 : 1);
    if (target) {
      const a = Math.atan2(target.y - this.y, target.x - this.x);
      const s = hopping ? this.speed : this.speed * 0.3;
      body.setVelocity(Math.cos(a) * s, Math.sin(a) * s);
    } else {
      if (Math.random() < dt * 0.6) {
        const a = Math.random() * Math.PI * 2;
        this.wander = { x: Math.cos(a) * 14, y: Math.sin(a) * 14 };
      }
      body.setVelocity(this.wander.x, this.wander.y);
    }
    this.sprite.setDepth(this.y);
    for (const p of players) {
      if (!p.fainted && Phaser.Math.Distance.Between(this.x, this.y, p.x, p.y) < 10) this.level.damagePlayer(p, 1, this.x, this.y);
    }
  }

  hit(dmg: number, from: { x: number; y: number }, magic = false): void {
    if (this.dead) return;
    this.hp -= dmg;
    this.flash = 0.12;
    this.sprite.setTintFill(0xffffff);
    if (magic) this.stun = 1.2;
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    const a = Math.atan2(this.y - from.y, this.x - from.x);
    body.setVelocity(Math.cos(a) * 180, Math.sin(a) * 180);
    Audio.play('hit');
    if (this.hp <= 0) this.die();
  }

  die(): void {
    this.dead = true;
    this.level.burst(this.x, this.y, 'fx_smoke', 8, { speed: 40, lifespan: 400 });
    this.level.onEnemyKilled(this);
    this.sprite.destroy();
  }
}
