import Phaser from 'phaser';
import { stopBackgroundMusic } from '../audio/MusicManager';
import { createButton } from '../ui/createButton';

interface GameOverSceneData {
  age: number;
  rankId: string;
}

export class GameOverScene extends Phaser.Scene {
  private age = 20;
  private rankId = 'A1';

  constructor() {
    super('GameOver');
  }

  init(data: GameOverSceneData): void {
    this.age = data.age ?? 20;
    this.rankId = data.rankId ?? 'A1';
  }

  create(): void {
    stopBackgroundMusic();
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor(0x2b1d1d);

    this.add
      .text(width / 2, height / 2 - 100, 'Burned Out', { fontSize: '48px', color: '#ff6b6b', fontStyle: 'bold' })
      .setOrigin(0.5);
    this.add
      .text(width / 2, height / 2 - 40, `Retired early at age ${this.age} (Rank ${this.rankId})`, {
        fontSize: '22px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    createButton(this, width / 2, height / 2 + 40, 'Retry', () => this.scene.start('Survive'));
    createButton(this, width / 2, height / 2 + 90, 'Main Menu', () => this.scene.start('MainMenu'));
  }
}
