import Phaser from 'phaser';
import { stopBackgroundMusic } from '../audio/MusicManager';
import { createButton } from '../ui/createButton';
import { GameState } from '../state/GameState';

interface GameOverSceneData {
  score: number;
}

export class GameOverScene extends Phaser.Scene {
  private score = 0;

  constructor() {
    super('GameOver');
  }

  init(data: GameOverSceneData): void {
    this.score = data.score ?? 0;
  }

  create(): void {
    stopBackgroundMusic();
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor(0x2b1d1d);

    this.add
      .text(width / 2, height / 2 - 100, 'Game Over', { fontSize: '48px', color: '#ff6b6b', fontStyle: 'bold' })
      .setOrigin(0.5);
    this.add
      .text(width / 2, height / 2 - 40, `Final Score: ${this.score}`, { fontSize: '24px', color: '#ffffff' })
      .setOrigin(0.5);

    createButton(this, width / 2, height / 2 + 40, 'Retry', () => {
      new GameState(this.registry).reset();
      this.scene.start('Level', { levelIndex: 0 });
    });
    createButton(this, width / 2, height / 2 + 90, 'Main Menu', () => this.scene.start('MainMenu'));
  }
}
