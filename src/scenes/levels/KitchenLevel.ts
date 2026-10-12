import Phaser from 'phaser';
import { BaseLevel } from './BaseLevel';
import { KITCHENS, KitchenConfig } from '../../data/kitchens';
import {
  CHOP, ItemKind, RecipeId, RECIPES, COOKERS, CookRecipe, ITEM_NAME,
  canAddToPlate, matchRecipe, canAddToCooker, cookerResult, deliveryScore, starsFor,
} from '../../data/recipes';
import { Item } from '../../entities/Item';
import { Player, Interactable } from '../../entities/Player';
import { Save } from '../../systems/SaveManager';
import { Input, KEY_LABELS } from '../../systems/InputManager';
import { Audio } from '../../systems/Audio';
import type { HUDScene } from '../HUDScene';
import { GAME_W, GAME_H, TILE, ZOOM, RES } from '../../config';
import { txt, panel, fillNames } from '../../ui/text';
import { TaskList } from '../../ui/TaskList';
import { charFrame } from '../../art/CharacterArt';
import { plaque } from './Scenery';

interface Order {
  recipe: RecipeId;
  timeLeft: number;
  total: number;
  card?: Phaser.GameObjects.Container;
  bar?: Phaser.GameObjects.Graphics;
}

// ------------------------------------------------------------------ estações
/** Segundos até um prato pronto queimar no fogo. */
const BURN_TIME = 16;

/** Barra do topo (cronômetro, moedas e estrelas), sobre a parede de cima da cozinha. */
const BAR = { x: 8, y: 4, w: 440, h: 28 };
/** Cartões de pedido: em cima do salão, um ao lado do outro. */
const ORDERS = { x: 480, y: 8, w: 112, h: 80, gap: 4 };

/** Nome das estações nas plaquinhas do chão. */
const STATION_NAMES: Record<string, string> = { b: 'Tábua', f: 'Panela', o: 'Forno', t: 'Lixo', p: 'Pratos', D: 'Entrega' };

class Surface implements Interactable {
  item: Item | null = null;
  img: Phaser.GameObjects.Image;
  x: number;
  y: number;
  priority = 1;
  tag: string;
  constructor(public L: KitchenLevel, public tx: number, public ty: number, tex: string) {
    const c = L.tileCenter(tx, ty);
    this.x = c.x;
    this.y = c.y;
    this.tag = tex;
    this.img = L.add.image(c.x, c.y, tex).setDepth(c.y - 8);
    L.addSolid(tx, ty, this);
  }

  place(it: Item): void {
    this.item = it;
    it.setPosition(this.x, this.y - 5, this.y + 2);
  }

  interact(p: Player): boolean {
    const L = this.L;
    if (p.held && !this.item) {
      this.place(p.held);
      p.held = null;
      L.sfx('drop');
      this.afterPlace(p);
      return true;
    }
    if (!p.held && this.item) {
      p.held = this.item;
      this.item = null;
      L.sfx('pick');
      p.held.pop();
      return true;
    }
    if (p.held && this.item) return L.combine(p, this);
    return false;
  }

  afterPlace(_p: Player): void {}
}

class Board extends Surface {
  progress = 0;
  private chopT = 0;
  private hinted = 0;
  constructor(L: KitchenLevel, tx: number, ty: number) { super(L, tx, ty, 'st_board'); }

  choppable(): boolean {
    return !!this.item && !this.item.isPlate && !!CHOP[this.item.kind];
  }

  interact(p: Player): boolean {
    if (p.id === 0 && !p.held && this.choppable()) return true; // segurar para cortar
    return super.interact(p);
  }

  afterPlace(p: Player): void {
    this.progress = 0;
    if (p.id === 1 && this.choppable() && this.L.time.now > this.hinted) {
      this.hinted = this.L.time.now + 15000;
      this.L.say(p, `${this.L.names[0]}, corta pra mim?`, 1800);
    }
  }

  canWork(p: Player): boolean {
    return p.id === 0 && !p.held && this.choppable();
  }

  work(_p: Player, dt: number): void {
    const speed = 1 + 0.3 * Save.data.upgrades.blade;
    this.progress += (dt * speed) / 1.3;
    this.chopT += dt;
    if (this.chopT > 0.16) {
      this.chopT = 0;
      this.L.sfx('chop');
      this.L.burst(this.x, this.y - 6, 'fx_pixel', 2, { speed: 30, lifespan: 250, tint: 0xf0e0c8 });
    }
    if (this.progress >= 1 && this.item) {
      this.progress = 0;
      this.item.setKind(CHOP[this.item.kind]!);
      this.L.burst(this.x, this.y - 6, 'fx_spark', 5, { speed: 30, lifespan: 300 });
      this.L.say(this, ITEM_NAME[this.item.kind], 1000);
    }
  }
}

class Source implements Interactable {
  x: number;
  y: number;
  priority = 1;
  tag: string;
  constructor(public L: KitchenLevel, tx: number, ty: number, tex: string, public kind: ItemKind) {
    this.tag = `src:${kind}`;
    const c = L.tileCenter(tx, ty);
    this.x = c.x;
    this.y = c.y;
    L.add.image(c.x, c.y, tex).setDepth(c.y - 8);
    L.addSolid(tx, ty, this);
    const label = L.add.image(c.x + 5, c.y - 9, `item_${kind}`).setScale(0.6).setDepth(c.y + 1);
    L.tweens.add({ targets: label, y: label.y - 1.5, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    L.stationLabel(c.x, c.y + 9, ITEM_NAME[kind]);
  }

  interact(p: Player): boolean {
    if (!p.held) {
      this.L.give(p, this.kind);
      this.L.say(p, ITEM_NAME[this.kind], 1000);
      return true;
    }
    if (p.held.kind === this.kind) {
      p.held.destroy();
      p.held = null;
      this.L.sfx('drop');
      return true;
    }
    if (p.held.isPlate && canAddToPlate(p.held.contents, this.kind, this.L.active)) {
      p.held.addContent(this.kind);
      this.L.sfx('plate');
      return true;
    }
    this.L.sfx('wrong');
    return true;
  }
}

class PlateStack extends Surface {
  constructor(L: KitchenLevel, tx: number, ty: number) { super(L, tx, ty, 'st_plates'); }
  interact(p: Player): boolean {
    if (!p.held) { this.L.give(p, 'plate'); this.L.sfx('plate'); return true; }
    if (p.held.isPlate && p.held.contents.length === 0) {
      p.held.destroy(); p.held = null; this.L.sfx('plate'); return true;
    }
    this.L.sfx('wrong');
    return true;
  }
}

class Trash implements Interactable {
  x: number;
  y: number;
  priority = 1;
  constructor(public L: KitchenLevel, tx: number, ty: number) {
    const c = L.tileCenter(tx, ty);
    this.x = c.x; this.y = c.y;
    L.add.image(c.x, c.y, 'st_trash').setDepth(c.y - 8);
    L.addSolid(tx, ty, this);
  }
  interact(p: Player): boolean {
    if (!p.held) return false;
    if (p.held.isPlate && p.held.contents.length) {
      p.held.clearContents();
    } else {
      p.held.destroy();
      p.held = null;
    }
    this.L.sfx('drop');
    this.L.burst(this.x, this.y - 6, 'fx_smoke', 4, { speed: 20, lifespan: 300 });
    return true;
  }
}

class Deliver implements Interactable {
  x: number;
  y: number;
  priority = 2;
  tag = 'deliver';
  constructor(public L: KitchenLevel, tx: number, ty: number) {
    const c = L.tileCenter(tx, ty);
    this.x = c.x; this.y = c.y;
    L.add.image(c.x, c.y, 'st_deliver').setDepth(c.y - 8);
    L.addSolid(tx, ty, this);
  }
  interact(p: Player): boolean {
    if (!p.held) return false;
    this.L.deliver(p, this);
    return true;
  }
}

class Cooker implements Interactable {
  x: number;
  y: number;
  priority = 2;
  contents: ItemKind[] = [];
  progress = 0;
  done: ItemKind | null = null;
  burnT = 0;
  burnt = false;
  fire = 0;
  fireImg: Phaser.GameObjects.Sprite;
  icons: Phaser.GameObjects.Image[] = [];
  warn: Phaser.GameObjects.Text;
  private sizzleT = 0;
  constructor(public L: KitchenLevel, tx: number, ty: number, public type: 'pot' | 'oven') {
    const c = L.tileCenter(tx, ty);
    this.x = c.x; this.y = c.y;
    L.add.image(c.x, c.y, type === 'pot' ? 'st_fire' : L.cfg.ovenTex ?? 'st_oven').setDepth(c.y - 8);
    this.fireImg = L.add.sprite(c.x, c.y + 6, 'fire', 0).setDepth(c.y - 7).setScale(0.8).setVisible(false);
    if (type === 'oven') this.fireImg.setPosition(c.x, c.y + 4).setScale(0.6);
    L.addSolid(tx, ty, this);
    this.warn = L.add.text(c.x, c.y - 22, '!', { fontFamily: 'monospace', fontSize: '12px', color: '#ff5c5c', stroke: '#2a1d2e', strokeThickness: 3, fontStyle: 'bold' })
      .setOrigin(0.5).setDepth(9500).setVisible(false).setResolution(ZOOM * RES + 1);
  }

  get recipes(): CookRecipe[] { const set = COOKERS[this.L.cfg.cookers] ?? COOKERS.classic; return this.type === 'pot' ? set.pot : set.oven; }

  private refreshIcons(): void {
    this.icons.forEach((i) => i.destroy());
    const kinds: ItemKind[] = this.burnt ? ['charcoal'] : this.done ? [this.done] : this.contents;
    this.icons = kinds.map((k, i) => this.L.add.image(this.x + (i - (kinds.length - 1) / 2) * 7, this.y - 10, `item_${k}`).setScale(0.7).setDepth(this.y + 3));
  }

  interact(p: Player): boolean {
    const L = this.L;
    if (p.held) {
      if (p.held.isPlate) {
        if (this.done && canAddToPlate(p.held.contents, this.done, L.active)) {
          p.held.addContent(this.done);
          this.reset();
          L.sfx('plate');
          return true;
        }
        if (this.done) { L.say(p, 'Não combina com esse prato'); L.sfx('wrong'); return true; }
        L.say(p, this.burnt ? 'Queimou... jogue fora!' : 'Ainda não está pronto');
        L.sfx('wrong');
        return true;
      }
      if (!this.done && !this.burnt && canAddToCooker(this.contents, p.held.kind, this.recipes)) {
        this.contents.push(p.held.kind);
        p.held.destroy();
        p.held = null;
        this.progress = 0;
        L.sfx('drop');
        this.refreshIcons();
        if (this.fire <= 0 && cookerResult(this.contents, this.recipes)) L.say(this, p.id === 1 ? 'Preciso acender!' : `${L.names[1]}, acende o fogo?`, 1600);
        return true;
      }
      L.say(p, this.type === 'pot' ? 'Isso não vai na panela' : 'Isso não vai no forno');
      L.sfx('wrong');
      return true;
    }
    if (this.burnt) {
      L.give(p, 'charcoal');
      this.reset();
      return true;
    }
    if (this.done) { L.say(p, 'Pegue um prato!'); L.sfx('wrong'); return true; }
    return false;
  }

  onMagic(p: Player): boolean {
    if (p.id !== 1) return false;
    const was = this.fire > 0;
    this.fire = this.L.cfg.fireTime + 15 * Save.data.upgrades.spark;
    this.fireImg.setVisible(true).play('fire-anim');
    this.L.sfx('fire');
    this.L.burst(this.x, this.y, 'fx_spark', 10, { speed: 50, lifespan: 400 });
    if (!was) this.L.hud?.floatText(this.x, this.y - 16, 'Fogo!', '#ffb86a');
    return true;
  }

  reset(): void {
    this.contents = [];
    this.done = null;
    this.burnt = false;
    this.progress = 0;
    this.burnT = 0;
    this.refreshIcons();
  }

  extinguish(): void {
    if (this.fire <= 0) return;
    this.fire = 0;
    this.fireImg.setVisible(false);
    this.L.burst(this.x, this.y - 2, 'fx_smoke', 6, { speed: 25, lifespan: 600, gravity: -40 });
  }

  update(dt: number, burnRate: number): void {
    const L = this.L;
    if (this.fire > 0) {
      this.fire -= dt * burnRate;
      if (this.fire <= 0) {
        this.extinguish();
        L.say(this, 'O fogo apagou!', 1400, '#ffd6e4');
      }
    }
    const rec = cookerResult(this.contents, this.recipes);
    if (this.fire > 0 && rec && !this.done) {
      this.progress += dt / rec.time;
      this.sizzleT += dt;
      if (this.sizzleT > 0.6) { this.sizzleT = 0; L.sfx('sizzle'); }
      if (Math.random() < dt * 3) L.burst(this.x, this.y - 8, 'fx_smoke', 1, { speed: 10, lifespan: 700, gravity: -30, scale: 0.6 });
      if (this.progress >= 1) {
        this.done = rec.output;
        this.contents = [];
        this.burnT = 0;
        L.sfx('bell');
        L.hud?.floatText(this.x, this.y - 18, 'Pronto!', '#8be07a');
        this.refreshIcons();
      }
    }
    if (this.done && this.fire > 0) {
      this.burnT += dt;
      if (this.burnT > BURN_TIME) {
        this.burnt = true;
        this.done = null;
        L.sfx('burn');
        L.burst(this.x, this.y - 8, 'fx_smoke', 12, { speed: 30, lifespan: 900, gravity: -40, tint: 0x555566 });
        L.hud?.toast('Queimou! Joguem o carvão no lixo.', '#ff9c9c');
        this.refreshIcons();
      }
    }
    // barras
    if (rec && !this.done && this.progress > 0) L.drawBar(this.x, this.y + 10, this.progress, 0x8be07a);
    if (this.done && this.burnT > BURN_TIME - 8) L.drawBar(this.x, this.y + 10, Math.min(1, (this.burnT - BURN_TIME + 8) / 8), 0xff5c5c);
    if (this.fire > 0) {
      const max = L.cfg.fireTime + 15 * Save.data.upgrades.spark;
      L.drawBar(this.x, this.y - 18, this.fire / max, 0xffa64a);
    }
    const needFire = this.fire <= 0 && !!rec;
    const burning = !!this.done && this.burnT > BURN_TIME - 5;
    this.warn.setVisible((needFire || burning) && Math.floor(L.time.now / 250) % 2 === 0);
    this.warn.setText(needFire ? 'fogo?' : '!');
  }
}

/** Pier de pesca: só a Juliana pesca (AÇÃO lança; AÇÃO de novo quando aparecer o "!"). */
class FishingSpot implements Interactable {
  x: number;
  y: number;
  priority = 3;
  reach = 2;
  state: 'idle' | 'wait' | 'bite' = 'idle';
  t = 0;
  fisher: Player | null = null;
  bobber: Phaser.GameObjects.Image;
  mark: Phaser.GameObjects.Text;
  private hintCd = 0;
  constructor(public L: KitchenLevel, tx: number, ty: number) {
    const c = L.tileCenter(tx, ty);
    this.x = c.x;
    this.y = c.y;
    L.setTile(4, tx, ty);
    L.add.image(c.x, c.y, 'dock').setDepth(-5);
    L.addSolid(tx, ty, this);
    this.bobber = L.add.image(c.x, c.y, 'bobber').setDepth(c.y + 2).setVisible(false);
    this.mark = L.add.text(c.x, c.y - 18, '!', { fontFamily: 'monospace', fontSize: '14px', color: '#ffd25e', stroke: '#2a1d2e', strokeThickness: 3, fontStyle: 'bold' })
      .setOrigin(0.5).setDepth(9600).setVisible(false).setResolution(ZOOM * RES + 1);
  }

  interact(p: Player): boolean {
    const L = this.L;
    if (p.id !== 1) {
      if (this.hintCd <= 0) { this.hintCd = 3; L.say(p, `${L.names[1]}, me ensina a pescar? Quem pesca aqui é você!`, 2000); }
      return true;
    }
    if (p.held) { L.say(p, 'Mãos livres pra pescar!', 1200); return true; }
    if (this.state === 'idle') {
      this.state = 'wait';
      this.fisher = p;
      this.t = Phaser.Math.FloatBetween(1.2, 3.2);
      // a boia cai um pouco à frente, na água
      const dx = Math.sign(this.x - p.x) * 10;
      const dy = Math.sign(this.y - p.y) * 10;
      this.bobber.setPosition(this.x + dx, this.y + dy).setVisible(true).setScale(0.3);
      L.tweens.add({ targets: this.bobber, scale: 1, duration: 200, ease: 'Back.Out' });
      L.sfx('splash');
      return true;
    }
    if (this.state === 'wait') {
      L.say(p, 'Calma... ainda não fisgou!', 1000);
      this.cancel();
      return true;
    }
    // fisgou!
    this.cancel();
    L.give(p, 'fish');
    L.onFish();
    L.sfx('coin');
    L.burst(this.x, this.y, 'fx_pixel', 8, { speed: 50, tint: 0xbfe9ff });
    L.hud?.floatText(this.x, this.y - 14, 'Peixe!', '#9ce8ff');
    return true;
  }

  cancel(): void {
    this.state = 'idle';
    this.fisher = null;
    this.bobber.setVisible(false);
    this.mark.setVisible(false);
  }

  update(dt: number): void {
    this.hintCd = Math.max(0, this.hintCd - dt);
    if (this.state === 'idle') return;
    if (!this.fisher || this.fisher.fainted || this.L.dist(this.fisher, this) > 30) { this.cancel(); return; }
    this.t -= dt;
    this.bobber.y += Math.sin(this.L.time.now / 150) * 0.05;
    if (this.state === 'wait' && this.t <= 0) {
      this.state = 'bite';
      this.t = 0.9;
      this.mark.setVisible(true);
      this.L.tweens.add({ targets: this.bobber, y: this.bobber.y + 2, yoyo: true, repeat: 3, duration: 60 });
      this.L.sfx('blip');
    } else if (this.state === 'bite' && this.t <= 0) {
      this.L.say(this.fisher, 'Escapou! Vou de novo...', 1200);
      this.cancel();
    }
  }
}

/** Corvo ladrão: rouba itens deixados nas bancadas. */
class Crow implements Interactable {
  sprite: Phaser.GameObjects.Sprite;
  state: 'in' | 'peck' | 'out' = 'in';
  t = 0;
  reach = 4;
  gone = false;
  private dirOut = 1;
  private tex = 'crow';
  constructor(public L: KitchenLevel, public target: Surface) {
    const fromLeft = Math.random() < 0.5;
    const W = L.cols * TILE;
    this.tex = L.cfg.crows?.tex ?? 'crow';
    this.sprite = L.add.sprite(fromLeft ? -16 : W + 16, Phaser.Math.Between(10, 60), this.tex, 0).setDepth(9800).setFlipX(fromLeft);
    this.sprite.play(`${this.tex}-fly`);
    L.sfx('crow');
  }
  get x(): number { return this.sprite.x; }
  get y(): number { return this.sprite.y + 6; }

  update(dt: number): void {
    const s = this.sprite;
    if (this.state === 'in') {
      if (!this.target.item) { this.flee(); return; }
      const tx = this.target.x;
      const ty = this.target.y - 10;
      const a = Math.atan2(ty - s.y, tx - s.x);
      s.x += Math.cos(a) * 70 * dt;
      s.y += Math.sin(a) * 70 * dt;
      s.setFlipX(Math.cos(a) > 0);
      if (Phaser.Math.Distance.Between(s.x, s.y, tx, ty) < 3) { this.state = 'peck'; this.t = 0; s.stop(); s.setFrame(1); }
    } else if (this.state === 'peck') {
      this.t += dt;
      s.y = this.target.y - 10 + (Math.floor(this.t * 6) % 2);
      if (!this.target.item) { this.flee(); return; }
      if (this.t > 2.6) {
        const it = this.target.item;
        this.target.item = null;
        this.L.hud?.toast(`${this.L.cfg.crows?.name ?? 'O corvo'} roubou: ${ITEM_NAME[it.kind]}!`, '#ff9c9c');
        it.destroy();
        this.L.sfx('crow');
        this.flee();
      }
    } else {
      s.x += this.dirOut * 110 * dt;
      s.y -= 50 * dt;
      if (s.y < -30 || s.x < -40 || s.x > this.L.cols * TILE + 40) { this.gone = true; s.destroy(); this.L.removeInteractable(this); }
    }
  }

  flee(): void {
    if (this.state === 'out') return;
    this.state = 'out';
    this.sprite.play(`${this.tex}-fly`);
    this.dirOut = this.sprite.x < (this.L.cols * TILE) / 2 ? -1 : 1;
    this.sprite.setFlipX(this.dirOut > 0);
  }

  scare(): boolean {
    if (this.state === 'out') return false;
    this.L.onScare();
    this.L.sfx('crow');
    this.L.burst(this.x, this.y - 6, 'fx_pixel', 8, { speed: 50, tint: 0x2a2a3a });
    this.L.hud?.floatText(this.x, this.y - 14, 'Xô!', '#fff4e0');
    this.flee();
    return true;
  }

  selectable(): boolean { return false; }
  onStrike(): boolean { return this.scare(); }
  onMagic(): boolean { return this.scare(); }
}

// ------------------------------------------------------------------ fase
export class KitchenLevel extends BaseLevel {
  cfg!: KitchenConfig;
  active: RecipeId[] = [];
  orders: Order[] = [];
  score = 0;
  timeLeft = 0;
  delivered = 0;
  expired = 0;
  cookers: Cooker[] = [];
  surfaces: Surface[] = [];
  crows: Crow[] = [];
  fishing: FishingSpot[] = [];
  private nextOrder = 0;
  private windT = 0;
  private crowT = 0;
  private rainT = 0;
  private raining = 0;
  private cartT = 0;
  private cart: Phaser.GameObjects.Image | null = null;
  private cartWarn: Phaser.GameObjects.Text | null = null;
  private rainEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private unlockIdx = 0;
  private ui: { info?: Phaser.GameObjects.Text; scoreText?: Phaser.GameObjects.Text; starBar?: Phaser.GameObjects.Graphics } = {};
  private lastTick = 99;
  // tarefas e momentos especiais do capítulo
  tasks: TaskList | null = null;
  fishCaught = 0;
  scared = 0;
  dances = 0;
  private tables: { x: number; y: number }[] = [];
  rings: { state: 'wait' | 'table' | 'carried' | 'done'; img: Phaser.GameObjects.Image | null } = { state: 'wait', img: null };
  dance: { t: number; pressed: number[]; next: number } = { t: 0, pressed: [-1, -1], next: 30 };
  private guests: { s: Phaser.GameObjects.Sprite; lines: string[] }[] = [];
  private guestT = 8;
  /** Final das alianças (depois do jantar): tempo decorrido e espera depois do abraço. */
  private finaleT = 0;
  private finaleWait = 2.5;

  constructor() {
    super('KitchenLevel');
  }

  mapRows(): string[] {
    this.cfg = KITCHENS[this.info.id];
    this.surfaces = [];
    this.cookers = [];
    this.fishing = [];
    this.tables = [];
    this.defaultFloor = this.cfg.floor;
    this.objectFloor = this.cfg.objectFloor;
    return this.cfg.map;
  }

  spawn(ch: string, tx: number, ty: number): boolean {
    const c = this.tileCenter(tx, ty);
    switch (ch) {
      case 'c': this.surfaces.push(new Surface(this, tx, ty, 'st_counter')); return true;
      case 'b': this.surfaces.push(new Board(this, tx, ty)); return true;
      case 'f': this.cookers.push(new Cooker(this, tx, ty, 'pot')); return true;
      case 'o': this.cookers.push(new Cooker(this, tx, ty, 'oven')); return true;
      case 'p': this.interactables.push(new PlateStack(this, tx, ty)); return true;
      case 't': this.interactables.push(new Trash(this, tx, ty)); return true;
      case 'D': this.interactables.push(new Deliver(this, tx, ty)); return true;
      case 'A': this.interactables.push(new Source(this, tx, ty, 'src_apple', 'apple')); return true;
      case 'R': this.interactables.push(new Source(this, tx, ty, 'src_berry', 'berry')); return true;
      case 'M': this.interactables.push(new Source(this, tx, ty, 'src_mush', 'mushroom')); return true;
      case 'F': this.interactables.push(new Source(this, tx, ty, 'src_flour', 'flour')); return true;
      case 'T': this.add.image(c.x, c.y - 12, 'tree_big').setDepth(c.y + 6); this.addSolid(tx, ty); return true;
      case 'Y': this.add.image(c.x, c.y - 12, 'tree_pink').setDepth(c.y + 6); this.addSolid(tx, ty); return true;
      case 'B': this.add.image(c.x, c.y, 'bush').setDepth(c.y); this.addSolid(tx, ty); return true;
      case 'k': this.add.image(c.x, c.y, 'blanket').setDepth(-5).setScale(0.5); return true;
      case 'W': this.spawnWaterfall(tx, ty); return true;
      case 'G': this.fishing.push(new FishingSpot(this, tx, ty)); this.interactables.push(this.fishing[this.fishing.length - 1]); return true;
      case 'I': this.add.image(c.x, c.y - 2, 'flag_italy').setDepth(c.y); this.addSolid(tx, ty); return true;
      case 'U': this.add.image(c.x, c.y - 2, 'bunting_j').setDepth(9000); return true;
      case 'J': {
        this.add.image(c.x + 8, c.y + 4, 'bonfire').setDepth(c.y + 8);
        const f = this.add.sprite(c.x + 8, c.y - 4, 'fire', 0).setScale(2).setDepth(c.y + 9).play('fire-anim');
        this.tweens.add({ targets: f, scaleY: 2.3, yoyo: true, repeat: -1, duration: 300 });
        for (let dx = 0; dx <= 1; dx++) for (let dy = 0; dy <= 1; dy++) this.addSolid(tx + dx, ty + dy);
        return true;
      }
      case 'E': this.add.image(c.x, c.y - 2, 'table').setDepth(c.y); this.addSolid(tx, ty); this.tables.push(c); return true;
      case 'L': this.add.image(c.x, c.y - 4, 'lantern').setDepth(c.y); this.addSolid(tx, ty); return true;
      default: {
        const kind = this.cfg.sources?.[ch];
        if (kind) { this.interactables.push(new Source(this, tx, ty, 'src_basket', kind)); return true; }
        return false;
      }
    }
  }

  setup(): void {
    this.interactables.push(...this.surfaces, ...this.cookers);
    this.active = [...this.cfg.recipes];
    this.orders = [];
    this.crows = [];
    this.score = 0;
    this.delivered = 0;
    this.expired = 0;
    this.timeLeft = this.cfg.duration;
    this.nextOrder = 1.5;
    this.windT = this.cfg.wind?.first ?? Infinity;
    this.crowT = this.cfg.crows?.first ?? Infinity;
    this.rainT = this.cfg.rain?.first ?? Infinity;
    this.cartT = this.cfg.cart?.first ?? Infinity;
    this.raining = 0;
    this.cart = null;
    this.rainEmitter = null;
    this.unlockIdx = 0;
    this.lastTick = 99;
    this.started = false;
    if (!this.anims.exists('fire-anim')) this.anims.create({ key: 'fire-anim', frames: this.anims.generateFrameNumbers('fire', { start: 0, end: 1 }), frameRate: 8, repeat: -1 });
    // fogueiras começam acesas para ensinar
    this.cookers.forEach((c) => { if (c.type === 'pot') c.onMagic(this.players[1]); });
    this.tasks = null;
    this.fishCaught = this.scared = this.dances = 0;
    this.rings = { state: 'wait', img: null };
    this.dance = { t: 0, pressed: [-1, -1], next: 30 };
    this.guestT = 8;
    this.recipeBook = [];
    this.finaleT = 0;
    this.finaleWait = 2.5;
    for (const pq of this.cfg.plaques ?? []) plaque(this, pq.tx, pq.ty, pq.text);
    this.labelStations();
    this.guests = (this.cfg.guests ?? []).map((g) => {
      const c = this.tileCenter(g.tx, g.ty);
      this.addSolid(g.tx, g.ty);
      return { s: this.add.sprite(c.x, c.y - 12, `npc_${g.npc}`, charFrame('down', 0)).setDepth(c.y), lines: g.lines };
    });
  }

  /** Plaquinha com o nome de uma cesta ou estação (no chão, por baixo dos jogadores). */
  stationLabel(x: number, y: number, text: string): void {
    // nomes compridos quebram em duas linhas ("Massa de / pizza")
    const s = text.length > 8 ? text.replace(/ (\S+)$/, '\n$1') : text;
    this.add.text(x, y, s, {
      fontFamily: 'monospace', fontSize: '6px', color: '#fff4e0', stroke: '#2a1d2e', strokeThickness: 2, fontStyle: 'bold', align: 'center', lineSpacing: -1,
    }).setOrigin(0.5, 0).setDepth(y - 12).setResolution(ZOOM * RES + 1);
  }

  /** Nomes das estações do mapa; estações iguais coladas (tábua dupla, balcão) ganham uma plaquinha só. */
  private labelStations(): void {
    const rows = this.cfg.map;
    const seen = new Set<string>();
    rows.forEach((row, ty) => [...row].forEach((ch, tx) => {
      const name = STATION_NAMES[ch];
      if (!name || seen.has(`${tx},${ty}`)) return;
      const cells: [number, number][] = [];
      const stack: [number, number][] = [[tx, ty]];
      while (stack.length) {
        const [x, y] = stack.pop()!;
        if (rows[y]?.[x] !== ch || seen.has(`${x},${y}`)) continue;
        seen.add(`${x},${y}`);
        cells.push([x, y]);
        stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
      }
      const xs = cells.map((c) => c[0]);
      const ys = cells.map((c) => c[1]);
      const cx = ((Math.min(...xs) + Math.max(...xs)) / 2) * TILE + TILE / 2;
      // fileira deitada: plaquinha embaixo; em pé (balcão de entrega): em cima
      const tall = Math.max(...ys) > Math.min(...ys);
      this.stationLabel(cx, tall ? Math.min(...ys) * TILE - 9 : Math.max(...ys) * TILE + TILE + 2, name);
    }));
  }

  // ------------------------------------------------------------------ tarefas do capítulo
  onFish(): void {
    this.fishCaught++;
    this.tasks?.progress('fish', this.fishCaught);
  }

  onScare(): void {
    this.scared++;
    this.tasks?.progress('scare', this.scared);
  }

  /** Momentos especiais: alianças (Italiano), quadrilha (festa junina) e comentários dos convidados. */
  private specials(dt: number): void {
    const elapsed = this.cfg.duration - this.timeLeft;
    if (this.cfg.special === 'quadrilha') this.updateDance(dt, elapsed);
    if (this.guests.length) {
      this.guestT -= dt;
      if (this.guestT <= 0) {
        this.guestT = Phaser.Math.Between(12, 18);
        const g = Phaser.Utils.Array.GetRandom(this.guests);
        this.say({ x: g.s.x, y: g.s.y + 8 }, fillNames(Phaser.Utils.Array.GetRandom(g.lines), this.names), 2400, '#fff4e0');
        this.tweens.add({ targets: g.s, y: g.s.y - 3, yoyo: true, duration: 120, repeat: 1 });
      }
    }
  }

  /** Fim do jantar: os pedidos param e a caixinha das alianças aparece na mesa. */
  private startRings(): void {
    const R = this.rings;
    const t = this.tables[0];
    R.state = 'table';
    [...this.orders].forEach((o) => this.removeOrder(o, true));
    // mãos livres para o abraço
    this.players.forEach((p) => { p.held?.destroy(); p.held = null; });
    this.recipeBook.forEach((o) => o.destroy());
    this.recipeBook = [];
    this.cart?.destroy();
    this.cart = null;
    this.cartWarn?.destroy();
    this.cartWarn = null;
    R.img = this.add.image(t.x, t.y - 10, 'item_rings').setDepth(t.y + 2);
    this.tweens.add({ targets: R.img, y: t.y - 13, yoyo: true, repeat: -1, duration: 400, ease: 'Sine.InOut' });
    this.hud?.banner('O jantar acabou... hora das alianças ♥', `${this.names[0]}: pegue a caixinha na mesa e dê um abraço na ${this.names[1]}`, 3200);
    Audio.play('bell');
    const box: Interactable = {
      x: t.x, y: t.y, priority: 4, reach: 2, tag: 'rings',
      selectable: () => R.state === 'table',
      interact: (p: Player) => {
        if (R.state !== 'table') return false;
        if (p.id !== 0) { this.say(p, `Hmm... isso parece surpresa do ${this.names[0]}!`, 1800, '#ffd6e4'); return true; }
        R.state = 'carried';
        this.tweens.killTweensOf(R.img!);
        this.sfx('pick');
        this.say(p, `Agora... um abraço na ${this.names[1]}!`, 2000);
        return true;
      },
    };
    this.interactables.push(box);
  }

  /**
   * Depois que o tempo acaba no Italiano: true enquanto a fase espera as alianças
   * (termina ~2,5 s depois do abraço, ou em 45 s se ninguém entregar).
   */
  private ringsFinale(dt: number): boolean {
    const R = this.rings;
    if (this.cfg.special !== 'rings' || !this.tables.length) return false;
    if (R.state === 'wait') this.startRings();
    this.finaleT += dt;
    if (R.state === 'carried' && R.img) {
      const j = this.players[0];
      R.img.setPosition(j.x + 8, j.y - 38 + Math.sin(this.time.now / 150) * 1.5).setDepth(j.y + 20);
    }
    if (R.state === 'done') {
      this.finaleWait -= dt;
      return this.finaleWait > 0;
    }
    return this.finaleT < 45;
  }

  onHug(): void {
    if (this.rings.state !== 'carried') return;
    this.rings.state = 'done';
    const [j, ju] = this.players;
    this.rings.img?.destroy();
    this.score += 60;
    this.players.forEach((p) => (p.hp = Math.min(p.maxHp, p.hp + 1)));
    this.hud?.banner('Alianças entregues! ♥', 'Alinhamentos feitos, planos juntos. +60 moedas', 2600);
    this.say(ju, 'São... alianças?! SIM, SIM! ♥', 2600, '#ffd6e4');
    Audio.play('bell');
    for (let i = 0; i < 14; i++) this.time.delayedCall(i * 80, () => this.floatHeart((j.x + ju.x) / 2 + Phaser.Math.Between(-16, 16), (j.y + ju.y) / 2 - 20));
    this.tasks?.done('rings');
  }

  /** Quadrilha: no "Anarriê!", os dois apertam HABILIDADE juntos para dançar. */
  private updateDance(dt: number, elapsed: number): void {
    const D = this.dance;
    if (D.t > 0) {
      D.t -= dt;
      if (D.t <= 0) this.endDance(false);
      return;
    }
    if (elapsed >= D.next) {
      D.t = 3;
      D.pressed = [-1, -1];
      const call = Phaser.Utils.Array.GetRandom(['ANARRIÊ!', 'BALANCÊ!', 'CAMINHO DA ROÇA!', 'OLHA A PONTE!']);
      this.hud?.banner(call, `Quadrilha! Os dois: ${KEY_LABELS[0].ability} e ${KEY_LABELS[1].ability} JUNTOS para dançar!`, 2200);
      Audio.play('bell');
    }
  }

  private endDance(ok: boolean): void {
    const D = this.dance;
    D.t = 0;
    D.next = this.cfg.duration - this.timeLeft + Phaser.Math.Between(24, 32);
    const [a, b] = this.players;
    if (ok) {
      this.dances++;
      this.score += 25;
      this.tasks?.progress('dance', this.dances);
      this.hud?.toast('Dançaram a quadrilha! +25 moedas', '#ffd25e', 1800);
      this.sfx('hug');
      [a, b].forEach((p) => this.tweens.add({ targets: p.sprite, angle: 360, duration: 500, onComplete: () => p.sprite.setAngle(0) }));
      for (let i = 0; i < 8; i++) this.time.delayedCall(i * 70, () => this.floatHeart((a.x + b.x) / 2 + Phaser.Math.Between(-20, 20), (a.y + b.y) / 2 - 20));
    } else {
      this.hud?.toast('Perderam o passo... na próxima vai!', '#d8c8e8', 1600);
    }
  }

  useAbility(p: Player): void {
    const D = this.dance;
    if (this.cfg.special === 'quadrilha' && D.t > 0) {
      // durante a quadrilha, a habilidade vira passo de dança
      p.abilityCd = 0.3;
      p.actTimer = 0.3;
      D.pressed[p.id] = this.time.now;
      if (D.pressed.every((t) => t >= 0)) this.endDance(Math.abs(D.pressed[0] - D.pressed[1]) < 900);
      return;
    }
    super.useAbility(p);
  }

  onHudReady(hud: HUDScene): void {
    // barra do topo, em cima da parede da cozinha: as cestas ficam livres e os pedidos vão para o salão
    hud.add.graphics().setDepth(-1)
      .fillStyle(0x1b1424, 0.75).fillRoundedRect(BAR.x, BAR.y, BAR.w, BAR.h, 8)
      .lineStyle(2, 0xffd6e4, 0.45).strokeRoundedRect(BAR.x, BAR.y, BAR.w, BAR.h, 8);
    hud.info.setPosition(BAR.x + 44, BAR.y + BAR.h / 2);
    hud.add.image(BAR.x + 100, BAR.y + BAR.h / 2, 'ui_coin').setScale(2.5);
    this.ui.scoreText = txt(hud, BAR.x + 116, BAR.y + BAR.h / 2, '0', 20, { color: '#ffd25e', origin: [0, 0.5] });
    this.ui.starBar = hud.add.graphics();
    hud.toastY = 150;
    this.showIntro(hud);
  }

  /** Painel inicial com as receitas; os dois apertam AÇÃO para começar. */
  private showIntro(hud: HUDScene): void {
    const objs: Phaser.GameObjects.GameObject[] = [];
    const w = 660;
    const h = 420;
    const x0 = (GAME_W - w) / 2;
    const y0 = (GAME_H - h) / 2 - 10;
    objs.push(panel(hud, x0, y0, w, h));
    objs.push(txt(hud, GAME_W / 2, y0 + 34, this.info.name, 30, { color: '#ffd6e4' }));
    objs.push(txt(hud, GAME_W / 2, y0 + 66, `${Math.floor(this.cfg.duration / 60)}:${String(this.cfg.duration % 60).padStart(2, '0')} · Meta: ${this.cfg.stars[0]} / ${this.cfg.stars[1]} / ${this.cfg.stars[2]} moedas`, 15, { color: '#fff4e0', bold: false }));
    const all: RecipeId[] = [...this.cfg.recipes, ...this.cfg.unlocks.map((u) => u.recipe)];
    all.forEach((r, i) => {
      const y = y0 + 108 + i * 42;
      const rec = RECIPES[r];
      rec.icons.forEach((k, j) => objs.push(hud.add.image(x0 + 50 + j * 34, y, `item_${k}`).setScale(2.4)));
      objs.push(txt(hud, x0 + 120, y - 9, rec.name + (this.cfg.recipes.includes(r) ? '' : ' (desbloqueia depois)'), 16, { origin: [0, 0.5], color: '#ffd25e' }));
      objs.push(txt(hud, x0 + 120, y + 10, fillNames(rec.how, this.names), 13, { origin: [0, 0.5], bold: false }));
    });
    // como jogar, com as teclas de cada um
    const [k1, k2] = KEY_LABELS;
    const how = [
      `Pegar e soltar: AÇÃO (${this.names[0]}: ${k1.action} · ${this.names[1]}: ${k2.action})`,
      `Tábua: só ${this.names[0]} corta, segurando ${k1.action}`,
      `Panela e Forno precisam de fogo: ${this.names[1]} acende com MAGIA (${k2.ability})`,
      'Monte o prato e leve à Entrega, no salão',
    ];
    const hy = y0 + 100 + all.length * 42;
    objs.push(txt(hud, x0 + 40, hy, 'Como jogar', 15, { origin: [0, 0.5], color: '#bfe6ff' }));
    how.forEach((line, i) => objs.push(txt(hud, x0 + 40, hy + 22 + i * 19, `${i + 1}. ${line}`, 13, { origin: [0, 0.5], bold: false })));
    const ty = hy + 34 + how.length * 19;
    this.cfg.tips.forEach((t, i) => objs.push(txt(hud, GAME_W / 2, ty + i * 19, '• ' + fillNames(t, this.names), 13, { color: '#d8c8e8', bold: false })));
    const ready = [false, false];
    const readyTxt = [0, 1].map((i) => txt(hud, GAME_W / 2 + (i === 0 ? -150 : 150), y0 + h - 30, `${this.names[i]}: aperte ${KEY_LABELS[i].action}`, 16, { color: i === 0 ? '#bfe6ff' : '#ffd6e4' }));
    objs.push(...readyTxt);
    const ev = hud.time.addEvent({
      delay: 16, loop: true, callback: () => {
        for (let i = 0; i < 2; i++) {
          if (!ready[i] && Input.players[i].actionPressed) {
            ready[i] = true;
            readyTxt[i].setText(`${this.names[i]}: pronto! ♥`);
            Audio.play('confirm');
          }
        }
        if (ready[0] && ready[1]) {
          ev.remove();
          objs.forEach((o) => (o as Phaser.GameObjects.Image).destroy());
          this.countdown(hud);
        }
      },
    });
  }

  private countdown(hud: HUDScene): void {
    const steps = ['3', '2', '1', 'Já!'];
    steps.forEach((s, i) => {
      hud.time.delayedCall(i * 600, () => {
        const t = txt(hud, GAME_W / 2, GAME_H / 2, s, 72, { color: i === 3 ? '#ffd25e' : '#fff4e0' });
        Audio.play(i === 3 ? 'confirm' : 'blip');
        hud.tweens.add({ targets: t, scale: { from: 1.6, to: 1 }, alpha: { from: 1, to: 0 }, duration: 580, onComplete: () => t.destroy() });
        if (i === 3) {
          this.started = true;
          this.buildRecipeBook();
          // painel de tarefas: embaixo, no salão (a cozinha fica livre)
          if (!this.tasks) this.tasks = new TaskList(hud, 552, 378, this.cfg.tasks.map((t) => ({ ...t, text: fillNames(t.text, this.names) })));
        }
      });
    });
  }

  /**
   * Painel "Receitas" à direita, abaixo dos pedidos, sempre com o passo a passo.
   * Esmaece quando alguém vai ao salão (para não cobrir as mesas).
   */
  private recipeBook: Phaser.GameObjects.GameObject[] = [];

  private buildRecipeBook(): void {
    const hud = this.hud;
    if (!hud?.ready) return;
    this.recipeBook.forEach((o) => o.destroy());
    this.recipeBook = [];
    const w = 280;
    const x0 = GAME_W - w - 10;
    const y0 = ORDERS.y + ORDERS.h + 8;
    let y = y0 + 30;
    for (const r of this.active) {
      const rec = RECIPES[r];
      y += 4;
      this.recipeBook.push(txt(hud, x0 + 12, y, rec.name, 13, { origin: [0, 0.5], color: '#ffd6e4' }).setDepth(21));
      rec.icons?.forEach((k, i) => this.recipeBook.push(hud.add.image(x0 + w - 20 - i * 22, y, `item_${k}`).setScale(1.5).setDepth(21)));
      y += 12;
      (rec.steps ?? [rec.how]).forEach((st, i) => {
        const t = txt(hud, x0 + 14, y, `${i + 1}. ${fillNames(st, this.names)}`, 11, { origin: [0, 0], bold: false, wrap: w - 26 }).setDepth(21);
        this.recipeBook.push(t);
        y += t.height;
      });
    }
    y += 4;
    const fire = txt(hud, x0 + 12, y, `Fogo apagou? ${this.names[1]} acende com MAGIA (${KEY_LABELS[1].ability})`, 11, { origin: [0, 0], color: '#ffb86a', bold: false, wrap: w - 24 }).setDepth(21);
    this.recipeBook.push(fire);
    y += fire.height;
    const h = y - y0 + 8;
    const g = hud.add.graphics().setDepth(20);
    g.fillStyle(0x1b1424, 0.8).fillRoundedRect(x0, y0, w, h, 10).lineStyle(2, 0xffd6e4, 0.5).strokeRoundedRect(x0, y0, w, h, 10);
    this.recipeBook.push(g, txt(hud, x0 + 12, y0 + 14, 'Receitas', 14, { origin: [0, 0.5], color: '#ffd25e' }).setDepth(21));
  }

  // ------------------------------------------------------------------ regras
  combine(p: Player, s: Surface): boolean {
    const held = p.held!;
    const it = s.item!;
    if (held.isPlate && !it.isPlate) {
      if (canAddToPlate(held.contents, it.kind, this.active)) {
        held.addContent(it.kind);
        it.destroy();
        s.item = null;
        this.sfx('plate');
        return true;
      }
    } else if (!held.isPlate && it.isPlate) {
      if (canAddToPlate(it.contents, held.kind, this.active)) {
        it.addContent(held.kind);
        held.destroy();
        p.held = null;
        this.sfx('plate');
        return true;
      }
    } else {
      this.say(p, 'Já tem algo aqui');
      this.sfx('wrong');
      return true;
    }
    this.say(p, held.isPlate && CHOP[it.kind] ? 'Precisa cortar antes!' : !held.isPlate && CHOP[held.kind] ? 'Precisa cortar antes!' : 'Isso não combina');
    this.sfx('wrong');
    return true;
  }

  deliver(p: Player, at: { x: number; y: number }): void {
    const held = p.held!;
    if (!held.isPlate) { this.say(p, 'Precisa estar num prato!'); this.sfx('wrong'); return; }
    const r = matchRecipe(held.contents, this.active);
    if (!r) { this.say(p, held.contents.length ? 'Falta alguma coisa...' : 'Prato vazio?'); this.sfx('wrong'); return; }
    const candidates = this.orders.filter((o) => o.recipe === r).sort((a, b) => a.timeLeft - b.timeLeft);
    if (!candidates.length) { this.say(p, 'Ninguém pediu isso agora!'); this.sfx('wrong'); return; }
    const o = candidates[0];
    const { base, tip } = deliveryScore(r, o.timeLeft, o.total);
    this.score += base + tip;
    this.delivered++;
    this.tasks?.progress('orders', this.delivered);
    this.tasks?.done(`recipe:${r}`);
    this.removeOrder(o, true);
    held.destroy();
    p.held = null;
    this.sfx('deliver');
    this.sfx('coin');
    this.hud?.floatText(at.x, at.y - 14, tip ? `+${base} +${tip} gorjeta` : `+${base}`, '#ffd25e');
    this.burst(at.x, at.y - 8, 'fx_heart', 8, { speed: 50, lifespan: 700 });
    if (this.orders.length < 2) this.nextOrder = Math.min(this.nextOrder, 2);
  }

  private addOrder(): void {
    if (this.orders.length >= this.cfg.maxOrders) return;
    // evita repetir sempre a mesma receita
    const pool = this.active.flatMap((r) => (this.orders.filter((o) => o.recipe === r).length >= 2 ? [] : [r]));
    const recipe = Phaser.Utils.Array.GetRandom(pool.length ? pool : this.active);
    const total = this.cfg.orderTime + (recipe === 'pie' ? 15 : recipe === 'soup' ? 8 : 0);
    const o: Order = { recipe, timeLeft: total, total };
    this.orders.push(o);
    this.buildOrderCard(o);
    this.layoutOrders();
    Audio.play('bell');
  }

  private buildOrderCard(o: Order): void {
    const hud = this.hud;
    if (!hud?.ready) return;
    const rec = RECIPES[o.recipe];
    const { w, h } = ORDERS;
    const g = hud.add.graphics();
    g.fillStyle(0x000000, 0.25).fillRoundedRect(3, 4, w, h, 8);
    g.fillStyle(0xfff4e0, 1).fillRoundedRect(0, 0, w, h, 8);
    g.lineStyle(3, 0x2a1d2e, 1).strokeRoundedRect(0, 0, w, h, 8);
    const icons = rec.icons.map((k, i) => hud.add.image(w / 2 + (i - (rec.icons.length - 1) / 2) * 34, 24, `item_${k}`).setScale(2.4));
    const name = txt(hud, w / 2, 49, rec.name, 11, { color: '#2a1d2e', stroke: '#fff4e0', strokeW: 0 });
    // ingredientes crus, com os mesmos nomes das cestas
    const parts = txt(hud, w / 2, 62, rec.ingredients ?? '', 9, { color: '#6a4a5e', stroke: '#fff4e0', strokeW: 0, bold: false });
    const bar = hud.add.graphics();
    const c = hud.add.container(GAME_W + 20, ORDERS.y, [g, ...icons, name, parts, bar]);
    o.card = c;
    o.bar = bar;
  }

  private layoutOrders(): void {
    this.orders.forEach((o, i) => {
      if (!o.card) this.buildOrderCard(o);
      if (o.card) this.hud.tweens.add({ targets: o.card, x: ORDERS.x + i * (ORDERS.w + ORDERS.gap), duration: 250, ease: 'Back.Out' });
    });
  }

  private removeOrder(o: Order, success: boolean): void {
    this.orders = this.orders.filter((x) => x !== o);
    if (o.card) {
      const card = o.card;
      this.hud.tweens.add({
        targets: card, y: success ? -90 : 140, alpha: 0, angle: success ? 0 : 12, duration: 350,
        onComplete: () => card.destroy(),
      });
    }
    this.layoutOrders();
  }

  // ------------------------------------------------------------------ laço
  tick(dt: number): void {
    // contador e barras da HUD
    this.updateHudInfo();
    // receitas: aparecem na cozinha e somem quando alguém vai ao salão (para não cobrir as mesas)
    const inKitchen = this.players.every((p) => p.x < 16 * TILE);
    const a = inKitchen ? 1 : 0.12;
    for (const o of this.recipeBook) {
      const g = o as unknown as Phaser.GameObjects.Components.Alpha;
      g.setAlpha?.(Phaser.Math.Linear(g.alpha ?? 1, a, Math.min(1, dt * 6)));
    }
    // no final das alianças a cozinha descansa (nada queima)
    if (!this.started || this.timeLeft > 0) for (const c of this.cookers) c.update(dt, this.raining > 0 ? 2.5 : 1);
    for (const b of this.surfaces) {
      if (b instanceof Board && b.progress > 0 && b.choppable()) this.drawBar(b.x, b.y + 9, b.progress, 0x8be07a);
    }
    for (const cr of this.crows) cr.update(dt);
    for (const f of this.fishing) f.update(dt);
    this.crows = this.crows.filter((c) => !c.gone);
    if (!this.started || this.ended) return;

    this.timeLeft -= dt;
    const sec = Math.ceil(this.timeLeft);
    if (sec <= 10 && sec !== this.lastTick && sec > 0) { this.lastTick = sec; Audio.play('blip'); }
    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      if (!this.ringsFinale(dt)) this.endLevel();
      return;
    }
    this.specials(dt);

    const elapsed = this.cfg.duration - this.timeLeft;
    while (this.unlockIdx < this.cfg.unlocks.length && elapsed >= this.cfg.unlocks[this.unlockIdx].at) {
      const r = this.cfg.unlocks[this.unlockIdx++].recipe;
      this.active.push(r);
      this.hud.banner('Novo prato!', `${RECIPES[r].name}: ${RECIPES[r].how}`, 3000);
      this.buildRecipeBook();
      this.nextOrder = 1;
    }

    // pedidos
    this.nextOrder -= dt;
    if (this.nextOrder <= 0) {
      this.addOrder();
      if (this.orders.length < 2) this.time.delayedCall(800, () => !this.ended && this.addOrder());
      this.nextOrder = Phaser.Math.FloatBetween(this.cfg.orderEvery[0], this.cfg.orderEvery[1]);
    }
    for (const o of [...this.orders]) {
      o.timeLeft -= dt;
      if (o.bar) {
        const t = Math.max(0, o.timeLeft / o.total);
        const bw = ORDERS.w - 16;
        o.bar.clear().fillStyle(0x2a1d2e, 0.25).fillRect(8, ORDERS.h - 9, bw, 4)
          .fillStyle(t > 0.5 ? 0x5bbf4a : t > 0.25 ? 0xffb84a : 0xe8424a, 1).fillRect(8, ORDERS.h - 9, bw * t, 4);
        if (t < 0.25 && o.card) o.card.angle = Math.sin(this.time.now / 60) * 2;
      }
      if (o.timeLeft <= 0) {
        const pen = this.cfg.expirePenalty ?? 10;
        this.expired++;
        this.score = Math.max(0, this.score - pen);
        this.sfx('expire');
        this.hud.toast(`Pedido perdido: ${RECIPES[o.recipe].name}${pen ? ` (-${pen})` : ''}`, '#ff9c9c');
        this.removeOrder(o, false);
      }
    }

    this.events_(dt);
  }

  private updateHudInfo(): void {
    if (!this.hud?.ready || !this.ui.scoreText) return;
    const t = Math.max(0, Math.ceil(this.timeLeft));
    const mm = Math.floor(t / 60);
    const ss = String(t % 60).padStart(2, '0');
    if (this.started && t === 0 && this.rings.state !== 'wait') this.hud.info.setText('♥').setColor('#ffd6e4').setScale(1.2);
    else {
      this.hud.info.setText(`${mm}:${ss}`).setColor(t <= 20 ? '#ff7a7a' : '#fff4e0');
      if (t <= 10 && this.started) this.hud.info.setScale(1 + (Math.sin(this.time.now / 80) + 1) * 0.06);
    }
    this.ui.scoreText.setText(String(this.score));
    const g = this.ui.starBar!;
    g.clear();
    const bw = 240;
    const x0 = BAR.x + BAR.w - bw - 14;
    const y0 = BAR.y + BAR.h / 2 - 3;
    const max = this.cfg.stars[2] * 1.1;
    g.fillStyle(0x000000, 0.35).fillRect(x0, y0, bw, 6);
    g.fillStyle(0xffd25e, 1).fillRect(x0, y0, Math.min(bw, (this.score / max) * bw), 6);
    for (const st of this.cfg.stars) {
      const sx = x0 + (st / max) * bw;
      g.fillStyle(this.score >= st ? 0xffffff : 0x8a7a9a, 1).fillRect(sx - 1, y0 - 4, 3, 14);
    }
  }

  /** Acontecimentos inesperados: vento, corvos, chuva, carroças. */
  private events_(dt: number): void {
    const cfg = this.cfg;
    // vento
    if (cfg.wind) {
      this.windT -= dt;
      if (this.windT <= 0) {
        this.windT = cfg.wind.every + Phaser.Math.Between(-8, 8);
        this.hud.toast('Lá vem uma rajada de vento! Protejam o fogo!', '#bfe6ff', 2000);
        this.sfx('wind');
        this.leaves();
        this.time.delayedCall(2200, () => {
          if (this.ended) return;
          this.cookers.forEach((c) => c.extinguish());
          this.say(this.players[1], 'Deixa que eu reacendo!', 1600);
        });
      }
    }
    // corvos
    if (cfg.crows) {
      this.crowT -= dt;
      if (this.crowT <= 0) {
        const targets = this.surfaces.filter((s) => s.item && !this.crows.some((c) => c.target === s));
        if (targets.length) {
          const cr = new Crow(this, Phaser.Utils.Array.GetRandom(targets));
          this.crows.push(cr);
          this.interactables.push(cr);
          this.hud.toast(`${cfg.crows.name ?? 'Um corvo'} vem roubar! Espantem com espada ou magia!`, '#d8c8e8', 2000);
          this.crowT = cfg.crows.every + Phaser.Math.Between(-6, 6);
        } else this.crowT = 4;
      }
    }
    // chuva
    if (cfg.rain) {
      if (this.raining > 0) {
        this.raining -= dt;
        if (this.raining <= 0) { this.rainEmitter?.stop(); this.hud.toast('A chuva passou!', '#bfe6ff'); }
      } else {
        this.rainT -= dt;
        if (this.rainT <= 0) {
          this.rainT = cfg.rain.every;
          this.raining = cfg.rain.length;
          this.startRain();
          this.hud.toast('Começou a chover! O fogo apaga mais rápido!', '#9ce8ff', 2400);
        }
      }
    }
    // carroça
    if (cfg.cart) this.updateCart(dt, cfg.cart.row, cfg.cart.every);
  }

  private leaves(): void {
    const H = this.rows * TILE;
    for (let i = 0; i < 40; i++) {
      const l = this.add.image(-10, Phaser.Math.Between(0, H), 'fx_leaf').setDepth(9700);
      this.tweens.add({
        targets: l, x: this.cols * TILE + 20, y: l.y + Phaser.Math.Between(-30, 30), angle: 720,
        delay: Phaser.Math.Between(0, 1800), duration: Phaser.Math.Between(900, 1500), onComplete: () => l.destroy(),
      });
    }
  }

  private startRain(): void {
    if (!this.rainEmitter) {
      this.rainEmitter = this.add.particles(0, -10, 'fx_rain', {
        x: { min: 0, max: this.cols * TILE + 60 }, speedY: { min: 240, max: 300 }, speedX: -60, lifespan: 1300,
        frequency: 8, quantity: 2, alpha: 0.7,
      }).setDepth(9600);
    } else this.rainEmitter.start();
  }

  private updateCart(dt: number, row: number, every: number): void {
    const y = row * TILE + 8;
    if (!this.cart) {
      this.cartT -= dt;
      if (this.cartT <= 1.6 && !this.cartWarn) {
        const fx = (this.cfg.cart?.fromX ?? 0) * TILE;
        this.cartWarn = this.add.text(fx + 10, y - 18, `!! ${this.cfg.cart?.warn ?? 'CARROÇA'} !!`, { fontFamily: 'monospace', fontSize: '10px', color: '#ffd25e', stroke: '#2a1d2e', strokeThickness: 3, fontStyle: 'bold' })
          .setDepth(9900).setResolution(ZOOM * RES + 1);
        this.tweens.add({ targets: this.cartWarn, alpha: 0.2, yoyo: true, repeat: -1, duration: 150 });
        this.sfx('bell');
      }
      if (this.cartT <= 0) {
        this.cartWarn?.destroy();
        this.cartWarn = null;
        this.cart = this.add.image((this.cfg.cart?.fromX ?? 0) * TILE - 20, y - 8, this.cfg.cart?.tex ?? 'cart').setDepth(y + 4);
        this.cartT = every + Phaser.Math.Between(-4, 4);
        this.sfx('push');
      }
      return;
    }
    this.cart.x += 230 * dt;
    for (const p of this.players) {
      if (Math.abs(p.y - y) < 12 && Math.abs(p.x - this.cart.x) < 18 && p.invuln <= 0) {
        p.pushBack(this.cart.x - 10, y + (p.y < y ? 10 : -10), 260, 0.25);
        p.invuln = 0.8;
        if (p.held) this.dropOnFloor(p, p.x, p.y + (p.y < y ? -14 : 14));
        this.say(p, Phaser.Utils.Array.GetRandom(this.cfg.cart?.lines ?? ['Ei! Olha a carroça!', 'Socorro!', 'Que susto!', 'Meus ingredientes!']), 1400);
        this.sfx('hit');
      }
    }
    if (this.cart.x > this.cols * TILE + 30) { this.cart.destroy(); this.cart = null; }
  }

  private endLevel(): void {
    const stars = starsFor(this.score, this.cfg.stars);
    const lines = [
      `Pedidos entregues: ${this.delivered}`,
      `Pedidos perdidos: ${this.expired}`,
      this.tasks ? this.tasks.summary() : `Abraços: ${this.stats.hugs}`,
    ];
    if (stars === 0) this.finish({ win: false, stars: 0, score: this.score, title: `Faltaram ${this.cfg.stars[0] - this.score} moedas`, lines });
    else this.finish({ win: true, stars, score: this.score, title: 'O tempo acabou!', lines });
  }
}
