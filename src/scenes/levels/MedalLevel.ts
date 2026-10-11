import Phaser from 'phaser';
import { GAME_W, GAME_H, ZOOM, RES, TOAST_WRAP } from '../../config';
import { LevelInfo, levelById } from '../../data/levels';
import { Save } from '../../systems/SaveManager';
import { Input, KEY_LABELS } from '../../systems/InputManager';
import { Audio } from '../../systems/Audio';
import { charFrame, WALK_CYCLE } from '../../art/CharacterArt';
import { txt, panel, uiButton } from '../../ui/text';
import { isTouchDevice } from '../../systems/TouchControls';
import { TaskList } from '../../ui/TaskList';
import { attachPilot } from '../../systems/autopilot';
import { Admin } from '../../systems/Admin';
import { Shadows } from '../../systems/Shadows';
import { applyGrade } from '../../systems/Grade';
import { irisOut } from '../TransitionScene';
import { RAMP, gradientTexture } from '../../art/palette';

/**
 * Mar/2026 — A Medalha de São Bento. A Juliana, sozinha, atravessa a cidade para preparar o presente
 * de aniversário do João: escolhe a medalha na loja, o papel de presente na papelaria e, em casa,
 * escreve uma carta, embrulha tudo junto e manda um motoboy entregar na casa dele.
 * Só atravessa a rua no sinal verde! O João não sabe de nada (no sofá, ele só pode torcer).
 */

type Kind = 'puddle' | 'pigeon' | 'skater' | 'heart' | 'coin' | 'dog';

interface Obj {
  kind: Kind;
  img: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite;
  wx: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  dead: boolean;
  done?: boolean;
}

interface Stop {
  id: 'shop' | 'papelaria' | 'casa';
  at: number;
  label: string;
  tex: string;
  done: boolean;
  spawned: boolean;
  img?: Phaser.GameObjects.Image;
  tag?: Phaser.GameObjects.Text;
}

interface Crossing {
  at: number;
  red: boolean;
  t: number;
  spawned: boolean;
  entered: boolean;
  counted: boolean;
  warned: boolean;
  carT: number;
  box?: Phaser.GameObjects.Container;
  light?: Phaser.GameObjects.Image;
  cars: { img: Phaser.GameObjects.Image; y: number; vy: number }[];
}

type State = 'intro' | 'walk' | 'shop' | 'paper' | 'letter' | 'wrap' | 'send' | 'end';
type Dir = 'up' | 'down' | 'left' | 'right';

const W = GAME_W / ZOOM; // 480
const H = GAME_H / ZOOM; // 270
const BLDG_BOT = 96;
const SIDE_TOP = 98;
const SIDE_BOT = 178;
const LANES = [116, 142, 168];
const JX = 150;
const TOTAL = 5700;
const RED_TIME = 3.6;
const GREEN_TIME = 3.2;
const COURAGE_GOAL = 8;

/** Papéis de presente da papelaria. */
const PAPERS = [
  { name: 'Rosa com bolinhas', color: 0xff6f9f, dots: 3 },
  { name: 'Azul com estrelas', color: 0x5a8ae8, dots: 2 },
  { name: 'Dourado', color: 0xe8b83a, dots: 1 },
  { name: 'Verde', color: 0x5bbf6a, dots: 2 },
];

/** Medalhas da vitrine (frame da textura 'medals'). A certa é a 0. */
const MEDALS = ['Medalha de São Bento', 'Medalha Milagrosa', 'Medalha de São Jorge', 'Terço'];

export class MedalLevel extends Phaser.Scene {
  info!: LevelInfo;
  names!: [string, string];
  state: State = 'intro';
  dist = 0;
  jy = LANES[1];
  hp = 3;
  maxHp = 3;
  invuln = 0;
  hits = 0;
  courage = 0;
  coins = 0;
  infractions = 0;
  crossOk = 0;
  wrongPicks = 0;
  wrapMistakes = 0;
  cheers = 0;
  tasks: TaskList | null = null;
  stops: Stop[] = [];
  crossings: Crossing[] = [];
  // mini-jogos
  sel = 0;
  shopOrder: number[] = [];
  /** Carta: linha atual e frases escolhidas. */
  letterLine = 0;
  letter: string[] = [];
  /** Papel de presente escolhido (cor). */
  paperColor = 0xff6f9f;
  seq: Dir[] = [];
  seqIdx = 0;
  private overlay: Phaser.GameObjects.GameObject[] = [];
  private overlayG: Phaser.GameObjects.Graphics | null = null;
  private overlayText: Phaser.GameObjects.Text | null = null;
  private busy = false;
  // mundo
  private world!: Phaser.GameObjects.Layer;
  private ui!: Phaser.GameObjects.Layer;
  private uiCam!: Phaser.Cameras.Scene2D.Camera;
  private objs: Obj[] = [];
  private decor: { wx: number; img: Phaser.GameObjects.Image }[] = [];
  private traffic: { img: Phaser.GameObjects.Image; sx: number; v: number }[] = [];
  private nextSpawn = 0;
  private nextDecor = 0;
  private trafficT = 1;
  private magicCd = 0;
  private atDoor: Stop | null = null;
  private doorHinted = '';
  private juliana!: Phaser.GameObjects.Sprite;
  private shadow!: Phaser.GameObjects.Ellipse;
  private shadows!: Shadows;
  private sidewalk!: Phaser.GameObjects.TileSprite;
  private dashes!: Phaser.GameObjects.TileSprite;
  /** Camadas do fundo: morros e prédios ao longe rolam mais devagar; nuvens quase paradas. */
  private farHills!: Phaser.GameObjects.TileSprite;
  private farBldgs!: Phaser.GameObjects.TileSprite;
  private clouds: { img: Phaser.GameObjects.Image; x0: number; v: number }[] = [];
  // interface
  private hearts: Phaser.GameObjects.Image[] = [];
  private courageText!: Phaser.GameObjects.Text;
  private progress!: Phaser.GameObjects.Graphics;
  private progressIcon!: Phaser.GameObjects.Image;
  private toastT!: Phaser.GameObjects.Text;

  constructor() {
    super('MedalLevel');
  }

  init(d: { levelId: string }): void {
    this.info = levelById(d.levelId ?? 'medal');
  }

  create(): void {
    const save = Save.data;
    this.names = [save.looks[0].name, save.looks[1].name];
    this.state = 'intro';
    this.dist = 0;
    this.jy = LANES[1];
    this.maxHp = 3 + save.upgrades.hearts;
    this.hp = this.maxHp;
    this.invuln = 0;
    this.hits = this.courage = this.coins = this.infractions = this.crossOk = 0;
    this.wrongPicks = this.wrapMistakes = this.cheers = 0;
    this.tasks = null;
    this.objs = [];
    this.decor = [];
    this.traffic = [];
    this.hearts = [];
    this.overlay = [];
    this.overlayG = null;
    this.overlayText = null;
    this.busy = false;
    this.nextSpawn = 520;
    this.nextDecor = -40;
    this.trafficT = 1;
    this.magicCd = 0;
    this.atDoor = null;
    this.doorHinted = '';
    this.stops = [
      { id: 'shop', at: 1700, label: 'Artigos Religiosos', tex: 'shop_rel', done: false, spawned: false },
      { id: 'papelaria', at: 3700, label: 'Papelaria', tex: 'papelaria', done: false, spawned: false },
      { id: 'casa', at: TOTAL, label: `Casa da ${this.names[1]}`, tex: 'house_c4', done: false, spawned: false },
    ];
    this.letterLine = 0;
    this.letter = [];
    this.paperColor = 0xff6f9f;
    this.crossings = [900, 2700, 4700].map((at) => ({ at, red: true, t: RED_TIME, spawned: false, entered: false, counted: false, warned: false, carT: 0.3, cars: [] }));

    this.world = this.add.layer();
    this.shadows = new Shadows(this);
    this.ui = this.add.layer();
    const cam = this.cameras.main;
    cam.setZoom(ZOOM * RES).centerOn(W / 2, H / 2).setBackgroundColor('#9ce0ff');
    applyGrade(this, cam, this.info.id);
    cam.ignore(this.ui);
    this.uiCam = this.cameras.add(0, 0, GAME_W * RES, GAME_H * RES).setZoom(RES).centerOn(GAME_W / 2, GAME_H / 2);
    this.uiCam.ignore(this.world);

    this.drawCity();
    this.shadow = this.w(this.add.ellipse(JX, this.jy, 16, 5, 0x000000, 0.22));
    this.juliana = this.w(this.add.sprite(JX, this.jy, 'char_1', charFrame('side', 0)).setOrigin(0.5, 1).setFlipX(true));
    this.spawnAhead();

    this.buildUi();
    this.showIntro();
    Audio.music('map');
    cam.fadeIn(400, 27, 20, 36);
    attachPilot(this);
  }

  // ------------------------------------------------------------------ utilidades
  private w<T extends Phaser.GameObjects.GameObject>(o: T): T { this.world.add(o); return o; }
  private u<T extends Phaser.GameObjects.GameObject>(o: T): T { this.ui.add(o); return o; }

  get herX(): number { return this.dist + JX; }

  /** Onde a íris de transição fecha: na Juliana (coordenadas da tela). */
  irisPoint(): { x: number; y: number } {
    const cam = this.cameras.main;
    const k = cam.zoom / RES;
    return { x: (JX - cam.worldView.x) * k, y: (this.jy - 12 - cam.worldView.y) * k };
  }

  private toast(s: string, color = '#fff4e0', ms = 1800): void {
    this.tweens.killTweensOf(this.toastT);
    this.toastT.setText(s).setColor(color).setAlpha(1).setScale(0.8);
    this.tweens.add({ targets: this.toastT, scale: 1, duration: 160, ease: 'Back.Out' });
    this.tweens.add({ targets: this.toastT, alpha: 0, delay: ms, duration: 300 });
  }

  private burst(x: number, y: number, key: string, n: number, tint?: number): void {
    const em = this.add.particles(x, y, key, { speed: { min: 20, max: 80 }, lifespan: 500, scale: { start: 1, end: 0 }, emitting: false, ...(tint !== undefined ? { tint } : {}) });
    this.w(em);
    em.setDepth(9500);
    em.explode(n);
    this.time.delayedCall(700, () => em.destroy());
  }

  // ------------------------------------------------------------------ cenário
  private drawCity(): void {
    // céu em degradê, nuvens, morros de BH e prédios ao longe (cada camada numa velocidade)
    this.w(this.add.image(0, 0, gradientTexture(this, 'sky_medal', W, BLDG_BOT, RAMP.skyDay)).setOrigin(0).setDepth(-5));
    this.clouds = [0, 1, 2].map((i) => ({
      img: this.w(this.add.image(0, 10 + i * 9, 'cloud_big').setDepth(-4.9).setAlpha(0.95).setScale(i === 1 ? 0.8 : 1)),
      x0: i * 170 + Phaser.Math.Between(0, 60),
      v: 3 + i * 1.5,
    }));
    this.farHills = this.w(this.add.tileSprite(W / 2, BLDG_BOT - 17, W, 34, 'far_hills').setDepth(-4.8));
    this.farBldgs = this.w(this.add.tileSprite(W / 2, BLDG_BOT - 22, W, 44, 'far_bldgs').setDepth(-4.7));
    // calçada de pedra portuguesa e meio-fio
    this.sidewalk = this.w(this.add.tileSprite(W / 2, (SIDE_TOP + SIDE_BOT) / 2, W, SIDE_BOT - SIDE_TOP + 4, 'sidewalk').setDepth(-4));
    const r = this.w(this.add.graphics().setDepth(-4));
    r.fillStyle(0xb8b4ac, 1).fillRect(0, SIDE_TOP - 4, W, 4);
    r.fillStyle(0xc8c4bc, 1).fillRect(0, SIDE_BOT, W, 4);
    r.fillStyle(0x8a8680, 1).fillRect(0, SIDE_BOT + 4, W, 2);
    // avenida com carros
    r.fillStyle(0x5a5a6a, 1).fillRect(0, SIDE_BOT + 6, W, H - SIDE_BOT - 6);
    this.dashes = this.w(this.add.tileSprite(W / 2, 226, W, 4, 'road_dash').setDepth(-3));
  }

  private spawnAhead(): void {
    const edge = this.dist + W + 80;
    // prédios e árvores no fundo
    while (this.nextDecor < edge) {
      const x = this.nextDecor;
      const blocked = this.crossings.some((c) => Math.abs(c.at - x) < 52) || this.stops.some((s) => Math.abs(s.at - 12 - x) < 50);
      if (!blocked) {
        const img = this.w(this.add.image(0, BLDG_BOT, 'city_bldg', Phaser.Math.Between(0, 3)).setOrigin(0.5, 1).setDepth(-2));
        this.decor.push({ wx: x, img });
        if (Math.random() < 0.35) {
          const tree = this.w(this.add.image(0, SIDE_TOP + 2, Math.random() < 0.5 ? 'tree_ipe' : 'tree_big').setOrigin(0.5, 1).setScale(0.8).setDepth(SIDE_TOP - 1));
          this.shadows.add(tree, 22, { layer: this.world });
          this.decor.push({ wx: x + 22, img: tree });
        }
      }
      this.nextDecor += Phaser.Math.Between(40, 46);
    }
    // paradas e faixas de pedestre
    for (const s of this.stops) {
      if (s.spawned || s.at - this.dist > W + 80) continue;
      s.spawned = true;
      s.img = this.w(this.add.image(0, BLDG_BOT + 2, s.tex, 0).setOrigin(0.5, 1).setDepth(-1));
      s.tag = this.w(this.add.text(0, BLDG_BOT + 8, s.label, { fontFamily: 'monospace', fontSize: '7px', color: '#2a1d2e', fontStyle: 'bold', backgroundColor: '#fff4e0' })
        .setOrigin(0.5, 0).setPadding(2, 1, 2, 1).setDepth(SIDE_TOP).setResolution(ZOOM * RES + 1));
    }
    for (const c of this.crossings) {
      if (c.spawned || c.at - this.dist > W + 80) continue;
      c.spawned = true;
      const band = this.add.graphics();
      band.fillStyle(0x5a5a6a, 1).fillRect(-30, 70, 60, H - 70);
      band.fillStyle(0x4a4a58, 1).fillRect(-30, 70, 2, H - 70).fillRect(28, 70, 2, H - 70);
      for (let y = SIDE_TOP + 2; y < SIDE_BOT; y += 8) band.fillStyle(0xf4f0e8, 1).fillRect(-26, y, 52, 4);
      band.fillStyle(0xf4f0e8, 1).fillRect(-30, SIDE_BOT + 8, 60, 2);
      c.light = this.add.image(-36, SIDE_TOP + 4, 'ped_light', 0).setOrigin(0.5, 1);
      c.box = this.w(this.add.container(0, 0, [band, c.light]).setDepth(-1));
    }
    // obstáculos e coisas boas na calçada
    while (this.nextSpawn < edge && this.nextSpawn < TOTAL - 260) {
      const x = this.nextSpawn;
      const nearEvent = this.crossings.some((c) => Math.abs(c.at - x) < 110) || this.stops.some((s) => Math.abs(s.at - x) < 140);
      if (!nearEvent) this.spawnThing(x);
      this.nextSpawn += Phaser.Math.Between(120, 190);
    }
  }

  private add_(kind: Kind, wx: number, y: number, key: string, w: number, h: number, frame = 0): Obj {
    const img = this.w(kind === 'dog' || kind === 'pigeon' ? this.add.sprite(0, y, key, frame) : this.add.image(0, y, key, frame));
    img.setOrigin(0.5, 1).setDepth(y);
    if (kind === 'dog' || kind === 'skater') this.shadows.add(img, kind === 'dog' ? 11 : 9, { layer: this.world });
    const o: Obj = { kind, img, wx, y, w, h, vx: 0, dead: false };
    this.objs.push(o);
    return o;
  }

  private spawnThing(x: number): void {
    const r = Math.random();
    const lane = Phaser.Utils.Array.GetRandom(LANES);
    if (r < 0.22) {
      const o = this.add_('puddle', x, lane + 3, 'puddle', 22, 8);
      o.img.setOrigin(0.5, 0.5).setDepth(lane - 20);
    } else if (r < 0.4) {
      for (let i = 0; i < 3; i++) this.add_('pigeon', x + i * 12, lane + (i % 2) * 4, 'pigeon', 10, 8);
    } else if (r < 0.52) {
      const o = this.add_('skater', x + 160, lane, 'skater', 12, 10);
      o.vx = -70;
    } else if (r < 0.6) {
      const o = this.add_('dog', x, lane, 'dog', 14, 10);
      (o.img as Phaser.GameObjects.Sprite).play('dog-walk');
    } else if (r < 0.86) {
      const y = Phaser.Utils.Array.GetRandom(LANES) - 6;
      this.add_('heart', x, y, 'item_heart', 10, 10);
    } else {
      for (let i = 0; i < 3; i++) this.add_('coin', x + i * 16, lane - 4, 'ui_coin', 10, 10);
    }
  }

  // ------------------------------------------------------------------ interface
  private buildUi(): void {
    const g = this.u(this.add.graphics());
    g.fillStyle(0x1b1424, 0.75).fillRoundedRect(12, 10, 230, 46, 10);
    for (let i = 0; i < this.maxHp; i++) this.hearts.push(this.u(this.add.image(36 + i * 22, 33, 'ui_heart').setScale(2.4)));
    this.u(this.add.image(GAME_W - 214, 32, 'fx_heart').setScale(2));
    this.courageText = this.u(txt(this, GAME_W - 24, 32, '', 18, { origin: [1, 0.5], color: '#ffd6e4' }));
    this.progress = this.u(this.add.graphics());
    this.progressIcon = this.u(this.add.image(0, 0, 'char_1', charFrame('side', 0)).setScale(1.2).setFlipX(true));
    this.u(this.add.image(GAME_W / 2 + 214, 58, 'house_c4').setScale(0.6));
    this.u(txt(this, GAME_W / 2, 24, this.info.name, 18, { color: '#fff4e0' }));
    this.toastT = this.u(txt(this, GAME_W / 2, 110, '', 20, { color: '#fff4e0', wrap: TOAST_WRAP }).setAlpha(0));
    const help = [
      `${this.names[0]} não sabe de nada... ${KEY_LABELS[0].action}: torcer ♥`,
      `${this.names[1]}: ${KEY_LABELS[1].move} anda · ${KEY_LABELS[1].ability}: xô, pombos! · ${KEY_LABELS[1].action}: entrar / carinho`,
    ];
    help.forEach((h, i) => this.u(txt(this, i === 0 ? 20 : GAME_W - 20, GAME_H - 18, h, 13, { origin: [i === 0 ? 0 : 1, 0.5], color: i === 0 ? '#bfe6ff' : '#ffd6e4', bold: false })));
    if (!isTouchDevice()) this.u(uiButton(this, GAME_W / 2, GAME_H - 20, 'Pausa (Esc)', () => this.openPause(), { size: 13 }));
    this.refreshUi();
  }

  private refreshUi(): void {
    this.hearts.forEach((h, i) => h.setTexture(i < this.hp ? 'ui_heart' : 'ui_heart_empty'));
    this.courageText.setText(`Coragem: ${this.courage}/${COURAGE_GOAL}`);
    const x0 = GAME_W / 2 - 200;
    const k = Phaser.Math.Clamp(this.herX / TOTAL, 0, 1);
    this.progress.clear().fillStyle(0x1b1424, 0.75).fillRoundedRect(x0 - 6, 48, 412, 20, 8)
      .fillStyle(0xffd6e4, 1).fillRect(x0, 56, 400 * k, 4);
    for (const s of this.stops) this.progress.fillStyle(s.done ? 0x8be07a : 0xffd25e, 1).fillRect(x0 + 400 * (s.at / TOTAL) - 2, 52, 4, 12);
    this.progressIcon.setPosition(x0 + 400 * k, 56);
  }

  private showIntro(): void {
    const objs: Phaser.GameObjects.GameObject[] = [];
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => { this.ui.add(o); objs.push(o); return o; };
    const w = 660;
    const h = 340;
    const x0 = (GAME_W - w) / 2;
    const y0 = (GAME_H - h) / 2;
    add(panel(this, x0, y0, w, h));
    add(txt(this, GAME_W / 2, y0 + 34, 'A Medalha de São Bento', 28, { color: '#ffd25e' }));
    add(txt(this, GAME_W / 2, y0 + 66, `${this.names[1]} sozinha pela cidade: escolher a medalha e o papel de presente; em casa, escrever uma carta e mandar entregar na casa do ${this.names[0]}.`, 14, { bold: false, wrap: 600 }));
    const lines: [string, string, string][] = [
      [`${this.names[1]} anda pela calçada`, `${KEY_LABELS[1].move}: anda e desvia · ${KEY_LABELS[1].ability}: espanta os pombos · ${KEY_LABELS[1].action}: entra nas lojas e faz carinho no cachorro`, '#ffd6e4'],
      ['Faixa de pedestre', 'Só atravessa com o bonequinho VERDE. No vermelho, espera!', '#ffd25e'],
      [`E o ${this.names[0]}?`, `Nesta lembrança ele não sabe de nada... mas pode torcer do sofá (${KEY_LABELS[0].action})!`, '#bfe6ff'],
    ];
    lines.forEach(([a, b, c], i) => {
      add(txt(this, GAME_W / 2, y0 + 110 + i * 58, a, 17, { color: c }));
      add(txt(this, GAME_W / 2, y0 + 133 + i * 58, b, 13, { bold: false, wrap: 600 }));
    });
    const ready = [false, false];
    const rt = [0, 1].map((i) => add(txt(this, GAME_W / 2 + (i ? 150 : -150), y0 + h - 28, `${this.names[i]}: aperte ${KEY_LABELS[i].action}`, 16, { color: i ? '#ffd6e4' : '#bfe6ff' })));
    const ev = this.time.addEvent({
      delay: 16, loop: true, callback: () => {
        for (let i = 0; i < 2; i++) {
          if (!ready[i] && Input.players[i].actionPressed) { ready[i] = true; rt[i].setText(`${this.names[i]}: pronto! ♥`); Audio.play('confirm'); }
        }
        if (ready[0] && ready[1]) {
          ev.remove();
          objs.forEach((o) => o.destroy());
          this.state = 'walk';
          this.tasks = new TaskList(this, 12, 64, [
            { id: 'medal', text: 'Escolher a medalha de São Bento' },
            { id: 'paper', text: 'Papel de presente na papelaria' },
            { id: 'letter', text: `Escrever uma carta pro ${this.names[0]}` },
            { id: 'wrap', text: 'Embrulhar com a carta dentro' },
            { id: 'cross', text: 'Atravessar no sinal verde', goal: this.crossings.length },
            { id: 'courage', text: 'Juntar coragem (corações)', goal: COURAGE_GOAL },
            { id: 'send', text: `Mandar entregar na casa do ${this.names[0]}` },
          ]);
          this.ui.add(this.tasks.container);
          this.toast(`(O aniversário dele tá chegando... ${this.names[1]}, bora buscar o presente!)`, '#ffd6e4', 2600);
        }
      },
    });
  }

  // ------------------------------------------------------------------ laço
  update(_t: number, delta: number): void {
    const dt = Math.min(delta / 1000, 0.05);
    if (Input.pausePressed && this.state !== 'end') { this.openPause(); return; }
    this.refreshUi();
    if (this.state === 'intro' || this.state === 'end') return;
    // torcida do sofá
    if (Input.players[0].actionPressed) this.cheer();

    if (this.state === 'shop') { this.updateShop(); return; }
    if (this.state === 'paper') { this.updatePaper(); return; }
    if (this.state === 'letter') { this.updateLetter(); return; }
    if (this.state === 'wrap') { this.updateWrap(); return; }
    if (this.state === 'send') return;

    const p = Input.players[1];
    this.invuln = Math.max(0, this.invuln - dt);
    this.magicCd = Math.max(0, this.magicCd - dt);
    const prevX = this.herX;
    // anda (devagar para trás), desvia para cima e para baixo
    const vx = p.x > 0.2 ? 100 * p.x : p.x < -0.2 ? 60 * p.x : 0;
    this.dist = Math.max(0, this.dist + vx * dt);
    this.jy = Phaser.Math.Clamp(this.jy + p.y * 80 * dt, LANES[0] - 4, LANES[2] + 4);
    // a próxima parada segura a caminhada até ela entrar
    const next = this.stops.find((s) => !s.done);
    this.atDoor = null;
    if (next && this.herX >= next.at - 16) {
      this.dist = next.at - 16 - JX;
      this.atDoor = next;
      if (this.doorHinted !== next.id) {
        this.doorHinted = next.id;
        Audio.play('bell');
        this.toast(next.id === 'casa'
          ? `Em casa! ${this.names[1]}, aperte ${KEY_LABELS[1].action} para escrever a carta.`
          : `${next.label}! ${this.names[1]}, aperte ${KEY_LABELS[1].action} para entrar.`, '#ffd25e', 2400);
      }
    }
    this.updateCrossings(dt, prevX);

    if (p.actionPressed) {
      if (this.atDoor) this.enter(this.atDoor);
      else this.petDog();
    }
    if (p.abilityPressed && this.magicCd <= 0) this.shoo();

    // animação da Juliana
    const moving = Math.abs(vx) > 1 || Math.abs(p.y) > 0.2;
    const col = moving ? WALK_CYCLE[Math.floor(this.time.now / 110) % 4] : 0;
    this.juliana.setFrame(charFrame('side', col)).setFlipX(vx >= 0).setPosition(JX, this.jy).setDepth(this.jy);
    this.juliana.setAlpha(this.invuln > 0 && Math.floor(this.invuln * 12) % 2 ? 0.4 : 1);
    // flash de dano logo depois do tropeço
    if (this.invuln > 1.05) this.juliana.setTintFill(0xffffff);
    else if (this.invuln > 0.95) this.juliana.setTint(0xff6a6a);
    else this.juliana.clearTint();
    this.shadow.setPosition(JX, this.jy).setDepth(this.jy - 1);

    this.spawnAhead();
    this.updateWorld(dt);
    this.updateTraffic(dt);
  }

  private updateWorld(dt: number): void {
    this.sidewalk.tilePositionX = this.dist;
    this.farHills.tilePositionX = this.dist * 0.2;
    this.farBldgs.tilePositionX = this.dist * 0.5;
    const span = W + 100;
    for (const c of this.clouds) c.img.setX(((((c.x0 - this.dist * 0.1 - this.time.now / 1000 * c.v) % span) + span) % span) - 50);
    this.dashes.tilePositionX = this.dist;
    for (const d of this.decor) d.img.setX(d.wx - this.dist);
    this.decor = this.decor.filter((d) => { if (d.wx - this.dist < -60) { d.img.destroy(); return false; } return true; });
    for (const s of this.stops) {
      if (!s.img) continue;
      const sx = s.at - 12 - this.dist;
      s.img.setX(sx);
      s.tag?.setX(sx);
    }
    for (const o of this.objs) {
      if (o.dead) continue;
      o.wx += o.vx * dt;
      const sx = o.wx - this.dist;
      if (o.kind === 'pigeon' && o.done) { o.y -= 70 * dt; o.img.setAlpha(Math.max(0, o.img.alpha - dt)); }
      if (o.kind === 'dog' && o.done) o.y = Math.min(o.y + 30 * dt, SIDE_BOT - 2);
      o.img.setPosition(sx, o.y);
      if (o.kind !== 'puddle') o.img.setDepth(o.y);
      if (sx < -40 || o.img.alpha <= 0) { o.dead = true; continue; }
      const hitX = Math.abs(sx - JX) < (o.w + 10) / 2;
      const hitY = Math.abs(o.y - this.jy) < (o.h + 8) / 2;
      if (!hitX || !hitY) continue;
      switch (o.kind) {
        case 'heart':
          o.dead = true;
          this.gainCourage(1);
          break;
        case 'coin':
          o.dead = true;
          this.coins++;
          Audio.play('coin');
          break;
        case 'puddle':
          if (!o.done) { o.done = true; this.hurt('Molhei o tênis!'); this.burst(JX, this.jy, 'fx_pixel', 8, 0x8ac8f0); }
          break;
        case 'pigeon':
          if (!o.done) this.hurt('Ai, os pombos!');
          break;
        case 'skater':
          if (!o.done) { o.done = true; this.hurt('Opa, skate na calçada!'); }
          break;
        case 'dog':
          break;
      }
    }
    for (const o of this.objs) if (o.dead && o.img.active) o.img.destroy();
    this.objs = this.objs.filter((o) => !o.dead);
  }

  /** Semáforo de pedestre: no vermelho os carros passam; atravessar no vermelho empurra de volta. */
  private updateCrossings(dt: number, prevX: number): void {
    for (const c of this.crossings) {
      if (!c.spawned) continue;
      c.t -= dt;
      if (c.t <= 0) {
        c.red = !c.red;
        c.t = c.red ? RED_TIME : GREEN_TIME;
        if (!c.red) c.warned = false;
        if (!c.red && Math.abs(c.at - this.herX) < 120) Audio.play('blip');
      }
      c.light?.setFrame(c.red ? 0 : 1);
      const sx = c.at - this.dist;
      c.box?.setX(sx);
      // carros na rua transversal (só no vermelho para o pedestre)
      c.carT -= dt;
      if (c.red && c.t > 1.4 && c.carT <= 0 && !c.entered) {
        c.carT = Phaser.Math.FloatBetween(0.7, 1.1);
        const down = Math.random() < 0.5;
        const img = this.w(this.add.image(sx, 0, 'car_top', Phaser.Math.Between(0, 3)).setDepth(SIDE_BOT + 10).setFlipY(down));
        c.cars.push({ img, y: down ? 84 : H + 30, vy: down ? 260 : -260 });
      }
      for (const car of c.cars) {
        car.y += car.vy * dt;
        car.img.setPosition(sx + (car.vy > 0 ? -12 : 12), car.y);
      }
      c.cars = c.cars.filter((car) => { if (car.y < 84 || car.y > H + 40) { car.img.destroy(); return false; } return true; });
      // calçada antes da faixa
      const curb = c.at - 30;
      if (c.red && !c.warned && curb - this.herX > 0 && curb - this.herX < 90) {
        c.warned = true;
        this.toast('Sinal vermelho! Espera o bonequinho verde.', '#ff9c9c');
      }
      if (prevX < curb && this.herX >= curb) {
        if (c.red && !c.entered) {
          this.infractions++;
          this.dist = curb - 24 - JX;
          Audio.play('horn');
          this.cameras.main.shake(140, 0.006);
          this.toast(Phaser.Utils.Array.GetRandom(['BIIII! Sinal vermelho!', 'Opa! Espera o verde!', 'Quase! O carro buzinou!']), '#ff9c9c');
        } else c.entered = true;
      }
      if (c.entered && !c.counted && this.herX > c.at + 30) {
        c.counted = true;
        this.crossOk++;
        this.tasks?.progress('cross', this.crossOk);
        Audio.play('pick');
        this.toast('Atravessou no verde! ♥', '#8be07a', 1200);
      }
      if (c.box && sx < -80) {
        c.box.destroy();
        c.box = undefined;
        c.cars.forEach((car) => car.img.destroy());
        c.cars = [];
      }
    }
  }

  /** Carros passando na avenida (só enfeite). */
  private updateTraffic(dt: number): void {
    this.trafficT -= dt;
    if (this.trafficT <= 0) {
      this.trafficT = Phaser.Math.FloatBetween(1.5, 3.2);
      const right = Math.random() < 0.5;
      const img = this.w(this.add.image(right ? -30 : W + 30, right ? 248 : 206, 'car_top', Phaser.Math.Between(0, 3)).setAngle(right ? 90 : -90).setDepth(SIDE_BOT + 5));
      this.traffic.push({ img, sx: img.x, v: right ? 160 : -160 });
    }
    for (const t of this.traffic) { t.sx += t.v * dt; t.img.setX(t.sx); }
    this.traffic = this.traffic.filter((t) => { if (t.sx < -60 || t.sx > W + 60) { t.img.destroy(); return false; } return true; });
  }

  private hurt(line: string): void {
    if (this.invuln > 0) return;
    // modo admin: o piloto automático nunca perde a fase
    this.hp = Admin.on ? Math.max(1, this.hp - 1) : this.hp - 1;
    this.hits++;
    this.invuln = 1.2;
    Audio.play('hurt');
    Input.rumble(1, 160, 0.6);
    this.cameras.main.shake(140, 0.006);
    this.toast(line, '#ff9c9c');
    if (this.hp <= 0) this.finish(false);
  }

  private gainCourage(n: number): void {
    this.courage += n;
    this.tasks?.progress('courage', this.courage);
    Audio.play('heart');
    this.burst(JX, this.jy - 18, 'fx_heart', 4);
    if (this.courage === COURAGE_GOAL) this.toast('Coragem de sobra! ♥', '#ffd6e4');
  }

  /** Magia da Juliana: brilhinhos que espantam os pombos da frente. */
  private shoo(): void {
    this.magicCd = 0.6;
    Audio.play('magic');
    this.burst(JX + 24, this.jy - 10, 'fx_spark', 10);
    let n = 0;
    for (const o of this.objs) {
      const sx = o.wx - this.dist;
      if (o.kind === 'pigeon' && !o.done && sx > JX - 20 && sx < JX + 150) {
        o.done = true;
        (o.img as Phaser.GameObjects.Sprite).play('pigeon-fly');
        n++;
      }
    }
    if (n) { Audio.play('wind'); this.toast('Xô, pombo!', '#fff4e0', 900); }
  }

  private petDog(): void {
    const dog = this.objs.find((o) => o.kind === 'dog' && !o.done && Math.abs(o.wx - this.dist - JX) < 30 && Math.abs(o.y - this.jy) < 20);
    if (!dog) return;
    dog.done = true;
    this.burst(dog.wx - this.dist, dog.y - 12, 'fx_heart', 6);
    this.toast('Que fofo! Au au! ♥', '#ffd6e4', 1200);
    this.gainCourage(1);
  }

  private cheer(): void {
    this.cheers++;
    Audio.play('blip');
    const h = this.u(this.add.image(Phaser.Math.Between(30, 200), GAME_H - 40, 'fx_heart').setScale(2.4).setTint(0x9cd8ff));
    this.tweens.add({ targets: h, y: h.y - 120, alpha: 0, duration: 1200, onComplete: () => h.destroy() });
    if (this.cheers % 6 === 1) this.toast(`Torcida do sofá: vai, ${this.names[1]}! ♥`, '#bfe6ff', 1200);
  }

  // ------------------------------------------------------------------ paradas
  private enter(s: Stop): void {
    if (this.busy) return;
    this.juliana.setFrame(charFrame('up', 0));
    if (s.id === 'shop') this.openShop();
    else if (s.id === 'papelaria') this.openPaper();
    else this.openLetter();
  }

  private openOverlay(title: string, color: string): void {
    this.closeOverlay();
    this.tasks?.container.setVisible(false);
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => { this.ui.add(o); this.overlay.push(o); return o; };
    add(panel(this, GAME_W / 2 - 320, 120, 640, 320).setDepth(200));
    add(txt(this, GAME_W / 2, 150, title, 24, { color }).setDepth(201));
    this.overlayG = add(this.add.graphics().setDepth(201));
    this.overlayText = add(txt(this, GAME_W / 2, 404, '', 14, { bold: false, wrap: 580 }).setDepth(202));
  }

  private overlayAdd<T extends Phaser.GameObjects.GameObject & { setDepth(d: number): unknown }>(o: T): T {
    this.ui.add(o);
    this.overlay.push(o);
    o.setDepth(203);
    return o;
  }

  private closeOverlay(): void {
    this.tasks?.container.setVisible(true);
    this.overlay.forEach((o) => o.destroy());
    this.overlay = [];
    this.overlayG = null;
    this.overlayText = null;
  }

  /** Cartinha com o item conquistado; depois volta a andar. */
  private finishStop(s: Stop, item: string, frame: number, text: string, tint?: number): void {
    this.busy = true;
    s.done = true;
    Audio.play('crystal');
    const c = this.u(this.add.container(GAME_W / 2, GAME_H / 2 - 10).setDepth(260));
    const g = this.add.graphics();
    g.fillStyle(0x1b1424, 0.92).fillRoundedRect(-150, -80, 300, 160, 14).lineStyle(3, 0xffd25e, 1).strokeRoundedRect(-150, -80, 300, 160, 14);
    const icon = this.add.image(0, -18, item, frame).setScale(5);
    if (tint !== undefined) icon.setTint(tint);
    c.add([g, icon, txt(this, 0, 52, text, 16, { color: '#ffd25e', wrap: 280 })]);
    c.setScale(0.3);
    this.tweens.add({ targets: c, scale: 1, duration: 260, ease: 'Back.Out' });
    this.time.delayedCall(1700, () => {
      c.destroy();
      this.closeOverlay();
      this.busy = false;
      this.state = 'walk';
    });
  }

  // loja: escolher a medalha certa
  private openShop(): void {
    this.state = 'shop';
    this.openOverlay('Qual é a medalha de São Bento?', '#ffd25e');
    this.shopOrder = Phaser.Utils.Array.Shuffle([0, 1, 2, 3]);
    this.sel = 0;
    this.shopOrder.forEach((m, i) => this.overlayAdd(this.add.image(this.shopX(i), 260, 'medals', m).setScale(4)));
    this.overlayAdd(this.add.sprite(GAME_W / 2 - 270, 330, 'npc_vendedora', charFrame('down', 0)).setScale(3).setOrigin(0.5, 1));
    this.overlayText?.setText(`Vendedora: "A de São Bento é redonda e dourada, com uma cruz no meio e letrinhas em volta."  ${KEY_LABELS[1].move}: escolher · ${KEY_LABELS[1].action}: comprar`);
  }

  private shopX(i: number): number { return GAME_W / 2 - 150 + i * 100 + 30; }

  private updateShop(): void {
    const p = Input.players[1];
    if (this.busy) return;
    if (p.leftPressed) { this.sel = (this.sel + 3) % 4; Audio.play('blip'); }
    if (p.rightPressed) { this.sel = (this.sel + 1) % 4; Audio.play('blip'); }
    const g = this.overlayG;
    if (g) {
      g.clear().lineStyle(3, 0xffd6e4, 1).strokeRoundedRect(this.shopX(this.sel) - 44, 210, 88, 104, 10);
      g.fillStyle(0xffd6e4, 1).fillTriangle(this.shopX(this.sel) - 8, 326, this.shopX(this.sel) + 8, 326, this.shopX(this.sel), 318);
    }
    if (p.actionPressed) {
      const m = this.shopOrder[this.sel];
      if (m === 0) {
        this.tasks?.done('medal');
        this.finishStop(this.stops[0], 'item_medal', 0, 'Medalha de São Bento no cordão! ♥');
      } else {
        this.wrongPicks++;
        Audio.play('wrong');
        this.cameras.main.shake(120, 0.004);
        this.toast(`Essa é a ${MEDALS[m]}... a de São Bento tem a cruz!`, '#ff9c9c');
      }
    }
  }

  // papelaria: escolhe o papel de presente (e leva caixinha e papel de carta)
  private openPaper(): void {
    this.state = 'paper';
    this.sel = 0;
    this.openOverlay('Qual papel de presente?', '#ff8fb1');
    PAPERS.forEach((pp, i) => {
      const g = this.overlayAdd(this.add.graphics());
      const x = this.shopX(i);
      g.fillStyle(pp.color, 1).fillRoundedRect(x - 32, 222, 64, 76, 6);
      g.fillStyle(0xffffff, 0.55);
      for (let k = 0; k < 6; k++) g.fillCircle(x - 20 + (k % 3) * 20, 236 + Math.floor(k / 3) * 28 + (k % 2) * 8, pp.dots);
      this.overlayAdd(txt(this, x, 312, pp.name, 12, { bold: false }));
    });
    this.overlayAdd(this.add.sprite(GAME_W / 2 - 270, 330, 'npc_vendedora', charFrame('down', 0)).setScale(3).setOrigin(0.5, 1));
    this.overlayText?.setText(`Vendedora: "Qual ele vai gostar?" (também vão: uma caixinha e papel de carta)  ${KEY_LABELS[1].move}: escolher · ${KEY_LABELS[1].action}: levar`);
  }

  private updatePaper(): void {
    const p = Input.players[1];
    if (this.busy) return;
    if (p.leftPressed) { this.sel = (this.sel + 3) % 4; Audio.play('blip'); }
    if (p.rightPressed) { this.sel = (this.sel + 1) % 4; Audio.play('blip'); }
    this.overlayG?.clear().lineStyle(3, 0xffd6e4, 1).strokeRoundedRect(this.shopX(this.sel) - 40, 214, 80, 112, 10);
    if (p.actionPressed) {
      this.paperColor = PAPERS[this.sel].color;
      this.tasks?.done('paper');
      this.finishStop(this.stops[1], 'gift', 0, 'Papel de presente, caixinha e papel de carta ♥', this.paperColor);
    }
  }

  // em casa: escreve a carta, embrulha com a medalha e chama o motoboy
  private openLetter(): void {
    this.state = 'letter';
    this.letterLine = 0;
    this.letter = [];
    this.sel = 0;
    this.letterTexts = [];
    this.openOverlay(`Uma carta para o ${this.names[0]}`, '#ffd6e4');
    this.overlayText?.setText(`${KEY_LABELS[1].move}: escolher a frase · ${KEY_LABELS[1].action}: escrever`);
    this.renderLetter();
  }

  /** Frases que ela pode escolher para cada linha da carta. */
  letterOptions(line: number): string[] {
    const [jo, ju] = this.names;
    return [
      [`Feliz aniversário, ${jo}!`, `Oi, ${jo}... feliz aniversário.`, `${jo}, hoje o dia é seu!`],
      ['Essa medalha é pra te proteger em todo caminho.', 'Que São Bento te guarde sempre.', 'Mesmo longe, eu penso em você.'],
      [`Com carinho, ${ju}.`, `Um abraço apertado, ${ju}.`, `Com saudade, ${ju}.`],
    ][line] ?? [];
  }

  private updateLetter(): void {
    if (this.busy) return;
    const p = Input.players[1];
    const opts = this.letterOptions(this.letterLine);
    let changed = this.letterTexts.length === 0;
    if (p.leftPressed || p.upPressed) { this.sel = (this.sel + opts.length - 1) % opts.length; Audio.play('blip'); changed = true; }
    if (p.rightPressed || p.downPressed) { this.sel = (this.sel + 1) % opts.length; Audio.play('blip'); changed = true; }
    if (p.actionPressed) {
      changed = true;
      this.letter.push(opts[this.sel]);
      this.letterLine++;
      this.sel = 0;
      Audio.play('pick');
      if (this.letterLine >= 3) {
        this.tasks?.done('letter');
        this.busy = true;
        this.time.delayedCall(1300, () => { this.busy = false; this.openWrap(); });
      }
    }
    if (changed) this.renderLetter();
  }

  /** Folha de carta com as linhas escritas e as opções da linha atual. */
  private renderLetter(): void {
    const opts = this.letterOptions(this.letterLine);
    const g = this.overlayG;
    if (!g) return;
    g.clear();
    g.fillStyle(0xfff7e6, 1).fillRoundedRect(GAME_W / 2 - 240, 176, 480, 120, 8).lineStyle(2, 0xc9a87a, 1).strokeRoundedRect(GAME_W / 2 - 240, 176, 480, 120, 8);
    for (let k = 0; k < 3; k++) g.lineStyle(1, 0xe8d8c0, 1).lineBetween(GAME_W / 2 - 220, 214 + k * 30, GAME_W / 2 + 220, 214 + k * 30);
    this.letterTexts.forEach((t) => t.destroy());
    this.overlay = this.overlay.filter((o) => !this.letterTexts.includes(o as Phaser.GameObjects.Text));
    this.letterTexts = [];
    const add = (t: Phaser.GameObjects.Text) => { this.letterTexts.push(this.overlayAdd(t)); };
    this.letter.forEach((l, k) => add(txt(this, GAME_W / 2, 202 + k * 30, l, 15, { color: '#3a2a3e', stroke: '#fff7e6', strokeW: 0, bold: false })));
    if (this.letterLine < 3) {
      opts.forEach((o, k) => {
        const y = 318 + k * 24;
        const on = k === this.sel;
        if (on) g.fillStyle(0xffd6e4, 0.25).fillRoundedRect(GAME_W / 2 - 250, y - 11, 500, 22, 6);
        add(txt(this, GAME_W / 2, y, `${on ? '> ' : ''}${o}`, 13, { color: on ? '#ffd25e' : '#fff4e0', bold: on }));
      });
    }
  }

  private letterTexts: Phaser.GameObjects.Text[] = [];

  // embrulha: a carta vai dentro da caixinha, junto com a medalha
  private openWrap(): void {
    this.state = 'wrap';
    const dirs: Dir[] = ['up', 'down', 'left', 'right'];
    this.seq = Array.from({ length: 6 }, () => Phaser.Utils.Array.GetRandom(dirs));
    this.seqIdx = 0;
    this.letterTexts = [];
    this.openOverlay('Embrulhar o presente', '#ff8fb1');
    this.overlayAdd(this.add.image(GAME_W / 2 - 70, 230, 'item_medal').setScale(3));
    this.overlayAdd(this.add.image(GAME_W / 2 + 70, 230, 'item_poem').setScale(3));
    this.overlayAdd(this.add.image(GAME_W / 2, 236, 'gift').setScale(4).setAlpha(0.2).setTint(this.paperColor));
    this.overlayText?.setText(`A medalha e a carta vão dentro da caixinha. Papel, fita e laço: ${this.names[1]}, aperte as setas na ordem!`);
  }

  private updateWrap(): void {
    if (this.busy) return;
    const p = Input.players[1];
    const pressed: Dir | null = p.upPressed ? 'up' : p.downPressed ? 'down' : p.leftPressed ? 'left' : p.rightPressed ? 'right' : null;
    if (pressed) {
      if (pressed === this.seq[this.seqIdx]) {
        this.seqIdx++;
        Audio.play('pick');
        const gift = this.overlay.find((o) => o instanceof Phaser.GameObjects.Image && o.texture.key === 'gift') as Phaser.GameObjects.Image | undefined;
        gift?.setAlpha(0.2 + 0.8 * (this.seqIdx / this.seq.length));
      } else {
        this.wrapMistakes++;
        Audio.play('wrong');
        this.toast('Ops, amassou o papel! De novo essa.', '#ff9c9c', 1000);
      }
    }
    const g = this.overlayG;
    if (g) {
      g.clear();
      this.seq.forEach((d, i) => {
        const x = GAME_W / 2 - 150 + i * 60;
        const color = i < this.seqIdx ? 0x8be07a : i === this.seqIdx ? 0xffd25e : 0x8a7a9a;
        g.fillStyle(0x1b1424, 1).fillRoundedRect(x - 22, 300, 44, 44, 8);
        this.arrow(g, x, 322, d, color);
      });
    }
    if (this.seqIdx >= this.seq.length) {
      this.tasks?.done('wrap');
      this.busy = true;
      this.toast('Presente embrulhado, com a carta dentro! ♥', '#ffd6e4', 1500);
      this.time.delayedCall(1500, () => { this.busy = false; this.openSend(); });
    }
  }

  // o motoboy busca o presente e leva até a casa do João
  private openSend(): void {
    this.state = 'send';
    this.busy = true;
    this.openOverlay(`Entrega para o ${this.names[0]}`, '#9ce8ff');
    const ju = this.overlayAdd(this.add.sprite(GAME_W / 2 + 170, 340, 'char_1', charFrame('down', 0)).setScale(4).setOrigin(0.5, 1));
    const gift = this.overlayAdd(this.add.image(GAME_W / 2 + 120, 300, 'gift').setScale(3).setTint(this.paperColor));
    const moto = this.overlayAdd(this.add.image(-80, 318, 'moto').setScale(4));
    const rider = this.overlayAdd(this.add.sprite(-90, 290, 'npc_motoboy', charFrame('side', 0)).setScale(3).setOrigin(0.5, 1).setFlipX(true));
    this.tweens.add({ targets: [moto, rider], x: `+=${GAME_W / 2 - 40}`, duration: 1100, ease: 'Sine.Out' });
    void ju;
    const lines = [
      'Motoboy: "Entrega pra quem?"',
      `${this.names[1]}: "Pro ${this.names[0]}, nesse endereço. É presente de aniversário!"`,
      'Motoboy: "Pode deixar, chega hoje ainda!"',
      `${this.names[1]}: "(Será que ele vai gostar da carta?)"`,
    ];
    lines.forEach((l, i) => this.time.delayedCall(1200 + i * 1500, () => {
      this.overlayText?.setText(l);
      Audio.play('blip');
      if (i === 2) {
        // o presente vai para o baú da moto
        this.tweens.add({ targets: gift, x: GAME_W / 2 - 150, y: 280, scale: 2, duration: 500 });
      }
    }));
    this.time.delayedCall(1200 + lines.length * 1500, () => {
      Audio.play('horn');
      this.tweens.add({ targets: [moto, rider, gift], x: `+=${GAME_W}`, duration: 1200, ease: 'Sine.In' });
      this.time.delayedCall(1200, () => {
        this.stops[2].done = true;
        this.tasks?.done('send');
        if (this.courage >= COURAGE_GOAL) this.tasks?.done('courage');
        this.finish(true);
      });
    });
  }

  private arrow(g: Phaser.GameObjects.Graphics, x: number, y: number, d: Dir, color: number): void {
    g.fillStyle(color, 1);
    const s = 13;
    if (d === 'up') g.fillTriangle(x, y - s, x - s, y + 2, x + s, y + 2).fillRect(x - 4, y, 8, s);
    if (d === 'down') g.fillTriangle(x, y + s, x - s, y - 2, x + s, y - 2).fillRect(x - 4, y - s, 8, s);
    if (d === 'left') g.fillTriangle(x - s, y, x + 2, y - s, x + 2, y + s).fillRect(x, y - 4, s, 8);
    if (d === 'right') g.fillTriangle(x + s, y, x - 2, y - s, x - 2, y + s).fillRect(x - s, y - 4, s, 8);
  }

  // ------------------------------------------------------------------ fim
  private openPause(): void {
    if (this.state === 'end' || !this.scene.isActive()) return;
    Audio.play('select');
    this.scene.launch('Pause', { levelKey: this.scene.key, levelId: this.info.id });
    this.scene.pause();
  }

  finish(win: boolean): void {
    if (this.state === 'end') return;
    this.state = 'end';
    Audio.music(null);
    Audio.play(win ? 'win' : 'lose');
    const clean = this.infractions === 0 && this.hits <= 1;
    const stars = win ? 1 + (this.courage >= COURAGE_GOAL ? 1 : 0) + (clean ? 1 : 0) : 0;
    const score = win ? this.coins * 5 + this.courage * 20 + this.crossOk * 30 + this.hp * 30 : 0;
    this.time.delayedCall(1200, () => {
      irisOut(this, () => this.scene.start('Result', {
        levelId: this.info.id, win, stars, score,
        title: win ? 'Presente entregue! ♥' : 'Tropeços demais... bora de novo?',
        lines: [
          `Coragem: ${this.courage}/${COURAGE_GOAL} ${this.courage >= COURAGE_GOAL ? '(estrela!)' : ''}`,
          `Sinal vermelho: ${this.infractions} · Tropeços: ${this.hits} ${clean ? '(estrela!)' : '(meta: nenhum vermelho e no máximo 1 tropeço)'}`,
          win ? 'A medalha foi... e uma carta junto. ♥' : `Moedas na calçada: ${this.coins}`,
          this.tasks ? this.tasks.summary() : '',
        ].filter(Boolean),
        stats: { hugs: 0, faints: 0, revives: 0, crystals: 0, coins: this.coins * 2 },
      }));
    });
  }
}
