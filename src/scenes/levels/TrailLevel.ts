import Phaser from 'phaser';
import { PuzzleLevel } from './PuzzleLevel';
import { TRAILS, TrailConfig } from '../../data/trails';
import { POEM_REST } from '../../data/poem';
import type { HUDScene } from '../HUDScene';
import { GAME_W, GAME_H, TILE, ZOOM, RES } from '../../config';
import { txt, fillNames } from '../../ui/text';
import { Slime } from '../../entities/Enemy';
import { Input, KEY_LABELS } from '../../systems/InputManager';
import { Audio } from '../../systems/Audio';
import { Save } from '../../systems/SaveManager';
import { charFrame } from '../../art/CharacterArt';
import { TaskList } from '../../ui/TaskList';
import { DEFAULT_TERRAIN } from './BaseLevel';
import { T } from '../../art/tiles';
import { plaque, scatter, cliffShadow } from './Scenery';
import type { Player } from '../../entities/Player';

/** Trilhas da linha do tempo: escalada, cânion, Itacolomi, Topo do Mundo (exploração e enigmas). */
export class TrailLevel extends PuzzleLevel {
  cfg!: TrailConfig;
  private collectText: Phaser.GameObjects.Text | null = null;
  private cutscene = false;
  tasks: TaskList | null = null;
  // contadores das tarefas do capítulo
  kills = 0;
  dodges = 0;
  gustsOk = 0;
  climbs = 0;
  rappelsDone = 0;
  photos = 0;
  // acontecimentos dinâmicos
  private eventT = 0;
  gust: { t: number; dir: number; slip: number[]; fx: Phaser.GameObjects.Particles.ParticleEmitter | null } | null = null;
  photoTarget: { img: Phaser.GameObjects.Image; mark: Phaser.GameObjects.Text; taken: boolean } | null = null;

  constructor() {
    super('TrailLevel');
  }

  mapRows(): string[] {
    this.resetPuzzle();
    this.cfg = TRAILS[this.info.id];
    this.cutscene = false;
    this.seats = [];
    this.seated = [];
    this.defaultFloor = this.cfg.floor;
    this.objectFloor = this.cfg.floor;
    this.signTexts = this.cfg.signs;
    this.crystalTex = this.cfg.collect.tex;
    this.crystalName = this.cfg.collect.name;
    this.foe = this.cfg.foe;
    // cenário do capítulo: paredes, paredão e chão próprios (academia, cânion, montanha...)
    this.terrain = { ...DEFAULT_TERRAIN, ...(this.cfg.terrain ?? {}) };
    this.cliffTile = this.cfg.cliff ?? T.CLIFF;
    this.inferObjectFloor = true;
    this.boulderTex = this.cfg.decor === 'gym' ? 'foam_block' : 'boulder';
    this.climbSpots = [];
    this.tasks = null;
    this.kills = this.dodges = this.gustsOk = this.climbs = this.rappelsDone = this.photos = 0;
    this.eventT = { rockfall: 4, swarm: 25, wind: 16, photos: 6 }[this.cfg.event];
    this.gust = null;
    this.photoTarget = null;
    return this.cfg.map;
  }

  spawn(ch: string, tx: number, ty: number): boolean {
    const c = this.tileCenter(tx, ty);
    // no Topo do Mundo as 3 fotos vêm dos parapentes; os cristais do mapa viram moedas
    if (ch === '*' && this.cfg.event === 'photos') { this.addPickup('coin', c.x, c.y); return true; }
    if (ch === 'm') { this.add.image(c.x, c.y + 4, 'mirante').setDepth(c.y - 6); return true; }
    if (ch === 'U' || ch === 'R') this.climbSpots.push({ tx, ty });
    if (ch === 'I') {
      this.add.image(c.x, c.y + 24, 'itacolomi').setOrigin(0.5, 1).setDepth(c.y + 24);
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) this.addSolid(tx + dx, ty + dy);
      return true;
    }
    if (ch === '@') {
      // arco de pedras no alto: a saída fica embaixo dele, com duas pedras para sentar
      this.add.image(c.x, c.y + 8, 'stone_arch').setOrigin(0.5, 1).setDepth(c.y + 9);
      this.seats = [c.x - 9, c.x + 9].map((x) => ({ x, y: c.y + 4 }));
      this.seats.forEach((st) => this.add.image(st.x, st.y + 2, 'stone_seat').setDepth(c.y - 2));
      const img = this.add.image(c.x, c.y - 4, 'exit').setDepth(-4).setAlpha(0.7);
      this.tweens.add({ targets: img, scale: 1.15, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      this.exits.push({ x: c.x, y: c.y, img });
      return true;
    }
    return this.spawnPuzzle(ch, tx, ty);
  }

  /** Pontos de escalada/rapel (para pôr colchões, cordas e magnésio em volta). */
  private climbSpots: { tx: number; ty: number }[] = [];

  /** Enfeites que deixam claro onde o capítulo acontece. */
  private decorate(): void {
    const rows = this.cfg.map;
    for (const p of this.cfg.plaques ?? []) plaque(this, p.tx, p.ty, p.text);
    // sombra embaixo de cada linha de paredão
    rows.forEach((row, y) => {
      let x0 = -1;
      for (let x = 0; x <= row.length; x++) {
        const cliff = x < row.length && (row[x] === '^' || row[x] === 'U' || row[x] === 'R');
        if (cliff && x0 < 0) x0 = x;
        if (!cliff && x0 >= 0) {
          if (!'^UR'.includes(rows[y + 1]?.[x0] ?? '#')) cliffShadow(this, y, x0, x - 1);
          x0 = -1;
        }
      }
    });
    const seed = this.info.id;
    switch (this.cfg.decor) {
      case 'gym': {
        // academia: colchões de queda e magnésio embaixo das vias, bancos e luz do teto
        const r = new Phaser.Math.RandomDataGenerator([seed]);
        for (const s of this.climbSpots) {
          const c = this.tileCenter(s.tx, s.ty + 1);
          this.add.image(c.x, c.y + 2, 'crash_pad').setDepth(-6);
          this.add.image(c.x + 18, c.y - 2, 'chalk_bag').setDepth(c.y);
        }
        rows.forEach((row, y) => {
          if (!row.includes('^')) return;
          for (let x = 3; x < row.length - 3; x += 7) {
            const below = rows[y + 2]?.[x];
            if (below === '.') this.add.ellipse(x * TILE + 8, (y + 3) * TILE, 70, 34, 0xfff7d0, 0.07).setDepth(-8);
          }
          let benches = 0;
          for (let x = 2; x < row.length - 3 && benches < 2; x++) {
            const free = [0, 1].every((d) => rows[y + 1]?.[x + d] === '.' && rows[y + 2]?.[x + d] === '.');
            const nearClimb = this.climbSpots.some((s) => Math.abs(s.tx - x) < 4 && s.ty === y);
            if (free && !nearClimb && r.frac() < 0.12) {
              this.add.image(x * TILE + 16, (y + 1) * TILE + 6, 'gym_bench').setDepth((y + 1) * TILE + 6);
              benches++;
              x += 6;
            }
          }
        });
        break;
      }
      case 'canyon':
        scatter(this, rows, ['rock_small', 'rock_small', 'bromelia'], 0.06, seed);
        break;
      case 'mountain':
        scatter(this, rows, ['rock_small', 'bromelia', 'bromelia'], 0.05, seed);
        break;
      case 'topo': {
        scatter(this, rows, ['bromelia', 'rock_small'], 0.03, seed);
        // rampa de decolagem dos parapentes e a biruta, perto de onde o casal começa
        this.add.image(3 * TILE, 18 * TILE, 'takeoff_ramp').setOrigin(0, 0).setDepth(18 * TILE + 24);
        this.add.image(10 * TILE + 8, 18 * TILE, 'windsock').setOrigin(0.15, 1).setDepth(18 * TILE);
        break;
      }
    }
  }

  /** Pedras do arco onde os dois se sentam no pedido. */
  seats: { x: number; y: number }[] = [];
  private seated: Phaser.GameObjects.Container[] = [];

  /** Desenha um personagem sentado de lado na pedra (tronco do sprite + pernas dobradas). */
  private sitDown(id: 0 | 1, x: number, y: number, faceRight: boolean): Phaser.GameObjects.Container {
    const look = Save.data.looks[id];
    const hex = (h: string) => Phaser.Display.Color.HexStringToColor(h).color;
    const dir = faceRight ? 1 : -1;
    const torso = this.add.image(0, -17, `char_${id}`, charFrame('side', 0)).setOrigin(0.5, 0).setCrop(0, 0, 16, 18).setFlipX(faceRight);
    const legs = this.add.graphics();
    // coxa na horizontal sobre a pedra, canela pendurada e o sapato
    legs.fillStyle(hex(look.pants), 1).fillRect(dir > 0 ? -2 : -5, -2, 7, 3);
    legs.fillStyle(hex(look.pants), 1).fillRect(dir > 0 ? 3 : -5, 0, 2, 4);
    legs.fillStyle(hex(look.shoes), 1).fillRect(dir > 0 ? 3 : -6, 4, 3, 2);
    legs.fillStyle(0x2a1d2e, 1).fillRect(dir > 0 ? -2 : -5, -3, 7, 1).setAlpha(0.25);
    return this.add.container(x, y, [legs, torso]).setDepth(y + 1);
  }

  setup(): void {
    this.enemyColliders();
    this.decorate();
    const W = this.cols * TILE;
    const H = this.rows * TILE;
    switch (this.cfg.ambience) {
      case 'fireflies':
        this.add.particles(0, 0, 'fx_spark', {
          x: { min: 0, max: W }, y: { min: 0, max: H }, lifespan: 3000, speed: { min: 2, max: 8 },
          scale: { start: 0.5, end: 0 }, alpha: { start: 0.8, end: 0 }, frequency: 120, tint: 0xfff1a8,
        }).setDepth(9500);
        break;
      case 'leaves':
      case 'petals':
        this.add.particles(0, -10, this.cfg.ambience === 'leaves' ? 'fx_leaf' : 'fx_heart', {
          x: { min: 0, max: W }, y: { min: 0, max: H }, lifespan: 4000, speedX: { min: 10, max: 25 }, speedY: { min: 5, max: 15 },
          rotate: { min: 0, max: 360 }, alpha: { start: 0.8, end: 0 }, scale: this.cfg.ambience === 'petals' ? 0.5 : 1, frequency: 300,
        }).setDepth(9500);
        break;
      case 'paragliders':
        this.time.addEvent({ delay: 2600, loop: true, callback: () => this.paraglider() });
        this.paraglider();
        break;
    }
  }

  private paraglider(): void {
    const cam = this.cameras.main.worldView;
    const y = cam.y + Phaser.Math.Between(10, 90);
    const fromLeft = Math.random() < 0.6;
    const p = this.add.image(fromLeft ? cam.x - 20 : cam.right + 20, y, 'paraglider').setDepth(9700).setFlipX(!fromLeft);
    this.tweens.add({
      targets: p, x: fromLeft ? cam.right + 40 : cam.x - 40, y: y + Phaser.Math.Between(-15, 25), duration: Phaser.Math.Between(7000, 10000),
      onUpdate: () => { p.angle = Math.sin(this.time.now / 600) * 6; }, onComplete: () => p.destroy(),
    });
  }

  onHudReady(hud: HUDScene): void {
    const g = hud.add.graphics();
    g.fillStyle(0x1b1424, 0.75).fillRoundedRect(GAME_W / 2 - 120, 8, 240, 40, 10);
    hud.add.image(GAME_W / 2 - 92, 28, this.cfg.collect.tex).setScale(2);
    this.collectText = txt(hud, GAME_W / 2 + 10, 28, `0 / 3 ${this.cfg.collect.plural}`, 18, { color: '#ffd6e4' });
    hud.toast(fillNames(this.cfg.intro, this.names), '#fff4e0', 3600);
    this.tasks = new TaskList(hud, 12, 12, this.cfg.tasks.map((t) => ({ ...t, text: fillNames(t.text, this.names) })));
  }

  private refreshCollect(): void {
    this.collectText?.setText(`${this.stats.crystals} / 3 ${this.cfg.collect.plural}`);
    this.tasks?.progress('collect', this.stats.crystals);
  }

  onClimbDone(): void {
    this.climbs++;
    this.tasks?.progress('climb', this.climbs);
  }

  onRappelDone(): void {
    this.rappelsDone++;
    this.tasks?.progress('rappel', this.rappelsDone);
  }

  // ------------------------------------------------------------------ acontecimentos do capítulo
  private updateEvent(dt: number): void {
    if (this.ended) return;
    this.eventT -= dt;
    switch (this.cfg.event) {
      case 'rockfall':
        if (this.eventT <= 0) { this.eventT = Phaser.Math.FloatBetween(3.2, 5.5); this.rockfall(); }
        break;
      case 'swarm':
        if (this.eventT <= 0) { this.eventT = Phaser.Math.Between(30, 40); this.swarm(); }
        break;
      case 'wind':
        if (this.gust) this.updateGust(dt);
        else if (this.eventT <= 0) this.startGust();
        break;
      case 'photos':
        if (this.photoTarget) this.updatePhotoTarget();
        else if (this.eventT <= 0) this.spawnPhotoTarget();
        break;
    }
  }

  /** Escalada: uma pedra solta cai perto de alguém. A sombra no chão avisa onde. */
  private rockfall(): void {
    const alive = this.players.filter((p) => !p.fainted && !p.locked);
    if (!alive.length) return;
    const p = Phaser.Utils.Array.GetRandom(alive);
    const x = p.x + Phaser.Math.Between(-20, 20);
    const y = p.y + Phaser.Math.Between(-14, 14);
    const shadow = this.add.ellipse(x, y + 2, 6, 3, 0x000000, 0.35).setDepth(y - 2);
    this.tweens.add({ targets: shadow, scaleX: 2.2, scaleY: 2.2, alpha: 0.55, duration: 1100 });
    if (Math.random() < 0.35) this.say(p, Phaser.Utils.Array.GetRandom(this.cfg.fallLines ?? ['Pedra!', 'Olha a pedra!', 'Cuidado aí!']), 900);
    const rock = this.add.image(x, y - 140, this.cfg.fallTex ?? 'rock_fall').setDepth(9600);
    this.tweens.add({
      targets: rock, y, delay: 850, duration: 260, ease: 'Quad.In',
      onComplete: () => {
        shadow.destroy();
        rock.destroy();
        this.burst(x, y, 'fx_pixel', 10, { speed: 60, tint: 0x9a98a4 });
        this.sfx('push');
        this.cameras.main.shake(90, 0.004);
        let hit = false;
        for (const q of this.players) {
          if (q.fainted || q.locked) continue;
          const d = Phaser.Math.Distance.Between(q.x, q.y, x, y);
          if (d < 11) { hit = true; this.damagePlayer(q, 1, x, y); }
        }
        if (!hit && this.players.some((q) => !q.fainted && Phaser.Math.Distance.Between(q.x, q.y, x, y) < 48)) {
          this.dodges++;
          this.tasks?.progress('dodge', this.dodges);
          this.hud?.floatText(x, y - 14, 'Ufa!', '#bfe6ff');
        }
      },
    });
  }

  /** Cânion: uma nuvem de borrachudos aparece; a magia dela é o repelente. */
  private swarm(): void {
    const alive = this.players.filter((p) => !p.fainted);
    if (!alive.length || this.enemies.filter((e) => !e.dead).length > 10) return;
    const p = Phaser.Utils.Array.GetRandom(alive);
    this.hud?.toast(`Nuvem de borrachudos! ${this.names[1]}, repelente (MAGIA)! ${this.names[0]}, ESPADA!`, '#ffd6e4', 2600);
    this.sfx('wind');
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.random();
      this.enemies.push(new Slime(this, p.x + Math.cos(a) * 70, p.y + Math.sin(a) * 50, 'mosquito', 1, 46, 160));
    }
  }

  /** Itacolomi: rajada de vento. Quem segurar AÇÃO fica firme; quem soltar é empurrado. */
  private startGust(): void {
    const dir = Math.random() < 0.5 ? -1 : 1;
    this.hud?.toast('Rajada de vento chegando! SEGUREM AÇÃO!', '#bfe6ff', 1800);
    this.sfx('wind');
    this.gust = { t: 4.0, dir, slip: [0, 0], fx: null };
  }

  private updateGust(dt: number): void {
    const g = this.gust!;
    g.t -= dt;
    const blowing = g.t <= 2.6; // 1,4 s de aviso, depois 2,6 s de vento
    if (blowing && !g.fx) {
      const cam = this.cameras.main.worldView;
      // faixas brancas de vento + folhas voando
      g.fx = this.add.particles(0, 0, 'fx_pixel', {
        x: { min: cam.x - 20, max: cam.right + 20 }, y: { min: cam.y, max: cam.bottom }, lifespan: 500,
        speedX: { min: g.dir * 320, max: g.dir * 420 }, scaleX: { min: 5, max: 9 }, scaleY: 0.5, alpha: { start: 0.7, end: 0 }, frequency: 12, tint: 0xffffff,
      }).setDepth(9600);
      const leaves = this.add.particles(0, 0, 'fx_leaf', {
        x: { min: cam.x - 20, max: cam.right + 20 }, y: { min: cam.y, max: cam.bottom }, lifespan: 900,
        speedX: { min: g.dir * 180, max: g.dir * 260 }, speedY: { min: -10, max: 10 }, rotate: { min: 0, max: 360 }, alpha: { start: 0.9, end: 0 }, frequency: 40,
      }).setDepth(9600);
      this.time.delayedCall(2600, () => leaves.destroy());
      this.cameras.main.shake(2600, 0.0015);
      this.hud?.banner(g.dir > 0 ? 'VENTO! >>>' : '<<< VENTO!', 'Segurem AÇÃO para ficar firmes!', 2200);
    }
    this.players.forEach((p, i) => {
      const holding = Input.players[i].action;
      if (!blowing || p.fainted || p.locked) { p.drift = { x: 0, y: 0 }; return; }
      if (holding) { p.drift = { x: 0, y: 0 }; p.actTimer = 0.05; }
      else { p.drift = { x: g.dir * 80, y: 0 }; g.slip[i] += dt; }
    });
    if (g.t <= 0) {
      this.players.forEach((p) => (p.drift = { x: 0, y: 0 }));
      g.fx?.destroy();
      const ok = g.slip.every((s) => s < 0.5);
      if (ok) {
        this.gustsOk++;
        this.tasks?.progress('gusts', this.gustsOk);
        this.say(this.players[1], 'Seguramos firme!', 1400, '#ffd6e4');
      } else this.say(this.players[g.slip[0] >= g.slip[1] ? 0 : 1], 'Uou! Quase voei!', 1400);
      this.gust = null;
      this.eventT = Phaser.Math.Between(16, 22);
    }
  }

  /** Topo do Mundo: um parapente passa bem perto; ela fotografa com a HABILIDADE. */
  private spawnPhotoTarget(): void {
    const cam = this.cameras.main.worldView;
    const fromLeft = Math.random() < 0.5;
    const y = cam.y + Phaser.Math.Between(30, Math.max(40, cam.height / 2));
    const img = this.add.image(fromLeft ? cam.x - 30 : cam.right + 30, y, 'paraglider').setScale(1.6).setDepth(9700).setFlipX(!fromLeft);
    const mark = this.add.text(img.x, y - 26, 'FOTO!', { fontFamily: 'monospace', fontSize: '10px', color: '#ffd25e', stroke: '#2a1d2e', strokeThickness: 3, fontStyle: 'bold' })
      .setOrigin(0.5).setDepth(9701).setResolution(ZOOM * RES + 1);
    this.tweens.add({ targets: mark, alpha: 0.3, yoyo: true, repeat: -1, duration: 260 });
    this.photoTarget = { img, mark, taken: false };
    this.tweens.add({
      targets: img, x: fromLeft ? cam.right + 40 : cam.x - 40, y: y + Phaser.Math.Between(-10, 20), duration: 7000,
      onComplete: () => { img.destroy(); mark.destroy(); this.photoTarget = null; this.eventT = Phaser.Math.Between(6, 10); },
    });
    if (this.photos < 3) this.say(this.players[1], 'Parapente! Prepara a câmera!', 1400, '#ffd6e4');
  }

  private updatePhotoTarget(): void {
    const t = this.photoTarget!;
    t.img.angle = Math.sin(this.time.now / 600) * 6;
    t.mark.setPosition(t.img.x, t.img.y - 26);
  }

  useAbility(p: Player): void {
    const t = this.photoTarget;
    if (p.id === 1 && t && !t.taken && this.cameras.main.worldView.contains(t.img.x, t.img.y)) {
      // a habilidade dela vira a câmera fotográfica
      p.abilityCd = 0.4;
      p.actTimer = 0.25;
      t.taken = true;
      t.mark.setText('CLIQUE!');
      this.cameras.main.flash(160, 255, 255, 255);
      Audio.play('camera');
      if (this.stats.crystals < 3) {
        this.stats.crystals++;
        this.photos++;
        this.refreshCollect();
        this.hud?.floatText(t.img.x, t.img.y - 10, `Foto ${this.stats.crystals}/3!`, '#ffd25e');
      }
      return;
    }
    super.useAbility(p);
  }

  onPickup(p: Parameters<PuzzleLevel['onPickup']>[0], kind: 'coin' | 'heart' | 'crystal'): void {
    super.onPickup(p, kind);
    this.refreshCollect();
  }

  onEnemyKilled(e: Slime): void {
    this.kills++;
    this.tasks?.progress('foes', this.kills);
    if (Math.random() < 0.35) this.addPickup(Math.random() < 0.5 ? 'coin' : 'heart', e.x, e.y);
  }

  tick(dt: number): void {
    if (this.cutscene) return;
    this.updatePuzzle(dt);
    this.updateEvent(dt);
  }

  onExit(): void {
    if (this.cutscene) return;
    this.tasks?.done('finish');
    if (this.gust) { this.players.forEach((p) => (p.drift = { x: 0, y: 0 })); this.gust.fx?.destroy(); this.gust = null; }
    if (this.cfg.ending === 'proposal') this.proposal();
    else if (this.cfg.ending === 'mirante' || this.cfg.ending === 'cachoeira') this.photoMoment();
    else this.complete();
  }

  private complete(extra: string[] = []): void {
    const c = this.stats.crystals;
    const third = this.cfg.parTime ? this.elapsed < this.cfg.parTime : this.stats.faints === 0;
    const stars = 1 + (c >= 3 ? 1 : 0) + (third ? 1 : 0);
    const score = Math.max(0, Math.round(1000 - this.elapsed * 2 + c * 150));
    const mm = Math.floor(this.elapsed / 60);
    const ss = String(Math.floor(this.elapsed % 60)).padStart(2, '0');
    this.finish({
      win: true, stars, score, title: this.cfg.finishTitle,
      lines: [
        ...extra,
        `${this.cfg.collect.plural[0].toUpperCase()}${this.cfg.collect.plural.slice(1)}: ${c}/3 ${c >= 3 ? '(estrela!)' : ''}`,
        this.cfg.parTime ? `Tempo: ${mm}:${ss} ${third ? '(estrela!)' : `(meta: ${Math.floor(this.cfg.parTime / 60)}:00)`}` : `Desmaios: ${this.stats.faints} ${third ? '(estrela!)' : ''}`,
        this.tasks ? this.tasks.summary() : `Tempo: ${mm}:${ss} · Abraços: ${this.stats.hugs}`,
      ].slice(0, 4),
    });
  }

  /** Mirante / cachoeira: os dois param, olham a vista e tiram uma foto. */
  private photoMoment(): void {
    this.cutscene = true;
    this.started = false;
    const [a, b] = this.players;
    a.face = { x: 0, y: -1 };
    b.face = { x: 0, y: -1 };
    Audio.play('camera');
    this.cameras.main.flash(300, 255, 255, 255);
    this.time.delayedCall(400, () => {
      this.say(b, this.cfg.ending === 'mirante' ? 'Olha essa vista, amor!' : 'Finalmente, a Lapinha!', 1800);
      this.time.delayedCall(900, () => this.say(a, 'Mais linda é a companhia.', 1800));
    });
    this.time.delayedCall(2600, () => this.complete([this.cfg.ending === 'mirante' ? 'Foto no mirante: guardada ♥' : 'Banho de cachoeira: garantido ♥']));
  }

  /** Pico do Itacolomi: o pedido de namoro. */
  /** Pedido: ele entrega o resto do poema, os versos aparecem e o último verso é a pergunta. */
  awaitingYes = false;
  private proposal(): void {
    this.cutscene = true;
    this.started = false;
    this.awaitingYes = false;
    const [joao, ju] = this.players;
    // sentam lado a lado nas pedras, embaixo do arco
    if (this.seats.length === 2) {
      this.players.forEach((p, i) => {
        p.teleport(this.seats[i].x, this.seats[i].y);
        p.locked = true;
        p.sprite.setVisible(false);
        p.shadow.setVisible(false);
        p.marker.setVisible(false);
        if (p.held) { p.held.destroy(); p.held = null; }
      });
      this.seated = [this.sitDown(0, this.seats[0].x, this.seats[0].y, true), this.sitDown(1, this.seats[1].x, this.seats[1].y, false)];
      this.cameras.main.flash(250, 255, 255, 255);
    }
    joao.face = { x: Math.sign(ju.x - joao.x) || 1, y: 0 };
    ju.face = { x: -joao.face.x, y: 0 };
    Audio.music('ending');
    const cam = this.cameras.main;
    if (this.seated.length) {
      // câmera no arco: o casal no alto da tela, a folha do poema embaixo
      cam.stopFollow();
      cam.pan((this.seats[0].x + this.seats[1].x) / 2, this.seats[0].y + 24, 1200, 'Sine.easeInOut');
      cam.zoomTo(3 * RES, 1200);
    } else cam.zoomTo(2.6 * RES, 1200);
    const hud = this.hud;
    this.time.delayedCall(1200, () => {
      this.say(joao, 'Lembra do poema incompleto? Trouxe o resto.', 2400);
      // a folha passa das mãos dele para as dela
      const paper = this.add.image(joao.x + joao.face.x * 7, joao.y + 3, 'item_poem').setScale(0.75).setDepth(9000);
      this.tweens.add({ targets: paper, x: ju.x + ju.face.x * 7, y: ju.y + 3, duration: 900, delay: 900, ease: 'Sine.InOut' });
      this.time.delayedCall(2500, () => {
        Audio.play('pick');
        const card = this.poemCard(hud);
        let i = 0;
        const nextVerse = () => {
          if (i < card.verses.length) {
            hud.tweens.add({ targets: card.verses[i++], alpha: 1, duration: 500 });
            Audio.play('blip');
            this.time.delayedCall(1300, nextVerse);
            return;
          }
          // o último verso: a pergunta
          paper.destroy();
          if (this.seated.length) this.tweens.add({ targets: this.seated[0], x: this.seated[0].x + 2, duration: 300, ease: 'Sine.Out' });
          else { joao.actTimer = 999; joao.sprite.setFrame(charFrame('side', 3)); }
          hud.tweens.add({ targets: card.question, alpha: 1, scale: { from: 1.3, to: 1 }, duration: 500, ease: 'Back.Out' });
          this.say(joao, `${this.names[1]}... quer namorar comigo?`, 60000);
          Audio.play('bell');
          const promptText = `${this.names[1]}: aperte ${KEY_LABELS[1].action} para responder`;
          const prompt = this.seated.length
            ? txt(hud, GAME_W / 2, GAME_H - 28 - 18, promptText, 15, { color: '#8a5a8a', stroke: '#fff7e6', strokeW: 0 })
            : txt(hud, GAME_W / 2, GAME_H - 90, promptText, 20, { color: '#ffd6e4' });
          hud.tweens.add({ targets: prompt, alpha: 0.4, yoyo: true, repeat: -1, duration: 500 });
          this.awaitingYes = true;
          const ev = this.time.addEvent({
            delay: 16, loop: true, callback: () => {
              if (!Input.players[1].actionPressed) return;
              ev.remove();
              this.awaitingYes = false;
              prompt.destroy();
              hud.tweens.add({ targets: card.all, alpha: 0, duration: 400, onComplete: () => card.all.forEach((o) => o.destroy()) });
              joao.actTimer = 0;
              hud.clearBubbles();
              // ela pula no abraço
              if (this.seated.length) this.tweens.add({ targets: this.seated[1], y: this.seated[1].y - 4, duration: 160, yoyo: true, repeat: 1 });
              this.say(ju, 'SIM!!! ♥', 3000, '#ffd6e4');
              this.doHug(joao, ju);
              this.fireworks();
              this.time.delayedCall(3200, () => {
                this.cameras.main.zoomTo(ZOOM * RES, 600);
                this.complete(['Poema completo e pedido de namoro: ACEITO ♥']);
              });
            },
          });
        };
        this.time.delayedCall(600, nextVerse);
      });
    });
  }

  /** Folha com o resto do poema, desenhada na interface. */
  private poemCard(hud: HUDScene): { all: Phaser.GameObjects.GameObject[]; verses: Phaser.GameObjects.Text[]; question: Phaser.GameObjects.Text } {
    const w = this.seated.length ? 520 : 600;
    const h = 64 + POEM_REST.length * 26 + 50 + (this.seated.length ? 26 : 0);
    const x = GAME_W / 2 - w / 2;
    const y = this.seated.length ? GAME_H - h - 28 : 24;
    const g = hud.add.graphics();
    g.fillStyle(0x000000, 0.25).fillRoundedRect(x + 5, y + 6, w, h, 10);
    g.fillStyle(0xfff7e6, 1).fillRoundedRect(x, y, w, h, 10);
    g.lineStyle(3, 0xc9a87a, 1).strokeRoundedRect(x, y, w, h, 10);
    for (let k = 0; k < POEM_REST.length + 1; k++) g.lineStyle(1, 0xe8d8c0, 1).lineBetween(x + 24, y + 70 + k * 26, x + w - 24, y + 70 + k * 26);
    const title = txt(hud, GAME_W / 2, y + 26, 'O resto do poema', 20, { color: '#c94a7a', stroke: '#fff7e6', strokeW: 0 });
    const verses = POEM_REST.map((v, k) => txt(hud, GAME_W / 2, y + 58 + k * 26, v, 16, { color: '#3a2a3e', stroke: '#fff7e6', strokeW: 0, bold: false }).setAlpha(0));
    const question = txt(hud, GAME_W / 2, y + 58 + POEM_REST.length * 26 + 16, `${this.names[1]}, quer namorar comigo? ♥`, 22, { color: '#c94a7a', stroke: '#fff7e6', strokeW: 0 }).setAlpha(0);
    const all: Phaser.GameObjects.GameObject[] = [g, title, ...verses, question];
    [g, title].forEach((o) => o.setAlpha(0));
    hud.tweens.add({ targets: [g, title], alpha: 1, duration: 400 });
    return { all, verses, question };
  }

  private fireworks(): void {
    const cam = this.cameras.main.worldView;
    for (let i = 0; i < 10; i++) {
      this.time.delayedCall(i * 260, () => {
        const x = cam.x + Phaser.Math.Between(20, cam.width - 20);
        const y = cam.y + Phaser.Math.Between(10, 60);
        Audio.play('coin');
        this.burst(x, y, i % 2 ? 'fx_heart' : 'fx_spark', 16, { speed: 70, lifespan: 900, tint: [0xff7aa8, 0xffd25e, 0x6cc4ff, 0x8be07a][i % 4] });
      });
    }
  }
}
