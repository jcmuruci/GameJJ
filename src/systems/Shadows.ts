import Phaser from 'phaser';

type Obj = Phaser.GameObjects.Sprite | Phaser.GameObjects.Image;

/**
 * Largura da sombra (em pixels da textura) para cada tipo de objeto que fica de pé no chão.
 * Objetos chatos (tapetes, placas no chão, poças), na água ou voando ficam de fora.
 */
const AUTO: [RegExp, number][] = [
  [/^npc_/, 11],
  [/^(waiter_run|quadrilha)$/, 18],
  [/^slime/, 12],
  [/^(capybara|cow)$/, 17],
  [/^horse$/, 19],
  [/^(goat|ostrich)$/, 12],
  [/^(dog|quero|skater|chicken)$/, 9],
  [/^tree_/, 22],
  [/^bush$/, 13],
  [/^big_rock$/, 60],
  [/^(big_stone|stone_arch)$/, 30],
  [/^itacolomi$/, 46],
  [/^(rock_small|rock_cracked|boulder|log_big|chest|basket|stone_seat)$/, 12],
  [/^step_stone/, 15],
  [/^(sign|lamp_post|ped_light|windsock|lantern)$/, 8],
  [/^(house|farmhouse)$/, 58],
  [/^(bakery|condo|stall|shop_rel|papelaria)$/, 44],
  [/^(cart|table|gym_bench)$/, 22],
  [/^pillar$/, 13],
  [/^mirante$/, 36],
];

interface Follower {
  o: Obj;
  s: Phaser.GameObjects.Image;
  w: number;
}

/** Sombras no chão que acompanham pessoas, bichos e objetos. */
export class Shadows {
  private list: Follower[] = [];

  constructor(private scene: Phaser.Scene) {
    scene.events.on(Phaser.Scenes.Events.POST_UPDATE, this.update, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.events.off(Phaser.Scenes.Events.POST_UPDATE, this.update, this);
      scene.events.off(Phaser.Scenes.Events.ADDED_TO_SCENE, this.onAdded, this);
      this.list = [];
    });
  }

  /** Coloca sombra sozinho em tudo que entrar na cena e estiver na tabela. */
  auto(): this {
    this.scene.events.on(Phaser.Scenes.Events.ADDED_TO_SCENE, this.onAdded, this);
    return this;
  }

  private onAdded(o: Phaser.GameObjects.GameObject): void {
    if (!(o instanceof Phaser.GameObjects.Image || o instanceof Phaser.GameObjects.Sprite)) return;
    const key = o.texture?.key ?? '';
    if (this.list.some((f) => f.o === o)) return;
    const hit = AUTO.find(([re]) => re.test(key));
    if (hit) this.add(o, hit[1]);
  }

  /**
   * Sombra para um objeto. `w` é a largura em pixels da textura (acompanha a escala do objeto).
   * `layer` coloca a sombra na mesma camada do objeto (cenas com câmera de mundo e de interface).
   */
  add(o: Obj, w: number, opts: { layer?: Phaser.GameObjects.Layer; alpha?: number } = {}): Phaser.GameObjects.Image {
    const s = this.scene.add.image(o.x, o.y, 'shadow').setAlpha(opts.alpha ?? 0.26);
    opts.layer?.add(s);
    this.list.push({ o, s, w });
    this.place(this.list[this.list.length - 1]);
    return s;
  }

  private place(f: Follower): void {
    const { o, s } = f;
    const sx = (f.w * Math.abs(o.scaleX)) / 12;
    const bottom = o.y + o.displayHeight * (1 - o.originY);
    s.setPosition(o.x, bottom - 1.5 * Math.abs(o.scaleY))
      .setScale(sx, Phaser.Math.Clamp(sx * 0.55, 1, 2.4) * Math.abs(o.scaleY))
      .setDepth(o.depth - 0.5)
      .setVisible(o.visible && o.alpha > 0.2 && !o.parentContainer && o.angle === 0);
  }

  private update(): void {
    let dead = false;
    for (const f of this.list) {
      if (!f.o.active || !f.o.scene) { f.s.destroy(); dead = true; continue; }
      this.place(f);
    }
    if (dead) this.list = this.list.filter((f) => f.s.active);
  }
}
