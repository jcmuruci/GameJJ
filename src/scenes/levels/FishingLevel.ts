import Phaser from 'phaser';
import { GAME_W, GAME_H } from '../../config';
import { LevelInfo, levelById } from '../../data/levels';
import { Save } from '../../systems/SaveManager';
import { Input, KEY_LABELS } from '../../systems/InputManager';
import { Audio } from '../../systems/Audio';
import { charFrame } from '../../art/CharacterArt';
import { txt, panel, uiButton, fillNames } from '../../ui/text';
import { isTouchDevice } from '../../systems/TouchControls';
import { TaskList } from '../../ui/TaskList';

/**
 * Jun/2026 — Juiz de Fora: a Juliana aprende a pescar no lago, com os pais do João olhando.
 * Juliana lança (AÇÃO na força certa), fisga quando a boia afunda e recolhe a linha (AÇÃO).
 * João afrouxa a linha quando o peixe briga (segura HABILIDADE) e pega com o puçá (AÇÃO no tempo certo).
 * À noite, festa junina em BH: quadrilha com os comandos do marcador.
 */

interface Species { name: string; strength: number; pts: number; tint: number; scale: number }
const SPECIES: Species[] = [
  { name: 'Lambari', strength: 0.6, pts: 10, tint: 0xd8e0e8, scale: 2.2 },
  { name: 'Tilápia', strength: 1, pts: 25, tint: 0x9aa8b8, scale: 3 },
  { name: 'Pacu', strength: 1.3, pts: 40, tint: 0x8a9a6a, scale: 3.4 },
  { name: 'Traíra', strength: 1.6, pts: 50, tint: 0x6a5a3a, scale: 3.6 },
  { name: 'Dourado', strength: 2, pts: 100, tint: 0xffc23a, scale: 4 },
];

interface Fish { img: Phaser.GameObjects.Image; x: number; y: number; vx: number; sp: Species; hunting: number }

type State = 'intro' | 'aim' | 'cast' | 'wait' | 'bite' | 'reel' | 'land' | 'caught' | 'party' | 'end';

const WATER_Y = 300;
const PIER_END = 340;
const FISH_TIME = 150;

/** Comandos da quadrilha: o que os dois precisam apertar. */
const CALLS: { call: string; need: 'action' | 'ability' | 'up' | 'right' | 'none'; hint: string }[] = [
  { call: 'BALANCÊ!', need: 'action', hint: 'os dois: AÇÃO' },
  { call: 'ANARRIÊ!', need: 'ability', hint: 'os dois: HABILIDADE' },
  { call: 'OLHA A COBRA!', need: 'up', hint: 'os dois: pulem (CIMA)' },
  { call: 'É MENTIRA!', need: 'none', hint: 'ninguém aperta nada!' },
  { call: 'CAMINHO DA ROÇA!', need: 'right', hint: 'os dois: DIREITA' },
  { call: 'OLHA A CHUVA!', need: 'up', hint: 'os dois: pulem (CIMA)' },
  { call: 'É MENTIRA!', need: 'none', hint: 'ninguém aperta nada!' },
  { call: 'BALANCÊ!', need: 'action', hint: 'os dois: AÇÃO' },
];

const DAD_LINES = ['Puxa devagar, {p2}!', 'Isso! Deixa ele cansar!', 'Aprendeu rapidinho, hein!', 'Esse lago tem traíra brava, cuidado!', 'Lança mais longe que lá tem peixe grande!'];
const MOM_LINES = ['Que moça boa de pescaria!', 'Tira foto pra mandar pra família!', '{p1}, segura esse puçá direito!', 'Vou fritar esses peixes pro almoço!', 'Vocês dois juntos dão gosto de ver.'];

export class FishingLevel extends Phaser.Scene {
  info!: LevelInfo;
  names!: [string, string];
  state: State = 'intro';
  private t = 0;
  timeLeft = FISH_TIME;
  // lançamento e linha
  private power = 0;
  private bobber!: Phaser.GameObjects.Image;
  private line!: Phaser.GameObjects.Graphics;
  private bob = { x: 0, y: WATER_Y };
  private rodTip = { x: 0, y: 0 };
  // peixes
  private fishes: Fish[] = [];
  hooked: Fish | null = null;
  dist = 1;
  tension = 0;
  private fightT = 0;
  private fighting = 0;
  private ringT = 0;
  // placar
  caught = 0;
  bigCatch = false;
  nets = 0;
  breaks = 0;
  score = 0;
  dances = 0;
  private callIdx = 0;
  private callWin = 0;
  private callPressed: [boolean, boolean] = [false, false];
  private callWrong = false;
  // cena
  private chars: Phaser.GameObjects.Sprite[] = [];
  private parents: Phaser.GameObjects.Sprite[] = [];
  private ui!: { time: Phaser.GameObjects.Text; fish: Phaser.GameObjects.Text; meter: Phaser.GameObjects.Graphics; hint: Phaser.GameObjects.Text; toast: Phaser.GameObjects.Text };
  private nightLayer: Phaser.GameObjects.GameObject[] = [];
  private chatT = 8;
  tasks: TaskList | null = null;
  private firstCatch = true;
  /** Pequena pausa antes de poder lançar (o "pronto" não vira lançamento). */
  private aimGrace = 0;
  private callText: Phaser.GameObjects.Text | null = null;

  constructor() {
    super('FishingLevel');
  }

  init(d: { levelId: string }): void {
    this.info = levelById(d.levelId ?? 'junina');
  }

  create(): void {
    this.names = [Save.data.looks[0].name, Save.data.looks[1].name];
    this.state = 'intro';
    this.timeLeft = FISH_TIME;
    this.fishes = [];
    this.hooked = null;
    this.caught = this.nets = this.breaks = this.score = this.dances = 0;
    this.bigCatch = false;
    this.callIdx = 0;
    this.callText = null;
    this.nightLayer = [];
    this.chatT = 8;
    this.tasks = null;
    this.firstCatch = true;
    this.chars = [];
    this.parents = [];

    this.drawScenery();
    // casal no pier (de lado, olhando para o lago)
    this.chars = [0, 1].map((i) => this.add.sprite(i === 0 ? 236 : 300, 266, `char_${i}`, charFrame('side', 0)).setScale(3).setOrigin(0.5, 1).setFlipX(true).setDepth(20));
    // pais do João na margem
    this.parents = ['pai', 'mae'].map((k, i) => this.add.sprite(60 + i * 46, 262, `npc_${k}`, charFrame('down', 0)).setScale(3).setOrigin(0.5, 1).setDepth(15));
    this.rodTip = { x: 352, y: 196 };
    this.line = this.add.graphics().setDepth(25);
    this.bobber = this.add.image(this.rodTip.x, this.rodTip.y, 'bobber').setScale(3).setDepth(26).setVisible(false);
    for (let i = 0; i < 7; i++) this.spawnFish();

    this.buildUi();
    this.showIntro();
    Audio.music('festival');
    this.cameras.main.fadeIn(400, 27, 20, 36);
  }

  // ------------------------------------------------------------------ cenário
  private drawScenery(): void {
    const g = this.add.graphics().setDepth(0);
    // céu e morros de Juiz de Fora
    g.fillStyle(0x9ce0ff, 1).fillRect(0, 0, GAME_W, WATER_Y);
    g.fillStyle(0xc8f0ff, 1).fillRect(0, 150, GAME_W, 150);
    g.fillStyle(0x6cbf5a, 1).fillEllipse(200, 250, 520, 160).fillEllipse(640, 260, 620, 150).fillEllipse(960, 240, 400, 170);
    g.fillStyle(0x5aa84a, 1).fillEllipse(420, 280, 700, 90);
    // casa dos pais ao fundo
    this.add.image(120, 214, 'farmhouse').setScale(1.4).setDepth(1);
    for (const [x, y, k] of [[300, 238, 'tree_big'], [520, 236, 'tree_pink'], [700, 232, 'tree_big'], [880, 236, 'tree_big']] as [number, number, string][]) this.add.image(x, y, k).setScale(2.4).setDepth(2);
    // margem
    g.fillStyle(0x7ccf5a, 1).fillRect(0, 262, 180, 40);
    g.fillStyle(0x8a5a34, 1).fillRect(0, 296, 190, 8);
    // lago
    const w = this.add.graphics().setDepth(3);
    for (let i = 0; i < 6; i++) w.fillStyle([0x4aa8e8, 0x3f98d8, 0x3488c8, 0x2a78b8, 0x226aa8, 0x1b5a98][i], 1).fillRect(0, WATER_Y + i * 42, GAME_W, 42);
    w.fillStyle(0x8fd8ff, 1).fillRect(0, WATER_Y, GAME_W, 3);
    for (let i = 0; i < 14; i++) w.fillStyle(0x8fd8ff, 0.5).fillRect(Phaser.Math.Between(0, GAME_W), Phaser.Math.Between(WATER_Y + 10, GAME_H - 10), Phaser.Math.Between(8, 24), 2);
    // pier de madeira
    const p = this.add.graphics().setDepth(18);
    p.fillStyle(0xc8915a, 1).fillRect(170, 266, PIER_END - 170, 12);
    for (let x = 170; x < PIER_END; x += 12) p.fillStyle(0xa8703a, 1).fillRect(x, 266, 1, 12);
    p.fillStyle(0x5a3a24, 1).fillRect(170, 278, PIER_END - 170, 3);
    for (const x of [186, 250, 314]) p.fillStyle(0x5a3a24, 1).fillRect(x, 278, 6, 60);
    // placa
    const sign = this.add.graphics().setDepth(16);
    sign.fillStyle(0xc8915a, 1).fillRect(110, 232, 64, 16).fillStyle(0x5a3a24, 1).fillRect(140, 248, 3, 18);
    txt(this, 142, 240, 'JUIZ DE FORA', 9, { color: '#3a2414', stroke: '#c8915a', strokeW: 0 }).setDepth(17);
  }

  private spawnFish(): void {
    const roll = Math.random();
    const sp = roll < 0.03 ? SPECIES[4] : roll < 0.35 ? SPECIES[0] : roll < 0.65 ? SPECIES[1] : roll < 0.85 ? SPECIES[2] : SPECIES[3];
    const y = Phaser.Math.Between(WATER_Y + 40, GAME_H - 30);
    const x = Phaser.Math.Between(380, GAME_W - 20);
    const img = this.add.image(x, y, 'item_fish').setScale(sp.scale).setTint(0x1b3a5a).setAlpha(0.55).setDepth(4);
    this.fishes.push({ img, x, y, vx: Phaser.Math.FloatBetween(18, 40) * (Math.random() < 0.5 ? -1 : 1), sp, hunting: Phaser.Math.FloatBetween(1, 3) });
  }

  // ------------------------------------------------------------------ interface
  private buildUi(): void {
    const g = this.add.graphics().setDepth(100);
    g.fillStyle(0x1b1424, 0.75).fillRoundedRect(GAME_W / 2 - 150, 8, 300, 40, 10);
    this.ui = {
      time: txt(this, GAME_W / 2 - 60, 28, '', 18, { color: '#fff4e0' }).setDepth(101),
      fish: txt(this, GAME_W / 2 + 70, 28, '', 18, { color: '#9ce8ff' }).setDepth(101),
      meter: this.add.graphics().setDepth(101),
      hint: txt(this, GAME_W / 2, 96, '', 18, { color: '#fff4e0', wrap: 760 }).setDepth(101),
      toast: txt(this, GAME_W / 2, 130, '', 20, { color: '#ffd25e' }).setDepth(102).setAlpha(0),
    };
    const help = [
      `${this.names[0]}: segura ${KEY_LABELS[0].ability} = afrouxa a linha · ${KEY_LABELS[0].action} = puçá`,
      `${this.names[1]}: ${KEY_LABELS[1].action} = lançar, fisgar e recolher`,
    ];
    help.forEach((h, i) => txt(this, i === 0 ? 20 : GAME_W - 20, GAME_H - 18, h, 13, { origin: [i === 0 ? 0 : 1, 0.5], color: i === 0 ? '#bfe6ff' : '#ffd6e4', bold: false }).setDepth(101));
    if (!isTouchDevice()) uiButton(this, GAME_W / 2, GAME_H - 20, 'Pausa (Esc)', () => this.openPause(), { size: 13 });
  }

  private toast(s: string, color = '#ffd25e', ms = 1600): void {
    this.tweens.killTweensOf(this.ui.toast);
    this.ui.toast.setText(s).setColor(color).setAlpha(1).setScale(0.8);
    this.tweens.add({ targets: this.ui.toast, scale: 1, duration: 160, ease: 'Back.Out' });
    this.tweens.add({ targets: this.ui.toast, alpha: 0, delay: ms, duration: 300 });
  }

  /** Balão de fala acima de alguém (personagens e pais). */
  private bubble(target: Phaser.GameObjects.Sprite, text: string, color = '#fff4e0', ms = 2000): void {
    const t = txt(this, 0, 0, text, 13, { color: '#2a1d2e', stroke: color, strokeW: 0, wrap: 220 });
    const w = t.width + 16;
    const h = t.height + 8;
    const g = this.add.graphics();
    g.fillStyle(0x2a1d2e, 1).fillRoundedRect(-w / 2 - 2, -h - 2, w + 4, h + 4, 7);
    g.fillStyle(Phaser.Display.Color.HexStringToColor(color).color, 1).fillRoundedRect(-w / 2, -h, w, h, 6).fillTriangle(-4, -1, 4, -1, 0, 6);
    t.setPosition(0, -h / 2);
    const x = Phaser.Math.Clamp(target.x, w / 2 + 6, GAME_W - w / 2 - 6);
    const c = this.add.container(x, target.y - target.displayHeight - 8, [g, t]).setDepth(90).setScale(0.6);
    this.tweens.add({ targets: c, scale: 1, duration: 160, ease: 'Back.Out' });
    this.tweens.add({ targets: c, alpha: 0, delay: ms, duration: 250, onComplete: () => c.destroy() });
  }

  private showIntro(): void {
    const objs: Phaser.GameObjects.GameObject[] = [];
    const w = 660;
    const h = 320;
    const x0 = (GAME_W - w) / 2;
    const y0 = (GAME_H - h) / 2;
    objs.push(panel(this, x0, y0, w, h).setDepth(200));
    objs.push(txt(this, GAME_W / 2, y0 + 32, 'Pescaria em Juiz de Fora', 28, { color: '#9ce8ff' }).setDepth(201));
    const lines: [string, string, string][] = [
      [`${this.names[1]} pesca`, `${KEY_LABELS[1].action} na força certa para lançar · ${KEY_LABELS[1].action} quando a boia afundar · ${KEY_LABELS[1].action} sem parar para recolher`, '#ffd6e4'],
      [`${this.names[0]} ajuda`, `Quando o peixe brigar, SEGURA ${KEY_LABELS[0].ability} para afrouxar a linha · ${KEY_LABELS[0].action} com o puçá quando o peixe pular`, '#bfe6ff'],
      ['À noite', 'Festa junina em BH: sigam os comandos da quadrilha!', '#ffd25e'],
    ];
    lines.forEach(([a, b, c], i) => {
      objs.push(txt(this, GAME_W / 2, y0 + 80 + i * 62, a, 17, { color: c }).setDepth(201));
      objs.push(txt(this, GAME_W / 2, y0 + 104 + i * 62, b, 13, { bold: false, wrap: 600 }).setDepth(201));
    });
    const ready = [false, false];
    const rt = [0, 1].map((i) => txt(this, GAME_W / 2 + (i ? 150 : -150), y0 + h - 28, `${this.names[i]}: aperte ${KEY_LABELS[i].action}`, 16, { color: i ? '#ffd6e4' : '#bfe6ff' }).setDepth(201));
    objs.push(...rt);
    const ev = this.time.addEvent({
      delay: 16, loop: true, callback: () => {
        for (let i = 0; i < 2; i++) {
          if (!ready[i] && Input.players[i].actionPressed) { ready[i] = true; rt[i].setText(`${this.names[i]}: pronto! ♥`); Audio.play('confirm'); }
        }
        if (ready[0] && ready[1]) {
          ev.remove();
          objs.forEach((o) => o.destroy());
          this.tasks = new TaskList(this, 12, 12, [
            { id: 'fish', text: 'Pescar peixes', goal: 5 },
            { id: 'big', text: 'Pegar um peixe brigão' },
            { id: 'net', text: `Puçá certeiro do ${this.names[0]}`, goal: 3 },
            { id: 'dance', text: 'Dançar a quadrilha (acertos)', goal: 5 },
          ]);
          this.tasks.container.setDepth(150);
          this.bubble(this.parents[0], fillNames('Bora, {p2}! Hoje você aprende a pescar!', this.names), '#d8f0c0', 2400);
          this.toAim();
        }
      },
    });
  }

  // ------------------------------------------------------------------ estados
  private toAim(): void {
    this.state = 'aim';
    this.t = 0;
    this.aimGrace = 0.4;
    this.hooked = null;
    this.tension = 0;
    this.bobber.setVisible(false);
    this.ui.hint.setText(`${this.names[1]}: aperte ${KEY_LABELS[1].action} na força certa para lançar!`);
  }

  private cast(): void {
    this.state = 'cast';
    const target = 380 + this.power * 520;
    this.bob = { x: target, y: WATER_Y };
    this.bobber.setVisible(true).setPosition(this.rodTip.x, this.rodTip.y);
    Audio.play('jump');
    this.tweens.add({ targets: this.chars[1], angle: -12, yoyo: true, duration: 140 });
    this.tweens.addCounter({
      from: 0, to: 1, duration: 600,
      onUpdate: (tw) => {
        const k = tw.getValue() ?? 0;
        this.bobber.setPosition(Phaser.Math.Linear(this.rodTip.x, target, k), Phaser.Math.Linear(this.rodTip.y, WATER_Y, k) - Math.sin(k * Math.PI) * 70);
      },
      onComplete: () => {
        Audio.play('splash');
        this.splash(target, WATER_Y);
        this.state = 'wait';
        this.t = Phaser.Math.FloatBetween(1.5, 3.5);
        this.ui.hint.setText('Esperem... quando a boia AFUNDAR, fisguem!');
      },
    });
  }

  private splash(x: number, y: number): void {
    const em = this.add.particles(x, y, 'fx_pixel', { speed: { min: 30, max: 90 }, angle: { min: 200, max: 340 }, lifespan: 500, tint: 0xbfe9ff, scale: { start: 2, end: 0 }, emitting: false }).setDepth(30);
    em.explode(12);
    this.time.delayedCall(700, () => em.destroy());
  }

  /** Um peixe perto da boia vem morder. */
  private nearestFish(): Fish | null {
    let best: Fish | null = null;
    let bd = 260;
    for (const f of this.fishes) {
      const d = Math.abs(f.x - this.bob.x);
      if (d < bd) { bd = d; best = f; }
    }
    return best;
  }

  private hook(f: Fish): void {
    this.state = 'reel';
    this.hooked = f;
    this.dist = Phaser.Math.Clamp((this.bob.x - PIER_END) / 560, 0.35, 1);
    this.tension = 0.25;
    this.fightT = 1.2;
    this.fighting = 0;
    f.img.setAlpha(0.95).clearTint().setTint(f.sp.tint);
    Audio.play('coin');
    this.toast('FISGOU! Recolhe!', '#9ce8ff');
    this.ui.hint.setText(`${this.names[1]}: ${KEY_LABELS[1].action} sem parar · ${this.names[0]}: segura ${KEY_LABELS[0].ability} quando o peixe brigar!`);
  }

  private lose(text: string): void {
    if (this.hooked) {
      this.hooked.img.setTint(0x1b3a5a).setAlpha(0.55);
      this.hooked.y = Phaser.Math.Between(WATER_Y + 60, GAME_H - 40);
    }
    this.toast(text, '#ff9c9c');
    Audio.play('wrong');
    this.time.delayedCall(700, () => { if (this.state !== 'party' && this.state !== 'end') this.toAim(); });
    this.state = 'caught';
  }

  private land(): void {
    this.state = 'land';
    this.ringT = 1.1;
    this.ui.hint.setText(`${this.names[0]}: ${KEY_LABELS[0].action} com o puçá quando o círculo ficar pequeno!`);
    Audio.play('splash');
  }

  private catchFish(): void {
    const f = this.hooked!;
    this.state = 'caught';
    this.caught++;
    this.nets++;
    this.score += f.sp.pts;
    this.tasks?.progress('fish', this.caught);
    this.tasks?.progress('net', this.nets);
    if (f.sp.strength >= 1.3) { this.bigCatch = true; this.tasks?.done('big'); }
    Audio.play('crystal');
    this.chars.forEach((c) => this.tweens.add({ targets: c, y: c.y - 10, yoyo: true, duration: 160 }));
    // cartinha do peixe
    const card = this.add.container(GAME_W / 2, 210).setDepth(160);
    const g = this.add.graphics();
    g.fillStyle(0xfff7e6, 1).fillRoundedRect(-120, -60, 240, 120, 12).lineStyle(3, 0x4aa8e8, 1).strokeRoundedRect(-120, -60, 240, 120, 12);
    card.add([g, this.add.image(0, -14, 'item_fish').setScale(f.sp.scale * 1.6).setTint(f.sp.tint), txt(this, 0, 30, `${f.sp.name}! +${f.sp.pts}`, 18, { color: '#2a5a98', stroke: '#fff7e6', strokeW: 0 })]);
    card.setScale(0.3);
    this.tweens.add({ targets: card, scale: 1, duration: 240, ease: 'Back.Out' });
    this.tweens.add({ targets: card, alpha: 0, delay: 1300, duration: 300, onComplete: () => card.destroy() });
    if (this.firstCatch) { this.firstCatch = false; this.bubble(this.chars[1], 'Meu primeiro peixe!!! ♥', '#ffd6e4', 2200); }
    else this.bubble(this.chars[0], Phaser.Utils.Array.GetRandom(['Peguei! Puçá certeiro!', 'Que dupla!', 'Esse vai pra frigideira!']), '#bfe6ff');
    this.time.delayedCall(500, () => this.bubble(this.parents[0], f.sp.strength >= 1.3 ? 'Que peixão!!!' : 'Isso aí!', '#d8f0c0'));
    // o peixe vai pro balde e nasce outro no lago
    f.img.destroy();
    this.fishes = this.fishes.filter((x) => x !== f);
    this.hooked = null;
    this.spawnFish();
    this.time.delayedCall(1500, () => { if (this.state === 'caught') this.toAim(); });
  }

  // ------------------------------------------------------------------ festa junina
  private toParty(): void {
    this.state = 'party';
    this.hooked = null;
    this.bobber.setVisible(false);
    this.line.clear();
    this.ui.hint.setText('');
    this.cameras.main.fade(500, 10, 10, 30);
    this.time.delayedCall(520, () => {
      // noite em BH: arraiá com bandeirinhas e fogueira
      const n = this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x141430, 1).setDepth(40);
      const ground = this.add.rectangle(GAME_W / 2, 440, GAME_W, 200, 0x3a2a3a, 1).setDepth(41);
      this.nightLayer.push(n, ground);
      for (let i = 0; i < 40; i++) this.nightLayer.push(this.add.image(Phaser.Math.Between(0, GAME_W), Phaser.Math.Between(10, 200), 'fx_spark').setScale(0.6).setDepth(42).setAlpha(0.8));
      for (const x of [140, 400, 660, 900]) this.nightLayer.push(this.add.image(x, 110, 'bunting_j').setScale(4).setDepth(43));
      this.nightLayer.push(this.add.image(GAME_W / 2, 330, 'bonfire').setScale(5).setDepth(44));
      const fire = this.add.sprite(GAME_W / 2, 300, 'fire', 0).setScale(5).setDepth(45).play('fire-anim');
      this.nightLayer.push(fire);
      this.nightLayer.push(txt(this, GAME_W / 2, 76, 'ARRAIÁ DE BH', 24, { color: '#ffd25e' }).setDepth(46));
      this.callText = txt(this, GAME_W / 2, 178, '', 44, { color: '#ffd6e4', strokeW: 8 }).setDepth(60);
      this.nightLayer.push(this.callText);
      this.ui.hint.setY(228);
      this.chars.forEach((c, i) => c.setPosition(GAME_W / 2 + (i ? 120 : -120), 420).setDepth(50).setFlipX(i === 0).setFrame(charFrame('side', 0)));
      this.parents.forEach((p) => p.setVisible(false));
      this.fishes.forEach((f) => f.img.setVisible(false));
      this.cameras.main.fadeIn(500, 10, 10, 30);
      this.ui.hint.setText('Festa junina! Sigam o marcador da quadrilha.').setDepth(101);
      this.callIdx = 0;
      this.time.delayedCall(1600, () => this.nextCall());
    });
  }

  private nextCall(): void {
    if (this.callIdx >= CALLS.length) { this.finish(); return; }
    const c = CALLS[this.callIdx];
    this.callWin = 1.6;
    this.callPressed = [false, false];
    this.callWrong = false;
    Audio.play('bell');
    this.callText?.setText(c.call).setScale(1.4).setAlpha(1);
    if (this.callText) this.tweens.add({ targets: this.callText, scale: 1, duration: 260, ease: 'Back.Out' });
    this.ui.hint.setText(c.hint);
  }

  private resolveCall(): void {
    const c = CALLS[this.callIdx];
    const ok = c.need === 'none' ? !this.callWrong : this.callPressed[0] && this.callPressed[1] && !this.callWrong;
    if (ok) {
      this.dances++;
      this.score += 15;
      this.tasks?.progress('dance', this.dances);
      Audio.play('hug');
      this.chars.forEach((ch) => this.tweens.add({ targets: ch, angle: 360, y: ch.y - 12, yoyo: false, duration: 420, onComplete: () => { ch.setAngle(0); ch.y = 420; } }));
      this.ui.hint.setText(c.need === 'none' ? 'Não caíram na mentira! Hahaha' : 'Arrasaram! ♥');
    } else {
      Audio.play('wrong');
      this.ui.hint.setText(c.need === 'none' ? 'Caíram na mentira! Hahaha' : 'Errou o passo... próxima!');
    }
    this.callIdx++;
    this.time.delayedCall(900, () => this.nextCall());
  }

  // ------------------------------------------------------------------ laço
  update(_t: number, delta: number): void {
    const dt = Math.min(delta / 1000, 0.05);
    if (Input.pausePressed && this.state !== 'end') { this.openPause(); return; }
    const p1 = Input.players[0];
    const p2 = Input.players[1];
    this.updateFishSwim(dt);

    if (this.state === 'party') { this.updateParty(dt, p1, p2); this.drawUi(); return; }
    if (this.state === 'intro' || this.state === 'end') { this.drawUi(); return; }

    // relógio da pescaria
    this.timeLeft -= dt;
    if (this.timeLeft <= 0 && this.state !== 'land') { this.timeLeft = 0; this.toast('Fim da pescaria! À noite... festa junina!', '#ffd25e', 2000); this.toParty(); return; }
    this.chatT -= dt;
    if (this.chatT <= 0) {
      this.chatT = Phaser.Math.Between(10, 14);
      const dad = Math.random() < 0.5;
      this.bubble(this.parents[dad ? 0 : 1], fillNames(Phaser.Utils.Array.GetRandom(dad ? DAD_LINES : MOM_LINES), this.names), '#d8f0c0', 2400);
    }

    switch (this.state) {
      case 'aim':
        this.t += dt;
        this.power = (Math.sin(this.t * 2.6 - Math.PI / 2) + 1) / 2;
        this.aimGrace -= dt;
        if (p2.actionPressed && this.aimGrace <= 0) this.cast();
        break;
      case 'wait': {
        this.t -= dt;
        const f = this.nearestFish();
        if (f) f.vx = Math.sign(this.bob.x - f.x) * 30 || f.vx;
        this.bobber.setPosition(this.bob.x, WATER_Y - 2 + Math.sin(this.time.now / 300) * 1.5);
        if (p2.actionPressed) { this.bubble(this.chars[1], 'Ops, cedo demais!', '#ffd6e4', 1200); this.lose('Calma... ainda não tinha fisgado!'); break; }
        if (this.t <= 0 && f) {
          this.state = 'bite';
          this.t = 0.8;
          Audio.play('splash');
          this.toast('!!!', '#ff7a7a', 500);
          f.x = this.bob.x;
          f.y = WATER_Y + 26;
        } else if (this.t <= 0) this.t = 1;
        break;
      }
      case 'bite':
        this.t -= dt;
        this.bobber.setPosition(this.bob.x, WATER_Y + 6);
        if (p2.actionPressed) { const f = this.nearestFish(); if (f) this.hook(f); else this.toAim(); break; }
        if (this.t <= 0) this.lose('O peixe comeu a isca e fugiu!');
        break;
      case 'reel':
        this.updateReel(dt, p1, p2);
        break;
      case 'land':
        this.ringT -= dt;
        if (p1.actionPressed) {
          const r = this.ringT / 1.1;
          if (r > 0.12 && r < 0.45) this.catchFish();
          else { this.bubble(this.chars[0], 'Ixi, errei o puçá!', '#bfe6ff', 1200); this.backToReel(); }
          break;
        }
        if (this.ringT <= 0) { this.bubble(this.chars[0], 'Ixi, escapou do puçá!', '#bfe6ff', 1200); this.backToReel(); }
        break;
    }
    this.drawLine();
    this.drawUi();
  }

  private backToReel(): void {
    this.state = 'reel';
    this.dist = 0.3;
    this.tension = 0.3;
    Audio.play('splash');
  }

  /** Recolher: ela puxa; o peixe briga em arrancadas; ele afrouxa a linha para não arrebentar. */
  private updateReel(dt: number, p1: typeof Input.players[0], p2: typeof Input.players[1]): void {
    const f = this.hooked!;
    const s = f.sp.strength;
    this.fightT -= dt;
    if (this.fightT <= 0) {
      if (this.fighting > 0) { this.fighting = 0; this.fightT = Phaser.Math.FloatBetween(1.6, 3) / s; }
      else { this.fighting = Phaser.Math.FloatBetween(0.9, 1.5); this.fightT = this.fighting; this.toast('Ele tá brigando! Afrouxa!', '#ffb08a', 900); }
    }
    if (p2.actionPressed) {
      this.dist -= 0.045 / s;
      this.tension += 0.07 * (this.fighting > 0 ? 1.8 : 1);
      Audio.play('step');
      this.tweens.add({ targets: this.chars[1], angle: 6, yoyo: true, duration: 80 });
    }
    if (this.fighting > 0) { this.tension += 0.32 * s * dt; this.dist += 0.05 * s * dt; }
    if (p1.ability) { this.tension -= 0.7 * dt; this.dist += 0.02 * dt; this.chars[0].setFrame(charFrame('side', 3)); }
    else this.chars[0].setFrame(charFrame('side', 0));
    this.tension = Math.max(0, this.tension - 0.12 * dt);
    if (this.tension >= 1) { this.breaks++; this.bubble(this.parents[0], 'Arrebentou! Faz parte, filha.', '#d8f0c0'); this.lose('A linha arrebentou!'); return; }
    if (this.dist >= 1.2) { this.lose('Ele levou a linha embora... escapou!'); return; }
    if (this.dist <= 0) { this.dist = 0; this.land(); }
    // o peixe aparece puxando entre o pier e a boia
    const x = PIER_END + 20 + Math.max(0, this.dist) * 520;
    f.x = x + (this.fighting > 0 ? Math.sin(this.time.now / 60) * 6 : 0);
    f.y = WATER_Y + 24 + Math.sin(this.time.now / 200) * 4;
    this.bob = { x: f.x, y: WATER_Y };
    this.bobber.setPosition(f.x, WATER_Y + 4);
  }

  private updateFishSwim(dt: number): void {
    for (const f of this.fishes) {
      if (f === this.hooked) {
        f.img.setPosition(f.x, f.y).setFlipX(true);
        if (this.state === 'land') {
          // salta perto do pier
          const k = 1 - this.ringT / 1.1;
          f.img.setPosition(PIER_END + 30, WATER_Y - Math.sin(k * Math.PI) * 50).setAngle(k * 180);
        } else f.img.setAngle(0);
        continue;
      }
      f.x += f.vx * dt;
      if (f.x < 370 || f.x > GAME_W - 10) { f.vx *= -1; f.x = Phaser.Math.Clamp(f.x, 370, GAME_W - 10); }
      if (Math.random() < dt * 0.3) f.vx = Phaser.Math.FloatBetween(18, 40) * (Math.random() < 0.5 ? -1 : 1);
      f.img.setPosition(f.x, f.y + Math.sin(this.time.now / 400 + f.x) * 2).setFlipX(f.vx > 0);
    }
  }

  private drawLine(): void {
    this.line.clear();
    if (!this.bobber.visible) return;
    this.line.lineStyle(2, 0x5a3a24, 1).lineBetween(312, 236, this.rodTip.x, this.rodTip.y);
    this.line.lineStyle(1, 0xf0f0f0, 0.9).lineBetween(this.rodTip.x, this.rodTip.y, this.bobber.x, this.bobber.y);
  }

  private drawUi(): void {
    const mm = Math.floor(this.timeLeft / 60);
    const ss = String(Math.floor(this.timeLeft % 60)).padStart(2, '0');
    this.ui.time.setText(this.state === 'party' ? 'Arraiá!' : `${mm}:${ss}`);
    this.ui.fish.setText(`Peixes: ${this.caught}`);
    const g = this.ui.meter.clear();
    if (this.state === 'aim') {
      // força do lançamento
      g.fillStyle(0x1b1424, 0.85).fillRoundedRect(240, 150, 30, 110, 8);
      g.fillStyle(0x8be07a, 1).fillRect(246, 156 + 98 * (1 - this.power), 18, 98 * this.power);
      g.lineStyle(2, 0xffd25e, 1).strokeRect(246, 156, 18, 30);
    }
    if (this.state === 'reel') {
      // tensão da linha e distância
      g.fillStyle(0x1b1424, 0.85).fillRoundedRect(GAME_W / 2 - 170, 150, 340, 54, 10);
      g.fillStyle(0x3a3a4a, 1).fillRect(GAME_W / 2 - 150, 162, 300, 12);
      g.fillStyle(this.tension > 0.8 ? 0xff5c5c : this.tension > 0.55 ? 0xffd25e : 0x8be07a, 1).fillRect(GAME_W / 2 - 150, 162, 300 * Math.min(1, this.tension), 12);
      g.fillStyle(0x9ce8ff, 1).fillRect(GAME_W / 2 - 150, 184, 300 * (1 - Math.min(1, this.dist)), 6);
    }
    if (this.state === 'land' && this.hooked) {
      const r = this.ringT / 1.1;
      g.lineStyle(3, r > 0.12 && r < 0.45 ? 0x8be07a : 0xfff4e0, 1).strokeCircle(PIER_END + 30, WATER_Y - 30, 8 + r * 50);
    }
  }

  private updateParty(dt: number, p1: typeof Input.players[0], p2: typeof Input.players[1]): void {
    if (this.callWin <= 0 || this.callIdx >= CALLS.length) return;
    const c = CALLS[this.callIdx];
    const pressed = (p: typeof p1) => ({ action: p.actionPressed, ability: p.abilityPressed, up: p.upPressed, right: p.rightPressed, any: p.actionPressed || p.abilityPressed || p.upPressed || p.rightPressed || p.leftPressed || p.downPressed });
    [p1, p2].forEach((p, i) => {
      const pr = pressed(p);
      if (!pr.any) return;
      if (c.need === 'none') { this.callWrong = true; return; }
      if (pr[c.need]) {
        this.callPressed[i] = true;
        this.tweens.add({ targets: this.chars[i], y: 408, yoyo: true, duration: 120 });
      } else this.callWrong = true;
    });
    this.callWin -= dt;
    if (this.callWin <= 0 || (c.need !== 'none' && this.callPressed[0] && this.callPressed[1])) { this.callWin = 0; this.resolveCall(); }
  }

  // ------------------------------------------------------------------ fim
  private openPause(): void {
    if (!this.scene.isActive()) return;
    Audio.play('select');
    this.scene.launch('Pause', { levelKey: this.scene.key, levelId: this.info.id });
    this.scene.pause();
  }

  finish(): void {
    if (this.state === 'end') return;
    this.state = 'end';
    Audio.music(null);
    Audio.play('win');
    const stars = 1 + (this.caught >= 5 ? 1 : 0) + (this.dances >= 5 ? 1 : 0);
    this.time.delayedCall(1200, () => {
      this.cameras.main.fadeOut(400, 27, 20, 36);
      this.time.delayedCall(420, () => this.scene.start('Result', {
        levelId: this.info.id, win: true, stars, score: this.score,
        title: 'Pescaria e arraiá!',
        lines: [
          `Peixes: ${this.caught} ${this.caught >= 5 ? '(estrela!)' : '(meta: 5)'}`,
          `Quadrilha: ${this.dances}/${CALLS.length} ${this.dances >= 5 ? '(estrela!)' : '(meta: 5)'}`,
          this.bigCatch ? 'Pegaram um peixe brigão!' : `Linhas arrebentadas: ${this.breaks}`,
          this.tasks ? this.tasks.summary() : '',
        ].filter(Boolean),
        stats: { hugs: 0, faints: 0, revives: 0, crystals: 0, coins: Math.round(this.score / 5) },
      }));
    });
  }
}
