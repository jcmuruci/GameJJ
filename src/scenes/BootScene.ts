import Phaser from 'phaser';
import { generateAllTextures, TILE_COUNT } from '../art/Textures';
import { generateCharacterTexture } from '../art/CharacterArt';
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
    const anim = (key: string, tex: string, rate: number) => {
      if (!this.anims.exists(key)) this.anims.create({ key, frames: this.anims.generateFrameNumbers(tex, { start: 0, end: 1 }), frameRate: rate, repeat: -1 });
    };
    anim('fire-anim', 'fire', 8);
    anim('crow-fly', 'crow', 8);
    anim('waterfall-anim', 'waterfall', 6);
    anim('capy-walk', 'capybara', 6);
    anim('mosquito-fly', 'mosquito', 14);
    anim('gator-blink', 'gator', 1);
    this.scene.start('Menu');
  }
}

export function refreshCharacters(scene: Phaser.Scene): void {
  generateCharacterTexture(scene, 'char_0', Save.data.looks[0], 0);
  generateCharacterTexture(scene, 'char_1', Save.data.looks[1], 1);
}
