import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { MainMenuScene } from './scenes/MainMenuScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  title: 'Platform Hopper',
  parent: 'app',
  width: 960,
  height: 540,
  backgroundColor: '#4488aa',
  pixelArt: true,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 900 },
      debug: false,
    },
  },
  scene: [BootScene, MainMenuScene],
};

new Phaser.Game(config);
