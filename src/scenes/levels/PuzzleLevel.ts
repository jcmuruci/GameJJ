import Phaser from 'phaser';
import { BaseLevel } from './BaseLevel';
import { Player, Interactable } from '../../entities/Player';
import { Slime } from '../../entities/Enemy';
import { Input } from '../../systems/InputManager';
import { TILE } from '../../config';
import { fillNames } from '../../ui/text';
import { T } from '../../art/tiles';

/** Gatilhos: caractere do mapa -> tipo e portão que controla. */
export const TRIGGERS: Record<string, { type: 'plate' | 'rune'; gate: string }> = {
  '1': { type: 'plate', gate: 'A' }, '2': { type: 'plate', gate: 'B' }, '3': { type: 'plate', gate: 'C' }, '4': { type: 'plate', gate: 'D' },
  '7': { type: 'plate', gate: 'E' }, '8': { type: 'plate', gate: 'F' },
  '5': { type: 'rune', gate: 'E' }, '6': { type: 'rune', gate: 'F' }, '9': { type: 'rune', gate: 'A' }, '0': { type: 'rune', gate: 'B' },
};
const GATE_LETTERS = 'ABCDEFGHM';

export class Boulder {
  img: Phaser.GameObjects.Image;
  zone: Phaser.GameObjects.Zone;
  moving = false;
  constructor(public L: PuzzleLevel, public tx: number, public ty: number) {
    const c = L.tileCenter(tx, ty);
    this.img = L.add.image(c.x, c.y, L.boulderTex).setDepth(c.y);
    this.zone = L.addSolid(tx, ty, this);
  }
  get x(): number { return this.tx * TILE + 8; }
  get y(): number { return this.ty * TILE + 8; }

  tryMove(dx: number, dy: number): boolean {
    if (this.moving) return false;
    const nx = this.tx + dx;
    const ny = this.ty + dy;
    const tile = this.L.layer.getTileAt(nx, ny);
    if (this.L.boulderFillsWater && tile?.index === T.WATER && !this.L.occupied.has(this.L.key(nx, ny))) {
      // tronco cai na água e vira ponte
      this.L.occupied.delete(this.L.key(this.tx, this.ty));
      this.L.setSolidEnabled(this.zone, false);
      this.L.boulders = this.L.boulders.filter((b) => b !== this);
      const c = this.L.tileCenter(nx, ny);
      this.L.tweens.add({
        targets: this.img, x: c.x, y: c.y, duration: 220,
        onComplete: () => {
          this.img.destroy();
          this.L.layer.putTileAt(T.BRIDGE, nx, ny);
          this.L.burst(c.x, c.y, 'fx_pixel', 10, { speed: 50, tint: 0xbfe9ff });
          this.L.sfx('drop');
          this.L.hud?.floatText(c.x, c.y - 10, 'Ponte!', '#8be07a');
        },
      });
      this.L.sfx('push');
      return true;
    }
    if (this.L.isBlocked(nx, ny)) return false;
    // não esmaga jogadores
    for (const p of this.L.players) {
      if (Math.floor(p.x / TILE) === nx && Math.floor(p.y / TILE) === ny) return false;
    }
    this.L.occupied.delete(this.L.key(this.tx, this.ty));
    this.tx = nx;
    this.ty = ny;
    this.L.occupied.set(this.L.key(nx, ny), this);
    const c = this.L.tileCenter(nx, ny);
    this.zone.setPosition(c.x, c.y);
    (this.zone.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
    this.moving = true;
    this.L.tweens.add({
      targets: this.img, x: c.x, y: c.y, duration: 200, ease: 'Sine.Out',
      onUpdate: () => this.img.setDepth(this.img.y),
      onComplete: () => { this.moving = false; },
    });
    this.L.sfx('push');
    this.L.burst(c.x - dx * 8, c.y + 6, 'fx_dust', 4, { speed: 20, lifespan: 300 });
    return true;
  }
}

class Trigger {
  img: Phaser.GameObjects.Image;
  active = false;
  constructor(public L: PuzzleLevel, public tx: number, public ty: number, public type: 'plate' | 'rune', public gate: string) {
    const c = L.tileCenter(tx, ty);
    this.img = L.add.image(c.x, c.y, type === 'plate' ? 'pplate_off' : 'rune_off').setDepth(-5);
    if (type === 'rune') L.tweens.add({ targets: this.img, alpha: 0.75, duration: 900, yoyo: true, repeat: -1 });
  }
  get x(): number { return this.tx * TILE + 8; }
  get y(): number { return this.ty * TILE + 8; }
}

export class Gate {
  img: Phaser.GameObjects.Image;
  zone: Phaser.GameObjects.Zone;
  open = false;
  forced = false;
  constructor(public L: PuzzleLevel, public tx: number, public ty: number, public letter: string) {
    const c = L.tileCenter(tx, ty);
    this.img = L.add.image(c.x, c.y, 'gate_closed').setDepth(c.y - 8);
    this.zone = L.addSolid(tx, ty, this);
  }
  setOpen(v: boolean): void {
    if (v === this.open) return;
    if (!v) {
      // não fecha em cima de alguém
      for (const p of this.L.players) {
        if (Math.abs(p.x - (this.tx * TILE + 8)) < 13 && Math.abs(p.y - (this.ty * TILE + 8)) < 11) return;
      }
      if (this.L.boulders.some((b) => b.tx === this.tx && b.ty === this.ty)) return;
    }
    this.open = v;
    this.img.setTexture(v ? 'gate_open' : 'gate_closed');
    this.L.setSolidEnabled(this.zone, !v);
    this.L.tweens.add({ targets: this.img, scaleY: { from: 0.8, to: 1 }, duration: 160 });
  }
}

/** Fase com enigmas: pedras, placas de pressão, runas, portões, espinhos, alavancas, placas de aviso e saída. */
export abstract class PuzzleLevel extends BaseLevel {
  boulders: Boulder[] = [];
  triggers: Trigger[] = [];
  gates: Gate[] = [];
  levers: { it: Interactable & { pulled: number; img: Phaser.GameObjects.Image }; }[] = [];
  exits: { x: number; y: number; img: Phaser.GameObjects.Image }[] = [];
  signTexts: string[] = [];
  private signIdx = 0;
  private pushT = [0, 0];
  private heavyCd = 0;
  private runeHintCd = 0;
  private leverOpen = false;
  private exitHintCd = 0;
  protected gateSound = new Set<string>();
  anchors: { x: number; y: number }[] = [];
  rappels = 0;
  boulderTex = 'boulder';
  boulderFillsWater = false;
  private belayCd = 0;
  private rope: Phaser.GameObjects.Graphics | null = null;

  resetPuzzle(): void {
    this.boulders = [];
    this.triggers = [];
    this.gates = [];
    this.levers = [];
    this.exits = [];
    this.signIdx = 0;
    this.pushT = [0, 0];
    this.heavyCd = 0;
    this.runeHintCd = 0;
    this.leverOpen = false;
    this.exitHintCd = 0;
    this.gateSound = new Set();
    this.anchors = [];
    this.rappels = 0;
    this.belayCd = 0;
    this.rope = null;
  }

  /** Objetos comuns de enigma. Subclasses chamam isto no seu spawn(). */
  spawnPuzzle(ch: string, tx: number, ty: number): boolean {
    const c = this.tileCenter(tx, ty);
    if (TRIGGERS[ch]) { const t = TRIGGERS[ch]; this.triggers.push(new Trigger(this, tx, ty, t.type, t.gate)); return true; }
    if (GATE_LETTERS.includes(ch) && ch.length === 1 && ch === ch.toUpperCase() && ch !== 'G') { this.gates.push(new Gate(this, tx, ty, ch)); return true; }
    switch (ch) {
      case 'G': this.gates.push(new Gate(this, tx, ty, 'G')); return true;
      case 'O': this.boulders.push(new Boulder(this, tx, ty)); return true;
      case 'T': this.spawnThorns(tx, ty); return true;
      case 'K': this.spawnCracked(tx, ty); return true;
      case 'l': this.spawnLever(tx, ty); return true;
      case 'i': this.spawnSign(tx, ty); return true;
      case 'X': {
        const img = this.add.image(c.x, c.y, 'exit').setDepth(-4);
        this.tweens.add({ targets: img, scale: 1.15, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
        this.exits.push({ x: c.x, y: c.y, img });
        return true;
      }
      case '*': this.addPickup('crystal', c.x, c.y); return true;
      case '$': this.addPickup('coin', c.x, c.y); return true;
      case 'v': this.addPickup('heart', c.x, c.y); return true;
      case 's': {
        const e = new Slime(this, c.x, c.y);
        this.enemies.push(e);
        return true;
      }
      case 'S': this.add.image(c.x, c.y, 'anchor').setDepth(-4); this.anchors.push({ x: c.x, y: c.y }); return true;
      case 'R':
        this.layer.putTileAt(T.CLIFF, tx, ty);
        this.add.image(c.x, c.y, 'rope_top').setDepth(c.y + 1);
        this.interactables.push({ x: c.x, y: c.y, priority: 3, reach: 2, interact: (p) => this.tryRappel(p, tx, ty) });
        return true;
      case 'W': this.spawnWaterfall(tx, ty); return true;
      case 'Z': this.add.image(c.x, c.y - 12, 'tree_big').setDepth(c.y + 6); this.addSolid(tx, ty); return true;
      case 'Y': this.add.image(c.x, c.y - 12, 'tree_pink').setDepth(c.y + 6); this.addSolid(tx, ty); return true;
      case 'b': this.add.image(c.x, c.y, 'bush').setDepth(c.y); this.addSolid(tx, ty); return true;
      case 'o': this.add.image(c.x, c.y + 2, 'rock_small').setDepth(c.y); return true;
      default: return false;
    }
  }

  /** Colisões de inimigos com o cenário (chamar no setup). */
  enemyColliders(): void {
    for (const e of this.enemies) {
      this.physics.add.collider(e.sprite, this.layer);
      this.physics.add.collider(e.sprite, this.solids);
    }
  }

  private spawnThorns(tx: number, ty: number): void {
    const c = this.tileCenter(tx, ty);
    const img = this.add.image(c.x, c.y, 'thorns').setDepth(c.y);
    const zone = this.addSolid(tx, ty);
    let hint = 0;
    const it: Interactable = {
      x: c.x, y: c.y,
      selectable: () => false,
      onMagic: (p) => {
        if (p.id !== 1) return false;
        this.removeInteractable(it);
        this.sfx('fire');
        const f = this.add.sprite(c.x, c.y, 'fire', 0).setDepth(c.y + 1).setScale(1.3).play('fire-anim');
        this.tweens.add({ targets: img, alpha: 0, duration: 500, onComplete: () => img.destroy() });
        this.time.delayedCall(500, () => { f.destroy(); this.setSolidEnabled(zone, false); this.burst(c.x, c.y, 'fx_smoke', 6, { speed: 25, gravity: -30 }); });
        return true;
      },
      onStrike: (p) => {
        if (p.id !== 0) return false;
        this.sfx('hit');
        p.pushBack(c.x, c.y, 120, 0.12);
        if (this.time.now > hint) { hint = this.time.now + 5000; this.say(p, `Ai! Espinhos... ${this.names[1]}, queima isso?`, 2000); }
        return true;
      },
    };
    this.interactables.push(it);
  }

  private spawnCracked(tx: number, ty: number): void {
    const c = this.tileCenter(tx, ty);
    const img = this.add.image(c.x, c.y, 'rock_cracked').setDepth(c.y);
    const zone = this.addSolid(tx, ty);
    let hp = 2;
    let hint = 0;
    const it: Interactable = {
      x: c.x, y: c.y,
      selectable: () => false,
      onStrike: (p) => {
        if (p.id !== 0) return false;
        hp--;
        this.sfx('hit');
        this.cameras.main.shake(80, 0.003);
        this.burst(c.x, c.y, 'fx_dust', 5, { speed: 40 });
        this.tweens.add({ targets: img, x: c.x + 1, yoyo: true, duration: 40, repeat: 2 });
        if (hp <= 0) {
          this.removeInteractable(it);
          this.burst(c.x, c.y, 'fx_dust', 14, { speed: 70, lifespan: 500 });
          img.destroy();
          this.setSolidEnabled(zone, false);
        }
        return true;
      },
      onMagic: (p) => {
        if (this.time.now > hint) { hint = this.time.now + 5000; this.say(p, `Magia não quebra pedra... ${this.names[0]}?`, 2000); }
        return true;
      },
    };
    this.interactables.push(it);
  }

  private spawnLever(tx: number, ty: number): void {
    const c = this.tileCenter(tx, ty);
    const img = this.add.image(c.x, c.y, 'lever_off').setDepth(c.y);
    this.addSolid(tx, ty);
    const it = {
      x: c.x, y: c.y, priority: 2, pulled: -99, img,
      interact: () => {
        if (this.leverOpen) return true;
        it.pulled = this.time.now / 1000;
        img.setTexture('lever_on');
        this.sfx('lever');
        const others = this.levers.filter((l) => l.it !== it);
        if (others.every((l) => this.time.now / 1000 - l.it.pulled < 1.2)) {
          this.leverOpen = true;
          this.gates.filter((g) => g.letter === 'G').forEach((g) => { g.forced = true; });
          this.hud?.toast('As alavancas abriram o portão! Sincronia perfeita!', '#8be07a');
          this.sfx('gate');
        } else {
          this.time.delayedCall(1200, () => {
            if (!this.leverOpen) { img.setTexture('lever_off'); this.sfx('lever'); }
          });
        }
        return true;
      },
    };
    this.levers.push({ it });
    this.interactables.push(it);
  }

  private spawnSign(tx: number, ty: number): void {
    const c = this.tileCenter(tx, ty);
    this.add.image(c.x, c.y, 'sign').setDepth(c.y);
    this.addSolid(tx, ty);
    const text = this.signTexts[this.signIdx++] ?? '...';
    this.interactables.push({
      x: c.x, y: c.y, priority: 1,
      interact: () => { this.say({ x: c.x, y: c.y - 6 }, fillNames(text, this.names), 4200, '#fff4e0'); this.sfx('blip'); return true; },
    });
  }

  /** O parceiro está dando segurança (segurando AÇÃO numa ancoragem)? */
  belaying(o: Player): boolean {
    return !o.fainted && !o.locked && Input.players[o.id].action && this.anchors.some((a) => this.dist(o, a) < 16);
  }

  /** Rapel: só desce se o parceiro estiver na segurança. */
  tryRappel(p: Player, tx: number, ty: number): boolean {
    const top = ty * TILE;
    if (p.held) { this.say(p, 'Mãos livres pra descer!', 1400); return true; }
    if (p.y > top + 8) { this.say(p, 'Corda é pra descer, não pra subir!', 1400); return true; }
    const o = this.other(p);
    if (!this.belaying(o)) {
      if (this.belayCd <= 0) {
        this.belayCd = 2;
        this.say(p, `${this.names[o.id]}, me dá segurança? (segure AÇÃO na ancoragem)`, 2200);
      }
      this.sfx('wrong');
      return true;
    }
    const x = tx * TILE + 8;
    const y0 = top - 6;
    const y1 = (ty + 1) * TILE + 9;
    p.locked = true;
    p.face = { x: 0, y: 1 };
    p.body.checkCollision.none = true;
    p.teleport(x, y0);
    this.say(o, 'Segurança! Pode descer!', 1400);
    this.sfx('lever');
    if (!this.rope) this.rope = this.add.graphics().setDepth(9000);
    const t = { v: 0 };
    this.tweens.add({
      targets: t, v: 1, duration: 1500, ease: 'Sine.InOut',
      onUpdate: () => {
        const yy = y0 + (y1 - y0) * t.v;
        const sway = Math.sin(t.v * Math.PI * 4) * 2;
        p.teleport(x + sway, yy);
        this.rope!.clear().lineStyle(1, 0xe8424a, 1).lineBetween(x, top + 2, x + sway, yy - 18);
        if (Math.random() < 0.15) this.sfx('step');
      },
      onComplete: () => {
        this.rope?.clear();
        p.locked = false;
        p.body.checkCollision.none = false;
        this.rappels++;
        this.sfx('revive');
        this.floatHeart(p.x, p.y - 26);
        this.say(p, Phaser.Utils.Array.GetRandom(['Uhuul!', 'Igualzinho ao dia em que a gente se conheceu!', 'Que vista!', 'Adrenalina!']), 2000);
      },
    });
    return true;
  }

  openGates(letter: string): void {
    this.gates.filter((g) => g.letter === letter).forEach((g) => { g.forced = true; });
  }

  /** Atualiza empurrões, placas, runas, portões e saída. Chamar em tick(). */
  updatePuzzle(dt: number): void {
    this.heavyCd = Math.max(0, this.heavyCd - dt);
    this.runeHintCd = Math.max(0, this.runeHintCd - dt);
    this.exitHintCd = Math.max(0, this.exitHintCd - dt);
    this.belayCd = Math.max(0, this.belayCd - dt);
    for (const p of this.players) this.updatePush(p, dt);

    // gatilhos
    const activeGates = new Set<string>();
    for (const t of this.triggers) {
      let on = false;
      for (const p of this.players) {
        if (p.fainted) continue;
        if (Math.abs(p.x - t.x) < 8 && Math.abs(p.y - t.y) < 8) {
          if (t.type === 'plate' || p.id === 1) on = true;
          else if (this.runeHintCd <= 0) { this.runeHintCd = 6; this.say(p, `Nada... só ${this.names[1]} ativa runas.`, 1800); }
        }
      }
      if (t.type === 'plate' && this.boulders.some((b) => b.tx === t.tx && b.ty === t.ty && !b.moving)) on = true;
      if (on !== t.active) {
        t.active = on;
        t.img.setTexture(t.type === 'plate' ? (on ? 'pplate_on' : 'pplate_off') : on ? 'rune_on' : 'rune_off');
        this.sfx(t.type === 'plate' ? 'plate' : 'rune');
        if (on && t.type === 'rune') this.burst(t.x, t.y, 'fx_heart', 6, { speed: 30, lifespan: 600 });
      }
      if (on) activeGates.add(t.gate);
    }
    for (const g of this.gates) {
      const want = g.forced || activeGates.has(g.letter);
      if (want !== g.open) {
        const before = g.open;
        g.setOpen(want);
        if (g.open !== before && !this.gateSound.has(g.letter + want)) {
          this.sfx('gate');
          this.gateSound.add(g.letter + want);
          this.time.delayedCall(100, () => this.gateSound.delete(g.letter + want));
        }
      }
    }

    // saída: os dois juntos
    for (const ex of this.exits) {
      const on = this.players.filter((p) => !p.fainted && Math.hypot(p.x - ex.x, p.y - ex.y) < 14);
      if (on.length === 2) { this.onExit(); return; }
      if (on.length === 1 && this.exitHintCd <= 0) {
        this.exitHintCd = 5;
        this.say(on[0], `Vem, ${this.names[on[0].id === 0 ? 1 : 0]}! Juntos!`, 1800);
      }
    }
  }

  onExit(): void {}

  private updatePush(p: Player, dt: number): void {
    if (p.fainted || p.held) { this.pushT[p.id] = 0; return; }
    const inp = Input.players[p.id];
    const fx = p.face.x;
    const fy = p.face.y;
    const pushing = (fx !== 0 && Math.sign(inp.x) === fx && Math.abs(inp.x) > 0.5) || (fy !== 0 && Math.sign(inp.y) === fy && Math.abs(inp.y) > 0.5);
    if (!pushing) { this.pushT[p.id] = 0; return; }
    const b = this.boulders.find((bo) => {
      const ax = (bo.x - p.x) * fx + (bo.y - p.y) * fy; // distância ao longo da direção
      const perp = Math.abs((bo.x - p.x) * fy) + Math.abs((bo.y - p.y) * fx);
      return ax > 0 && ax < 15 && perp < 9;
    });
    if (!b) { this.pushT[p.id] = 0; return; }
    this.pushT[p.id] += dt;
    if (this.pushT[p.id] < 0.2) return;
    this.pushT[p.id] = 0;
    if (p.id === 1) {
      if (this.heavyCd <= 0) { this.heavyCd = 6; this.say(p, `Pesado demais! ${this.names[0]}, me ajuda?`, 1800); }
      return;
    }
    if (!b.tryMove(fx, fy) && this.heavyCd <= 0) {
      this.heavyCd = 4;
      this.say(p, 'Travou...', 1000);
    }
  }
}
