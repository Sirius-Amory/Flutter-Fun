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
    this.load.image('mainmenu-proj2', 'src/assets/main-menu/proj2.png');
    this.load.image('icon-mute', 'src/assets/main-menu/mute.png');
    this.load.image('icon-unmute', 'src/assets/main-menu/unmute.png');

    // Main menu sounds
    this.load.audio('main-menu-sound', 'src/assets/sounds/main-menu.mp3');
    this.load.audio('whiteboard-sound', 'src/assets/sounds/whiteboard-sound.mp3');
    this.load.audio('sfx-swish', 'src/assets/sounds/swish.mp3');
    this.load.audio('sfx-punch', 'src/assets/sounds/punch.mp3');
  }

  create(): void {
    generateTextures(this);
    console.log('Preload complete. Available audio:', Object.keys(this.cache.audio?.entries || {}));
    this.scene.start('MainMenu');
  }
}
