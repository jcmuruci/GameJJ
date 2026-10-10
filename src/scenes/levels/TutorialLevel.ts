import { PuzzleLevel } from './PuzzleLevel';
import { TUTORIAL_MAP } from '../../data/maps';
import { Player } from '../../entities/Player';
import { Item } from '../../entities/Item';
import type { HUDScene } from '../HUDScene';
import { GAME_W } from '../../config';
import { txt, fillNames } from '../../ui/text';
import { KEY_LABELS } from '../../systems/InputManager';
import { Audio } from '../../systems/Audio';
import { DEFAULT_TERRAIN } from './BaseLevel';
import { T } from '../../art/tiles';
import { rockTop, cliffShadow, plaque } from './Scenery';

/**
 * Tutorial interativo ao pé da Pedra Grande; o rapel desce do topo da pedra.
 * Legenda extra: < bandeira azul, > bandeira rosa, L tronco, c fogueira, H casa (decoração).
 */

interface Step {
  text: string;
  done: () => boolean;
}

export class TutorialLevel extends PuzzleLevel {
  private step = 0;
  private steps: Step[] = [];
  private stepText: Phaser.GameObjects.Text | null = null;
  private fuel = false;
  private lit = false;
  private hugged = false;
  private flags: { x: number; y: number; id: number }[] = [];
  private logCut = false;

  constructor() {
    super('TutorialLevel');
  }

  mapRows(): string[] {
    this.resetPuzzle();
    this.step = 0;
    this.fuel = false;
    this.lit = false;
    this.hugged = false;
    this.flags = [];
    this.logCut = false;
    // a sala da direita é o topo da Pedra Grande: granito, com a face de rocha para o rapel
    this.terrain = { ...DEFAULT_TERRAIN, '"': T.GRANITE, '|': T.ROCK_FACE, '^': T.ROCK_FACE };
    this.cliffTile = T.ROCK_FACE;
    this.inferObjectFloor = true;
    this.signTexts = ['A Pedra Grande: foi descendo de rapel aqui que {p1} e {p2} se conheceram. Se alguém desmaiar, o outro fica perto e SEGURA AÇÃO para reviver. Nunca deixe seu amor pra trás!'];
    return TUTORIAL_MAP;
  }

  spawn(ch: string, tx: number, ty: number): boolean {
    const c = this.tileCenter(tx, ty);
    switch (ch) {
      case '<':
      case '>': {
        const id = ch === '<' ? 0 : 1;
        this.add.image(c.x, c.y - 4, `flag_${id}`).setDepth(c.y);
        this.flags.push({ x: c.x, y: c.y, id });
        return true;
      }
      case 'H': this.add.image(c.x + 12, c.y + 6, 'big_rock').setDepth(c.y + 30); for (let x = -2; x <= 2; x++) for (let y = -1; y <= 1; y++) this.addSolid(tx + x, ty + y); return true;
      case 'L': {
        const img = this.add.image(c.x, c.y, 'log_big').setDepth(c.y);
        const zone = this.addSolid(tx, ty);
        const it = {
          x: c.x, y: c.y,
          selectable: () => false,
          onStrike: (p: Player) => {
            if (p.id !== 0) return false;
            this.removeInteractable(it);
            img.destroy();
            this.logCut = true;
            this.setSolidEnabled(zone, false);
            this.sfx('chop');
            this.burst(c.x, c.y, 'fx_pixel', 10, { speed: 50, tint: 0xc8915a });
            this.placeFloorItem(new Item(this, 'firewood', c.x, c.y), c.x, c.y);
            return true;
          },
          onMagic: (p: Player) => { this.say(p, 'Magia não corta madeira... é com a espada!', 1800); return true; },
        };
        this.interactables.push(it);
        return true;
      }
      case 'c': {
        const pile = this.add.image(c.x, c.y, 'st_woodpile').setDepth(c.y - 9).setVisible(false);
        const ring = this.add.graphics().setDepth(c.y - 10);
        ring.fillStyle(0x7a7a8a).fillEllipse(c.x, c.y + 3, 16, 8).fillStyle(0x3a2a2a).fillEllipse(c.x, c.y + 3, 10, 4);
        this.addSolid(tx, ty);
        this.interactables.push({
          x: c.x, y: c.y, priority: 2,
          interact: (p: Player) => {
            if (p.held?.kind === 'firewood' && !this.fuel) {
              p.held.destroy();
              p.held = null;
              this.fuel = true;
              pile.setVisible(true);
              this.sfx('drop');
              return true;
            }
            if (!this.fuel) { this.say(p, 'Precisa de lenha...', 1400); return true; }
            return false;
          },
          onMagic: (p: Player) => {
            if (p.id !== 1) return false;
            if (!this.fuel) { this.say(p, 'Sem lenha não pega fogo!', 1400); return true; }
            if (!this.lit) {
              this.lit = true;
              this.add.sprite(c.x, c.y - 2, 'fire', 0).setDepth(c.y + 1).setScale(1.3).play('fire-anim');
              this.sfx('fire');
              this.burst(c.x, c.y, 'fx_spark', 12, { speed: 60 });
            }
            return true;
          },
        });
        return true;
      }
      default:
        return this.spawnPuzzle(ch, tx, ty);
    }
  }

  setup(): void {
    const k = KEY_LABELS;
    this.steps = [
      { text: `Cada um anda até a sua bandeirinha! ({p1}: ${k[0].move} · {p2}: ${k[1].move})`, done: () => this.flags.every((f) => this.dist(this.players[f.id], f) < 16) },
      { text: `{p1}: golpeie o tronco com a ESPADA (${k[0].ability}).`, done: () => this.logCut },
      { text: `Peguem a lenha com AÇÃO (${k[0].action} / ${k[1].action}) e coloquem na fogueira.`, done: () => this.fuel },
      { text: `{p2}: acenda a fogueira com MAGIA (${k[1].ability}). Só a maga faz fogo!`, done: () => this.lit },
      { text: 'Só {p1} tem força para empurrar pedras: leve a pedra até a placa amarela.', done: () => this.gates.some((g) => g.letter === 'A' && g.open) },
      { text: '{p2} pisa na runa rosa para abrir a passagem. {p1} sobe e segura a placa lá em cima da Pedra Grande!', done: () => this.players.every((p) => p.x > 34 * 16) },
      { text: `Abraço! Fiquem juntinhos, mãos vazias, e apertem AÇÃO quase juntos.`, done: () => this.hugged },
      { text: 'No topo da pedrona! Rapel, como no dia em que se conheceram: um SEGURA AÇÃO na ancoragem e o outro aperta AÇÃO na corda.', done: () => this.players.every((p) => p.y > 11 * 16) },
      { text: 'Perfeito! Agora pisem juntos no coração para terminar.', done: () => false },
    ];
    if (!this.anims.exists('fire-anim')) this.anims.create({ key: 'fire-anim', frames: this.anims.generateFrameNumbers('fire', { start: 0, end: 1 }), frameRate: 8, repeat: -1 });
    // o topo da Pedra Grande, de onde sai o rapel
    rockTop(this, 34, 1, 42, 8, 'pedra-grande');
    cliffShadow(this, 10, 33, 42);
    plaque(this, 37, 1, 'PEDRA GRANDE');
  }

  onHudReady(hud: HUDScene): void {
    const g = hud.add.graphics();
    g.fillStyle(0x1b1424, 0.8).fillRoundedRect(GAME_W / 2 - 360, 8, 720, 64, 12);
    g.lineStyle(2, 0xffd6e4, 1).strokeRoundedRect(GAME_W / 2 - 360, 8, 720, 64, 12);
    txt(hud, GAME_W / 2 - 340, 22, 'TUTORIAL', 12, { origin: [0, 0.5], color: '#ffd25e' });
    this.stepText = txt(hud, GAME_W / 2, 44, '', 17, { wrap: 680 });
    this.showStep();
  }

  private showStep(): void {
    if (!this.stepText) return;
    const s = this.steps[this.step];
    this.stepText.setText(`${this.step + 1}/${this.steps.length} · ${fillNames(s.text, this.names)}`);
    this.hud.tweens.add({ targets: this.stepText, scale: { from: 1.15, to: 1 }, duration: 250, ease: 'Back.Out' });
  }

  onHug(): void {
    this.hugged = true;
  }

  tick(dt: number): void {
    this.updatePuzzle(dt);
    // o portão entre o quintal e a área da pedra abre depois da fogueira
    this.gates.filter((g) => g.letter === 'M').forEach((g) => { g.forced = this.lit; });
    const s = this.steps[this.step];
    if (s && s.done() && this.step < this.steps.length - 1) {
      this.step++;
      Audio.play('confirm');
      this.hud?.floatText((this.players[0].x + this.players[1].x) / 2, this.players[0].y - 30, 'Muito bem!', '#8be07a');
      this.showStep();
    }
  }

  onExit(): void {
    if (this.step < this.steps.length - 1) {
      this.say(this.players[0], 'Falta terminar o treino!', 1500);
      return;
    }
    this.finish({ win: true, stars: 3, score: 0, title: 'Treino completo!', lines: ['Vocês já sabem tudo o que precisam.', `Abraços: ${this.stats.hugs}`, 'Agora... rumo ao piquenique!'] });
  }
}
