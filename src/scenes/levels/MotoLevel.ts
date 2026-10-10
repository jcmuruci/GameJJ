import Phaser from 'phaser';
import { GAME_W, GAME_H, ZOOM, RES } from '../../config';
import { LevelInfo, levelById } from '../../data/levels';
import { MOTOS, MotoConfig, MotoSpot } from '../../data/motos';
import { Save } from '../../systems/SaveManager';
import { Input, KEY_LABELS } from '../../systems/InputManager';
import { Audio } from '../../systems/Audio';
import { charFrame } from '../../art/CharacterArt';
import { txt, panel, uiButton } from '../../ui/text';
import { isTouchDevice } from '../../systems/TouchControls';
import { TaskList } from '../../ui/TaskList';

/**
 * Passeio de Moto Amarela — fase de estrada.
 * {p1} pilota (desvia, acelera, freia e pula buracos). {p2} vai na garupa:
 * explode pedras com magia, buzina para as capivaras e tira fotos dos lugares lindos.
 */

type Kind = 'pothole' | 'rock' | 'cone' | 'capy' | 'coin' | 'heart' | 'spot' | 'mud' | 'gate';

interface Obj {
  kind: Kind;
  img: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite | Phaser.GameObjects.Ellipse;
  x: number;
  y: number;
  w: number;
  h: number;
  vy: number;
  dead: boolean;
  scared?: boolean;
  shot?: boolean;
  label?: string;
  /** Faixa onde a capivara vai sentar. */
  ty?: number;
  decor?: string;
  spot?: MotoSpot;
}

const W = GAME_W / ZOOM; // 480
const H = GAME_H / ZOOM; // 270
const ROAD_TOP = 92;
const ROAD_BOT = 212;
const LANES = [112, 152, 192];

export class MotoLevel extends Phaser.Scene {
  info!: LevelInfo;
  cfg!: MotoConfig;
  private repair = -1; // -1 = sem conserto; 0..1 = progresso do conserto
  private flatDone = false;
  private repairUi: Phaser.GameObjects.GameObject[] = [];
  private repairBar: Phaser.GameObjects.Graphics | null = null;
  names!: [string, string];
  private world!: Phaser.GameObjects.Layer;
  private ui!: Phaser.GameObjects.Layer;
  private uiCam!: Phaser.Cameras.Scene2D.Camera;
  private grass!: Phaser.GameObjects.TileSprite;
  private dashes: Phaser.GameObjects.TileSprite[] = [];
  private moto!: Phaser.GameObjects.Container;
  private riders: Phaser.GameObjects.Sprite[] = [];
  private shadow!: Phaser.GameObjects.Ellipse;
  private objs: Obj[] = [];
  private bolts: { img: Phaser.GameObjects.Image; x: number; y: number }[] = [];
  private mx = 120;
  private my = LANES[1];
  private speed = 170;
  private dist = 0;
  private hp = 3;
  private maxHp = 3;
  private invuln = 0;
  private air = 0;
  private jumpCd = 0;
  private boltCd = 0;
  private spawnT = 1.5;
  private coins = 0;
  private photos = 0;
  private hits = 0;
  private spotIdx = 0;
  private started = false;
  private ended = false;
  private hornCd = 0;
  private hearts: Phaser.GameObjects.Image[] = [];
  private progress!: Phaser.GameObjects.Graphics;
  private progressMoto!: Phaser.GameObjects.Image;
  private photoText!: Phaser.GameObjects.Text;
  private toastT!: Phaser.GameObjects.Text;
  private flash!: Phaser.GameObjects.Rectangle;
  private cdBars!: Phaser.GameObjects.Graphics;
  // tarefas do capítulo e o pão quentinho
  tasks: TaskList | null = null;
  warmth = 100;
  catchT = 0;
  catches = 0;
  honked = 0;
  private wasAir = false;
  private flyingBread: Phaser.GameObjects.Image | null = null;
  private warmBar: Phaser.GameObjects.Graphics | null = null;
  /** O pão só existe depois da parada na padaria. */
  private breadOn = false;
  /** Parada obrigatória em que a moto está esperando. */
  private stopWait: Obj | null = null;
  // porteiras
  private gateIdx = 0;
  private gate: { o: Obj; state: 'closed' | 'open' | 'closing' | 'done'; t: number; warned: boolean } | null = null;
  gatesDone = 0;
  // curvas
  private curveT = 6;
  curve: { dir: number; t: number; b: number; failed: boolean } | null = null;
  curvesOk = 0;
  private balanceUi: Phaser.GameObjects.Graphics | null = null;
  private camRot = 0;
  // noite
  private headlight: Phaser.GameObjects.Graphics | null = null;

  constructor() {
    super('MotoLevel');
  }

  init(d: { levelId: string }): void {
    this.info = levelById(d.levelId);
    this.cfg = MOTOS[d.levelId] ?? MOTOS.bread;
  }

  create(): void {
    const save = Save.data;
    this.names = [save.looks[0].name, save.looks[1].name];
    this.objs = [];
    this.bolts = [];
    this.dashes = [];
    this.riders = [];
    this.hearts = [];
    this.mx = 120;
    this.my = LANES[1];
    this.speed = 170;
    this.dist = 0;
    this.maxHp = 3 + save.upgrades.hearts;
    this.hp = this.maxHp;
    this.invuln = 0;
    this.air = 0;
    this.jumpCd = 0;
    this.boltCd = 0;
    this.spawnT = 2;
    this.coins = 0;
    this.photos = 0;
    this.hits = 0;
    this.spotIdx = 0;
    this.started = false;
    this.ended = false;
    this.hornCd = 0;
    this.repair = -1;
    this.flatDone = false;
    this.repairUi = [];
    this.repairBar = null;
    this.tasks = null;
    this.warmth = 100;
    this.catchT = 0;
    this.catches = 0;
    this.honked = 0;
    this.wasAir = false;
    this.flyingBread = null;
    this.warmBar = null;
    this.breadOn = false;
    this.stopWait = null;
    this.gateIdx = 0;
    this.gate = null;
    this.gatesDone = 0;
    this.curveT = 6;
    this.curve = null;
    this.curvesOk = 0;
    this.balanceUi = null;
    this.camRot = 0;
    this.headlight = null;

    this.world = this.add.layer();
    this.ui = this.add.layer();
    const cam = this.cameras.main;
    cam.setZoom(ZOOM * RES).centerOn(W / 2, H / 2).setBackgroundColor('#7ccf5a');
    cam.ignore(this.ui);
    this.uiCam = this.cameras.add(0, 0, GAME_W * RES, GAME_H * RES).setZoom(RES).centerOn(GAME_W / 2, GAME_H / 2);
    this.uiCam.ignore(this.world);

    // cenário
    this.grass = this.add.tileSprite(W / 2, H / 2, W, H, 'tiles', 0);
    const road = this.add.graphics();
    const dirt = this.cfg.dirt;
    road.fillStyle(dirt ? 0x8a5a34 : 0xd8b07a, 1).fillRect(0, ROAD_TOP - 6, W, 6).fillRect(0, ROAD_BOT, W, 6);
    road.fillStyle(dirt ? 0xb8844e : 0x5a5a6a, 1).fillRect(0, ROAD_TOP, W, ROAD_BOT - ROAD_TOP);
    road.fillStyle(dirt ? 0xa8743e : 0x4a4a58, 1).fillRect(0, ROAD_TOP + 2, W, 2).fillRect(0, ROAD_BOT - 4, W, 2);
    if (!dirt) road.fillStyle(0xffd25e, 1).fillRect(0, ROAD_TOP + 5, W, 1).fillRect(0, ROAD_BOT - 6, W, 1);
    this.world.add([this.grass, road]);
    if (dirt) {
      // marcas de pneu na terra (rolam junto)
      const ruts = this.add.tileSprite(W / 2, 152, W, 80, 'fx_dust').setAlpha(0.18).setTint(0x6a4a2a);
      this.dashes.push(ruts);
      this.world.add(ruts);
    }
    for (const y of dirt ? [] : [132, 172]) {
      const d = this.add.tileSprite(W / 2, y, W, 4, 'road_dash');
      this.dashes.push(d);
      this.world.add(d);
    }
    for (let i = 0; i < 10; i++) this.spawnDecor(Phaser.Math.Between(0, W));

    // moto com o casal
    this.shadow = this.add.ellipse(0, 0, 36, 8, 0x000000, 0.25);
    this.riders = [1, 0].map((i) => this.add.sprite(i === 0 ? 5 : -5, i === 0 ? -11 : -13, `char_${i}`, charFrame('side', 0)).setFlipX(true));
    const motoImg = this.add.image(0, 0, 'moto');
    this.moto = this.add.container(this.mx, this.my, [...this.riders, motoImg]);
    this.world.add([this.shadow, this.moto]);

    this.flash = this.add.rectangle(W / 2, H / 2, W, H, 0xffffff, 0);
    this.world.add(this.flash);
    if (this.cfg.night) {
      // noite: tudo escurece; farol e postes iluminam
      this.world.add(this.add.rectangle(W / 2, H / 2, W, H, 0x0a0a26, 0.62).setDepth(8000));
      this.headlight = this.add.graphics().setDepth(8001).setBlendMode(Phaser.BlendModes.ADD);
      this.world.add(this.headlight);
      for (let i = 0; i < 26; i++) {
        const st = this.add.image(Phaser.Math.Between(0, W), Phaser.Math.Between(4, ROAD_TOP - 20), 'fx_spark').setScale(0.4).setDepth(8002).setAlpha(0.7);
        this.world.add(st);
        this.tweens.add({ targets: st, alpha: 0.2, yoyo: true, repeat: -1, duration: Phaser.Math.Between(600, 1500) });
      }
    }

    this.buildUi();
    this.showIntro();
    Audio.music('road');
    cam.fadeIn(400, 27, 20, 36);
  }

  // ------------------------------------------------------------------ interface
  private buildUi(): void {
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => { this.ui.add(o); return o; };
    const g = add(this.add.graphics());
    g.fillStyle(0x1b1424, 0.75).fillRoundedRect(12, 10, 220, 46, 10);
    for (let i = 0; i < this.maxHp; i++) this.hearts.push(add(this.add.image(36 + i * 22, 33, 'ui_heart').setScale(2.4)));
    this.photoText = add(txt(this, GAME_W - 24, 32, '', 18, { origin: [1, 0.5], color: '#ffd6e4' }));
    add(this.add.image(GAME_W - 200, 32, this.hasStops ? 'item_bread' : 'photo_spot').setScale(1.6));
    this.progress = add(this.add.graphics());
    this.progressMoto = add(this.add.image(0, 0, 'moto_map').setScale(2));
    add(this.add.image(GAME_W / 2 + 214, 58, this.cfg.goalIcon, 0).setScale(0.5));
    add(txt(this, GAME_W / 2, 24, this.info.name, 18, { color: '#fff4e0' }));
    this.toastT = add(txt(this, GAME_W / 2, 110, '', 20, { color: '#fff4e0' }).setAlpha(0));
    this.cdBars = add(this.add.graphics());
    if (this.cfg.bread) {
      add(this.add.image(GAME_W - 200, 66, 'fx_heart').setScale(1.6).setTint(0xffa64a));
      this.warmBar = add(this.add.graphics());
    }
    if (this.cfg.curves) this.balanceUi = add(this.add.graphics());
    const help = [
      `${this.names[0]}: ${KEY_LABELS[0].move} pilota · ${KEY_LABELS[0].ability}: pula buracos`,
      `${this.names[1]}: ${KEY_LABELS[1].ability}: magia nas pedras · ${KEY_LABELS[1].action}: ${this.hasStops ? 'buzina / paradas' : this.cfg.gates ? 'porteira / foto' : 'buzina / foto'}${this.cfg.curves ? ' · ← →: equilíbrio' : ''}`,
    ];
    help.forEach((h, i) => add(txt(this, i === 0 ? 20 : GAME_W - 20, GAME_H - 18, h, 13, { origin: [i === 0 ? 0 : 1, 0.5], color: i === 0 ? '#bfe6ff' : '#ffd6e4', bold: false })));
    if (!isTouchDevice()) add(uiButton(this, GAME_W / 2, GAME_H - 20, 'Pausa (Esc)', () => this.openPause(), { size: 13 }));
    this.refreshUi();
  }

  private refreshUi(): void {
    this.hearts.forEach((h, i) => h.setTexture(i < this.hp ? 'ui_heart' : 'ui_heart_empty'));
    this.photoText.setText(`${this.hasStops ? 'Paradas' : 'Fotos'}: ${this.photos}/${this.cfg.spots.length}`);
    if (this.warmBar) {
      const w = this.breadOn ? this.warmth / 100 : 0;
      this.warmBar.clear().fillStyle(0x1b1424, 0.75).fillRoundedRect(GAME_W - 186, 60, 164, 14, 6)
        .fillStyle(w >= 0.5 ? 0xffa64a : 0x9ab0d8, 1).fillRect(GAME_W - 182, 64, 156 * w, 6);
    }
    const x0 = GAME_W / 2 - 200;
    const w = 400;
    const t = Math.min(1, this.dist / this.cfg.total);
    this.progress.clear().fillStyle(0x1b1424, 0.75).fillRoundedRect(x0 - 8, 48, w + 16, 22, 8)
      .fillStyle(0xd8b07a, 1).fillRect(x0, 57, w, 4).fillStyle(0xffd23a, 1).fillRect(x0, 57, w * t, 4);
    for (const s of this.cfg.spots) this.progress.fillStyle(0xff9cc2, 1).fillRect(x0 + w * s.at - 1, 53, 3, 12);
    this.progressMoto.setPosition(x0 + w * t, 52);
    const g = this.cdBars.clear();
    g.fillStyle(0x000000, 0.4).fillRect(20, GAME_H - 36, 120, 3).fillRect(GAME_W - 140, GAME_H - 36, 120, 3);
    g.fillStyle(this.jumpCd <= 0 ? 0x8be07a : 0xffd25e, 1).fillRect(20, GAME_H - 36, 120 * (1 - this.jumpCd / 1.3), 3);
    g.fillStyle(this.boltCd <= 0 ? 0x8be07a : 0xffd25e, 1).fillRect(GAME_W - 140, GAME_H - 36, 120 * (1 - this.boltCd / 0.45), 3);
    // equilíbrio nas curvas
    if (this.balanceUi) {
      const b = this.balanceUi.clear();
      if (this.curve) {
        const cx = GAME_W / 2;
        const cy = GAME_H - 64;
        b.fillStyle(0x1b1424, 0.8).fillRoundedRect(cx - 130, cy - 12, 260, 24, 8);
        b.fillStyle(0xff7a7a, 1).fillRect(cx - 124, cy - 4, 24, 8).fillRect(cx + 100, cy - 4, 24, 8);
        b.fillStyle(0x8be07a, 1).fillRect(cx - 40, cy - 4, 80, 8);
        b.fillStyle(0xfff4e0, 1).fillRect(cx + this.curve.b * 120 - 3, cy - 9, 6, 18);
      }
    }
  }

  private get hasStops(): boolean { return this.cfg.spots.some((s) => s.kind === 'stop'); }

  private toast(s: string, color = '#fff4e0'): void {
    this.tweens.killTweensOf(this.toastT);
    this.toastT.setText(s).setColor(color).setAlpha(1).setScale(0.8);
    this.tweens.add({ targets: this.toastT, scale: 1, duration: 160, ease: 'Back.Out' });
    this.tweens.add({ targets: this.toastT, alpha: 0, delay: 1800, duration: 300 });
  }

  private showIntro(): void {
    const objs: Phaser.GameObjects.GameObject[] = [];
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => { this.ui.add(o); objs.push(o); return o; };
    const w = 640;
    const h = 330;
    const x0 = (GAME_W - w) / 2;
    const y0 = (GAME_H - h) / 2;
    add(panel(this, x0, y0, w, h));
    add(txt(this, GAME_W / 2, y0 + 34, this.cfg.title, 30, { color: '#ffd23a' }));
    add(txt(this, GAME_W / 2, y0 + 66, this.cfg.subtitle, 14, { bold: false, wrap: 600 }));
    const lines: [string, string][] = [
      [`${this.names[0]} pilota`, `${KEY_LABELS[0].move}: desvia, acelera e freia · ${KEY_LABELS[0].ability}: pula buracos e cones`],
      [`${this.names[1]} na garupa`, `${KEY_LABELS[1].ability}: magia explode pedras · ${KEY_LABELS[1].action}: buzina p/ ${this.cfg.animal === 'cow' ? 'vacas' : 'capivaras'}${this.cfg.bread ? ' e segura o pão' : ''}`],
      this.hasStops
        ? ['Paradas', `Na padaria e na casa da família a moto para: ${this.names[1]} aperta ${KEY_LABELS[1].action}!`]
        : this.cfg.gates
          ? ['Porteiras e curvas', `Porteira: ${this.names[1]} abre e fecha (${KEY_LABELS[1].action}) · Curva: ela se inclina junto (← →)`]
          : ['Fotos do casal', `Quando passar uma placa de câmera, ${this.names[1]} aperta ${KEY_LABELS[1].action}!`],
    ];
    lines.forEach(([a, b], i) => {
      add(txt(this, GAME_W / 2, y0 + 110 + i * 50, a, 17, { color: i === 0 ? '#bfe6ff' : i === 1 ? '#ffd6e4' : '#ffd25e' }));
      add(txt(this, GAME_W / 2, y0 + 132 + i * 50, b, 14, { bold: false }));
    });
    const ready = [false, false];
    const rt = [0, 1].map((i) => add(txt(this, GAME_W / 2 + (i ? 150 : -150), y0 + h - 30, `${this.names[i]}: aperte ${KEY_LABELS[i].action}`, 16, { color: i ? '#ffd6e4' : '#bfe6ff' })));
    const ev = this.time.addEvent({
      delay: 16, loop: true, callback: () => {
        for (let i = 0; i < 2; i++) {
          if (!ready[i] && Input.players[i].actionPressed) { ready[i] = true; rt[i].setText(`${this.names[i]}: pronto! ♥`); Audio.play('confirm'); }
        }
        if (ready[0] && ready[1]) {
          ev.remove();
          objs.forEach((o) => o.destroy());
          Audio.play('horn');
          this.toast('Vrummm! Partiu!', '#ffd23a');
          this.started = true;
          this.tasks = new TaskList(this, 12, 64, this.cfg.tasks);
          this.ui.add(this.tasks.container);
        }
      },
    });
  }

  // ------------------------------------------------------------------ geração
  private spawnDecor(x: number): void {
    if (this.cfg.night && Math.random() < 0.3) {
      // poste com luz amarelada iluminando a estrada
      const post = this.add.image(x, ROAD_TOP - 2, 'lamp_post').setOrigin(0.5, 1).setDepth(ROAD_TOP - 2);
      const glow = this.add.ellipse(x + 4, ROAD_TOP + 22, 90, 50, 0xffc860, 0.16).setDepth(8001).setBlendMode(Phaser.BlendModes.ADD);
      this.world.add([post, glow]);
      this.objs.push({ kind: 'coin', img: post, x, y: ROAD_TOP - 2, w: 0, h: 0, vy: 0, dead: false, label: 'decor' });
      this.objs.push({ kind: 'coin', img: glow, x: x + 4, y: ROAD_TOP + 22, w: 0, h: 0, vy: 0, dead: false, label: 'decor' });
      return;
    }
    const top = Math.random() < 0.5;
    const y = top ? Phaser.Math.Between(16, ROAD_TOP - 16) : Phaser.Math.Between(ROAD_BOT + 22, H - 6);
    const key = Phaser.Utils.Array.GetRandom(['tree_big', 'tree_big', 'tree_pink', 'tree_ipe', 'bush', 'bush', 'rock_small']);
    const img = this.add.image(x, y, key).setOrigin(0.5, 1).setDepth(y);
    if (key.startsWith('tree') && top) img.setScale(0.9);
    this.world.add(img);
    this.objs.push({ kind: 'coin', img, x, y, w: 0, h: 0, vy: 0, dead: false, label: 'decor' });
  }

  private add_(kind: Kind, x: number, y: number, key: string, w: number, h: number, vy = 0): Obj {
    const img = kind === 'capy' ? this.add.sprite(x, y, key, 0).play(this.animalAnim) : this.add.image(x, y, key);
    img.setDepth(y);
    this.world.add(img);
    const o: Obj = { kind, img, x, y, w, h, vy, dead: false };
    this.objs.push(o);
    return o;
  }

  private get animalAnim(): string { return this.cfg.animal === 'cow' ? 'cow-walk' : 'capy-walk'; }

  private spawnWave(): void {
    const t = this.dist / this.cfg.total;
    const r = Math.random();
    const lane = Phaser.Utils.Array.GetRandom(LANES);
    const X = W + 30;
    if (r < 0.28) {
      if (this.cfg.mud && Math.random() < 0.55) this.add_('mud', X, lane, 'mud', 22, 8);
      else this.add_('pothole', X, lane, 'pothole', 18, 7);
    }
    else if (r < 0.48) this.add_('rock', X, lane, 'boulder', 14, 12);
    else if (r < 0.58) {
      // barreira: pedras em duas faixas e buraco na terceira — precisa da magia ou do pulo
      const free = Phaser.Utils.Array.GetRandom(LANES);
      for (const l of LANES) {
        if (l === free) this.add_('pothole', X, l, 'pothole', 18, 7);
        else this.add_('rock', X, l, 'boulder', 14, 12);
      }
    } else if (r < 0.68) {
      for (let i = 0; i < 3; i++) this.add_('cone', X + i * 14, lane, 'cone', 8, 8);
    } else if (r < 0.8 && t > 0.08) {
      const fromTop = Math.random() < 0.5;
      const cow = this.cfg.animal === 'cow';
      const o = this.add_('capy', X + 40, fromTop ? ROAD_TOP - 6 : ROAD_BOT + 4, cow ? 'cow' : 'capybara', cow ? 20 : 18, 10, fromTop ? 22 : -22);
      o.ty = Phaser.Utils.Array.GetRandom(LANES);
    } else {
      const n = Math.random() < 0.15 ? 1 : 4;
      for (let i = 0; i < n; i++) this.add_(n === 1 ? 'heart' : 'coin', X + i * 18, lane, n === 1 ? 'item_heart' : 'ui_coin', 10, 10);
    }
  }

  // ------------------------------------------------------------------ laço
  update(_t: number, delta: number): void {
    const dt = Math.min(delta / 1000, 0.05);
    if (Input.pausePressed && !this.ended) { this.openPause(); return; }
    const time = this.time.now;
    const col = [1, 0, 2, 0][Math.floor(time / 90) % 4];
    this.riders.forEach((r, i) => r.setFrame(charFrame('side', i === 0 && this.boltCd > 0.3 ? 3 : 0)).setY((i === 0 ? -13 : -11) + (col === 1 ? -0.5 : 0)));
    this.refreshUi();
    if (!this.started || this.ended) {
      this.moto.y = this.my + Math.sin(time / 120) * 0.5;
      this.shadow.setPosition(this.moto.x, this.my + 12);
      return;
    }

    const p1 = Input.players[0];
    const p2 = Input.players[1];
    if (this.cfg.flatTireAt !== undefined && !this.flatDone && this.repair < 0 && this.dist / this.cfg.total >= this.cfg.flatTireAt) this.flatTire();
    if (this.repair >= 0) { this.updateRepair(dt, time); return; }
    this.invuln = Math.max(0, this.invuln - dt);
    this.jumpCd = Math.max(0, this.jumpCd - dt);
    this.boltCd = Math.max(0, this.boltCd - dt);
    this.hornCd = Math.max(0, this.hornCd - dt);

    // paradas obrigatórias e porteiras seguram a moto
    const halt = this.updateHalts(dt);
    // piloto
    const target = halt ? 0 : 170 + p1.x * 70 + (this.dist / this.cfg.total) * 40;
    this.speed += (target - this.speed) * Math.min(1, dt * (halt ? 6 : 3));
    if (halt && this.speed < 4) this.speed = 0;
    this.my = Phaser.Math.Clamp(this.my + p1.y * 120 * dt, ROAD_TOP + 12, ROAD_BOT - 8);
    this.mx += ((95 + (this.speed - 100) * 0.4) - this.mx) * Math.min(1, dt * 2);
    if (p1.abilityPressed && this.jumpCd <= 0 && this.air <= 0) {
      this.air = 0.6;
      this.jumpCd = 1.3;
      Audio.play('jump');
    }
    if (p1.actionPressed && this.hornCd <= 0) this.honk();
    // garupa
    if (p2.abilityPressed && this.boltCd <= 0) this.castBolt();
    if (p2.actionPressed) {
      if (this.catchT > 0) this.catchBread(true);
      else if (this.gateAction()) { /* porteira */ }
      else if (!this.tryPhoto() && this.hornCd <= 0) this.honk();
    }
    this.updateBread(dt);
    if (!halt) this.updateCurve(dt, p2.x);

    this.air = Math.max(0, this.air - dt);
    const hop = this.air > 0 ? Math.sin((1 - this.air / 0.6) * Math.PI) * 14 : 0;
    this.moto.setPosition(this.mx, this.my - hop + (this.air > 0 ? 0 : Math.sin(time / 60) * 0.4));
    this.moto.setAngle((this.air > 0 ? -6 : p1.y * 4) + (this.curve ? this.curve.b * 14 : 0));
    this.moto.setDepth(this.my + 4);
    this.moto.setAlpha(this.invuln > 0 && Math.floor(this.invuln * 12) % 2 ? 0.4 : 1);
    this.shadow.setPosition(this.mx, this.my + 12).setScale(1 - hop / 40).setDepth(this.my - 1);
    if (this.headlight) {
      const hy = this.my - hop - 6;
      this.headlight.clear().fillStyle(0xffe08a, 0.13).fillTriangle(this.mx + 14, hy, this.mx + 160, hy - 36, this.mx + 160, hy + 30)
        .fillStyle(0xfff1a8, 0.3).fillCircle(this.mx + 15, hy, 4);
    }
    if (Math.random() < dt * 20) {
      const d = this.add.image(this.mx - 20, this.my + 8, 'fx_dust').setDepth(this.my);
      this.world.add(d);
      this.tweens.add({ targets: d, x: d.x - 30, alpha: 0, scale: 2, duration: 400, onComplete: () => d.destroy() });
    }

    // rolagem
    const dx = this.speed * dt;
    this.dist += dx;
    this.grass.tilePositionX += dx;
    this.dashes.forEach((d) => { d.tilePositionX += dx; });
    if (Math.random() < dt * 2.2) this.spawnDecor(W + 30);
    this.spawnT -= dt;
    const gap = Phaser.Math.Linear(1.25, 0.75, this.dist / this.cfg.total);
    const gateNear = this.gate && this.gate.state !== 'done';
    if (this.spawnT <= 0 && this.dist < this.cfg.total - 900 && !gateNear && !this.stopWait) { this.spawnT = gap * Phaser.Math.FloatBetween(0.8, 1.2); this.spawnWave(); }
    if (this.cfg.gates && this.gateIdx < this.cfg.gates.length && !this.gate && this.dist / this.cfg.total >= this.cfg.gates[this.gateIdx]) { this.gateIdx++; this.spawnGate(); }
    if (this.spotIdx < this.cfg.spots.length && this.dist / this.cfg.total >= this.cfg.spots[this.spotIdx].at) this.spawnSpot(this.cfg.spots[this.spotIdx++]);

    this.updateObjs(dt, dx);
    this.updateBolts(dt);

    if (this.dist >= this.cfg.total) this.arrive();
  }

  /** O pneu furou: os dois consertam juntos. */
  private flatTire(): void {
    this.repair = 0;
    this.speed = 0;
    Audio.play('wind');
    Audio.play('hurt');
    this.cameras.main.shake(250, 0.01);
    this.toast('PSSSSS... o pneu furou!', '#ff9c9c');
    for (const o of this.objs) if (o.label !== 'decor') o.dead = true;
    // para no acostamento: sem curva no meio do conserto
    this.curve = null;
    this.curveT = 6;
    this.camRot = 0;
    this.cameras.main.setRotation(0);
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => { this.ui.add(o); this.repairUi.push(o); return o; };
    add(panel(this, GAME_W / 2 - 280, 150, 560, 170));
    add(txt(this, GAME_W / 2, 182, 'Consertem o pneu juntos!', 24, { color: '#ffd23a' }));
    add(txt(this, GAME_W / 2, 216, `${this.names[0]}: SEGURE ${KEY_LABELS[0].action} (segura a moto)  ·  ${this.names[1]}: aperte ${KEY_LABELS[1].action} sem parar (bomba de ar)`, 14, { bold: false, wrap: 520 }));
    this.repairBar = add(this.add.graphics());
  }

  private updateRepair(_dt: number, time: number): void {
    const holding = Input.players[0].action;
    if (Input.players[1].actionPressed) {
      if (holding) {
        this.repair = Math.min(1, this.repair + 0.08);
        Audio.play('push');
        this.riders[0].setY(-13 - 2);
      } else {
        this.toast(`Segura a moto, ${this.names[0]}!`, '#ffd6e4');
        Audio.play('wrong');
      }
    }
    this.moto.setAngle(holding ? 0 : Math.sin(time / 80) * 3);
    this.repairBar?.clear().fillStyle(0x1b1424, 1).fillRoundedRect(GAME_W / 2 - 200, 262, 400, 22, 8)
      .fillStyle(0x8be07a, 1).fillRoundedRect(GAME_W / 2 - 196, 266, 392 * this.repair, 14, 6);
    if (this.repair >= 1) {
      this.repair = -1;
      this.flatDone = true;
      this.repairUi.forEach((o) => o.destroy());
      this.repairUi = [];
      Audio.play('revive');
      this.toast('Consertado! Dupla imbatível ♥', '#8be07a');
      this.tasks?.done('repair');
      const next = this.cfg.repairText;
      if (next) this.time.delayedCall(2100, () => this.toast(next, '#ffd23a'));
      this.burst(this.mx, this.my - 10, 'fx_heart', 12);
      this.spawnT = 1.5;
    }
  }

  private openPause(): void {
    if (this.ended || !this.scene.isActive()) return;
    Audio.play('select');
    this.scene.launch('Pause', { levelKey: this.scene.key, levelId: this.info.id });
    this.scene.pause();
  }

  private spawnSpot(s: MotoSpot): void {
    const x = W + 40;
    const decor = this.add.image(x + 20, ROAD_TOP - 10, s.decor, 0).setOrigin(0.5, 1).setDepth(ROAD_TOP - 10);
    if (s.decor === 'big_rock') decor.setScale(0.7);
    this.world.add(decor);
    this.objs.push({ kind: 'coin', img: decor, x: x + 20, y: ROAD_TOP - 10, w: 0, h: 0, vy: 0, dead: false, label: 'decor' });
    const o = this.add_('spot', x, ROAD_TOP - 4, 'photo_spot', 0, 0);
    o.label = s.label;
    o.decor = s.decor;
    o.spot = s;
    if (this.cfg.night) {
      // a padaria e a casa ficam com a luz acesa
      const glow = this.add.ellipse(x + 20, ROAD_TOP - 24, 110, 70, 0xffe8a0, 0.25).setDepth(8001).setBlendMode(Phaser.BlendModes.ADD);
      this.world.add(glow);
      this.objs.push({ kind: 'coin', img: glow, x: x + 20, y: ROAD_TOP - 24, w: 0, h: 0, vy: 0, dead: false, label: 'decor' });
    }
    o.img.setOrigin(0.5, 1);
    this.tweens.add({ targets: o.img, scale: 1.2, yoyo: true, repeat: -1, duration: 300 });
    if (s.kind === 'stop') this.toast(`Parada: ${s.label}! ${this.names[1]}, aperte ${KEY_LABELS[1].action} quando chegar.`, '#ffd23a');
    else this.toast(`Foto: ${s.label} chegando! ${this.names[1]}, prepara a foto (${KEY_LABELS[1].action})!`, '#ffd6e4');
  }

  private tryPhoto(): boolean {
    const spot = this.objs.find((o) => o.kind === 'spot' && !o.dead && !o.shot && o.x > this.mx - 60 && o.x < this.mx + 170);
    if (!spot) return false;
    spot.shot = true;
    this.photos++;
    if (spot.spot?.kind === 'stop') { this.completeStop(spot.spot); return true; }
    Audio.play('camera');
    this.flash.setAlpha(0.8);
    this.tweens.add({ targets: this.flash, alpha: 0, duration: 350 });
    this.riders.forEach((r) => this.tweens.add({ targets: r, y: r.y - 3, yoyo: true, duration: 120 }));
    this.toast(`Foto: ${spot.label}! (${this.photos}/3) ♥`, '#ffd6e4');
    this.tasks?.progress('photos', this.photos);
    this.polaroid(spot.label ?? '', spot.decor ?? 'tree_ipe');
    return true;
  }

  /** Mini "polaroid" do casal que aparece na tela. */
  private polaroid(label: string, decor: string): void {
    const c = this.add.container(GAME_W - 130, GAME_H / 2);
    const g = this.add.graphics();
    g.fillStyle(0xfff7f0, 1).fillRect(-70, -80, 140, 160);
    g.fillStyle(0x7ccf5a, 1).fillRect(-60, -70, 120, 110);
    g.fillStyle(0x9ce8ff, 1).fillRect(-60, -70, 120, 40);
    c.add(g);
    c.add(this.add.image(0, -30, decor, 0).setScale(decor === 'big_rock' ? 0.9 : 1.2));
    c.add(this.add.image(-16, 6, 'char_0', charFrame('down', 3)).setScale(2));
    c.add(this.add.image(16, 6, 'char_1', charFrame('down', 3)).setScale(2));
    c.add(this.add.image(0, -18, 'fx_heart').setScale(2));
    c.add(txt(this, 0, 58, label, 14, { color: '#2a1d2e', stroke: '#fff7f0', strokeW: 0 }));
    c.setAngle(-6).setScale(0.3).setAlpha(0);
    this.ui.add(c);
    this.tweens.add({ targets: c, scale: 1, alpha: 1, angle: 4, duration: 300, ease: 'Back.Out' });
    this.tweens.add({ targets: c, alpha: 0, y: c.y + 40, delay: 1800, duration: 400, onComplete: () => c.destroy() });
  }

  /** Parada concluída: pega o item (pão, carne de lata...) e segue viagem. */
  private completeStop(s: MotoSpot): void {
    this.stopWait = null;
    Audio.play('coin');
    this.toast(s.doneText ?? s.label, '#ffd23a');
    if (s.task) this.tasks?.done(s.task);
    if (s.task === 'padaria' && this.cfg.bread) { this.breadOn = true; this.warmth = 100; }
    this.riders.forEach((r) => this.tweens.add({ targets: r, y: r.y - 4, yoyo: true, duration: 140 }));
    // o item aparece grande na tela por um instante
    const c = this.add.container(GAME_W / 2, GAME_H / 2 - 20);
    const g = this.add.graphics();
    g.fillStyle(0x1b1424, 0.85).fillRoundedRect(-110, -70, 220, 140, 14);
    g.lineStyle(3, 0xffd23a, 1).strokeRoundedRect(-110, -70, 220, 140, 14);
    c.add([g, this.add.image(0, -14, s.item ?? 'item_bread').setScale(5), txt(this, 0, 46, s.label, 18, { color: '#ffd23a' })]);
    c.setScale(0.3).setAlpha(0);
    this.ui.add(c);
    this.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 260, ease: 'Back.Out' });
    this.tweens.add({ targets: c, alpha: 0, delay: 1500, duration: 300, onComplete: () => c.destroy() });
  }

  /** Moto parada: parada obrigatória à frente ou porteira fechada. */
  private updateHalts(dt: number): boolean {
    if (!this.stopWait) {
      const st = this.objs.find((o) => o.kind === 'spot' && o.spot?.kind === 'stop' && !o.shot && !o.dead && o.x <= this.mx + 26);
      if (st) {
        this.stopWait = st;
        this.toast(`${st.label}! ${this.names[1]}, aperte ${KEY_LABELS[1].action}!`, '#ffd23a');
      }
    } else if (this.stopWait.shot || this.stopWait.dead) this.stopWait = null;
    let gateHalt = false;
    const g = this.gate;
    if (g) {
      if (g.state === 'closed' && g.o.x - this.mx < 50) {
        gateHalt = true;
        if (!g.warned) { g.warned = true; this.toast(`Porteira! ${this.names[1]}, desce e abre (${KEY_LABELS[1].action})!`, '#ffd23a'); }
      }
      if (g.state === 'open' && g.o.x < this.mx - 28) {
        g.state = 'closing';
        g.t = 3;
        this.toast(`Porteira aberta, porteira fechada! Fecha (${KEY_LABELS[1].action})!`, '#ffd23a');
      }
      if (g.state === 'closing') {
        g.t -= dt;
        if (g.t <= 0) { g.state = 'done'; this.toast('Ih, a porteira ficou aberta... as vacas vão fugir!', '#d8c8e8'); }
      }
      if (g.o.dead || g.o.x < -30) this.gate = null;
    }
    return !!this.stopWait || gateHalt;
  }

  private spawnGate(): void {
    const o = this.add_('gate', W + 30, ROAD_TOP - 6, 'porteira', 12, 124);
    o.img.setOrigin(0.5, 0);
    for (const x of this.objs) if (x !== o && x.label !== 'decor' && x.kind !== 'spot' && x.x > this.mx + 40) x.dead = true;
    this.gate = { o, state: 'closed', t: 0, warned: false };
  }

  /** Ela desce e abre a porteira; depois que a moto passa, fecha. */
  private gateAction(): boolean {
    const g = this.gate;
    if (!g) return false;
    const img = g.o.img as Phaser.GameObjects.Image;
    if (g.state === 'closed' && g.o.x - this.mx < 90) {
      g.state = 'open';
      Audio.play('gate');
      this.tweens.add({ targets: img, angle: -82, duration: 500, ease: 'Sine.Out' });
      this.tweens.add({ targets: this.riders[0], y: this.riders[0].y - 6, yoyo: true, duration: 160, repeat: 1 });
      this.toast('Porteira aberta! Passa, amor!', '#8be07a');
      return true;
    }
    if (g.state === 'closing') {
      g.state = 'done';
      Audio.play('gate');
      this.tweens.add({ targets: img, angle: 0, duration: 400, ease: 'Sine.In' });
      this.gatesDone++;
      this.tasks?.progress('gates', this.gatesDone);
      this.toast('Porteira fechada! Regra da roça ♥', '#8be07a');
      return true;
    }
    return false;
  }

  /** Curvas na terra: a moto quer escapar para fora; ela se inclina junto (setas). */
  private updateCurve(dt: number, lean: number): void {
    if (!this.cfg.curves) return;
    const cam = this.cameras.main;
    if (!this.curve) {
      this.camRot *= 0.9;
      cam.setRotation(this.camRot);
      this.curveT -= dt;
      if (this.curveT <= 0 && !this.gate && !this.stopWait) {
        const dir = Math.random() < 0.5 ? -1 : 1;
        this.curve = { dir, t: 3.6, b: 0, failed: false };
        const sign = this.add.image(W + 10, ROAD_TOP - 2, 'curve_sign').setOrigin(0.5, 1).setFlipX(dir < 0).setDepth(ROAD_TOP);
        this.world.add(sign);
        this.objs.push({ kind: 'coin', img: sign, x: W + 10, y: ROAD_TOP - 2, w: 0, h: 0, vy: 0, dead: false, label: 'decor' });
        this.toast(dir > 0 ? `Curva à direita! ${this.names[1]}, incline junto (→)` : `Curva à esquerda! ${this.names[1]}, incline junto (←)`, '#ffd23a');
      }
      return;
    }
    const c = this.curve;
    c.t -= dt;
    const jitter = Math.sin(this.time.now / 170) * 0.35 + Math.sin(this.time.now / 53) * 0.2;
    c.b = Phaser.Math.Clamp(c.b + (-c.dir * 0.85 + jitter) * dt + lean * 1.6 * dt, -1.05, 1.05);
    this.camRot = Phaser.Math.Linear(this.camRot, c.dir * 0.035, 0.08);
    cam.setRotation(this.camRot);
    if (Math.abs(c.b) >= 1 && !c.failed) {
      c.failed = true;
      c.b = 0;
      this.hp--;
      this.hits++;
      this.invuln = 1;
      Audio.play('hurt');
      this.cameras.main.shake(200, 0.008);
      this.toast('Quase caímos! Inclina junto, amor!', '#ff9c9c');
      if (this.hp <= 0) { this.finish(false); return; }
    }
    if (c.t <= 0) {
      if (!c.failed) {
        this.curvesOk++;
        this.tasks?.progress('curves', this.curvesOk);
        this.toast('Curva perfeita! Dupla sincronizada ♥', '#8be07a');
      }
      this.curve = null;
      this.curveT = Phaser.Math.Between(8, 12);
    }
  }

  /** Pão quentinho: esfria aos poucos; depois de um pulo, pode escapar da sacola. */
  private updateBread(dt: number): void {
    if (!this.cfg.bread || !this.breadOn) return;
    this.warmth = Math.max(0, this.warmth - 0.55 * dt);
    const inAir = this.air > 0;
    if (this.wasAir && !inAir && this.catchT <= 0 && Math.random() < 0.55) {
      this.catchT = 1.4;
      this.toast(`O pão pulou da sacola! ${this.names[1]}, SEGURA (${KEY_LABELS[1].action})!`, '#ffd23a');
      Audio.play('jump');
      const b = this.add.image(this.mx - 6, this.my - 24, 'item_bread').setDepth(9600);
      this.world.add(b);
      this.flyingBread = b;
      this.tweens.add({ targets: b, y: this.my - 52, angle: 200, duration: 700, yoyo: true, ease: 'Sine.Out' });
    }
    this.wasAir = inAir;
    if (this.flyingBread) this.flyingBread.x = this.mx - 6;
    if (this.catchT > 0) {
      this.catchT -= dt;
      if (this.catchT <= 0) this.catchBread(false);
    }
  }

  private catchBread(ok: boolean): void {
    this.catchT = 0;
    this.flyingBread?.destroy();
    this.flyingBread = null;
    if (ok) {
      this.catches++;
      this.tasks?.progress('catch', this.catches);
      this.warmth = Math.min(100, this.warmth + 3);
      Audio.play('pick');
      this.toast('Peguei! Ainda quentinho ♥', '#ffd6e4');
      this.riders.forEach((r) => this.tweens.add({ targets: r, y: r.y - 3, yoyo: true, duration: 120 }));
    } else {
      this.warmth = Math.max(0, this.warmth - 15);
      Audio.play('wrong');
      this.toast('Ih... o pão caiu e amassou um pouco.', '#d8c8e8');
    }
  }

  private honk(): void {
    this.hornCd = 0.5;
    Audio.play('horn');
    let scared = false;
    for (const o of this.objs) {
      if (o.kind === 'capy' && !o.scared && !o.dead && o.x > this.mx - 10 && o.x < this.mx + 200) {
        o.scared = true;
        o.vy = o.y < (ROAD_TOP + ROAD_BOT) / 2 ? -90 : 90;
        (o.img as Phaser.GameObjects.Sprite).play(this.animalAnim);
        scared = true;
        this.honked++;
        this.tasks?.progress('honk', this.honked);
      }
    }
    if (scared) this.toast(this.cfg.animal === 'cow' ? 'Licença, vaquinha! Muuu!' : 'Licença, capivara!', '#fff4e0');
  }

  private castBolt(): void {
    this.boltCd = 0.45;
    Audio.play('magic');
    const img = this.add.image(this.mx + 10, this.my - 12, 'fx_bolt').setDepth(9000);
    this.world.add(img);
    this.bolts.push({ img, x: this.mx + 10, y: this.my });
  }

  private updateBolts(dt: number): void {
    for (const b of this.bolts) {
      b.x += 380 * dt;
      b.img.setPosition(b.x, b.y - 8).setAngle(b.img.angle + 20);
      const hit = this.objs.find((o) => o.kind === 'rock' && !o.dead && Math.abs(o.x - b.x) < 12 && Math.abs(o.y - b.y) < 14);
      if (hit) {
        hit.dead = true;
        this.burst(hit.x, hit.y, 'fx_dust', 10);
        this.burst(hit.x, hit.y - 6, 'fx_spark', 6);
        Audio.play('hit');
        b.x = W + 100;
      }
      const capy = this.objs.find((o) => o.kind === 'capy' && !o.dead && Math.abs(o.x - b.x) < 12 && Math.abs(o.y - b.y) < 14);
      if (capy && !capy.scared) { capy.scared = true; capy.vy = capy.y < 152 ? -90 : 90; this.toast('Ei! A magia só assusta... capivaras são amigas!', '#ffd6e4'); }
    }
    this.bolts = this.bolts.filter((b) => { if (b.x > W + 20) { b.img.destroy(); return false; } return true; });
  }

  private burst(x: number, y: number, key: string, n: number): void {
    const em = this.add.particles(x, y, key, { speed: { min: 20, max: 70 }, lifespan: 450, scale: { start: 1, end: 0 }, emitting: false });
    this.world.add(em);
    em.setDepth(9500);
    em.explode(n);
    this.time.delayedCall(600, () => em.destroy());
  }

  private updateObjs(dt: number, dx: number): void {
    for (const o of this.objs) {
      if (o.dead) continue;
      o.x -= dx;
      if (o.kind === 'capy') {
        o.y += o.vy * dt;
        // anda até uma faixa e senta para descansar no meio da estrada (até alguém buzinar)
        if (!o.scared && o.ty !== undefined && o.vy !== 0 && Math.abs(o.y - o.ty) < 2) {
          o.vy = 0;
          (o.img as Phaser.GameObjects.Sprite).stop().setFrame(0);
        }
        if (o.scared) o.img.setAlpha(Math.max(0, 1 - Math.abs(o.y - 152) / 140));
      }
      o.img.setPosition(o.x, o.y);
      if (o.label !== 'decor') o.img.setDepth(o.y);
      if (o.x < -60) { o.dead = true; continue; }
      if (o.kind === 'spot' || o.kind === 'gate' || o.label === 'decor') continue;
      // colisão com a moto
      const hitX = Math.abs(o.x - this.mx) < (o.w + 26) / 2;
      const hitY = Math.abs(o.y - this.my) < (o.h + 10) / 2;
      if (!hitX || !hitY) continue;
      if (o.kind === 'coin') { o.dead = true; this.coins++; Audio.play('coin'); continue; }
      if (o.kind === 'heart') { o.dead = true; this.hp = Math.min(this.maxHp, this.hp + 1); Audio.play('heart'); continue; }
      if (this.air > 0 && (o.kind === 'pothole' || o.kind === 'cone' || o.kind === 'mud')) continue;
      if (o.kind === 'mud') {
        if (!o.shot) {
          o.shot = true;
          this.speed *= 0.5;
          this.burst(this.mx - 6, this.my + 6, 'fx_dust', 10);
          Audio.play('splash');
          this.toast(Phaser.Utils.Array.GetRandom(['Lama! Segura!', 'Atolou um pouquinho!', 'Respingou tudo!']), '#d8b07a');
        }
        continue;
      }
      if (this.invuln > 0) continue;
      if (o.kind === 'cone') { o.dead = true; this.burst(o.x, o.y, 'fx_pixel', 6); }
      this.crash(o);
    }
    for (const o of this.objs) if (o.dead && o.img.active) o.img.destroy();
    this.objs = this.objs.filter((o) => !o.dead);
  }

  private crash(o: Obj): void {
    this.hp--;
    this.hits++;
    this.invuln = 1.4;
    this.speed *= 0.6;
    Audio.play('hurt');
    Input.rumble(0, 200, 0.7);
    Input.rumble(1, 200, 0.7);
    this.cameras.main.shake(180, 0.008);
    const lines: Record<string, string[]> = {
      pothole: ['Ai, buraco!', 'Segura firme, amor!'],
      rock: ['Pedra! Cadê a magia?', 'Ops, a pedra!'],
      cone: ['Desculpa, cone!'],
      capy: this.cfg.animal === 'cow' ? ['Desculpa, vaquinha!', 'Buzina, amor, buzina!'] : ['Desculpa, capivara!', 'Buzina, amor, buzina!'],
    };
    this.toast(Phaser.Utils.Array.GetRandom(lines[o.kind] ?? ['Ops!']), '#ff9c9c');
    if (this.cfg.bread) this.warmth = Math.max(0, this.warmth - 8);
    if (this.hp <= 0) this.finish(false);
  }

  private arrive(): void {
    if (this.ended) return;
    this.tasks?.done('arrive');
    if (this.cfg.bread && this.warmth >= 50) this.tasks?.done('warm');
    this.toast(this.cfg.arriveText, '#ffd23a');
    this.finish(true);
  }

  private finish(win: boolean): void {
    if (this.ended) return;
    this.ended = true;
    Audio.music(null);
    Audio.play(win ? 'win' : 'lose');
    const n = this.cfg.spots.length;
    // pão: a 2ª estrela é chegar com ele quentinho; nas outras, todas as fotos
    const second = this.cfg.bread ? this.warmth >= 50 : this.photos >= n;
    const stars = win ? 1 + (second ? 1 : 0) + (this.hits <= 1 ? 1 : 0) : 0;
    const score = win ? this.coins * 5 + this.photos * 50 + this.hp * 30 : 0;
    this.time.delayedCall(1800, () => {
      this.cameras.main.fadeOut(400, 27, 20, 36);
      this.time.delayedCall(420, () => this.scene.start('Result', {
        levelId: this.info.id, win, stars, score,
        title: win ? this.cfg.finishTitle : 'A moto precisou de conserto...',
        lines: [
          this.cfg.bread
            ? `Pão: ${Math.round(this.warmth)}% quentinho ${this.warmth >= 50 ? '(estrela!)' : '(meta: 50%)'}`
            : `Fotos do casal: ${this.photos}/${n} ${this.photos >= n ? '(estrela!)' : ''}`,
          `Batidas: ${this.hits} ${this.hits <= 1 ? '(estrela!)' : '(meta: no máximo 1)'}`,
          win ? this.cfg.memory : `Moedas na estrada: ${this.coins}`,
          this.tasks ? this.tasks.summary() : '',
        ].filter(Boolean),
        stats: { hugs: 0, faints: 0, revives: 0, crystals: 0, coins: this.coins * 2 },
      }));
    });
  }
}
