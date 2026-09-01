import Phaser from 'phaser';
import { generateTextures } from '../textures/generateTextures';
import { CHARACTERS } from '../data/characters';
import { BACKGROUND_ASSETS, OBSTACLE_ASSETS, PROMOTION_TOKEN_ASSET, REGULAR_TOKEN_ASSETS } from '../data/gameAssets';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  preload(): void {
    // Character assets
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

    // Game assets
    for (const asset of [...REGULAR_TOKEN_ASSETS, PROMOTION_TOKEN_ASSET, ...OBSTACLE_ASSETS]) {
      this.load.image(asset.key, asset.source);
    }
    BACKGROUND_ASSETS.forEach((source, index) => this.load.image(`office-background-${index + 1}`, source));

    // Main menu assets
    this.load.image('mainmenu-background', 'src/assets/main-menu/mainmenu_background.jpg');
    this.load.image('mainmenu-logo', 'src/assets/main-menu/mainmenu_logo.png');
    this.load.image('mainmenu-controls', 'src/assets/main-menu/mainmenu_controls.png');
    this.load.image('mainmenu-leaderboard', 'src/assets/main-menu/mainmenu_leaderboard.png');
    this.load.image('mainmenu-start', 'src/assets/main-menu/mainmenu_start.png');
  }

  create(): void {
    generateTextures(this);
    this.scene.start('MainMenu');
  }
}
