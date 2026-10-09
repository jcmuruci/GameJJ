import { PuzzleLevel } from './PuzzleLevel';
import { FOREST_MAP } from '../../data/maps';
import { T } from '../../art/Textures';
import type { HUDScene } from '../HUDScene';
import { GAME_W } from '../../config';
import { txt } from '../../ui/text';
import { Slime } from '../../entities/Enemy';

/**
 * Floresta Sussurrante — exploração e enigmas.
 * Legenda: O pedra · 1-4/7/8 placas · 5/6 runas · A-F portões · G portões das alavancas · l alavanca
 *          T espinhos · K pedra rachada · * cristal · $ moeda · v coração · s geleca · i placa de aviso · X saída
 */

export class ForestLevel extends PuzzleLevel {
  private crystalText: Phaser.GameObjects.Text | null = null;

  constructor() {
    super('ForestLevel');
  }

  mapRows(): string[] {
    this.resetPuzzle();
    this.defaultFloor = T.DARK_GRASS;
    this.objectFloor = T.DARK_GRASS;
    this.signTexts = [
      'Espinhos no caminho? A MAGIA de {p2} queima! Pedras rachadas? A ESPADA de {p1} quebra!',
      'Placa amarela: segura o portão aberto só enquanto alguém (ou algo) estiver em cima.',
      'Pedras grandes podem ficar em cima de placas para sempre. Só {p1} consegue empurrar!',
      'Runas rosas só respondem a {p2}. Alavancas gêmeas: puxem JUNTOS! Contem: 3, 2, 1...',
      'A saída! Pisem juntos no coração.',
    ];
    return FOREST_MAP;
  }

  spawn(ch: string, tx: number, ty: number): boolean {
    return this.spawnPuzzle(ch, tx, ty);
  }

  setup(): void {
    if (!this.anims.exists('fire-anim')) this.anims.create({ key: 'fire-anim', frames: this.anims.generateFrameNumbers('fire', { start: 0, end: 1 }), frameRate: 8, repeat: -1 });
    this.enemyColliders();
    // vaga-lumes para atmosfera
    this.add.particles(0, 0, 'fx_spark', {
      x: { min: 0, max: this.cols * 16 }, y: { min: 0, max: this.rows * 16 }, lifespan: 3000, speed: { min: 2, max: 8 },
      scale: { start: 0.5, end: 0 }, alpha: { start: 0.8, end: 0 }, frequency: 120, tint: 0xfff1a8,
    }).setDepth(9500);
  }

  onHudReady(hud: HUDScene): void {
    const g = hud.add.graphics();
    g.fillStyle(0x1b1424, 0.75).fillRoundedRect(GAME_W / 2 - 110, 8, 220, 40, 10);
    hud.add.image(GAME_W / 2 - 80, 28, 'item_crystal').setScale(2);
    this.crystalText = txt(hud, GAME_W / 2 + 10, 28, '0 / 3 cristais', 18, { color: '#ffd6e4' });
    hud.toast('Atravessem a floresta juntos! Leiam as placas (AÇÃO).', '#fff4e0', 3000);
  }

  onPickup(p: Parameters<PuzzleLevel['onPickup']>[0], kind: 'coin' | 'heart' | 'crystal'): void {
    super.onPickup(p, kind);
    this.crystalText?.setText(`${this.stats.crystals} / 3 cristais`);
  }

  onEnemyKilled(e: Slime): void {
    if (Math.random() < 0.35) this.addPickup(Math.random() < 0.5 ? 'coin' : 'heart', e.x, e.y);
  }

  tick(dt: number): void {
    this.updatePuzzle(dt);
  }

  onExit(): void {
    const crystals = this.stats.crystals;
    const stars = 1 + (crystals >= 3 ? 1 : 0) + (this.stats.faints === 0 ? 1 : 0);
    const score = Math.max(0, Math.round(1000 - this.elapsed * 2 + crystals * 150));
    const mm = Math.floor(this.elapsed / 60);
    const ss = String(Math.floor(this.elapsed % 60)).padStart(2, '0');
    this.finish({
      win: true, stars, score, title: 'Saíram da floresta!',
      lines: [
        `Cristais: ${crystals}/3 ${crystals >= 3 ? '(estrela!)' : ''}`,
        `Desmaios: ${this.stats.faints} ${this.stats.faints === 0 ? '(estrela!)' : ''}`,
        `Tempo: ${mm}:${ss} · Abraços: ${this.stats.hugs}`,
      ],
    });
  }
}
