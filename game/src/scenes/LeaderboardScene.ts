import Phaser from 'phaser';
import { createButton } from '../ui/createButton';

// Populated in the leaderboard-integration pass; navigable stub for now so MainMenu can link to it.
export class LeaderboardScene extends Phaser.Scene {
  constructor() {
    super('Leaderboard');
  }

  create(): void {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor(0x1d1d2b);
    this.add
      .text(width / 2, 60, 'Leaderboard', { fontSize: '36px', color: '#ffd23f', fontStyle: 'bold' })
      .setOrigin(0.5);
    this.add.text(width / 2, height / 2, 'Coming soon', { fontSize: '18px', color: '#ffffff' }).setOrigin(0.5);
    createButton(this, width / 2, height - 50, 'Back', () => this.scene.start('MainMenu'));
  }
}
