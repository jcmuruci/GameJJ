import Phaser from 'phaser';

type Anchor = { x: number; y: number; active?: boolean };

export interface Light {
  /** Desligada: não ilumina (ex.: farol apagado). */
  on: boolean;
  r: number;
  dx: number;
  dy: number;
  readonly anchor: Anchor | (() => { x: number; y: number });
  readonly cone: boolean;
  readonly flicker: number;
  readonly glow: Phaser.GameObjects.Image | null;
}

/**
 * Noite de verdade: uma camada escura do tamanho da cena da qual as luzes são "apagadas"
 * (farol, postes, fogueira...), com um brilho quente por cima. Funciona no WebGL e no Canvas.
 */
export class Darkness {
  readonly rt: Phaser.GameObjects.RenderTexture;
  private lights: Light[] = [];
  private soft: Phaser.GameObjects.Image;
  private cone: Phaser.GameObjects.Image;
  private t = 0;

  constructor(private scene: Phaser.Scene, w: number, h: number, private opts: { color: number; alpha: number; depth: number; layer?: Phaser.GameObjects.Layer }) {
    this.rt = scene.add.renderTexture(0, 0, w, h).setOrigin(0).setDepth(opts.depth);
    opts.layer?.add(this.rt);
    this.soft = scene.make.image({ key: 'light_soft', add: false });
    this.cone = scene.make.image({ key: 'light_cone', add: false }).setOrigin(0, 0.5);
    scene.events.on(Phaser.Scenes.Events.POST_UPDATE, this.update, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.events.off(Phaser.Scenes.Events.POST_UPDATE, this.update, this);
      this.soft.destroy();
      this.cone.destroy();
    });
    this.update(0, 0);
  }

  /**
   * Luz presa a um objeto (ou a uma função de posição). `r` é o raio em pixels da cena.
   * `cone` usa o facho do farol (abre para a direita). `glow` acrescenta um brilho colorido.
   */
  add(anchor: Light['anchor'], r: number, o: { cone?: boolean; flicker?: number; glow?: number; glowAlpha?: number; dx?: number; dy?: number } = {}): Light {
    let glow: Phaser.GameObjects.Image | null = null;
    if (o.glow !== undefined) {
      glow = this.scene.add.image(0, 0, o.cone ? 'light_cone' : 'light_soft').setTint(o.glow).setAlpha(o.glowAlpha ?? 0.2)
        .setBlendMode(Phaser.BlendModes.ADD).setDepth(this.opts.depth + 1);
      if (o.cone) glow.setOrigin(0, 0.5);
      this.opts.layer?.add(glow);
    }
    const l: Light = { on: true, r, dx: o.dx ?? 0, dy: o.dy ?? 0, anchor, cone: !!o.cone, flicker: o.flicker ?? 0, glow };
    this.lights.push(l);
    return l;
  }

  private pos(l: Light): { x: number; y: number } | null {
    if (typeof l.anchor === 'function') return l.anchor();
    if (l.anchor.active === false) return null;
    return l.anchor;
  }

  private update(_time: number, delta: number): void {
    this.t += delta / 1000;
    const rt = this.rt;
    rt.clear();
    rt.fill(this.opts.color, this.opts.alpha);
    this.lights = this.lights.filter((l) => {
      const p = this.pos(l);
      if (!p) { l.glow?.destroy(); return false; }
      const visible = l.on;
      l.glow?.setVisible(visible);
      if (!visible) return true;
      const k = 1 + (l.flicker ? (Math.sin(this.t * 9 + l.r) * 0.5 + Math.sin(this.t * 23) * 0.5) * l.flicker : 0);
      const x = p.x + l.dx;
      const y = p.y + l.dy;
      const brush = l.cone ? this.cone : this.soft;
      const sx = l.cone ? (l.r * k) / 96 : (l.r * 2 * k) / 128;
      const sy = l.cone ? (l.r * 0.48 * k) / 56 : sx;
      brush.setPosition(x, y).setScale(sx, sy);
      rt.erase(brush);
      l.glow?.setPosition(x, y).setScale(sx, sy);
      return true;
    });
  }
}
