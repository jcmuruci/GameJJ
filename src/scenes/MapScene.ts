import Phaser from 'phaser';
import { GAME_W, GAME_H } from '../config';
import { LEVELS, UPGRADES, LevelInfo } from '../data/levels';
import { Save } from '../systems/SaveManager';
import { Input, KEY_LABELS } from '../systems/InputManager';
import { Audio } from '../systems/Audio';
import { txt, panel, fillNames } from '../ui/text';
import { MenuList } from '../ui/MenuList';
import { charFrame } from '../art/CharacterArt';

/** Mapa-mundi: escolha de fases e loja de melhorias. */
export class MapScene extends Phaser.Scene {
  private sel = 0;
  private moto!: Phaser.GameObjects.Container;
  private infoTexts: Phaser.GameObjects.Text[] = [];
  private starImgs: Phaser.GameObjects.Image[] = [];
  private shop: MenuList | null = null;
  private shopBox: Phaser.GameObjects.Container | null = null;
  private coinsText!: Phaser.GameObjects.Text;
  private moving = false;
  private leaving = false;

  constructor() {
    super('Map');
  }

  init(data: { select?: string }): void {
    const unlocked = this.unlockedCount();
    const idx = data.select ? LEVELS.findIndex((l) => l.id === data.select) : -1;
    this.sel = idx >= 0 ? Math.min(idx, unlocked - 1) : unlocked - 1;
    this.shop = null;
    this.shopBox = null;
    this.moving = false;
    this.leaving = false;
  }

  unlockedCount(): number {
    let n = 1;
    for (let i = 0; i < LEVELS.length - 1; i++) {
      if (Save.data.levels[LEVELS[i].id]?.done) n = i + 2;
      else break;
    }
    return Math.min(n, LEVELS.length);
  }

  create(): void {
    this.drawWorld();
    const unlocked = this.unlockedCount();
    // caminhos
    const g = this.add.graphics();
    for (let i = 0; i < LEVELS.length - 1; i++) {
      const a = LEVELS[i].map;
      const b = LEVELS[i + 1].map;
      const steps = Math.floor(Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y) / 14);
      for (let s = 1; s < steps; s++) {
        const t = s / steps;
        const x = a.x + (b.x - a.x) * t;
        const y = a.y + (b.y - a.y) * t - Math.sin(t * Math.PI) * 20;
        g.fillStyle(i + 1 < unlocked ? 0xfff4e0 : 0x6a5a7a, 1).fillRect(x - 3, y - 3, 6, 6);
      }
    }
    LEVELS.forEach((l, i) => {
      const open = i < unlocked;
      const node = this.add.image(l.map.x, l.map.y, open ? 'map_node' : 'map_node_locked').setScale(2.4);
      if (open) this.tweens.add({ targets: node, scale: 2.6, duration: 700, yoyo: true, repeat: -1, delay: i * 100 });
      txt(this, l.map.x, l.map.y + 34, l.name, 13, { color: open ? '#fff4e0' : '#9a8aaa' });
      const rec = Save.data.levels[l.id];
      for (let s = 0; s < 3; s++) {
        this.add.image(l.map.x - 18 + s * 18, l.map.y - 32, rec && rec.stars > s ? 'ui_star' : 'ui_star_empty').setScale(1.6);
      }
    });

    const riders = [1, 0].map((i) => this.add.sprite(i === 0 ? 5 : -5, i === 0 ? -11 : -13, `char_${i}`, charFrame('side', 0)).setFlipX(true));
    this.moto = this.add.container(0, 0, [...riders, this.add.image(0, 0, 'moto')]).setScale(1.8).setDepth(10);
    this.placeCouple(false);

    // HUD superior
    const top = this.add.graphics();
    top.fillStyle(0x1b1424, 0.75).fillRoundedRect(GAME_W - 250, 12, 238, 44, 10);
    this.add.image(GAME_W - 226, 34, 'ui_coin').setScale(3);
    this.coinsText = txt(this, GAME_W - 204, 34, '', 20, { origin: [0, 0.5], color: '#ffd25e' });
    this.add.image(GAME_W - 110, 34, 'ui_star').setScale(2);
    txt(this, GAME_W - 92, 34, `${Save.totalStars}/${LEVELS.length * 3}`, 20, { origin: [0, 0.5] });
    txt(this, 24, 30, 'Mapa da Aventura', 28, { origin: [0, 0.5], color: '#ffd6e4' });

    // painel de informação
    panel(this, 20, GAME_H - 132, 560, 116);
    this.infoTexts = [
      txt(this, 40, GAME_H - 110, '', 22, { origin: [0, 0.5], color: '#ffd25e' }),
      txt(this, 40, GAME_H - 82, '', 14, { origin: [0, 0.5], color: '#d8c8e8', bold: false }),
      txt(this, 40, GAME_H - 56, '', 15, { origin: [0, 0.5], bold: false, wrap: 520 }),
      txt(this, 40, GAME_H - 30, '', 13, { origin: [0, 0.5], color: '#ffd6e4', bold: false }),
    ];
    panel(this, 600, GAME_H - 132, 340, 116);
    const k = KEY_LABELS;
    txt(this, 770, GAME_H - 104, `${k[0].action} / ${k[1].action}: jogar fase`, 15);
    txt(this, 770, GAME_H - 74, `${k[0].ability} / ${k[1].ability}: loja de melhorias`, 15);
    txt(this, 770, GAME_H - 44, 'Esc: menu principal', 15);
    this.refreshInfo();
    Audio.music('map');
    this.cameras.main.fadeIn(300, 27, 20, 36);
  }

  private drawWorld(): void {
    this.add.tileSprite(0, 0, GAME_W / 3, GAME_H / 3, 'tiles', 4).setOrigin(0).setScale(3);
    const g = this.add.graphics();
    g.fillStyle(0x7ccf5a, 1);
    g.fillEllipse(480, 300, 900, 520);
    g.fillStyle(0x62b048, 1);
    g.fillEllipse(480, 310, 820, 440);
    g.fillStyle(0x7ccf5a, 1);
    g.fillEllipse(470, 300, 800, 420);
    g.fillStyle(0x9a8a7a, 1).fillTriangle(760, 210, 880, 210, 820, 70);
    g.fillStyle(0xe8e0f4, 1).fillTriangle(800, 120, 840, 120, 820, 70);
    const r = new Phaser.Math.RandomDataGenerator(['map']);
    for (let i = 0; i < 40; i++) {
      const x = r.between(110, 880);
      const y = r.between(110, 520);
      if (LEVELS.some((l) => Math.abs(x - l.map.x) < 80 && y - l.map.y > -60 && y - l.map.y < 90)) continue;
      if (y > 400 || x > 800 || (x < 120 && y > 240 && y < 340)) continue;
      this.add.image(x, y, r.pick(['tree_big', 'tree_big', 'tree_pink', 'bush'])).setScale(1.6);
    }
    // Amazônia: ilha de floresta densa com rio e jacaré
    g.fillStyle(0x2f7a3a, 1).fillEllipse(880, 345, 150, 120);
    g.fillStyle(0x4aa8e8, 1).fillRect(812, 380, 136, 8);
    for (const [x, y] of [[830, 300], [925, 310], [845, 360], [915, 365]]) this.add.image(x, y, 'tree_jungle').setScale(1.3);
    this.add.image(880, 384, 'gator', 0).setScale(1.6);
    this.add.image(60, 300, 'big_rock').setScale(1.1);
    this.add.image(430, 240, 'waterfall', 0).setScale(1.1);
    this.add.image(560, 270, 'waterfall', 0).setScale(0.9);
    this.add.image(690, 350, 'table').setScale(1.8);
    this.add.image(890, 170, 'pillar').setScale(2.4);
  }

  private placeCouple(animate: boolean): void {
    const m = LEVELS[this.sel].map;
    const tx = m.x;
    const ty = m.y - 8;
    if (!animate) { this.moto.setPosition(tx, ty); return; }
    this.moving = true;
    this.moto.scaleX = tx < this.moto.x ? -1.8 : 1.8;
    this.tweens.add({
      targets: this.moto, x: tx, y: ty, duration: 520, ease: 'Sine.InOut',
      onComplete: () => { this.moving = false; this.moto.setAngle(0); },
    });
  }

  private refreshInfo(): void {
    const l: LevelInfo = LEVELS[this.sel];
    const rec = Save.data.levels[l.id];
    this.infoTexts[0].setText(l.name);
    this.infoTexts[1].setText(l.subtitle);
    this.infoTexts[2].setText(l.goal);
    this.infoTexts[3].setText(rec?.done ? `Melhor: ${rec.stars} estrela(s)${rec.best ? ` · ${rec.best} pts` : ''}` : 'Ainda não concluída');
    this.coinsText.setText(String(Save.data.coins));
    this.starImgs.forEach((s) => s.destroy());
  }

  private openShop(): void {
    const box = this.add.container(0, 0).setDepth(50);
    box.add(panel(this, GAME_W / 2 - 340, 70, 680, 400));
    box.add(txt(this, GAME_W / 2, 104, 'Loja da Vovó Rosa', 28, { color: '#ffd6e4' }));
    box.add(txt(this, GAME_W / 2, 136, 'Melhorias permanentes para a dupla', 14, { bold: false, color: '#d8c8e8' }));
    const names: [string, string] = [Save.data.looks[0].name, Save.data.looks[1].name];
    const desc = txt(this, GAME_W / 2, 430, '', 14, { bold: false, wrap: 600 });
    box.add(desc);
    const items = UPGRADES.map((u) => ({
      label: () => {
        const lvl = Save.data.upgrades[u.key];
        const max = u.costs.length;
        const cost = lvl < max ? `${u.costs[lvl]} moedas` : 'MÁXIMO';
        return `${u.name} (${fillNames(u.who, names)})  ${'♥'.repeat(lvl)}${'·'.repeat(max - lvl)}  ${cost}`;
      },
      onSelect: () => {
        const lvl = Save.data.upgrades[u.key];
        if (lvl >= u.costs.length) { Audio.play('wrong'); return; }
        const cost = u.costs[lvl];
        if (Save.data.coins < cost) { Audio.play('wrong'); desc.setText('Moedas insuficientes... joguem mais fases!'); return; }
        Save.data.coins -= cost;
        Save.data.upgrades[u.key]++;
        Save.save();
        Audio.play('coin');
        this.refreshInfo();
        desc.setText(`Comprado: ${u.name}!`);
      },
    }));
    this.shop = new MenuList(this, GAME_W / 2, 190, [...items, { label: 'Voltar', onSelect: () => this.closeShop() }], 46, 17);
    this.shop.texts.forEach((t) => t.setDepth(51));
    this.shop.cursor.setDepth(51);
    this.shopBox = box;
    const upd = () => {
      const i = this.shop?.index ?? 0;
      const u = UPGRADES[i];
      if (u && !desc.text.startsWith('Comprado') && !desc.text.startsWith('Moedas')) desc.setText(u.desc);
    };
    upd();
    this.events.on('shop-move', upd);
  }

  private closeShop(): void {
    this.shop?.destroy();
    this.shopBox?.destroy();
    this.shop = null;
    this.shopBox = null;
    this.events.off('shop-move');
    Audio.play('back');
  }

  update(time: number): void {
    if (this.leaving) return;
    if (this.moving) {
      this.moto.setAngle(Math.sin(time / 50) * 2);
      if (Math.random() < 0.3) {
        const d = this.add.image(this.moto.x - this.moto.scaleX * 18, this.moto.y + 18, 'fx_dust').setScale(2).setDepth(9);
        this.tweens.add({ targets: d, alpha: 0, scale: 4, duration: 400, onComplete: () => d.destroy() });
      }
    }
    if (this.shop) {
      const before = this.shop.index;
      this.shop.update();
      if (this.shop && this.shop.index !== before) this.events.emit('shop-move');
      if (Input.backPressed() || Input.players.some((p) => p.abilityPressed)) this.closeShop();
      return;
    }
    const unlocked = this.unlockedCount();
    if (!this.moving) {
      if (Input.menuRight() || Input.menuUp()) {
        if (this.sel < unlocked - 1) { this.sel++; Audio.play('select'); this.placeCouple(true); this.refreshInfo(); } else Audio.play('wrong');
      } else if (Input.menuLeft() || Input.menuDown()) {
        if (this.sel > 0) { this.sel--; Audio.play('select'); this.placeCouple(true); this.refreshInfo(); } else Audio.play('wrong');
      }
    }
    if (Input.players.some((p) => p.abilityPressed)) { Audio.play('confirm'); this.openShop(); return; }
    if (Input.backPressed()) { Audio.play('back'); this.scene.start('Menu'); return; }
    if (Input.confirmPressed() && !this.moving) {
      const l = LEVELS[this.sel];
      Audio.play('confirm');
      this.leaving = true;
      Audio.play('horn');
      this.tweens.add({ targets: this.moto, y: this.moto.y - 10, yoyo: true, duration: 150 });
      this.cameras.main.fadeOut(350, 27, 20, 36);
      this.time.delayedCall(370, () => this.scene.start('Story', { id: l.story, next: l.scene, nextData: { levelId: l.id } }));
    }
  }
}
