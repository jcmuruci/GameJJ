import Phaser from 'phaser';
import { FONT } from '../config';

export interface TxtOpts {
  color?: string;
  stroke?: string;
  strokeW?: number;
  align?: 'left' | 'center' | 'right';
  origin?: [number, number];
  wrap?: number;
  bold?: boolean;
  shadow?: boolean;
  lineSpacing?: number;
}

/** Texto padronizado com fonte pixel e contorno. */
export function txt(scene: Phaser.Scene, x: number, y: number, s: string, size = 16, o: TxtOpts = {}): Phaser.GameObjects.Text {
  const t = scene.add.text(x, y, s, {
    fontFamily: FONT,
    fontSize: `${size}px`,
    fontStyle: o.bold === false ? 'normal' : 'bold',
    color: o.color ?? '#fff4e0',
    stroke: o.stroke ?? '#2a1d2e',
    strokeThickness: o.strokeW ?? Math.max(2, Math.round(size / 5)),
    align: o.align ?? 'center',
    wordWrap: o.wrap ? { width: o.wrap, useAdvancedWrap: true } : undefined,
    lineSpacing: o.lineSpacing ?? 2,
  });
  const [ox, oy] = o.origin ?? [0.5, 0.5];
  t.setOrigin(ox, oy);
  if (o.shadow) t.setShadow(0, 3, '#00000066', 0, true, true);
  return t;
}

/** Painel arredondado em estilo pixel. */
export function panel(scene: Phaser.Scene, x: number, y: number, w: number, h: number, fill = 0x2a1d3a, alpha = 0.92, border = 0xffd6e4): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.fillStyle(0x000000, 0.25);
  g.fillRoundedRect(x + 4, y + 6, w, h, 10);
  g.fillStyle(fill, alpha);
  g.fillRoundedRect(x, y, w, h, 10);
  g.lineStyle(3, border, 1);
  g.strokeRoundedRect(x, y, w, h, 10);
  return g;
}

/** Substitui {p1} e {p2} pelos nomes dos personagens. */
export function fillNames(s: string, names: [string, string]): string {
  return s.replace(/\{p1\}/g, names[0]).replace(/\{p2\}/g, names[1]);
}

/** Botão clicável/tocável em estilo pixel. */
export function uiButton(
  scene: Phaser.Scene, x: number, y: number, label: string, onClick: () => void,
  o: { size?: number; color?: number; textColor?: string; minW?: number } = {},
): Phaser.GameObjects.Container {
  const t = txt(scene, 0, 0, label, o.size ?? 16, { color: o.textColor ?? '#fff4e0' });
  const w = Math.max(o.minW ?? 0, t.width + 28);
  const h = t.height + 12;
  const g = scene.add.graphics();
  const draw = (hover: boolean) => {
    g.clear();
    g.fillStyle(0x000000, 0.3).fillRoundedRect(-w / 2 + 2, -h / 2 + 4, w, h, 9);
    g.fillStyle(hover ? 0x4a3360 : 0x2a1d3a, 0.95).fillRoundedRect(-w / 2, -h / 2, w, h, 9);
    g.lineStyle(2, o.color ?? 0xffd6e4, 1).strokeRoundedRect(-w / 2, -h / 2, w, h, 9);
  };
  draw(false);
  const c = scene.add.container(x, y, [g, t]).setSize(w, h).setDepth(80);
  c.setInteractive({ useHandCursor: true });
  c.on('pointerover', () => draw(true));
  c.on('pointerout', () => draw(false));
  c.on('pointerdown', () => {
    scene.tweens.add({ targets: c, scale: 0.92, yoyo: true, duration: 70 });
    onClick();
  });
  return c;
}
