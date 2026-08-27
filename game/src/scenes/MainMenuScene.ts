import Phaser from 'phaser';
import { startBackgroundMusic } from '../audio/MusicManager';
import { createButton } from '../ui/createButton';

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super('MainMenu');
  }

  create(): void {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor(0x1d1d2b);

    this.add
      .text(width / 2, height / 2 - 130, 'CCA-Survive', { fontSize: '52px', color: '#ffd23f', fontStyle: 'bold' })
      .setOrigin(0.5);
    this.add
      .text(width / 2, height / 2 - 80, 'Survive the career ladder from Grad Dev to CEO', {
        fontSize: '18px',
        color: '#cccccc',
      })
      .setOrigin(0.5);
    this.add
      .text(
        width / 2,
        height / 2 - 30,
        'Arrow keys / WASD to move \u2022 Up / Space to jump \u2022 Shift / X to parry',
        { fontSize: '16px', color: '#cccccc' }
      )
      .setOrigin(0.5);

    createButton(this, width / 2, height / 2 + 40, 'Start Game', () => this.startGame());
    createButton(this, width / 2, height / 2 + 90, 'Leaderboard', () => this.scene.start('Leaderboard'));

    this.input.keyboard!.once('keydown-SPACE', () => this.startGame());
  }

  private startGame(): void {
    startBackgroundMusic();
    this.scene.start('Survive');
  }
}
