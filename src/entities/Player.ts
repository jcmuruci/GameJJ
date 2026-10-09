import Phaser from 'phaser';
import { CharacterLook } from '../data/characters';
import { charFrame, Dir } from '../art/CharacterArt';
import { Item } from './Item';
import { PlayerId, PlayerState } from '../systems/InputManager';
import { PLAYER_TINTS } from '../config';

export interface Interactable {
  x: number;
  y: number;
  /** Alcance extra para seleção (padrão 0). */
  reach?: number;
  /** Prioridade de seleção (maior vence em empate). */
  priority?: number;
  /** Pode ser selecionado por este jogador agora? */
  selectable?(p: Player): boolean;
  interact?(p: Player): boolean;
  canWork?(p: Player): boolean;
  work?(p: Player, dt: number): void;
  onMagic?(p: Player): boolean;
  onStrike?(p: Player, dmg: number): boolean;
  /** Texto curto de dica exibido ao selecionar. */
  hint?(p: Player): string | null;
}

export class Player {
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  readonly shadow: Phaser.GameObjects.Image;
  readonly selector: Phaser.GameObjects.Image;
  readonly marker: Phaser.GameObjects.Triangle;
  held: Item | null = null;
  face = { x: 0, y: 1 };
  dir: Dir = 'down';
  hp: number;
  maxHp: number;
  fainted = false;
  invuln = 0;
  actTimer = 0;
  abilityCd = 0;
  abilityMax = 0.5;
  hugRequest = -999;
  idleTime = 0;
  target: Interactable | null = null;
  working = false;
  speed = 82;
  speedMult = 1;
  slowTimer = 0;
  private animT = 0;
  private knock = { x: 0, y: 0, t: 0 };
  private stepT = 0;
  moving = false;
  /** Travado por animação (ex.: descendo de rapel). */
  locked = false;

  constructor(
    public scene: Phaser.Scene,
    public id: PlayerId,
    public look: CharacterLook,
    x: number,
    y: number,
    maxHp: number,
  ) {
    this.hp = maxHp;
    this.maxHp = maxHp;
    this.shadow = scene.add.image(x, y, 'shadow').setAlpha(0.25);
    this.sprite = scene.physics.add.sprite(x, y - 8, `char_${id}`, 0);
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.setSize(10, 6).setOffset(3, 17);
    body.setCollideWorldBounds(true);
    this.selector = scene.add.image(0, 0, 'select').setTint(PLAYER_TINTS[id]).setVisible(false).setDepth(4000);
    this.marker = scene.add.triangle(x, y, 0, 0, 6, 0, 3, 4, PLAYER_TINTS[id]).setOrigin(0.5).setDepth(6000);
    this.marker.setStrokeStyle(1, 0x2a1d2e);
  }

  get body(): Phaser.Physics.Arcade.Body {
    return this.sprite.body as Phaser.Physics.Arcade.Body;
  }

  /** Posição dos pés (centro do corpo físico). */
  get x(): number { return this.body.center.x; }
  get y(): number { return this.body.center.y; }

  /** Ponto logo à frente do personagem. */
  front(dist = 12): { x: number; y: number } {
    return { x: this.x + this.face.x * dist, y: this.y + this.face.y * dist };
  }

  teleport(x: number, y: number): void {
    this.body.reset(x, y - 8);
  }

  update(dt: number, inp: PlayerState, canMove: (p: Player, vx: number, vy: number) => [number, number]): void {
    this.invuln = Math.max(0, this.invuln - dt);
    this.actTimer = Math.max(0, this.actTimer - dt);
    this.abilityCd = Math.max(0, this.abilityCd - dt);
    this.slowTimer = Math.max(0, this.slowTimer - dt);

    let vx = 0;
    let vy = 0;
    if (!this.fainted && !this.locked) {
      vx = inp.x;
      vy = inp.y;
      if (vx !== 0 || vy !== 0) {
        // direção dominante -> face em 4 direções (mais previsível na cozinha)
        if (Math.abs(vx) > Math.abs(vy) + 0.01) this.face = { x: Math.sign(vx), y: 0 };
        else this.face = { x: 0, y: Math.sign(vy) };
      }
    }
    const mult = this.speedMult * (this.working ? 0 : 1) * (this.slowTimer > 0 ? 0.5 : 1) * (this.held ? 0.95 : 1);
    vx *= this.speed * mult;
    vy *= this.speed * mult;
    [vx, vy] = canMove(this, vx, vy);
    if (this.knock.t > 0) {
      this.knock.t -= dt;
      vx += this.knock.x;
      vy += this.knock.y;
    }
    this.body.setVelocity(vx, vy);
    this.moving = Math.abs(vx) + Math.abs(vy) > 5;
    this.idleTime = this.moving ? 0 : this.idleTime + dt;

    // animação
    this.dir = this.face.y !== 0 ? (this.face.y > 0 ? 'down' : 'up') : 'side';
    this.sprite.setFlipX(this.face.x > 0);
    let col = 0;
    if (this.actTimer > 0) col = 3;
    else if (this.moving) {
      this.animT += dt * 8 * Math.min(1.4, this.speedMult);
      col = [1, 0, 2, 0][Math.floor(this.animT) % 4];
      this.stepT += dt;
    } else if (this.working) {
      this.animT += dt * 10;
      col = Math.floor(this.animT) % 2 ? 3 : 0;
    }
    if (!this.fainted) this.sprite.setFrame(charFrame(this.dir, col));

    // visual de dano / desmaio
    if (this.fainted) {
      this.sprite.setAngle(90).setTint(0xb0a0c0);
    } else {
      this.sprite.setAngle(0);
      if (this.invuln > 0) this.sprite.setAlpha(Math.floor(this.invuln * 12) % 2 ? 0.35 : 1);
      else this.sprite.setAlpha(1);
      this.sprite.clearTint();
    }
  }

  /** Atualiza objetos visuais acoplados (sombra, item carregado...). Chamado após a física. */
  postUpdate(time: number): void {
    const x = this.x;
    const y = this.y;
    this.shadow.setPosition(x, y + 2).setDepth(y - 1);
    this.sprite.setDepth(y);
    if (this.held) {
      const bob = this.moving ? Math.sin(time / 70) * 1 : 0;
      this.held.setPosition(x, y - 26 + bob, y + 1);
    }
    this.marker.setPosition(x, y - (this.held ? 38 : 30) + Math.sin(time / 200) * 1.5);
  }

  pushBack(fromX: number, fromY: number, force = 160, t = 0.18): void {
    const dx = this.x - fromX;
    const dy = this.y - fromY;
    const len = Math.hypot(dx, dy) || 1;
    this.knock = { x: (dx / len) * force, y: (dy / len) * force, t };
  }

  takeStep(): boolean {
    if (this.stepT > 0.28) { this.stepT = 0; return true; }
    return false;
  }
}
