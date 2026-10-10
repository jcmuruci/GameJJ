import Phaser from 'phaser';
import { TILE, ZOOM, GAME_W, GAME_H, RES } from '../../config';
import { T, SOLID_TILES } from '../../art/Textures';
import { Input, PlayerId } from '../../systems/InputManager';
import { Audio, Sfx } from '../../systems/Audio';
import { Save } from '../../systems/SaveManager';
import { Player, Interactable } from '../../entities/Player';
import { Item } from '../../entities/Item';
import { Slime } from '../../entities/Enemy';
import { LevelInfo, levelById } from '../../data/levels';
import type { HUDScene } from '../HUDScene';
import { ItemKind } from '../../data/recipes';

export interface LevelResult {
  win: boolean;
  stars: number;
  score: number;
  title: string;
  lines: string[];
}

interface Bolt {
  img: Phaser.GameObjects.Image;
  vx: number;
  vy: number;
  life: number;
  owner: Player;
}

interface Pickup {
  img: Phaser.GameObjects.Image;
  kind: 'coin' | 'heart' | 'crystal';
  taken: boolean;
  baseY: number;
}

/** Texto de "esbarrão" engraçado. */
const BUMP_LINES = ['Opa!', 'Licença, amor!', 'Foi mal!', 'Ei, cuidado!', 'Esbarrão de carinho!', 'Hihi'];
const REVIVE_LINES = ['Valeu, amor!', 'Você me salvou!', 'Beijo de cura!', 'Tô de volta!', 'Te devo uma!'];
const FAINT_LINES = ['AMOR!!', 'Não! Aguenta aí!', 'Já vou te ajudar!'];

export const DEFAULT_TERRAIN: Record<string, number> = {
  '#': T.TREE, h: T.HEDGE, '~': T.WATER, '=': T.BRIDGE, ',': T.PATH, ';': T.DARK_GRASS, w: T.STONE_WALL,
  '^': T.CLIFF, x: T.FENCE, ':': T.WOOD_FLOOR, _: T.STONE_FLOOR, ' ': T.SKY, '%': T.FLOWERBED, '-': T.SAND,
  '&': T.CLOUD_EDGE, '+': T.CARPET, '.': -1,
};

/** Base comum de todas as fases: mapa, jogadores, ações, habilidades, desmaio, abraço, câmera e HUD. */
export abstract class BaseLevel extends Phaser.Scene {
  info!: LevelInfo;
  names!: [string, string];
  cols = 0;
  rows = 0;
  tilemap!: Phaser.Tilemaps.Tilemap;
  layer!: Phaser.Tilemaps.TilemapLayer;
  players: Player[] = [];
  solids!: Phaser.Physics.Arcade.StaticGroup;
  interactables: Interactable[] = [];
  enemies: Slime[] = [];
  bolts: Bolt[] = [];
  pickups: Pickup[] = [];
  occupied = new Map<string, unknown>();
  hud!: HUDScene;
  ended = false;
  started = true;
  elapsed = 0;
  stats = { hugs: 0, faints: 0, revives: 0, crystals: 0, coins: 0 };
  reviveProgress = [0, 0];
  reviveBars!: Phaser.GameObjects.Graphics;
  camTarget!: Phaser.GameObjects.Zone;
  /** Textura do coletável principal da fase (cristal, mosquetão, flor...). */
  crystalTex = 'item_crystal';
  crystalName = 'Cristal do Coração';
  defaultFloor: number = T.GRASS;
  objectFloor: number = T.GRASS;
  terrain: Record<string, number> = DEFAULT_TERRAIN;
  /** Objetos do mapa usam o chão do vizinho (ex.: âncora no granito fica sobre granito). */
  inferObjectFloor = false;
  /** Fase maior que a tela? Então a câmera segue e os jogadores ficam "amarrados". */
  scrolling = false;
  private heartT = 0;
  private bumpCd = 0;
  private hugCd = 0;
  private medalUsed = false;
  protected levelData: Record<string, unknown> = {};

  /** Chão de um objeto do mapa: o terreno de chão mais próximo na mesma linha (ou acima/abaixo). */
  private neighborFloor(rows: string[], x: number, y: number): number {
    for (let d = 1; d <= 3; d++) {
      for (const [nx, ny] of [[x - d, y], [x + d, y], [x, y - d], [x, y + d]]) {
        const t = this.terrain[rows[ny]?.[nx] ?? '#'];
        if (t === -1) return this.defaultFloor;
        if (t !== undefined && !SOLID_TILES.includes(t) && t !== T.WATER) return t;
      }
    }
    return this.objectFloor;
  }

  abstract mapRows(): string[];
  /** Cria um objeto para o caractere do mapa. Retorna false se não reconhecido. */
  abstract spawn(ch: string, tx: number, ty: number): boolean;
  /** Configuração específica após o mapa e jogadores existirem. */
  setup(): void {}
  /** Lógica por quadro específica da fase. */
  tick(_dt: number): void {}
  /** Chamado quando o HUD estiver pronto para receber widgets. */
  onHudReady(_hud: HUDScene): void {}
  onHug(): void {}
  onEnemyKilled(_e: Slime): void {}

  init(data: { levelId: string }): void {
    this.info = levelById(data.levelId);
    this.levelData = data as unknown as Record<string, unknown>;
  }

  create(): void {
    // a mesma instância é reutilizada em restart(): reiniciar tudo
    this.players = [];
    this.interactables = [];
    this.enemies = [];
    this.bolts = [];
    this.pickups = [];
    this.occupied = new Map();
    this.ended = false;
    this.started = true;
    this.elapsed = 0;
    this.stats = { hugs: 0, faints: 0, revives: 0, crystals: 0, coins: 0 };
    this.reviveProgress = [0, 0];
    this.heartT = 0;
    this.bumpCd = 0;
    this.hugCd = 0;
    this.medalUsed = false;

    const save = Save.data;
    this.names = [save.looks[0].name, save.looks[1].name];
    this.cameras.main.setBackgroundColor('#1b1424');

    const rows = this.mapRows();
    this.rows = rows.length;
    this.cols = Math.max(...rows.map((r) => r.length));
    const r = new Phaser.Math.RandomDataGenerator([this.info.id]);
    const data: number[][] = [];
    const spawns: [string, number, number][] = [];
    for (let y = 0; y < this.rows; y++) {
      const line: number[] = [];
      for (let x = 0; x < this.cols; x++) {
        const ch = rows[y][x] ?? '.';
        let t = this.terrain[ch];
        if (t === undefined) {
          spawns.push([ch, x, y]);
          t = this.inferObjectFloor ? this.neighborFloor(rows, x, y) : this.objectFloor;
        }
        if (t === -1) t = this.defaultFloor;
        if (t === T.GRASS) {
          const v = r.frac();
          t = v < 0.07 ? T.GRASS_FLOWERS : v < 0.18 ? T.GRASS_TUFT : T.GRASS;
        }
        line.push(t);
      }
      data.push(line);
    }
    this.tilemap = this.make.tilemap({ data, tileWidth: TILE, tileHeight: TILE });
    const ts = this.tilemap.addTilesetImage('tiles', 'tiles', TILE, TILE, 0, 0)!;
    this.layer = this.tilemap.createLayer(0, ts, 0, 0)!;
    this.layer.setCollision(SOLID_TILES);
    this.layer.setDepth(-10);

    const W = this.cols * TILE;
    const H = this.rows * TILE;
    this.physics.world.setBounds(0, 0, W, H);
    this.solids = this.physics.add.staticGroup();

    // jogadores primeiro
    const maxHp = 3 + save.upgrades.hearts;
    for (const [ch, x, y] of spawns) {
      if (ch === 'P' || ch === 'Q') {
        const id = (ch === 'P' ? 0 : 1) as PlayerId;
        const p = new Player(this, id, save.looks[id], x * TILE + 8, y * TILE + 8, maxHp);
        p.speedMult = 1 + 0.08 * save.upgrades.speed;
        p.abilityMax = id === 0 ? 0.32 : 0.55 - 0.1 * save.upgrades.spark;
        this.players[id] = p;
      }
    }
    if (this.players.length < 2) throw new Error('Mapa sem posição inicial dos jogadores (P e Q).');
    for (const [ch, x, y] of spawns) {
      if (ch === 'P' || ch === 'Q') continue;
      if (!this.spawn(ch, x, y)) console.warn(`Caractere de mapa desconhecido "${ch}" em ${x},${y}`);
    }

    const sprites = this.players.map((p) => p.sprite);
    this.physics.add.collider(sprites, this.layer);
    this.physics.add.collider(sprites, this.solids);
    this.physics.add.collider(sprites[0], sprites[1]);

    // câmera
    const cam = this.cameras.main;
    cam.setZoom(ZOOM * RES);
    cam.setBounds(0, 0, Math.max(W, GAME_W / ZOOM), Math.max(H, GAME_H / ZOOM));
    this.scrolling = W > GAME_W / ZOOM + 8 || H > GAME_H / ZOOM + 8;
    const mx = (this.players[0].x + this.players[1].x) / 2;
    const my = (this.players[0].y + this.players[1].y) / 2;
    this.camTarget = this.add.zone(mx, my, 1, 1);
    if (this.scrolling) cam.startFollow(this.camTarget, true, 0.1, 0.1);
    else cam.centerOn(W / 2, H / 2);
    cam.roundPixels = true;

    this.reviveBars = this.add.graphics().setDepth(9000);

    this.setup();

    this.scene.launch('HUD', { level: this });
    this.hud = this.scene.get('HUD') as HUDScene;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scene.stop('HUD');
    });
    Audio.music(this.info.music);
    cam.fadeIn(400, 27, 20, 36);
  }

  // ------------------------------------------------------------------ utilidades de mapa
  tileCenter(tx: number, ty: number): { x: number; y: number } {
    return { x: tx * TILE + 8, y: ty * TILE + 8 };
  }

  key(tx: number, ty: number): string {
    return `${tx},${ty}`;
  }

  isSolidTile(tx: number, ty: number): boolean {
    if (tx < 0 || ty < 0 || tx >= this.cols || ty >= this.rows) return true;
    const t = this.layer.getTileAt(tx, ty);
    return !!t && t.collides;
  }

  /** Bloqueado por terreno ou por objeto sólido registrado. */
  isBlocked(tx: number, ty: number): boolean {
    return this.isSolidTile(tx, ty) || this.occupied.has(this.key(tx, ty));
  }

  isBlockedAt(x: number, y: number): boolean {
    return this.isBlocked(Math.floor(x / TILE), Math.floor(y / TILE));
  }

  /** Cria um corpo sólido invisível de 1 tile. */
  addSolid(tx: number, ty: number, owner: unknown = true, w = TILE, h = TILE): Phaser.GameObjects.Zone {
    const c = this.tileCenter(tx, ty);
    const z = this.add.zone(c.x, c.y, w, h);
    this.physics.add.existing(z, true);
    this.solids.add(z);
    this.occupied.set(this.key(tx, ty), owner);
    return z;
  }

  setSolidEnabled(z: Phaser.GameObjects.Zone, on: boolean): void {
    const body = z.body as Phaser.Physics.Arcade.StaticBody;
    body.enable = on;
    const tx = Math.floor(z.x / TILE);
    const ty = Math.floor(z.y / TILE);
    if (on) this.occupied.set(this.key(tx, ty), z);
    else this.occupied.delete(this.key(tx, ty));
  }

  other(p: Player): Player {
    return this.players[p.id === 0 ? 1 : 0];
  }

  dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  /** Cachoeira decorativa (2x3 tiles) com respingos. Base na linha ty, centrada entre tx-1 e tx. */
  spawnWaterfall(tx: number, ty: number): void {
    const x = tx * TILE;
    const y = (ty + 1) * TILE;
    this.add.sprite(x, y, 'waterfall', 0).setOrigin(0.5, 1).setDepth(y - 30).play('waterfall-anim');
    for (let dy = -2; dy <= 0; dy++) for (const dx of [-1, 0]) if (!this.isBlocked(tx + dx, ty + dy)) this.addSolid(tx + dx, ty + dy);
    this.add.particles(x, y - 4, 'fx_pixel', {
      x: { min: -12, max: 12 }, speedY: { min: -30, max: -10 }, speedX: { min: -20, max: 20 }, gravityY: 60,
      lifespan: 500, frequency: 60, scale: { start: 1, end: 0 }, tint: 0xe0f6ff,
    }).setDepth(y);
  }

  // ------------------------------------------------------------------ efeitos
  burst(x: number, y: number, tex: string, count: number, o: { speed?: number; lifespan?: number; gravity?: number; scale?: number; tint?: number; depth?: number } = {}): void {
    const em = this.add.particles(x, y, tex, {
      speed: { min: (o.speed ?? 60) * 0.4, max: o.speed ?? 60 },
      angle: { min: 0, max: 360 },
      lifespan: o.lifespan ?? 600,
      gravityY: o.gravity ?? 0,
      scale: { start: o.scale ?? 1, end: 0 },
      alpha: { start: 1, end: 0.2 },
      tint: o.tint,
      emitting: false,
    });
    em.setDepth(o.depth ?? 8000);
    em.explode(count);
    this.time.delayedCall((o.lifespan ?? 600) + 100, () => em.destroy());
  }

  floatHeart(x: number, y: number): void {
    const h = this.add.image(x, y, 'fx_heart').setDepth(8000);
    this.tweens.add({ targets: h, y: y - 18, alpha: 0, duration: 1100, ease: 'Sine.Out', onComplete: () => h.destroy() });
  }

  sfx(s: Sfx): void {
    Audio.play(s);
  }

  say(p: Player | { x: number; y: number }, text: string, ms = 1800, color?: string): void {
    if (!this.hud?.ready) return;
    const target = p instanceof Player ? () => ({ x: p.x, y: p.y - 30 }) : () => ({ x: p.x, y: p.y - 12 });
    this.hud.bubble(target, text, ms, color ?? (p instanceof Player ? (p.id === 0 ? '#bfe6ff' : '#ffd6e4') : '#fff4e0'));
  }

  // ------------------------------------------------------------------ itens no chão e coletáveis
  dropOnFloor(p: Player, x?: number, y?: number): boolean {
    if (!p.held) return false;
    const f = x !== undefined && y !== undefined ? { x, y } : p.front(10);
    if (this.isBlockedAt(f.x, f.y)) {
      if (x === undefined) { this.say(p, 'Não dá pra largar aqui'); this.sfx('wrong'); }
      // larga nos pés
      f.x = p.x; f.y = p.y;
    }
    this.placeFloorItem(p.held, f.x, f.y);
    p.held = null;
    this.sfx('drop');
    return true;
  }

  placeFloorItem(item: Item, x: number, y: number): void {
    item.setPosition(x, y - 2, y - 2);
    const fi: Interactable & { item: Item } = {
      x, y, item, priority: -1,
      selectable: (pl) => !pl.held,
      interact: (pl) => {
        if (pl.held) return false;
        pl.held = item;
        this.interactables = this.interactables.filter((i) => i !== fi);
        this.sfx('pick');
        item.pop();
        return true;
      },
    };
    this.interactables.push(fi);
  }

  removeInteractable(i: Interactable): void {
    this.interactables = this.interactables.filter((x) => x !== i);
  }

  addPickup(kind: 'coin' | 'heart' | 'crystal', x: number, y: number): void {
    const img = this.add.image(x, y, kind === 'coin' ? 'ui_coin' : kind === 'heart' ? 'item_heart' : this.crystalTex).setDepth(y);
    this.pickups.push({ img, kind, taken: false, baseY: y });
  }

  onPickup(p: Player, kind: 'coin' | 'heart' | 'crystal'): void {
    if (kind === 'coin') {
      this.stats.coins += 5;
      this.sfx('coin');
      this.hud?.floatText(p.x, p.y - 24, '+5', '#ffd25e');
    } else if (kind === 'heart') {
      this.players.forEach((pl) => { if (!pl.fainted) pl.hp = Math.min(pl.maxHp, pl.hp + 1); });
      this.sfx('heart');
      this.hud?.floatText(p.x, p.y - 24, '+1 ♥', '#ff7aa8');
    } else {
      this.stats.crystals++;
      this.sfx('crystal');
      this.hud?.toast(`${this.crystalName}! (${this.stats.crystals}/3)`, '#ff9cc2');
      this.burst(p.x, p.y - 10, 'fx_spark', 14, { speed: 70 });
    }
  }

  // ------------------------------------------------------------------ dano, desmaio, reviver, abraço
  damagePlayer(p: Player, n: number, fromX: number, fromY: number): void {
    if (this.ended || p.fainted || p.invuln > 0) return;
    if (p.id === 0 && Save.data.relics.medalha && !this.medalUsed) {
      // a medalha de São Bento protege o João do primeiro golpe da fase
      this.medalUsed = true;
      p.invuln = 1.2;
      p.pushBack(fromX, fromY, 100, 0.12);
      this.sfx('crystal');
      this.burst(p.x, p.y - 12, 'fx_spark', 14, { speed: 60, tint: 0xffd25e });
      this.hud?.floatText(p.x, p.y - 34, 'A medalha de São Bento protegeu!', '#ffd25e');
      return;
    }
    p.hp -= n;
    p.invuln = 1.3;
    p.pushBack(fromX, fromY);
    this.sfx('hurt');
    Input.rumble(p.id, 150, 0.6);
    this.cameras.main.shake(120, 0.004);
    if (p.hp <= 0) this.faint(p);
  }

  faint(p: Player): void {
    p.hp = 0;
    p.fainted = true;
    this.stats.faints++;
    if (p.held) this.dropOnFloor(p, p.x + 8, p.y);
    this.sfx('faint');
    const o = this.other(p);
    if (!o.fainted) {
      this.say(o, Phaser.Utils.Array.GetRandom(FAINT_LINES), 1600);
      this.hud?.toast(`${this.names[p.id]} desmaiou! Segure AÇÃO perto para reviver`, '#ff9cc2');
    }
    if (this.players.every((pl) => pl.fainted)) {
      this.fail('Os dois desmaiaram...', ['Ninguém ficou de pé para reviver o outro.', 'Dica: fiquem perto e se revivam rápido!']);
    }
  }

  revive(p: Player, by: Player): void {
    p.fainted = false;
    p.hp = Math.max(1, Math.ceil(p.maxHp / 2));
    p.invuln = 2;
    this.stats.revives++;
    this.sfx('revive');
    for (let i = 0; i < 6; i++) this.time.delayedCall(i * 90, () => this.floatHeart(p.x + Phaser.Math.Between(-8, 8), p.y - 16));
    this.say(p, Phaser.Utils.Array.GetRandom(REVIVE_LINES), 1800);
    void by;
  }

  tryHug(p: Player): boolean {
    const o = this.other(p);
    if (o.fainted || p.held || o.held || this.dist(p, o) > 26) return false;
    const now = this.time.now / 1000;
    p.hugRequest = now;
    if (now - o.hugRequest < 0.6) {
      this.doHug(p, o);
      p.hugRequest = -999;
      o.hugRequest = -999;
    } else {
      this.floatHeart(p.x, p.y - 26);
    }
    return true;
  }

  doHug(a: Player, b: Player): void {
    this.stats.hugs++;
    this.sfx('hug');
    a.face = { x: Math.sign(b.x - a.x) || 1, y: 0 };
    b.face = { x: -a.face.x, y: 0 };
    a.actTimer = b.actTimer = 0.4;
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    for (let i = 0; i < 8; i++) this.time.delayedCall(i * 70, () => this.floatHeart(mx + Phaser.Math.Between(-10, 10), my - 20));
    this.burst(mx, my - 18, 'fx_heart', 10, { speed: 50, lifespan: 900 });
    if (this.hugCd <= 0) {
      let healed = false;
      const heal = Save.data.relics.aliancas ? 2 : 1;
      for (const p of [a, b]) if (p.hp < p.maxHp) { p.hp = Math.min(p.maxHp, p.hp + heal); healed = true; }
      this.hud?.floatText(mx, my - 34, healed ? `Abraço! +${heal} ♥` : 'Abraço!', '#ff9cc2');
      this.hugCd = Save.data.relics.aliancas ? 8 : 12;
    } else {
      this.hud?.floatText(mx, my - 34, 'Abraço!', '#ffd6e4');
    }
    this.onHug();
  }

  // ------------------------------------------------------------------ habilidades
  useAbility(p: Player): void {
    p.abilityCd = p.abilityMax;
    p.actTimer = 0.2;
    if (p.id === 0) this.slash(p);
    else this.castBolt(p);
  }

  slash(p: Player): void {
    const f = p.front(11);
    const ang = Math.atan2(p.face.y, p.face.x);
    const fx = this.add.image(f.x, f.y - 6, 'fx_slash').setRotation(ang).setDepth(p.y + 2).setAlpha(0.95);
    this.tweens.add({ targets: fx, alpha: 0, scale: 1.25, duration: 160, onComplete: () => fx.destroy() });
    this.sfx('slash');
    const dmg = 1 + (Save.data.upgrades.blade >= 2 ? 1 : 0);
    const hp = p.front(12);
    for (const e of this.enemies) {
      if (!e.dead && this.dist(hp, e) < 15) e.hit(dmg, p);
    }
    for (const it of [...this.interactables]) {
      if (it.onStrike && this.dist(hp, it) < 14 + (it.reach ?? 0)) {
        if (it.onStrike(p, dmg)) break;
      }
    }
    this.onSlash(p, hp);
  }

  onSlash(_p: Player, _at: { x: number; y: number }): void {}

  castBolt(p: Player): void {
    const f = p.front(6);
    const img = this.add.image(f.x, f.y - 6, 'fx_bolt').setDepth(9000);
    this.tweens.add({ targets: img, angle: 360, duration: 400, repeat: -1 });
    this.bolts.push({ img, vx: p.face.x * 200, vy: p.face.y * 200, life: 0.5, owner: p });
    this.sfx('magic');
  }

  private updateBolts(dt: number): void {
    for (const b of this.bolts) {
      b.life -= dt;
      b.img.x += b.vx * dt;
      b.img.y += b.vy * dt;
      const pos = { x: b.img.x, y: b.img.y + 6 };
      let done = b.life <= 0;
      if (!done && Math.random() < 0.5) {
        const s = this.add.image(pos.x, pos.y - 6, 'fx_spark').setDepth(8999).setScale(0.6);
        this.tweens.add({ targets: s, alpha: 0, scale: 0, duration: 250, onComplete: () => s.destroy() });
      }
      if (!done) {
        for (const e of this.enemies) {
          if (!e.dead && this.dist(pos, e) < 11) { e.hit(1, b.owner, true); done = true; break; }
        }
      }
      if (!done) {
        for (const it of [...this.interactables]) {
          if (it.onMagic && this.dist(pos, it) < 12 + (it.reach ?? 0)) {
            if (it.onMagic(b.owner)) { done = true; break; }
          }
        }
      }
      if (!done && this.onBolt(b.owner, pos)) done = true;
      if (!done && this.isSolidTile(Math.floor(pos.x / TILE), Math.floor(pos.y / TILE))) done = true;
      if (done) {
        this.burst(pos.x, pos.y - 6, 'fx_spark', 6, { speed: 40, lifespan: 300 });
        b.img.destroy();
        b.life = -1;
      }
    }
    this.bolts = this.bolts.filter((b) => b.life > 0);
  }

  /** Gancho para colisão de magia com objetos especiais da fase. */
  onBolt(_p: Player, _pos: { x: number; y: number }): boolean { return false; }

  // ------------------------------------------------------------------ alvo de ação
  findTarget(p: Player): Interactable | null {
    const f = p.front(10);
    let best: Interactable | null = null;
    let bestScore = Infinity;
    for (const it of this.interactables) {
      if (it.selectable && !it.selectable(p)) continue;
      const reach = it.reach ?? 0;
      const df = this.dist(f, it);
      const dp = this.dist(p, it);
      if (df > 12 + reach || dp > 24 + reach) continue;
      const score = df - (it.priority ?? 0) * 3;
      if (score < bestScore) { bestScore = score; best = it; }
    }
    return best;
  }

  private canMove = (p: Player, vx: number, vy: number): [number, number] => {
    if (!this.scrolling) return [vx, vy];
    const o = this.other(p);
    const maxDX = GAME_W / ZOOM - 36;
    const maxDY = GAME_H / ZOOM - 56;
    const dt = 1 / 60;
    const dx = p.x - o.x;
    const dy = p.y - o.y;
    if (Math.abs(dx + vx * dt) > maxDX && Math.abs(dx + vx * dt) > Math.abs(dx)) vx = 0;
    if (Math.abs(dy + vy * dt) > maxDY && Math.abs(dy + vy * dt) > Math.abs(dy)) vy = 0;
    return [vx, vy];
  };

  // ------------------------------------------------------------------ laço principal
  update(time: number, delta: number): void {
    const dt = Math.min(delta / 1000, 0.05);
    if (Input.pausePressed && !this.ended) {
      this.openPause();
      return;
    }
    if (!this.ended) this.elapsed += dt;
    this.hugCd = Math.max(0, this.hugCd - dt);
    this.bumpCd = Math.max(0, this.bumpCd - dt);
    const frozen = this.ended || !this.started;

    this.reviveBars.clear();
    for (const p of this.players) {
      const inp = Input.players[p.id];
      p.update(dt, frozen ? NO_INPUT : inp, this.canMove);
      if (!frozen) this.handleActions(p, inp, dt);
      if (p.moving && p.takeStep()) Audio.play('step');
    }

    if (!frozen) {
      for (const e of this.enemies) e.update(dt, this.players);
      this.enemies = this.enemies.filter((e) => !e.dead);
      this.updateBolts(dt);
      this.updatePickups(time);
      this.romance(dt);
      this.tick(dt);
    }

    for (const p of this.players) {
      p.postUpdate(time);
      // seletor
      if (p.target && !p.fainted && !frozen) {
        const hint = p.target;
        p.selector.setVisible(true).setPosition(hint.x, hint.y).setScale(1 + Math.sin(time / 120) * 0.05);
      } else p.selector.setVisible(false);
    }

    const mx = (this.players[0].x + this.players[1].x) / 2;
    const my = (this.players[0].y + this.players[1].y) / 2;
    this.camTarget.setPosition(mx, my);
  }

  private handleActions(p: Player, inp: typeof Input.players[0], dt: number): void {
    p.working = false;
    if (p.fainted || p.locked) { p.target = null; return; }
    const o = this.other(p);
    // reviver o parceiro
    if (o.fainted && this.dist(p, o) < 26) {
      p.target = null;
      if (inp.action) {
        p.working = true;
        this.reviveProgress[p.id] += dt;
        const t = Math.min(1, this.reviveProgress[p.id] / 1.4);
        this.drawBar(o.x, o.y - 22, t, 0xff7aa8);
        if (Math.random() < dt * 6) this.floatHeart(o.x + Phaser.Math.Between(-6, 6), o.y - 14);
        if (t >= 1) { this.reviveProgress[p.id] = 0; this.revive(o, p); }
      } else this.reviveProgress[p.id] = 0;
      if (inp.abilityPressed && p.abilityCd <= 0) this.useAbility(p);
      return;
    }
    this.reviveProgress[p.id] = 0;
    if (p.id === 0 && inp.secretPressed) this.squeeze(p, o);
    p.target = this.findTarget(p);
    if (inp.actionPressed) {
      if (p.target?.interact?.(p)) { /* tratado */ }
      else if (p.held) this.dropOnFloor(p);
      else this.tryHug(p);
    }
    if (inp.action && p.target?.canWork?.(p)) {
      p.target.work!(p, dt);
      p.working = true;
    }
    if (inp.abilityPressed && p.abilityCd <= 0) this.useAbility(p);
  }

  /** Comando secreto do João (B): um apertãozinho no bumbum dela... e ela fica com vergonha. */
  private squeezeCd = 0;
  squeeze(j: Player, ju: Player): void {
    const now = this.time.now;
    if (now < this.squeezeCd || ju.fainted || ju.locked || j.locked) return;
    if (this.dist(j, ju) > 24) {
      this.squeezeCd = now + 800;
      this.say(j, Phaser.Utils.Array.GetRandom(['Hmm... longe demais.', 'Cadê ela?', '(chega mais perto...)']), 1000);
      return;
    }
    this.squeezeCd = now + 1600;
    this.squeezes++;
    // ele chega por trás, ela dá um pulinho e fica vermelha
    j.face = { x: Math.sign(ju.x - j.x) || 1, y: 0 };
    j.actTimer = 0.3;
    ju.face = { x: -j.face.x, y: 0 };
    this.sfx('pick');
    this.time.delayedCall(120, () => this.sfx('hug'));
    this.tweens.add({ targets: ju.sprite, y: ju.sprite.y - 6, duration: 110, yoyo: true, ease: 'Quad.Out' });
    ju.sprite.setTint(0xffb0c0);
    this.time.delayedCall(900, () => ju.sprite.clearTint());
    const blush = this.add.text(ju.x, ju.y - 30, '>///<', { fontFamily: 'monospace', fontSize: '8px', color: '#ff5c8a', stroke: '#fff4e0', strokeThickness: 2, fontStyle: 'bold' })
      .setOrigin(0.5).setDepth(9800).setResolution(ZOOM * RES + 1);
    this.tweens.add({ targets: blush, y: blush.y - 10, alpha: 0, delay: 500, duration: 700, onComplete: () => blush.destroy() });
    const lines = this.squeezes === 1
      ? [`${this.names[0]}!! Aqui não! >///<`]
      : ['Ei!! >///<', `${this.names[0]}!!! Tem gente olhando!`, 'Seu safado... ♥', 'Hihi, para! >///<', 'Depois a gente conversa... ♥', 'Foco na missão, amor!'];
    this.time.delayedCall(150, () => this.say(ju, Phaser.Utils.Array.GetRandom(lines), 1800, '#ffd6e4'));
    this.time.delayedCall(900, () => this.say(j, Phaser.Utils.Array.GetRandom(['Hehe', 'Foi sem querer!', 'Escorregou a mão...', '(assobia)']), 1400));
    for (let i = 0; i < 4; i++) this.time.delayedCall(200 + i * 90, () => this.floatHeart(ju.x + Phaser.Math.Between(-6, 6), ju.y - 24));
  }
  squeezes = 0;

  drawBar(x: number, y: number, t: number, color = 0x8be07a): void {
    const g = this.reviveBars;
    g.fillStyle(0x2a1d2e, 1);
    g.fillRect(Math.round(x - 9), Math.round(y - 1), 18, 4);
    g.fillStyle(color, 1);
    g.fillRect(Math.round(x - 8), Math.round(y), Math.round(16 * t), 2);
  }

  private updatePickups(time: number): void {
    for (const pk of this.pickups) {
      if (pk.taken) continue;
      pk.img.y = pk.baseY + Math.sin(time / 250 + pk.baseY) * 1.5;
      for (const p of this.players) {
        if (p.fainted) continue;
        if (Math.hypot(p.x - pk.img.x, p.y - pk.baseY) < 11) {
          pk.taken = true;
          this.tweens.add({ targets: pk.img, y: pk.img.y - 16, alpha: 0, duration: 300, onComplete: () => pk.img.destroy() });
          this.onPickup(p, pk.kind);
          break;
        }
      }
    }
    this.pickups = this.pickups.filter((p) => !p.taken);
  }

  /** Detalhes românticos: corações quando juntinhos, falas ao esbarrar. */
  private romance(dt: number): void {
    const [a, b] = this.players;
    if (a.fainted || b.fainted) return;
    const d = this.dist(a, b);
    if (d < 24 && a.idleTime > 1.5 && b.idleTime > 1.5) {
      this.heartT += dt;
      if (this.heartT > 1.1) { this.heartT = 0; this.floatHeart((a.x + b.x) / 2, Math.min(a.y, b.y) - 26); }
    } else this.heartT = 0;
    if (d < 13 && a.moving && b.moving && this.bumpCd <= 0) {
      this.bumpCd = 9;
      this.say(Math.random() < 0.5 ? a : b, Phaser.Utils.Array.GetRandom(BUMP_LINES), 1300);
    }
  }

  // ------------------------------------------------------------------ fluxo da fase
  openPause(): void {
    Audio.play('select');
    this.scene.launch('Pause', { levelKey: this.scene.key, levelId: this.info.id });
    this.scene.pause();
    this.scene.pause('HUD');
  }

  fail(title: string, lines: string[]): void {
    this.finish({ win: false, stars: 0, score: 0, title, lines });
  }

  finish(res: LevelResult): void {
    if (this.ended) return;
    this.ended = true;
    this.players.forEach((p) => p.body.setVelocity(0, 0));
    Audio.music(null);
    Audio.play(res.win ? 'win' : 'lose');
    if (res.win) {
      this.players.forEach((p) => { p.face = { x: 0, y: 1 }; });
      for (let i = 0; i < 14; i++) {
        this.time.delayedCall(i * 80, () => {
          const p = this.players[i % 2];
          this.floatHeart(p.x + Phaser.Math.Between(-10, 10), p.y - 20);
        });
      }
    }
    this.hud?.banner(res.win ? 'Conseguimos!' : 'Ah, não...', res.title, 1800);
    this.time.delayedCall(2000, () => {
      this.cameras.main.fadeOut(400, 27, 20, 36);
      this.time.delayedCall(420, () => {
        this.scene.stop('HUD');
        this.scene.start('Result', { ...res, levelId: this.info.id, stats: this.stats });
      });
    });
  }

  /** Cria um item novo nas mãos do jogador. */
  give(p: Player, kind: ItemKind): Item {
    const it = new Item(this, kind, p.x, p.y - 26);
    p.held = it;
    this.sfx('pick');
    return it;
  }
}

const NO_INPUT = {
  x: 0, y: 0, action: false, actionPressed: false, ability: false, abilityPressed: false, secretPressed: false,
  upPressed: false, downPressed: false, leftPressed: false, rightPressed: false, usingPad: false,
};
