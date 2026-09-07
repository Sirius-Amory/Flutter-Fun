import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { MainMenuScene } from './scenes/MainMenuScene';
import { SurviveScene } from './scenes/SurviveScene';
import { HUDScene } from './scenes/HUDScene';
import { GameOverScene } from './scenes/GameOverScene';
import { VictoryScene } from './scenes/VictoryScene';
import { LeaderboardScene } from './scenes/LeaderboardScene';
import { PauseScene } from './scenes/PauseScene';
import { WORLD_GRAVITY_Y } from './data/movementTuning';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  title: 'Cubicle Survivor',
  parent: 'app',
  backgroundColor: '#4488aa',
  pixelArt: true,
  render: {
    antialias: false,
    roundPixels: true,
  },
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 960,
    height: 540,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: WORLD_GRAVITY_Y },
      debug: false,
    },
  },
  scene: [BootScene, PreloadScene, MainMenuScene, SurviveScene, HUDScene, PauseScene, GameOverScene, VictoryScene, LeaderboardScene],
};

new Phaser.Game(config);
