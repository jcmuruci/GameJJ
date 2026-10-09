import Phaser from 'phaser';
import { GAME_W, GAME_H } from '../config';
import { LEVELS, UPGRADES, LevelInfo, unlockedCount } from '../data/levels';
import { Save } from '../systems/SaveManager';
import { Input, KEY_LABELS } from '../systems/InputManager';
import { Audio } from '../systems/Audio';
import { txt, panel, fillNames, uiButton } from '../ui/text';
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
    return unlockedCount((id) => !!Save.data.levels[id]?.done);
  }

  create(): void {
    this.drawWorld();
    const unlocked = this.unlockedCount();
    // caminho da linha do tempo
    const g = this.add.graphics();
    for (let i = 0; i < LEVELS.length - 1; i++) {
      const a = LEVELS[i].map;
      const b = LEVELS[i + 1].map;
      const steps = Math.floor(Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y) / 13);
      const soon = LEVELS[i + 1].soon;
      for (let s = 1; s < steps; s++) {
        if (soon && s % 2) continue;
        const t = s / steps;
        const x = a.x + (b.x - a.x) * t;
        const y = a.y + (b.y - a.y) * t - (a.y === b.y ? Math.sin(t * Math.PI) * 12 : 0);
        g.fillStyle(i + 1 < unlocked ? 0xfff4e0 : 0x6a5a7a, 1).fillRect(x - 3, y - 3, 6, 6);
      }
    }
    LEVELS.forEach((l, i) => {
      const open = i < unlocked;
      const { x, y } = l.map;
      if (l.icon) this.add.image(x + 34, y + 4, l.icon.key, 0).setScale(l.icon.scale).setAlpha(l.soon ? 0.45 : 0.95);
      const node = this.add.image(x, y, open ? 'map_node' : 'map_node_locked').setScale(2);
      if (open) this.tweens.add({ targets: node, scale: 2.2, duration: 700, yoyo: true, repeat: -1, delay: i * 90 });
      txt(this, x, y + 26, l.month, 11, { color: l.soon ? '#9a8aaa' : '#ffd25e' });
      txt(this, x, y + 41, l.soon && l.id === 'storm' ? '???' : l.short, 13, { color: open ? '#fff4e0' : '#9a8aaa' });
      if (!l.soon) {
        const rec = Save.data.levels[l.id];
        for (let s = 0; s < 3; s++) this.add.image(x - 14 + s * 14, y - 26, rec && rec.stars > s ? 'ui_star' : 'ui_star_empty').setScale(1.25);
      }
    });

    const riders = [1, 0].map((i) => this.add.sprite(i === 0 ? 5 : -5, i === 0 ? -11 : -13, `char_${i}`, charFrame('side', 0)).setFlipX(true));
    this.moto = this.add.container(0, 0, [...riders, this.add.image(0, 0, 'moto')]).setScale(1.6).setDepth(10);
    this.placeCouple(false);

    // topo: título, lembranças, moedas e estrelas
    const top = this.add.graphics();
    top.fillStyle(0x1b1424, 0.75).fillRoundedRect(GAME_W - 250, 12, 238, 44, 10);
    this.add.image(GAME_W - 226, 34, 'ui_coin').setScale(3);
    this.coinsText = txt(this, GAME_W - 204, 34, '', 20, { origin: [0, 0.5], color: '#ffd25e' });
    this.add.image(GAME_W - 110, 34, 'ui_star').setScale(2);
    const maxStars = LEVELS.filter((l) => !l.soon).length * 3;
    txt(this, GAME_W - 92, 34, `${Save.totalStars}/${maxStars}`, 20, { origin: [0, 0.5] });
    txt(this, 24, 28, 'Nossa Linha do Tempo', 26, { origin: [0, 0.5], color: '#ffd6e4' });
    const rel = Save.data.relics;
    const relics = [rel.medalha ? 'Medalha de São Bento' : '', rel.aliancas ? 'Alianças' : ''].filter(Boolean);
    txt(this, 24, 54, relics.length ? `Lembranças: ${relics.join(' · ')}` : 'Lembranças: complete capítulos para ganhar', 12, { origin: [0, 0.5], color: '#d8c8e8', bold: false });

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
    uiButton(this, 770, GAME_H - 104, `Jogar capítulo (${k[0].action}/${k[1].action})`, () => this.playSelected(), { minW: 300, color: 0xffd25e });
    uiButton(this, 770, GAME_H - 72, `Loja (${k[0].ability}/${k[1].ability})`, () => { if (!this.shop) { Audio.play('confirm'); this.openShop(); } }, { minW: 300 });
    uiButton(this, 770, GAME_H - 40, 'Menu principal (Esc)', () => this.toMenu(), { minW: 300 });
    // tocar/clicar numa fase: seleciona; tocar de novo: joga
    LEVELS.forEach((l, i) => {
      const hit = this.add.zone(l.map.x, l.map.y, 64, 64).setInteractive({ useHandCursor: true });
      hit.on('pointerdown', () => {
        if (this.shop || this.moving || this.leaving) return;
        if (i >= this.unlockedCount()) { Audio.play('wrong'); this.showLocked(l); return; }
        if (i === this.sel) { this.playSelected(); return; }
        this.sel = i;
        Audio.play('select');
        this.placeCouple(true);
        this.refreshInfo();
      });
    });
    this.refreshInfo();
    Audio.music('map');
    this.cameras.main.fadeIn(300, 27, 20, 36);
  }

  /** Mostra no painel por que um capítulo está bloqueado. */
  private showLocked(l: LevelInfo): void {
    this.infoTexts[0].setText(l.soon ? `${l.month}: ${l.name}` : l.name);
    this.infoTexts[1].setText(l.soon ? 'Capítulo futuro' : 'Bloqueado');
    this.infoTexts[2].setText(l.soon ? 'Este capítulo ainda vai ser vivido por vocês. Em breve!' : 'Completem o capítulo anterior para liberar.');
    this.infoTexts[3].setText('');
  }

  private drawWorld(): void {
    this.add.tileSprite(0, 0, GAME_W / 3, GAME_H / 3, 'tiles', 0).setOrigin(0).setScale(3);
    const g = this.add.graphics();
    g.fillStyle(0x1b1424, 0.18).fillRect(0, 0, GAME_W, GAME_H);
    // nuvenzinhas sobre os capítulos futuros
    g.fillStyle(0xffffff, 0.35).fillEllipse(330, 345, 300, 80);
    const r = new Phaser.Math.RandomDataGenerator(['timeline']);
    for (let i = 0; i < 26; i++) {
      const x = r.between(30, 930);
      const y = r.between(70, 400);
      if (LEVELS.some((l) => Math.abs(x - l.map.x) < 75 && Math.abs(y - l.map.y) < 60)) continue;
      this.add.image(x, y, r.pick(['tree_big', 'tree_pink', 'tree_ipe', 'bush', 'bush'])).setScale(1.2).setAlpha(0.9);
    }
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
    this.infoTexts[0].setText(`${l.month} · ${l.name}`);
    this.infoTexts[1].setText(l.subtitle);
    this.infoTexts[2].setText(l.goal);
    this.infoTexts[3].setText(rec?.done ? `Melhor: ${rec.stars} estrela(s)${rec.best ? ` · ${rec.best} pts` : ''}` : l.reward ? `Lembrança ao vencer: ${l.reward === 'medalha' ? 'Medalha de São Bento' : 'Alianças'}` : 'Ainda não concluído');
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
    if (Input.backPressed()) { this.toMenu(); return; }
    if (Input.confirmPressed()) this.playSelected();
  }

  private toMenu(): void {
    if (this.leaving || this.shop) return;
    this.leaving = true;
    Audio.play('back');
    this.scene.start('Menu');
  }

  private playSelected(): void {
    if (this.moving || this.leaving || this.shop) return;
    const l = LEVELS[this.sel];
    Audio.play('confirm');
    this.leaving = true;
    Audio.play('horn');
    this.tweens.add({ targets: this.moto, y: this.moto.y - 10, yoyo: true, duration: 150 });
    this.cameras.main.fadeOut(350, 27, 20, 36);
    this.time.delayedCall(370, () => this.scene.start('Story', { id: l.story, next: l.scene, nextData: { levelId: l.id } }));
  }
}
