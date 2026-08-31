import Phaser from 'phaser';
import { generateTextures } from '../textures/generateTextures';
import { CHARACTERS } from '../data/characters';
import { BACKGROUND_ASSETS, OBSTACLE_ASSETS, PROMOTION_TOKEN_ASSET, REGULAR_TOKEN_ASSETS } from '../data/gameAssets';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  preload(): void {
    for (const character of CHARACTERS) {
      this.load.image(`${character.id}-idle`, character.idle);
      this.load.image(`${character.id}-walk1`, character.walk[0]);
      this.load.image(`${character.id}-walk2`, character.walk[1]);
      this.load.image(`${character.id}-jump`, character.jump);
      this.load.image(`${character.id}-fall`, character.fall);
      this.load.image(`${character.id}-kick`, character.kick);
      this.load.image(`${character.id}-hurt`, character.hurt);
      this.load.image(`${character.id}-duck`, character.duck);
    }
    for (const asset of [...REGULAR_TOKEN_ASSETS, PROMOTION_TOKEN_ASSET, ...OBSTACLE_ASSETS]) {
      this.load.image(asset.key, asset.source);
    }
    BACKGROUND_ASSETS.forEach((source, index) => this.load.image(`office-background-${index + 1}`, source));
  }

  create(): void {
    generateTextures(this);
    this.scene.start('MainMenu');
  }
}
