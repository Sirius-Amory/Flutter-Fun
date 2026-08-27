import Phaser from 'phaser';
import { stopBackgroundMusic } from '../audio/MusicManager';
import { createButton } from '../ui/createButton';

interface VictorySceneData {
  age: number;
}

export class VictoryScene extends Phaser.Scene {
  private age = 65;

  constructor() {
    super('Victory');
  }

  init(data: VictorySceneData): void {
    this.age = data.age ?? 65;
  }

  create(): void {
    stopBackgroundMusic();
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor(0x1d2b1f);

    this.add
      .text(width / 2, height / 2 - 100, 'Retirement!', { fontSize: '48px', color: '#7cfc90', fontStyle: 'bold' })
      .setOrigin(0.5);
    this.add
      .text(width / 2, height / 2 - 40, `You made it to CEO and retired at age ${this.age}`, {
        fontSize: '22px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    createButton(this, width / 2, height / 2 + 40, 'Play Again', () => this.scene.start('Survive'));
    createButton(this, width / 2, height / 2 + 90, 'Main Menu', () => this.scene.start('MainMenu'));
  }
}
