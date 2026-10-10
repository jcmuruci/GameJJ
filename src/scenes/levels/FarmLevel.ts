import Phaser from 'phaser';
import { PuzzleLevel } from './PuzzleLevel';
import { FARM_MAP } from '../../data/maps';
import { T } from '../../art/tiles';
import { Player, Interactable } from '../../entities/Player';
import type { HUDScene } from '../HUDScene';
import { GAME_W, TILE, ZOOM, RES } from '../../config';
import { txt } from '../../ui/text';
import { TaskList } from '../../ui/TaskList';
import { plaque } from './Scenery';
import { Input, KEY_LABELS } from '../../systems/InputManager';
import { Audio } from '../../systems/Audio';

const ANIMALS: Record<string, { tex: string; anim: string; name: string; line: string }> = {
  g: { tex: 'goat', anim: 'goat-walk', name: 'Cabra', line: 'Méééé! ♥' },
  u: { tex: 'horse', anim: 'horse-walk', name: 'Cavalo', line: 'Hiiiin! ♥' },
  d: { tex: 'dog', anim: 'dog-walk', name: 'Cachorro', line: 'Au au! ♥' },
  c: { tex: 'chicken', anim: 'chicken-fly', name: 'Galinha', line: 'Có-có! ♥' },
};

/** Animal calmo: passeia perto de casa e adora carinho (AÇÃO). */
class Animal implements Interactable {
  img: Phaser.GameObjects.Sprite;
  x: number;
  y: number;
  priority = 2;
  reach = 4;
  petted = false;
  private target = { x: 0, y: 0 };
  private t = 0;
  constructor(public L: FarmLevel, public kind: string, public hx: number, public hy: number) {
    this.x = hx;
    this.y = hy;
    this.img = L.add.sprite(hx, hy, ANIMALS[kind].tex, 0).setDepth(hy);
    this.target = { x: hx, y: hy };
  }
  interact(p: Player): boolean {
    const a = ANIMALS[this.kind];
    this.L.say({ x: this.x, y: this.y - 6 }, a.line, 1400, '#fff4e0');
    for (let i = 0; i < 4; i++) this.L.time.delayedCall(i * 90, () => this.L.floatHeart(this.x + Phaser.Math.Between(-6, 6), this.y - 10));
    this.L.sfx('heart');
    if (!this.petted) {
      this.petted = true;
      this.L.onPet(p, a.name);
    }
    return true;
  }
  update(dt: number): void {
    this.t -= dt;
    if (this.t <= 0) {
      this.t = Phaser.Math.FloatBetween(1.5, 3.5);
      this.target = { x: this.hx + Phaser.Math.Between(-20, 20), y: this.hy + Phaser.Math.Between(-12, 12) };
    }
    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const d = Math.hypot(dx, dy);
    if (d > 1) {
      this.x += (dx / d) * 14 * dt;
      this.y += (dy / d) * 14 * dt;
      this.img.setFlipX(dx > 0);
      if (!this.img.anims.isPlaying) this.img.play(ANIMALS[this.kind].anim);
    } else this.img.stop();
    this.img.setPosition(this.x, this.y).setDepth(this.y);
  }
}

/** A avestruz que quase atacou: fixa o olhar, corre em linha reta e fica tonta. */
class Ostrich implements Interactable {
  sprite: Phaser.Physics.Arcade.Sprite;
  state: 'wander' | 'aim' | 'charge' | 'dizzy' | 'scared' = 'wander';
  t = 1;
  dir = { x: 0, y: 0 };
  reach = 6;
  private mark: Phaser.GameObjects.Text;
  constructor(public L: FarmLevel, x: number, y: number) {
    this.sprite = L.physics.add.sprite(x, y, 'ostrich', 0).setDepth(y);
    const b = this.sprite.body as Phaser.Physics.Arcade.Body;
    b.setSize(14, 8).setOffset(5, 19).setCollideWorldBounds(true);
    L.physics.add.collider(this.sprite, L.layer);
    L.physics.add.collider(this.sprite, L.solids);
    this.mark = L.add.text(x, y - 30, '!', { fontFamily: 'monospace', fontSize: '14px', color: '#ff5c5c', stroke: '#2a1d2e', strokeThickness: 3, fontStyle: 'bold' })
      .setOrigin(0.5).setDepth(9600).setVisible(false).setResolution(ZOOM * RES + 1);
  }
  get body(): Phaser.Physics.Arcade.Body { return this.sprite.body as Phaser.Physics.Arcade.Body; }
  get x(): number { return this.body.center.x; }
  get y(): number { return this.body.center.y; }
  selectable(): boolean { return false; }
  onStrike(): boolean { return this.scare(); }
  onMagic(): boolean { return this.scare(); }

  scare(): boolean {
    if (this.state === 'scared') return false;
    this.state = 'scared';
    this.t = 2;
    this.L.onOstrichScared();
    this.L.sfx('crow');
    this.L.say({ x: this.x, y: this.y - 22 }, 'QUÉÉÉ?!', 1000, '#fff4e0');
    const p = this.L.players.reduce((a, b) => (this.L.dist(a, this) < this.L.dist(b, this) ? a : b));
    const a = Math.atan2(this.y - p.y, this.x - p.x);
    this.dir = { x: Math.cos(a), y: Math.sin(a) };
    return true;
  }

  update(dt: number): void {
    const L = this.L;
    this.t -= dt;
    const fieldMin = 14 * TILE + 6;
    const fieldMax = 25 * TILE - 6;
    let vx = 0;
    let vy = 0;
    const targets = L.players.filter((p) => !p.fainted && !p.locked && p.x > fieldMin - 6 && p.x < fieldMax + 6);
    switch (this.state) {
      case 'wander':
        if (this.t <= 0) { this.t = Phaser.Math.FloatBetween(1, 2.5); const a = Math.random() * Math.PI * 2; this.dir = { x: Math.cos(a), y: Math.sin(a) }; }
        vx = this.dir.x * 20; vy = this.dir.y * 20;
        if (targets.length && this.t < 2.4) {
          const p = targets.reduce((a, b) => (L.dist(a, this) < L.dist(b, this) ? a : b));
          if (L.dist(p, this) < 120) {
            this.state = 'aim';
            this.t = 0.75;
            const a = Math.atan2(p.y - this.y, p.x - this.x);
            this.dir = { x: Math.cos(a), y: Math.sin(a) };
            this.mark.setVisible(true);
            L.sfx('crow');
          }
        }
        break;
      case 'aim':
        this.sprite.x += Math.sin(L.time.now / 30) * 0.4;
        if (this.t <= 0) { this.state = 'charge'; this.t = 0.9; this.mark.setVisible(false); }
        break;
      case 'charge':
        vx = this.dir.x * 190; vy = this.dir.y * 190;
        if (Math.random() < dt * 20) L.burst(this.x, this.y + 4, 'fx_dust', 1, { speed: 15, lifespan: 300 });
        for (const p of L.players) {
          if (!p.fainted && !p.locked && L.dist(p, this) < 13) {
            if (L.damagePlayer(p, 1, this.x, this.y)) L.say(p, 'Socorro, a avestruz!', 1400);
            p.pushBack(this.x, this.y, 240, 0.25);
          }
        }
        if (this.t <= 0 || this.body.blocked.left || this.body.blocked.right || this.body.blocked.up || this.body.blocked.down) {
          this.state = 'dizzy';
          this.t = 1.4;
        }
        break;
      case 'dizzy':
        if (this.t <= 0) { this.state = 'wander'; this.t = 1.5; }
        break;
      case 'scared':
        vx = this.dir.x * 70; vy = this.dir.y * 70;
        if (this.t <= 0) { this.state = 'wander'; this.t = 2; }
        break;
    }
    if (this.state !== 'charge' && this.state !== 'aim') this.mark.setVisible(false);
    this.body.setVelocity(vx, vy);
    // nunca sai do cercado, mesmo com o portão aberto
    if (this.x < fieldMin) this.sprite.x += fieldMin - this.x;
    if (this.x > fieldMax) this.sprite.x -= this.x - fieldMax;
    const moving = Math.abs(vx) + Math.abs(vy) > 5;
    this.sprite.setFrame(this.state === 'dizzy' ? 2 : moving && Math.floor(L.time.now / (this.state === 'charge' ? 70 : 160)) % 2 ? 1 : 0);
    if (Math.abs(vx) > 1) this.sprite.setFlipX(vx > 0);
    this.sprite.setDepth(this.y);
    this.mark.setPosition(this.x, this.y - 30);
  }
}

/** Pedalinho: os dois pedalam (AÇÃO). Pedaladas juntas aceleram; só um lado faz virar. */
class Pedalinho {
  c: Phaser.GameObjects.Container;
  x: number;
  y: number;
  angle = 0; // radianos; 0 = para a direita
  v = 0;
  w = 0;
  lastTap = [-9, -9];
  constructor(public L: FarmLevel, x: number, y: number) {
    this.x = x;
    this.y = y;
    const heads = [0, 1].map((i) => L.add.sprite(i === 0 ? -5 : 5, -10, `char_${i}`, 0).setCrop(0, 0, 16, 13));
    this.c = L.add.container(x, y, [...heads, L.add.image(0, 0, 'pedalinho')]).setDepth(5000);
  }
  tap(id: number): void {
    const now = this.L.time.now / 1000;
    this.lastTap[id] = now;
    const together = Math.abs(this.lastTap[0] - this.lastTap[1]) < 0.35;
    this.v = Math.min(120, this.v + (together ? 26 : 14));
    if (!together) this.w += id === 0 ? 0.9 : -0.9;
    else if (Math.random() < 0.3) this.L.floatHeart(this.x, this.y - 18);
    Audio.play('splash');
  }
  update(dt: number): void {
    for (let i = 0; i < 2; i++) {
      if (Input.players[i].actionPressed) this.tap(i);
      this.w += Input.players[i].x * 1.6 * dt; // leme
    }
    this.angle += this.w * dt;
    this.w *= Math.max(0, 1 - 3 * dt);
    this.v *= Math.max(0, 1 - 0.7 * dt);
    const nx = this.x + Math.cos(this.angle) * this.v * dt;
    const ny = this.y + Math.sin(this.angle) * this.v * dt;
    if (this.water(nx, ny)) { this.x = nx; this.y = ny; }
    else { this.v = -this.v * 0.3; this.L.cameras.main.shake(80, 0.003); }
    this.c.setPosition(this.x, this.y).setDepth(this.y + 10);
    this.c.setScale(Math.cos(this.angle) < 0 ? -1 : 1, 1);
    this.c.y += Math.sin(this.L.time.now / 300) * 1;
  }
  /** O casco inteiro precisa estar na água. */
  water(x: number, y: number): boolean {
    const pts = [[x - 12, y], [x + 12, y], [x, y - 6], [x, y + 8]];
    return pts.every(([px, py]) => this.L.layer.getTileAtWorldXY(px, py)?.index === T.WATER);
  }
}

export class FarmLevel extends PuzzleLevel {
  animals: Animal[] = [];
  ostrich: Ostrich | null = null;
  ducks: { s: Phaser.GameObjects.Sprite; vx: number; vy: number }[] = [];
  boat: Pedalinho | null = null;
  buoys: { img: Phaser.GameObjects.Image; label: Phaser.GameObjects.Text; x: number; y: number }[] = [];
  buoyIdx = 0;
  boatTime = 0;
  dock = { x: 0, y: 0 };
  private hudText: Phaser.GameObjects.Text | null = null;
  private arrow: Phaser.GameObjects.Triangle | null = null;

  constructor() {
    super('FarmLevel');
  }

  mapRows(): string[] {
    this.resetPuzzle();
    this.animals = [];
    this.ostrich = null;
    this.ducks = [];
    this.boat = null;
    this.buoys = [];
    this.buoyIdx = 0;
    this.boatTime = 0;
    this.hits = 0;
    this.arrow = null;
    this.defaultFloor = T.GRASS;
    this.objectFloor = T.GRASS;
    this.signTexts = [
      'Hotel Fazenda! Os bichinhos são calmos: façam carinho (AÇÃO) em todos.',
      'Cuidado com a AVESTRUZ! Ela encara e corre. Espada ou magia espantam ela.',
      'Pedalinho no lago: o pier é logo ali. Pedalem JUNTOS!',
      'A runa rosa abre o portão enquanto a {p2} estiver nela... distraiam a avestruz!',
    ];
    return FARM_MAP;
  }

  spawn(ch: string, tx: number, ty: number): boolean {
    const c = this.tileCenter(tx, ty);
    if (ANIMALS[ch]) { const a = new Animal(this, ch, c.x, c.y); this.animals.push(a); this.interactables.push(a); return true; }
    if (ch === 'e') { this.ostrich = new Ostrich(this, c.x, c.y); this.interactables.push(this.ostrich); return true; }
    if (ch === 'q') {
      this.layer.putTileAt(T.WATER, tx, ty);
      this.ducks.push({ s: this.add.sprite(c.x, c.y, 'duck', 0).play('duck-swim').setDepth(c.y), vx: Phaser.Math.Between(-10, 10), vy: Phaser.Math.Between(-6, 6) });
      return true;
    }
    if (ch === 'F') {
      this.add.image(c.x, c.y + 8, 'farmhouse').setOrigin(0.5, 1).setDepth(c.y + 8);
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 0; dy++) this.addSolid(tx + dx, ty + dy);
      return true;
    }
    if (ch === 'X') {
      this.dock = { x: c.x, y: c.y };
      const img = this.add.image(c.x, c.y, 'dock').setDepth(-5);
      this.exits.push({ x: c.x, y: c.y, img });
      return true;
    }
    return this.spawnPuzzle(ch, tx, ty);
  }

  setup(): void {
    this.enemyColliders();
    plaque(this, 4, 1, 'HOTEL FAZENDA');
    plaque(this, 28, 9, 'PEDALINHO');
  }

  onHudReady(hud: HUDScene): void {
    const g = hud.add.graphics();
    g.fillStyle(0x1b1424, 0.75).fillRoundedRect(GAME_W / 2 - 130, 8, 260, 40, 10);
    this.hudText = txt(hud, GAME_W / 2, 28, '', 18, { color: '#ffd6e4' });
    this.refreshHud();
    hud.toast('Setembro de 2026: Hotel Fazenda! Carinho nos bichos e... cuidado com a avestruz.', '#fff4e0', 3600);
    this.ostrichScares = 0;
    this.tasks = new TaskList(hud, 12, 12, [
      { id: 'pet', text: 'Carinho nos bichos', goal: this.animals.length },
      { id: 'ostrich', text: 'Espantar a avestruz brava', goal: 2 },
      { id: 'buoys', text: 'Pedalinho: passar nas boias', goal: 5 },
      { id: 'dock', text: 'Voltar ao pier pedalando juntos' },
    ]);
  }

  private refreshHud(): void {
    if (!this.hudText) return;
    if (this.boat) this.hudText.setText(`Boias: ${Math.min(this.buoyIdx, 5)}/5 · ${this.boatTime.toFixed(0)}s`);
    else this.hudText.setText(`Carinhos: ${this.animals.filter((a) => a.petted).length}/${this.animals.length} ♥`);
  }

  onPet(p: Player, name: string): void {
    this.refreshHud();
    this.tasks?.progress('pet', this.animals.filter((a) => a.petted).length);
    this.hud?.floatText(p.x, p.y - 30, `${name}: carinho!`, '#ff9cc2');
  }

  tick(dt: number): void {
    for (const a of this.animals) a.update(dt);
    for (const d of this.ducks) {
      const nx = d.s.x + d.vx * dt;
      const ny = d.s.y + d.vy * dt;
      if (this.layer.getTileAtWorldXY(nx, ny)?.index === T.WATER) { d.s.setPosition(nx, ny); } else { d.vx = -d.vx; d.vy = -d.vy; }
      d.s.setFlipX(d.vx > 0);
      if (Math.random() < dt * 0.3) { d.vx = Phaser.Math.Between(-12, 12); d.vy = Phaser.Math.Between(-6, 6); }
    }
    if (this.boat) { this.tickBoat(dt); return; }
    this.ostrich?.update(dt);
    this.updatePuzzle(dt);
  }

  onExit(): void {
    if (this.boat) return;
    this.startBoat();
  }

  private startBoat(): void {
    Audio.play('confirm');
    this.cameras.main.flash(250, 255, 255, 255);
    for (const p of this.players) {
      p.locked = true;
      p.body.checkCollision.none = true;
      p.sprite.setVisible(false);
      p.shadow.setVisible(false);
      p.marker.setVisible(false);
      if (p.held) { p.held.destroy(); p.held = null; }
    }
    this.boat = new Pedalinho(this, this.dock.x + 34, this.dock.y);
    const spots = [[33, 4], [37, 9], [32, 12], [36, 18], [31, 22]];
    this.buoys = spots.map(([tx, ty], i) => {
      const c = this.tileCenter(tx, ty);
      const img = this.add.image(c.x, c.y, 'buoy').setDepth(c.y);
      const label = this.add.text(c.x, c.y - 14, String(i + 1), { fontFamily: 'monospace', fontSize: '10px', color: '#fff4e0', stroke: '#2a1d2e', strokeThickness: 3, fontStyle: 'bold' })
        .setOrigin(0.5).setDepth(9500).setResolution(ZOOM * RES + 1);
      return { img, label, x: c.x, y: c.y };
    });
    this.arrow = this.add.triangle(0, 0, 0, 0, 8, 0, 4, 6, 0xffd25e).setDepth(9600).setStrokeStyle(1, 0x2a1d2e);
    this.hud?.banner('Pedalinho!', `Os dois pedalam com ${KEY_LABELS[0].action}/${KEY_LABELS[1].action} · juntos = rápido, sozinho = vira`, 2600);
    this.refreshHud();
  }

  private tickBoat(dt: number): void {
    const b = this.boat!;
    b.update(dt);
    this.boatTime += dt;
    for (const p of this.players) p.teleport(b.x, b.y);
    // patos: esbarrar deixa mais devagar
    for (const d of this.ducks) {
      if (Math.hypot(d.s.x - b.x, d.s.y - b.y) < 14) {
        b.v *= 0.5;
        d.vx = Math.sign(d.s.x - b.x || 1) * 30;
        d.vy = Math.sign(d.s.y - b.y || 1) * 15;
        if (Math.random() < 0.3) this.say({ x: d.s.x, y: d.s.y - 6 }, 'Quack!', 800, '#fff4e0');
      }
    }
    const target = this.buoyIdx < this.buoys.length ? this.buoys[this.buoyIdx] : { x: this.dock.x + 22, y: this.dock.y };
    this.buoys.forEach((bu, i) => {
      bu.img.setAlpha(i < this.buoyIdx ? 0.3 : 1);
      bu.img.y = bu.y + Math.sin(this.time.now / 300 + i) * 1;
      bu.label.setColor(i === this.buoyIdx ? '#ffd25e' : '#fff4e0');
    });
    this.arrow?.setPosition(target.x, target.y - 22 + Math.sin(this.time.now / 150) * 2);
    if (Math.hypot(target.x - b.x, target.y - b.y) < 18) {
      if (this.buoyIdx < this.buoys.length) {
        this.buoyIdx++;
        this.tasks?.progress('buoys', this.buoyIdx);
        Audio.play('coin');
        this.hud?.floatText(b.x, b.y - 24, this.buoyIdx < this.buoys.length ? `Boia ${this.buoyIdx}!` : 'Agora, de volta ao pier!', '#ffd25e');
      } else {
        this.finishFarm();
      }
    }
    this.refreshHud();
  }

  private finishFarm(): void {
    this.tasks?.done('dock');
    const pets = this.animals.filter((a) => a.petted).length;
    const fast = this.boatTime < 75;
    const stars = 1 + (pets >= this.animals.length ? 1 : 0) + (fast ? 1 : 0);
    const score = Math.max(0, Math.round(1500 - this.elapsed * 2 + pets * 100));
    this.finish({
      win: true, stars, score, title: 'Mestres do pedalinho!',
      lines: [
        `Carinhos: ${pets}/${this.animals.length} ${pets >= this.animals.length ? '(estrela!)' : ''}`,
        `Pedalinho: ${this.boatTime.toFixed(0)}s ${fast ? '(estrela!)' : '(meta: 75s)'}`,
        `Sustos com a avestruz: ${this.stats.faints + this.hits}`,
        this.tasks ? this.tasks.summary() : '',
      ].filter(Boolean),
    });
  }

  tasks: TaskList | null = null;
  ostrichScares = 0;
  onOstrichScared(): void {
    this.ostrichScares++;
    this.tasks?.progress('ostrich', this.ostrichScares);
  }

  hits = 0;
  damagePlayer(p: Player, n: number, fromX: number, fromY: number): boolean {
    const before = p.hp;
    super.damagePlayer(p, n, fromX, fromY);
    const hit = p.hp < before;
    if (hit) this.hits++;
    return hit;
  }
}
