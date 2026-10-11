import Phaser from 'phaser';
import { TILE, GAME_W, GAME_H, ZOOM } from '../config';
import { T } from '../art/tiles';
import { SWAY_KEYS } from '../art/TexturesSky';
import type { BaseLevel } from '../scenes/levels/BaseLevel';

/** Fases ao ar livre (as de interior ficam sem nuvens nem bichinhos). */
const OUTDOOR = new Set(['tutorial', 'canyon', 'itacolomi', 'topo', 'lapinha', 'farm', 'amazon']);
/** Onde tem borboleta (campo e flores). */
const BUTTERFLIES = new Set(['tutorial', 'itacolomi', 'topo', 'lapinha', 'farm', 'canyon']);

/**
 * Vida no cenário das fases de mapa: sombras de nuvem passando, árvores balançando com o
 * vento, borboletas, um bando de passarinhos de vez em quando e brilhos na água.
 */
export class Ambience {
  private sway: Phaser.GameObjects.Image[] = [];
  private clouds: Phaser.GameObjects.Image[] = [];
  private butterflies: Phaser.GameObjects.Sprite[] = [];
  private t = 0;
  private birdT = 8;
  private wind: [number, number] = [7, 2.5];

  /** Criado antes dos objetos da fase, para pegar as árvores que nascem no mapa. */
  constructor(private L: BaseLevel) {
    L.events.on(Phaser.Scenes.Events.ADDED_TO_SCENE, this.onAdded, this);
    L.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      L.events.off(Phaser.Scenes.Events.ADDED_TO_SCENE, this.onAdded, this);
      L.events.off(Phaser.Scenes.Events.UPDATE, this.update, this);
    });
  }

  private onAdded(o: Phaser.GameObjects.GameObject): void {
    if (o instanceof Phaser.GameObjects.Image && SWAY_KEYS.includes(o.texture.key)) this.sway.push(o);
  }

  /** Começa depois que o mapa e o chão estão prontos. */
  start(): void {
    const L = this.L;
    const id = L.info.id;
    if (id === 'storm') this.wind = [22, 6]; // só as árvores (lá não tem sombra de nuvem)
    L.events.on(Phaser.Scenes.Events.UPDATE, this.update, this);
    if (!OUTDOOR.has(id)) return;
    const W = L.cols * TILE;
    const H = L.rows * TILE;
    // sombras de nuvem atravessando o mapa devagar (só sobre o chão)
    for (let i = 0; i < 3; i++) {
      const c = L.add.image(Phaser.Math.Between(0, W), Phaser.Math.Between(0, H), 'cloud_shadow')
        .setScale(Phaser.Math.FloatBetween(2.2, 3.4)).setAlpha(0.075).setDepth(-1);
      this.clouds.push(c);
    }
    if (BUTTERFLIES.has(id)) {
      for (let i = 0; i < 4; i++) {
        const b = L.add.sprite(0, 0, 'butterfly', 0).play({ key: 'butterfly-fly', startFrame: i % 2 }).setDepth(5000);
        this.butterflies.push(b);
        this.placeNearView(b);
        this.flutter(b);
      }
    }
    this.glints();
  }

  private view(): Phaser.Geom.Rectangle {
    return this.L.cameras.main.worldView;
  }

  private placeNearView(b: Phaser.GameObjects.Sprite): void {
    const v = this.view();
    const w = v.width || GAME_W / ZOOM;
    const h = v.height || GAME_H / ZOOM;
    b.setPosition(v.x + Phaser.Math.FloatBetween(0.1, 0.9) * w, v.y + Phaser.Math.FloatBetween(0.15, 0.85) * h);
  }

  /** Voo em zigue-zague de borboleta: pequenos trechos com pausas. */
  private flutter(b: Phaser.GameObjects.Sprite): void {
    if (!b.active) return;
    const v = this.view();
    if (!Phaser.Geom.Rectangle.Contains(Phaser.Geom.Rectangle.Inflate(Phaser.Geom.Rectangle.Clone(v), 60, 60), b.x, b.y)) this.placeNearView(b);
    const tx = b.x + Phaser.Math.Between(-40, 40);
    const ty = b.y + Phaser.Math.Between(-26, 26);
    b.setFlipX(tx > b.x);
    this.L.tweens.add({
      targets: b, x: tx, y: ty, duration: Phaser.Math.Between(900, 1800), ease: 'Sine.InOut',
      onComplete: () => this.L.time.delayedCall(Phaser.Math.Between(100, 900), () => this.flutter(b)),
    });
  }

  /** Brilhos de sol piscando sobre a água. */
  private glints(): void {
    const L = this.L;
    const water: [number, number][] = [];
    L.layer.forEachTile((t) => { if (t.index === T.WATER) water.push([t.x, t.y]); });
    if (!water.length) return;
    const n = Math.min(20, Math.ceil(water.length / 10));
    for (let i = 0; i < n; i++) {
      const g = L.add.image(0, 0, 'fx_spark').setScale(0.45).setAlpha(0).setDepth(-9);
      const move = () => {
        const [tx, ty] = Phaser.Utils.Array.GetRandom(water);
        g.setPosition(tx * TILE + Phaser.Math.Between(2, 14), ty * TILE + Phaser.Math.Between(2, 14));
      };
      move();
      L.tweens.add({
        targets: g, alpha: { from: 0, to: 0.9 }, duration: 380, yoyo: true, hold: 120,
        delay: Phaser.Math.Between(0, 3000), repeat: -1, repeatDelay: Phaser.Math.Between(1200, 3200), onRepeat: move,
      });
    }
  }

  /** Bando de três passarinhos cruzando a tela pelo alto. */
  private birds(): void {
    const L = this.L;
    const v = this.view();
    const fromLeft = Math.random() < 0.5;
    const y0 = v.y + Phaser.Math.Between(16, Math.max(20, v.height * 0.4));
    for (let i = 0; i < 3; i++) {
      const x0 = fromLeft ? v.x - 20 - i * 10 : v.right + 20 + i * 10;
      const b = L.add.sprite(x0, y0 + (i === 1 ? -6 : i * 4), 'bird', i % 2).play({ key: 'bird-fly', startFrame: i % 2 })
        .setDepth(9600).setFlipX(!fromLeft);
      L.tweens.add({
        targets: b, x: fromLeft ? v.right + 40 : v.x - 40, y: b.y - Phaser.Math.Between(10, 30),
        duration: Phaser.Math.Between(5000, 6500), onComplete: () => b.destroy(),
      });
    }
  }

  private update(_time: number, delta: number): void {
    const dt = Math.min(delta / 1000, 0.05);
    this.t += dt;
    const L = this.L;
    // árvores: ondas de vento atravessando o mapa
    if (this.sway.length) {
      this.sway = this.sway.filter((o) => o.active);
      const strong = this.wind[0] > 15;
      for (const o of this.sway) {
        const base = o.texture.key.replace(/_sway$/, '');
        const on = Math.sin(this.t * (strong ? 3.2 : 1.7) - o.x * 0.025 - o.y * 0.01) > (strong ? 0.1 : 0.55);
        const key = on ? `${base}_sway` : base;
        if (o.texture.key !== key) o.setTexture(key);
      }
    }
    if (!this.clouds.length) return;
    const W = L.cols * TILE;
    const H = L.rows * TILE;
    for (const c of this.clouds) {
      c.x += this.wind[0] * dt;
      c.y += this.wind[1] * dt;
      if (c.x - c.displayWidth / 2 > W) c.x = -c.displayWidth / 2;
      if (c.y - c.displayHeight / 2 > H) c.y = -c.displayHeight / 2;
    }
    this.birdT -= dt;
    if (this.birdT <= 0) { this.birdT = Phaser.Math.Between(14, 24); this.birds(); }
  }
}
