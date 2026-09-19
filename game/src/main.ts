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

function resumeGameRuntime(game: Phaser.Game): void {
  const soundManager = game.sound as { context?: AudioContext; resumeAll?: () => void };
  const audioContext = soundManager?.context;

  if (audioContext && audioContext.state === 'suspended') {
    void audioContext.resume();
  }

  if (typeof soundManager.resumeAll === 'function') {
    soundManager.resumeAll();
  }

  if (game.isPaused) {
    game.resume();
  }
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  title: 'Cubicle Survivor',
  parent: 'app',
  dom: {
    createContainer: true,
  },
  backgroundColor: '#4488aa',
  pixelArt: true,
  render: {
    antialias: false,
    roundPixels: true,
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1600,
    height: 900,
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

const game = new Phaser.Game(config);

const handleVisibleResume = (): void => {
  if (document.visibilityState === 'visible') {
    resumeGameRuntime(game);
  }
};

document.addEventListener('visibilitychange', handleVisibleResume);
window.addEventListener('focus', handleVisibleResume);