import Phaser from 'phaser';
import { stopBackgroundMusic } from '../audio/MusicManager';
import { createButton } from '../ui/createButton';
import { GameState } from '../state/GameState';

interface VictorySceneData {
  score: number;
}

export class VictoryScene extends Phaser.Scene {
  private score = 0;

  constructor() {
    super('Victory');
  }

  init(data: VictorySceneData): void {
    this.score = data.score ?? 0;
  }

  create(): void {
    stopBackgroundMusic();
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor(0x1d2b1f);

    this.add
      .text(width / 2, height / 2 - 100, 'You Win!', { fontSize: '48px', color: '#7cfc90', fontStyle: 'bold' })
      .setOrigin(0.5);
    this.add
      .text(width / 2, height / 2 - 40, `Final Score: ${this.score}`, { fontSize: '24px', color: '#ffffff' })
      .setOrigin(0.5);

    createButton(this, width / 2, height / 2 + 40, 'Play Again', () => {
      new GameState(this.registry).reset();
      this.scene.start('Level', { levelIndex: 0 });
    });
    createButton(this, width / 2, height / 2 + 90, 'Main Menu', () => this.scene.start('MainMenu'));
  }
}
