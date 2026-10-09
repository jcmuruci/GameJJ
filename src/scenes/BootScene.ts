import Phaser from 'phaser';
import { generateAllTextures, TILE_COUNT } from '../art/Textures';
import { generateCharacterTexture, CHAR_W, CHAR_H } from '../art/CharacterArt';
import { NPCS } from '../data/npcs';
import { Save } from '../systems/SaveManager';

/** Gera toda a arte procedural e segue para o menu. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    generateAllTextures(this);
    const tiles = this.textures.get('tiles');
    for (let i = 0; i < TILE_COUNT; i++) tiles.add(i, 0, i * 16, 0, 16, 16);
    refreshCharacters(this);
    for (const [k, look] of Object.entries(NPCS)) {
      generateCharacterTexture(this, `npc_${k}`, look, 0);
    }
    composeNpcProps(this);
    const anim = (key: string, tex: string, rate: number) => {
      if (!this.anims.exists(key)) this.anims.create({ key, frames: this.anims.generateFrameNumbers(tex, { start: 0, end: 1 }), frameRate: rate, repeat: -1 });
    };
    anim('fire-anim', 'fire', 8);
    anim('crow-fly', 'crow', 8);
    anim('waterfall-anim', 'waterfall', 6);
    anim('capy-walk', 'capybara', 6);
    anim('mosquito-fly', 'mosquito', 14);
    anim('gator-blink', 'gator', 1);
    anim('chicken-fly', 'chicken', 6);
    anim('goat-walk', 'goat', 4);
    anim('horse-walk', 'horse', 4);
    anim('dog-walk', 'dog', 6);
    anim('duck-swim', 'duck', 3);
    this.scene.start('Menu');
  }
}

export function refreshCharacters(scene: Phaser.Scene): void {
  generateCharacterTexture(scene, 'char_0', Save.data.looks[0], 0);
  generateCharacterTexture(scene, 'char_1', Save.data.looks[1], 1);
}

/** Monta sprites compostos a partir dos NPCs (garçom com bandeja, par da quadrilha). */
function composeNpcProps(scene: Phaser.Scene): void {
  const frame = (key: string, col: number) => ({ img: scene.textures.get(key).getSourceImage() as HTMLCanvasElement, sx: col * CHAR_W, sy: 2 * CHAR_H });
  const make = (key: string, w: number, draw: (ctx: CanvasRenderingContext2D) => void) => {
    if (scene.textures.exists(key)) scene.textures.remove(key);
    const t = scene.textures.createCanvas(key, w, CHAR_H)!;
    const ctx = t.getContext();
    ctx.imageSmoothingEnabled = false;
    draw(ctx);
    t.refresh();
  };
  // desenha o quadro de perfil espelhado (olhando para a direita)
  const put = (ctx: CanvasRenderingContext2D, key: string, col: number, dx: number) => {
    const f = frame(key, col);
    ctx.save();
    ctx.translate(dx + CHAR_W, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(f.img, f.sx, f.sy, CHAR_W, CHAR_H, 0, 0, CHAR_W, CHAR_H);
    ctx.restore();
  };
  make('waiter_run', 24, (ctx) => {
    put(ctx, 'npc_garcom', 1, 0);
    ctx.fillStyle = '#d8d8e4'; ctx.fillRect(12, 11, 10, 2);
    ctx.fillStyle = '#e8424a'; ctx.fillRect(14, 8, 3, 3);
    ctx.fillStyle = '#ffd25e'; ctx.fillRect(18, 9, 3, 2);
  });
  make('quadrilha', 30, (ctx) => {
    put(ctx, 'npc_caipira2', 1, 0);
    put(ctx, 'npc_caipira', 2, 13);
  });
}
