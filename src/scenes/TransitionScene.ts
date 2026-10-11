import Phaser from 'phaser';
import { GAME_W, GAME_H } from '../config';

export type IrisShape = 'circle' | 'heart';

/** Capítulos que terminam num momento do casal: a tela fecha num coração. */
export const HEART_LEVELS = new Set(['itacolomi', 'bread', 'medal', 'italiano']);

/**
 * Cena de transição, sempre por cima de tudo (inclusive do HUD): a tela escurece fechando
 * um círculo (ou um coração) sobre um ponto, troca de cena por baixo e abre de novo.
 */
export class TransitionScene extends Phaser.Scene {
  private rt!: Phaser.GameObjects.RenderTexture;
  private brushes!: Record<IrisShape, Phaser.GameObjects.Image>;
  private busy = false;

  constructor() {
    super('Fx');
  }

  create(): void {
    this.rt = this.add.renderTexture(0, 0, GAME_W, GAME_H).setOrigin(0).setVisible(false);
    this.brushes = {
      circle: this.make.image({ key: 'iris_circle', add: false }),
      heart: this.make.image({ key: 'iris_heart', add: false }),
    };
    this.busy = false;
  }

  /** Fecha a íris sobre (x, y), chama `covered` (que troca de cena) e reabre no centro. */
  run(shape: IrisShape, x: number, y: number, ms: number, covered: () => void): void {
    if (this.busy) { covered(); return; }
    this.busy = true;
    this.scene.bringToTop();
    const brush = this.brushes[shape];
    // raio que cobre a tela inteira a partir do ponto
    const far = (cx: number, cy: number) => Math.max(...[[0, 0], [GAME_W, 0], [0, GAME_H], [GAME_W, GAME_H]].map(([a, b]) => Math.hypot(a - cx, b - cy)));
    const draw = (v: number, cx: number, cy: number) => {
      const rt = this.rt;
      rt.setVisible(true).clear().fill(0x1b1424, 1);
      if (v <= 0.002) return;
      const size = far(cx, cy) * 2.1 * v * (shape === 'heart' ? 1.35 : 1);
      brush.setPosition(cx, cy).setDisplaySize(size, size * (brush.height / brush.width));
      rt.erase(brush);
    };
    this.tweens.addCounter({
      from: 1, to: 0, duration: ms, ease: 'Sine.In',
      onUpdate: (tw) => draw(tw.getValue() ?? 0, x, y),
      onComplete: () => {
        draw(0, x, y);
        covered();
        // espera a cena nova desenhar o primeiro quadro e abre do centro
        this.time.delayedCall(90, () => {
          this.tweens.addCounter({
            from: 0, to: 1, duration: ms * 1.1, ease: 'Sine.Out',
            onUpdate: (tw) => draw(tw.getValue() ?? 1, GAME_W / 2, GAME_H / 2),
            onComplete: () => { this.rt.setVisible(false); this.busy = false; },
          });
        });
      },
    });
  }
}

/**
 * Sai da cena fechando a íris e então chama `then` (normalmente `scene.start`).
 * O ponto de fechamento vem de `irisPoint()` da cena (ex.: o casal), ou o centro da tela.
 */
export function irisOut(from: Phaser.Scene, then: () => void, opts: { shape?: IrisShape; ms?: number } = {}): void {
  const fx = from.scene.get('Fx') as TransitionScene | null;
  if (!fx || !from.scene.isActive('Fx')) {
    // sem a cena de transição (ex.: testes que param todas as cenas): fade simples
    if (fx && !from.scene.isActive('Fx')) from.scene.launch('Fx');
    from.cameras.main.fadeOut(300, 27, 20, 36);
    from.time.delayedCall(320, then);
    return;
  }
  const id = (from as unknown as { info?: { id: string } }).info?.id;
  const shape = opts.shape ?? (id && HEART_LEVELS.has(id) ? 'heart' : 'circle');
  const p = (from as unknown as { irisPoint?: () => { x: number; y: number } }).irisPoint?.() ?? { x: GAME_W / 2, y: GAME_H / 2 };
  fx.run(shape, p.x, p.y, opts.ms ?? 420, then);
}
