import Phaser from 'phaser';
import { GAME_W, GAME_H } from '../config';
import { txt, panel } from '../ui/text';
import { MenuList } from '../ui/MenuList';
import { Input } from '../systems/InputManager';
import { Audio } from '../systems/Audio';
import { Save } from '../systems/SaveManager';
import { controlsPanel } from '../ui/controlsPanel';
import { charFrame } from '../art/CharacterArt';

/** Desenha um fundo aconchegante de grama com árvores (usado em várias telas). */
export function cozyBackground(scene: Phaser.Scene, tint = 0xffffff): void {
  scene.add.tileSprite(0, 0, GAME_W / 3, GAME_H / 3, 'tiles', 0).setOrigin(0).setScale(3).setTint(tint);
  const r = new Phaser.Math.RandomDataGenerator(['bg']);
  for (let i = 0; i < 26; i++) {
    const x = r.between(0, GAME_W);
    const y = r.between(0, GAME_H);
    scene.add.image(x, y, 'tiles', r.pick([1, 2, 1])).setScale(3).setTint(tint);
  }
  const trees: [number, number, string][] = [[60, 90, 'tree_big'], [150, 470, 'tree_pink'], [880, 120, 'tree_pink'], [820, 480, 'tree_big'], [40, 330, 'tree_big'], [930, 330, 'tree_big']];
  trees.forEach(([x, y, k]) => scene.add.image(x, y, k).setScale(3).setTint(tint));
}

export class MenuScene extends Phaser.Scene {
  private list!: MenuList;
  private sub: MenuList | null = null;
  private overlay: Phaser.GameObjects.Container | null = null;
  private chars: Phaser.GameObjects.Sprite[] = [];
  private confirmReset = false;

  constructor() {
    super('Menu');
  }

  create(): void {
    this.sub = null;
    this.overlay = null;
    this.confirmReset = false;
    cozyBackground(this);
    const vignette = this.add.graphics();
    vignette.fillStyle(0x1b1424, 0.35).fillRect(0, 0, GAME_W, GAME_H);

    // título
    const title = txt(this, GAME_W / 2, 92, 'Juntos', 96, { color: '#ffd6e4', strokeW: 10, shadow: true });
    this.tweens.add({ targets: title, y: 100, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    txt(this, GAME_W / 2, 162, 'uma aventura a dois', 26, { color: '#fff4e0', strokeW: 6 });
    const n = Save.data.looks;
    txt(this, GAME_W / 2, 196, `${n[0].name} ♥ ${n[1].name}`, 18, { color: '#ffd25e' });

    // personagens
    this.chars = [0, 1].map((i) => {
      const s = this.add.sprite(i === 0 ? 210 : 750, 360, `char_${i}`, charFrame('side', 0)).setScale(6);
      s.setFlipX(i === 0);
      return s;
    });
    this.time.addEvent({ delay: 900, loop: true, callback: () => this.heart() });

    this.list = new MenuList(this, GAME_W / 2, 270, [
      { label: 'Jogar', onSelect: () => this.play() },
      { label: 'Personagens', onSelect: () => this.scene.start('Customize') },
      { label: 'Como jogar', onSelect: () => this.showControls() },
      { label: 'Opções', onSelect: () => this.showOptions() },
    ]);
    txt(this, GAME_W / 2, GAME_H - 22, 'Jogador 1: WASD + F/G   ·   Jogador 2: Setas + K/L   ·   Controles também funcionam', 13, { color: '#e8d8f0', bold: false });
    Audio.music('menu');
    this.cameras.main.fadeIn(300, 27, 20, 36);
  }

  private heart(): void {
    const h = this.add.image(GAME_W / 2 + Phaser.Math.Between(-200, 200), 400, 'fx_heart').setScale(3).setAlpha(0.9);
    this.tweens.add({ targets: h, y: 300, alpha: 0, duration: 2200, onComplete: () => h.destroy() });
  }

  private play(): void {
    this.cameras.main.fadeOut(300, 27, 20, 36);
    this.time.delayedCall(320, () => {
      if (!Save.data.seenIntro) {
        Save.data.seenIntro = true;
        Save.save();
        this.scene.start('Story', { id: 'intro', next: 'Map' });
      } else this.scene.start('Map');
    });
  }

  private showControls(): void {
    this.list.setVisible(false);
    this.overlay = controlsPanel(this);
  }

  private showOptions(): void {
    this.list.setVisible(false);
    const s = Save.data.settings;
    const c = this.add.container(0, 0);
    c.add(panel(this, GAME_W / 2 - 300, 220, 600, 300));
    this.overlay = c;
    const pct = (v: number) => `${Math.round(v * 100)}%`;
    const setVol = (k: 'music' | 'sfx', d: number) => {
      s[k] = Math.round(Math.max(0, Math.min(1, s[k] + d)) * 10) / 10;
      Audio.setVolumes(s.music, s.sfx);
      Save.save();
    };
    this.sub = new MenuList(this, GAME_W / 2, 262, [
      { label: () => `Música: < ${pct(s.music)} >`, onLeft: () => setVol('music', -0.1), onRight: () => setVol('music', 0.1) },
      { label: () => `Efeitos: < ${pct(s.sfx)} >`, onLeft: () => setVol('sfx', -0.1), onRight: () => setVol('sfx', 0.1) },
      {
        label: () => `Controle único vai para: < Jogador ${s.padSwap ? 2 : 1} >`,
        onLeft: () => { s.padSwap = !s.padSwap; Input.padSwap = s.padSwap; Save.save(); },
        onRight: () => { s.padSwap = !s.padSwap; Input.padSwap = s.padSwap; Save.save(); },
      },
      {
        label: () => (this.confirmReset ? 'Tem certeza? Aperte de novo' : 'Apagar progresso'),
        onSelect: () => {
          if (this.confirmReset) { Save.reset(); this.confirmReset = false; Audio.play('back'); }
          else this.confirmReset = true;
        },
      },
      { label: 'Voltar', onSelect: () => this.closeOverlay() },
    ], 48, 20);
    c.add(txt(this, GAME_W / 2, 500, `Controles conectados: ${Input.connectedPads}`, 13, { bold: false, color: '#d8c8e8' }));
  }

  private closeOverlay(): void {
    this.sub?.destroy();
    this.sub = null;
    this.overlay?.destroy();
    this.overlay = null;
    this.confirmReset = false;
    this.list.setVisible(true);
    Audio.play('back');
  }

  update(time: number): void {
    // personagens caminhando no lugar
    const col = [1, 0, 2, 0][Math.floor(time / 140) % 4];
    this.chars.forEach((c) => c.setFrame(charFrame('side', col)));
    if (this.sub) {
      this.sub.update();
      if (Input.backPressed()) this.closeOverlay();
      return;
    }
    if (this.overlay) {
      if (Input.confirmPressed() || Input.backPressed()) this.closeOverlay();
      return;
    }
    this.list.update();
  }
}
