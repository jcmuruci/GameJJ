import Phaser from 'phaser';
import { GAME_W, GAME_H, PLAYER_COLORS } from '../config';
import { txt, panel, uiButton } from '../ui/text';
import { Input, PlayerId, KEY_LABELS } from '../systems/InputManager';
import { Audio } from '../systems/Audio';
import { Save } from '../systems/SaveManager';
import { generateCharacterTexture, charFrame, Dir } from '../art/CharacterArt';
import {
  CharacterLook, SKIN_TONES, HAIR_COLORS, EYE_COLORS, CLOTH_COLORS, HAIR_STYLES, ACCESSORIES, BEARDS,
  HAIR_STYLE_LABEL, ACCESSORY_LABEL, DEFAULT_P1, DEFAULT_P2, HIGHLIGHT_COLORS,
  BUILDS, BUILD_LABEL, TATTOOS, TATTOO_LABEL, TATTOO_COLORS,
} from '../data/characters';
import { cozyBackground } from './MenuScene';

interface Field {
  label: string;
  value: (l: CharacterLook) => string;
  change?: (l: CharacterLook, d: number) => void;
  action?: (id: PlayerId) => void;
}

function cycle<T>(arr: readonly T[], cur: T, d: number): T {
  const i = arr.indexOf(cur);
  return arr[(Math.max(0, i) + d + arr.length) % arr.length];
}

function colorField(label: string, key: keyof CharacterLook, palette: string[]): Field {
  return {
    label,
    value: () => '■',
    change: (l, d) => { (l as unknown as Record<string, string>)[key] = cycle(palette, l[key] as string, d); },
  };
}

/** Editor dos personagens (para deixá-los parecidos com vocês!). */
export class CustomizeScene extends Phaser.Scene {
  private sel: [number, number] = [0, 0];
  private ready: [boolean, boolean] = [false, false];
  private rows: Phaser.GameObjects.Text[][] = [[], []];
  private swatches: Phaser.GameObjects.Rectangle[][] = [[], []];
  private previews: Phaser.GameObjects.Sprite[] = [];
  private fields: Field[] = [];
  private editing: PlayerId | null = null;
  private stopCapture: (() => void) | null = null;
  private dirT = 0;

  constructor() {
    super('Customize');
  }

  create(): void {
    this.sel = [0, 0];
    this.ready = [false, false];
    this.rows = [[], []];
    this.swatches = [[], []];
    this.previews = [];
    this.editing = null;
    cozyBackground(this);
    this.add.graphics().fillStyle(0x1b1424, 0.5).fillRect(0, 0, GAME_W, GAME_H);
    txt(this, GAME_W / 2, 30, 'Personagens', 32, { color: '#ffd6e4' });
    txt(this, GAME_W / 2, 60, 'Cada um edita o seu: cima/baixo escolhe · esquerda/direita muda · AÇÃO no nome para digitar', 13, { bold: false, color: '#e8d8f0' });

    this.fields = [
      { label: 'Nome', value: (l) => l.name, action: (id) => this.editName(id) },
      colorField('Pele', 'skin', SKIN_TONES),
      colorField('Cabelo', 'hair', HAIR_COLORS),
      { label: 'Mechas', value: (l) => (l.highlights ? '■' : 'nenhuma'), change: (l, d) => { l.highlights = cycle(HIGHLIGHT_COLORS, l.highlights, d); } },
      { label: 'Penteado', value: (l) => HAIR_STYLE_LABEL[l.hairStyle], change: (l, d) => { l.hairStyle = cycle(HAIR_STYLES, l.hairStyle, d); } },
      colorField('Olhos', 'eyes', EYE_COLORS),
      { label: 'Corpo', value: (l) => BUILD_LABEL[l.build], change: (l, d) => { l.build = cycle(BUILDS, l.build, d); } },
      { label: 'Mangas', value: (l) => l.sleeves, change: (l) => { l.sleeves = l.sleeves === 'curtas' ? 'longas' : 'curtas'; } },
      { label: 'Tatuagem', value: (l) => TATTOO_LABEL[l.tattoo], change: (l, d) => { l.tattoo = cycle(TATTOOS, l.tattoo, d); if (l.tattoo !== 'nenhuma') l.sleeves = 'curtas'; } },
      colorField('Cor da tatuagem', 'tattooColor', TATTOO_COLORS),
      colorField('Roupa', 'shirt', CLOTH_COLORS),
      colorField('Calça', 'pants', CLOTH_COLORS),
      colorField('Sapatos', 'shoes', CLOTH_COLORS),
      { label: 'Barba', value: (l) => l.beard, change: (l, d) => { l.beard = cycle(BEARDS, l.beard, d); } },
      colorField('Cor da barba', 'beardColor', HAIR_COLORS),
      { label: 'Cílios', value: (l) => (l.lashes ? 'marcados' : 'simples'), change: (l) => { l.lashes = !l.lashes; } },
      { label: 'Óculos', value: (l) => (l.glasses ? 'sim' : 'não'), change: (l) => { l.glasses = !l.glasses; } },
      { label: 'Acessório', value: (l) => ACCESSORY_LABEL[l.accessory], change: (l, d) => { l.accessory = cycle(ACCESSORIES, l.accessory, d); } },
      colorField('Cor do acessório', 'accessoryColor', CLOTH_COLORS),
      { label: 'Restaurar padrão', value: () => '', action: (id) => { Save.data.looks[id] = { ...(id === 0 ? DEFAULT_P1 : DEFAULT_P2) }; this.regen(id); Audio.play('back'); } },
      { label: 'Pronto!', value: () => '', action: (id) => { this.ready[id] = !this.ready[id]; this.refresh(); } },
    ];

    for (let i = 0 as PlayerId; i < 2; i = (i + 1) as PlayerId) {
      const left = i === 0;
      const cx = left ? 240 : 720;
      panel(this, cx - 225, 80, 450, 440, 0x2a1d3a, 0.9, Phaser.Display.Color.HexStringToColor(PLAYER_COLORS[i]).color);
      txt(this, cx, 102, `Jogador ${i + 1} · ${left ? 'Guardião' : 'Maga'} (${KEY_LABELS[i].move} + ${KEY_LABELS[i].action})`, 14, { color: PLAYER_COLORS[i] });
      const px = left ? cx - 140 : cx + 140;
      const pv = this.add.sprite(px, 300, `char_${i}`, 0).setScale(7);
      this.previews.push(pv);
      this.add.image(px, 382, 'shadow').setScale(6).setAlpha(0.25).setDepth(-1);
      const lx = left ? cx + 60 : cx - 60;
      this.fields.forEach((_, k) => {
        const t = txt(this, lx, 118 + k * 18, '', 13, { bold: false });
        t.setInteractive({ useHandCursor: true });
        t.on('pointerdown', () => { this.sel[i] = k; this.activate(i); });
        this.rows[i].push(t);
        const sw = this.add.rectangle(lx + 80, 118 + k * 18, 13, 13, 0xffffff).setStrokeStyle(2, 0x2a1d2e).setVisible(false);
        this.swatches[i].push(sw);
      });
    }
    uiButton(this, 80, 30, '< Voltar', () => { if (this.editing === null) { Audio.play('back'); this.leave(); } }, { size: 15 });
    this.refresh();
    Audio.music('menu');
    this.cameras.main.fadeIn(300, 27, 20, 36);
  }

  private regen(id: PlayerId): void {
    const look = Save.data.looks[id];
    generateCharacterTexture(this, `char_${id}`, look, id);
    this.previews[id].setTexture(`char_${id}`, 0);
    Save.save();
    this.refresh();
  }

  private refresh(): void {
    for (let i = 0 as PlayerId; i < 2; i = (i + 1) as PlayerId) {
      const look = Save.data.looks[i];
      this.fields.forEach((f, k) => {
        const t = this.rows[i][k];
        const selected = this.sel[i] === k;
        let v = f.value(look);
        const isColor = v === '■';
        if (f.label === 'Pronto!') v = this.ready[i] ? '✓' : '';
        if (this.editing === i && k === 0) v = `${look.name}_`;
        const label = isColor ? `${f.label}: <    >` : v ? `${f.label}: ${f.change ? `< ${v} >` : v}` : f.label;
        t.setText(label);
        t.setColor(selected ? '#ffd25e' : f.label === 'Pronto!' && this.ready[i] ? '#8be07a' : '#fff4e0');
        const sw = this.swatches[i][k];
        if (isColor) {
          const key = ({ Pele: 'skin', Cabelo: 'hair', Mechas: 'highlights', 'Cor da barba': 'beardColor', Olhos: 'eyes', Roupa: 'shirt', 'Calça': 'pants', Sapatos: 'shoes', 'Cor do acessório': 'accessoryColor', 'Cor da tatuagem': 'tattooColor' } as Record<string, keyof CharacterLook>)[f.label];
          sw.setFillStyle(Phaser.Display.Color.HexStringToColor(look[key] as string).color).setVisible(true);
          sw.setX(t.x + t.width / 2 - 26);
        } else sw.setVisible(false);
      });
    }
  }

  private activate(id: PlayerId): void {
    const f = this.fields[this.sel[id]];
    if (f.action) { Audio.play('confirm'); f.action(id); }
    else if (f.change) { f.change(Save.data.looks[id], 1); Audio.play('select'); this.regen(id); }
    if (this.ready[0] && this.ready[1]) this.leave();
  }

  private editName(id: PlayerId): void {
    if (this.editing !== null) return;
    this.editing = id;
    this.refresh();
    const look = Save.data.looks[id];
    this.stopCapture = Input.captureText((e) => {
      if (e.key === 'Enter' || e.key === 'Escape' || e.key === 'Tab') {
        if (!look.name.trim()) look.name = id === 0 ? DEFAULT_P1.name : DEFAULT_P2.name;
        look.name = look.name.trim();
        this.editing = null;
        this.stopCapture?.();
        this.stopCapture = null;
        Save.save();
        Audio.play('confirm');
      } else if (e.key === 'Backspace') {
        look.name = look.name.slice(0, -1);
        Audio.play('blip');
      } else if (e.key.length === 1 && look.name.length < 12) {
        look.name += e.key;
        Audio.play('blip');
      }
      this.refresh();
    });
  }

  private leave(): void {
    Save.save();
    this.time.delayedCall(250, () => this.scene.start('Menu'));
  }

  update(_t: number, delta: number): void {
    // prévia girando
    this.dirT += delta / 1000;
    const dirs: [Dir, boolean][] = [['down', false], ['side', true], ['up', false], ['side', false]];
    const [dir, flip] = dirs[Math.floor(this.dirT / 1.2) % 4];
    const col = [1, 0, 2, 0][Math.floor(this.dirT * 6) % 4];
    this.previews.forEach((p) => p.setFrame(charFrame(dir, col)).setFlipX(flip));

    if (this.editing !== null) return;
    if (Input.backPressed()) { Audio.play('back'); this.leave(); return; }
    for (let i = 0 as PlayerId; i < 2; i = (i + 1) as PlayerId) {
      const st = Input.players[i];
      const n = this.fields.length;
      if (st.upPressed) { this.sel[i] = (this.sel[i] + n - 1) % n; Audio.play('blip'); this.refresh(); }
      if (st.downPressed) { this.sel[i] = (this.sel[i] + 1) % n; Audio.play('blip'); this.refresh(); }
      const f = this.fields[this.sel[i]];
      if (f.change && (st.leftPressed || st.rightPressed)) {
        f.change(Save.data.looks[i], st.leftPressed ? -1 : 1);
        Audio.play('select');
        this.regen(i);
      }
      if (st.actionPressed) this.activate(i);
    }
  }
}
