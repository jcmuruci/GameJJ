import Phaser from 'phaser';
import { ItemKind } from '../data/recipes';

/** Um item que pode ser carregado, colocado em bancadas ou no chão. */
export class Item {
  readonly container: Phaser.GameObjects.Container;
  private icon: Phaser.GameObjects.Image;
  private contentIcons: Phaser.GameObjects.Image[] = [];
  contents: ItemKind[] = [];
  destroyed = false;

  constructor(public scene: Phaser.Scene, public kind: ItemKind, x = 0, y = 0) {
    this.icon = scene.add.image(0, 0, `item_${kind}`);
    this.container = scene.add.container(x, y, [this.icon]);
    this.container.setDepth(5000);
  }

  get isPlate(): boolean {
    return this.kind === 'plate';
  }

  setKind(kind: ItemKind): void {
    this.kind = kind;
    this.icon.setTexture(`item_${kind}`);
    this.pop();
  }

  addContent(kind: ItemKind): void {
    this.contents.push(kind);
    this.refreshContents();
    this.pop();
  }

  clearContents(): void {
    this.contents = [];
    this.refreshContents();
  }

  private refreshContents(): void {
    this.contentIcons.forEach((c) => c.destroy());
    this.contentIcons = this.contents.map((k, i) => {
      const n = this.contents.length;
      const img = this.scene.add.image((i - (n - 1) / 2) * 6, -3, `item_${k}`).setScale(0.75);
      this.container.add(img);
      return img;
    });
  }

  pop(): void {
    this.scene.tweens.add({ targets: this.container, scaleX: { from: 1.3, to: 1 }, scaleY: { from: 0.7, to: 1 }, duration: 160, ease: 'Back.Out' });
  }

  setPosition(x: number, y: number, depth?: number): void {
    this.container.setPosition(x, y);
    if (depth !== undefined) this.container.setDepth(depth);
  }

  destroy(): void {
    this.destroyed = true;
    this.container.destroy();
  }
}
