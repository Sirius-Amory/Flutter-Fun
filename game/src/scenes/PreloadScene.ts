import Phaser from 'phaser';
import { generateTextures } from '../textures/generateTextures';
import { CHARACTERS } from '../data/characters';
import proj2 from '../assets/main-menu/proj2.png';
import collectSfx from '../assets/sounds/collect.mp3';
import jumpSfx from '../assets/sounds/jump.mp3';
import ouchFemaleSfx from '../assets/sounds/ouch_female.mp3';
import ouchMaleSfx from '../assets/sounds/ouch_male.mp3';
import parrySfx from '../assets/sounds/parry.mp3';
import shootSfx from '../assets/sounds/shoot.mp3';
import victorySfx from '../assets/sounds/victory.mp3';
import {
  BACKGROUND_ASSETS,
  OBSTACLE_ASSETS,
  PROMOTION_OPPORTUNITY_ASSET,
  PROMOTION_TOKEN_ASSET,
  REGULAR_TOKEN_ASSETS,
} from '../data/gameAssets';

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
    for (const asset of [
      ...REGULAR_TOKEN_ASSETS,
      PROMOTION_TOKEN_ASSET,
      PROMOTION_OPPORTUNITY_ASSET,
      ...OBSTACLE_ASSETS,
    ]) {
      this.load.image(asset.key, asset.source);
    }
    BACKGROUND_ASSETS.forEach((source, index) => this.load.image(`office-background-${index + 1}`, source));

    // Main menu assets
    this.load.image('mainmenu-background', 'assets/main-menu/mainmenu_background.jpg');
    this.load.image('mainmenu-logo', 'assets/main-menu/mainmenu_logo.png');
    this.load.image('mainmenu-controls', 'assets/main-menu/mainmenu_controls.png');
    this.load.image('mainmenu-leaderboard', 'assets/main-menu/mainmenu_leaderboard.png');
    this.load.image('mainmenu-start', 'assets/main-menu/mainmenu_start.png');
    this.load.image('mainmenu-proj2', proj2);
    this.load.image('icon-mute', 'assets/main-menu/mute.png');
    this.load.image('icon-unmute', 'assets/main-menu/unmute.png');

    // HUD icons
    this.load.image('hud-icon-age', 'assets/hud/icons/age.png');
    this.load.image('hud-icon-rank', 'assets/hud/icons/rank.png');
    this.load.image('hud-icon-highlight', 'assets/hud/icons/highlight.png');
    this.load.image('hud-icon-setback', 'assets/hud/icons/setback.png');

    // Main menu sounds
    this.load.audio('menu', 'assets/sounds/menu.mp3');
    this.load.audio('game-music', 'assets/sounds/game-music.mp3');
    this.load.audio('game-sfx', 'assets/sounds/game-sfx.mp3');
    this.load.audio('boss', 'assets/sounds/boss.mp3');
    this.load.audio('whiteboard-sound', 'assets/sounds/whiteboard-sound.mp3');
    this.load.audio('sfx-swish', 'assets/sounds/swish.mp3');
    this.load.audio('collect', collectSfx);
    this.load.audio('jump', jumpSfx);
    this.load.audio('ouch_female', ouchFemaleSfx);
    this.load.audio('ouch_male', ouchMaleSfx);
    this.load.audio('parry', parrySfx);
    this.load.audio('shoot', shootSfx);
    this.load.audio('victory', victorySfx);

    // Boss encounter poses (128x128, facing left, transparent backgrounds)
    this.load.image('boss-idle', 'assets/boss/PNG/Poses/idle.png');
    this.load.image('boss-idle2', 'assets/boss/PNG/Poses/idle 2.png');
    this.load.image('boss-walk1', 'assets/boss/PNG/Poses/walk 1.png');
    this.load.image('boss-walk2', 'assets/boss/PNG/Poses/walk 2.png');
    this.load.image('boss-telegraph', 'assets/boss/PNG/Poses/telegraph.png');
    this.load.image('boss-attack', 'assets/boss/PNG/Poses/attack.png');
    this.load.image('boss-staggered', 'assets/boss/PNG/Poses/staggered.png');
    this.load.image('boss-fall1', 'assets/boss/PNG/Poses/fall_1.png');
    this.load.image('boss-fall2', 'assets/boss/PNG/Poses/fall_2.png');
    this.load.image('boss-defeated', 'assets/boss/PNG/Poses/defeated.png');
  }

  create(): void {
    generateTextures(this);

    // Boss walk-in animation: 2-frame loop at ~7 fps
    if (!this.anims.exists('boss-walk-in')) {
      this.anims.create({
        key: 'boss-walk-in',
        frames: [{ key: 'boss-walk1' }, { key: 'boss-walk2' }],
        frameRate: 7,
        repeat: -1,
      });
    }

    console.log('Preload complete. Available audio:', Object.keys(this.cache.audio?.entries || {}));
    this.scene.start('MainMenu');
  }
}
