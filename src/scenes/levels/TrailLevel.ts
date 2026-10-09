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
import { charFrame } from '../../art/CharacterArt';

/** Trilhas da linha do tempo: escalada, cânion, Itacolomi, Topo do Mundo (exploração e enigmas). */
export class TrailLevel extends PuzzleLevel {
  cfg!: TrailConfig;
  private collectText: Phaser.GameObjects.Text | null = null;
  private cutscene = false;

  constructor() {
    super('TrailLevel');
  }

  mapRows(): string[] {
    this.resetPuzzle();
    this.cfg = TRAILS[this.info.id];
    this.cutscene = false;
    this.defaultFloor = this.cfg.floor;
    this.objectFloor = this.cfg.floor;
    this.signTexts = this.cfg.signs;
    this.crystalTex = this.cfg.collect.tex;
    this.crystalName = this.cfg.collect.name;
    return this.cfg.map;
  }

  spawn(ch: string, tx: number, ty: number): boolean {
    const c = this.tileCenter(tx, ty);
    if (ch === 'm') { this.add.image(c.x, c.y + 4, 'mirante').setDepth(c.y - 6); return true; }
    if (ch === 'I') {
      this.add.image(c.x, c.y + 24, 'itacolomi').setOrigin(0.5, 1).setDepth(c.y + 24);
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) this.addSolid(tx + dx, ty + dy);
      return true;
    }
    return this.spawnPuzzle(ch, tx, ty);
  }

  setup(): void {
    this.enemyColliders();
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
  }

  onPickup(p: Parameters<PuzzleLevel['onPickup']>[0], kind: 'coin' | 'heart' | 'crystal'): void {
    super.onPickup(p, kind);
    this.collectText?.setText(`${this.stats.crystals} / 3 ${this.cfg.collect.plural}`);
  }

  onEnemyKilled(e: Slime): void {
    if (Math.random() < 0.35) this.addPickup(Math.random() < 0.5 ? 'coin' : 'heart', e.x, e.y);
  }

  tick(dt: number): void {
    if (!this.cutscene) this.updatePuzzle(dt);
  }

  onExit(): void {
    if (this.cutscene) return;
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
        `Tempo: ${mm}:${ss} · Abraços: ${this.stats.hugs}`,
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
    joao.face = { x: Math.sign(ju.x - joao.x) || 1, y: 0 };
    ju.face = { x: -joao.face.x, y: 0 };
    Audio.music('ending');
    this.cameras.main.zoomTo(2.6 * RES, 1200);
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
          joao.actTimer = 999; // ajoelhado
          joao.sprite.setFrame(charFrame('side', 3));
          hud.tweens.add({ targets: card.question, alpha: 1, scale: { from: 1.3, to: 1 }, duration: 500, ease: 'Back.Out' });
          this.say(joao, `${this.names[1]}... quer namorar comigo?`, 60000);
          Audio.play('bell');
          const prompt = txt(hud, GAME_W / 2, GAME_H - 90, `${this.names[1]}: aperte ${KEY_LABELS[1].action} para responder`, 20, { color: '#ffd6e4' });
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
    const w = 600;
    const h = 64 + POEM_REST.length * 26 + 50;
    const x = GAME_W / 2 - w / 2;
    const y = 24;
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
