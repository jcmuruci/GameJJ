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
    this.scene.start('Menu');
  }
}

export function refreshCharacters(scene: Phaser.Scene): void {
  generateCharacterTexture(scene, 'char_0', Save.data.looks[0], 0);
  generateCharacterTexture(scene, 'char_1', Save.data.looks[1], 1);
}
