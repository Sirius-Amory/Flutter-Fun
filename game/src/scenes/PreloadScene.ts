import Phaser from 'phaser';
import { generateTextures } from '../textures/generateTextures';
import { CHARACTERS } from '../data/characters';

const ASSET_PREFIX = '/assets';
const proj2 = `${ASSET_PREFIX}/main-menu/proj2.png`;
const collectSfx = `${ASSET_PREFIX}/sounds/collect.mp3`;
const jumpSfx = `${ASSET_PREFIX}/sounds/jump.mp3`;
const ouchFemaleSfx = `${ASSET_PREFIX}/sounds/ouch_female.mp3`;
const ouchMaleSfx = `${ASSET_PREFIX}/sounds/ouch_male.mp3`;
const parrySfx = `${ASSET_PREFIX}/sounds/parry.mp3`;
const shootSfx = `${ASSET_PREFIX}/sounds/shoot.mp3`;
const victorySfx = `${ASSET_PREFIX}/sounds/victory.mp3`;
const villain1Sfx = `${ASSET_PREFIX}/sounds/villain-1.mp3`;
const villain2Sfx = `${ASSET_PREFIX}/sounds/villain-2.mp3`;
const villain3Sfx = `${ASSET_PREFIX}/sounds/villain-3.mp3`;
const villain4Sfx = `${ASSET_PREFIX}/sounds/villain-4.mp3`;
const villain5Sfx = `${ASSET_PREFIX}/sounds/villain-5.mp3`;
const villainDefeatedSfx = `${ASSET_PREFIX}/sounds/villain-defeated.mp3`;
import {
  BACKGROUND_ASSETS,
  FLOOR_HAZARD_ASSETS,
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
      ...FLOOR_HAZARD_ASSETS,
    ]) {
      this.load.image(asset.key, asset.source);
    }
    BACKGROUND_ASSETS.forEach((source, index) => this.load.image(`office-background-${index + 1}`, source));

    // Main menu assets
    this.load.image('mainmenu-background', `${ASSET_PREFIX}/main-menu/mainmenu_background.jpg`);
    this.load.image('mainmenu-logo', `${ASSET_PREFIX}/main-menu/mainmenu_logo.png`);
    this.load.image('mainmenu-controls', `${ASSET_PREFIX}/main-menu/mainmenu_controls.png`);
    this.load.image('mainmenu-leaderboard', `${ASSET_PREFIX}/main-menu/mainmenu_leaderboard.png`);
    this.load.image('mainmenu-start', `${ASSET_PREFIX}/main-menu/mainmenu_start.png`);
    this.load.image('mainmenu-proj2', proj2);
    this.load.image('icon-fullscreen', `${ASSET_PREFIX}/main-menu/full-screen.png`);
    this.load.image('icon-revert', `${ASSET_PREFIX}/main-menu/revert.png`);
    this.load.image('icon-mute', `${ASSET_PREFIX}/main-menu/mute.png`);
    this.load.image('icon-unmute', `${ASSET_PREFIX}/main-menu/unmute.png`);
    this.load.image('gameOverStamp', `${ASSET_PREFIX}/game-over/game-over.png`);

    // HUD icons
    this.load.image('hud-icon-age', `${ASSET_PREFIX}/hud/icons/age.png`);
    this.load.image('hud-icon-rank', `${ASSET_PREFIX}/hud/icons/rank.png`);
    this.load.image('hud-icon-highlight', `${ASSET_PREFIX}/hud/icons/highlight.png`);
    this.load.image('hud-icon-setback', `${ASSET_PREFIX}/hud/icons/setback.png`);

    // Main menu sounds
    this.load.audio('menu', `${ASSET_PREFIX}/sounds/menu.mp3`);
    this.load.audio('game-music', `${ASSET_PREFIX}/sounds/game-music.mp3`);
    this.load.audio('game-sfx', `${ASSET_PREFIX}/sounds/game-sfx.mp3`);
    this.load.audio('boss', `${ASSET_PREFIX}/sounds/boss.mp3`);
    this.load.audio('whiteboard-sound', `${ASSET_PREFIX}/sounds/whiteboard-sound.mp3`);
    this.load.audio('sfx-swish', `${ASSET_PREFIX}/sounds/swish.mp3`);
    this.load.audio('collect', collectSfx);
    this.load.audio('jump', jumpSfx);
    this.load.audio('ouch_female', ouchFemaleSfx);
    this.load.audio('ouch_male', ouchMaleSfx);
    this.load.audio('parry', parrySfx);
    this.load.audio('shoot', shootSfx);
    this.load.audio('victory', victorySfx);
    this.load.audio('villain-1', villain1Sfx);
    this.load.audio('villain-2', villain2Sfx);
    this.load.audio('villain-3', villain3Sfx);
    this.load.audio('villain-4', villain4Sfx);
    this.load.audio('villain-5', villain5Sfx);
    this.load.audio('villain-defeated', villainDefeatedSfx);

    // Boss encounter poses (128x128, facing left, transparent backgrounds)
    this.load.image('boss-idle', `${ASSET_PREFIX}/boss/PNG/Poses/idle.png`);
    this.load.image('boss-idle2', `${ASSET_PREFIX}/boss/PNG/Poses/idle 2.png`);
    this.load.image('boss-walk1', `${ASSET_PREFIX}/boss/PNG/Poses/walk 1.png`);
    this.load.image('boss-walk2', `${ASSET_PREFIX}/boss/PNG/Poses/walk 2.png`);
    this.load.image('boss-telegraph', `${ASSET_PREFIX}/boss/PNG/Poses/telegraph.png`);
    this.load.image('boss-attack', `${ASSET_PREFIX}/boss/PNG/Poses/attack.png`);
    this.load.image('boss-staggered', `${ASSET_PREFIX}/boss/PNG/Poses/staggered.png`);
    this.load.image('boss-fall1', `${ASSET_PREFIX}/boss/PNG/Poses/fall_1.png`);
    this.load.image('boss-fall2', `${ASSET_PREFIX}/boss/PNG/Poses/fall_2.png`);
    this.load.image('boss-defeated', `${ASSET_PREFIX}/boss/PNG/Poses/defeated.png`);
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
