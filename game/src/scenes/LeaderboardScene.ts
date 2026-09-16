import Phaser from 'phaser';
import { createButton } from '../ui/createButton';

interface LeaderboardEntry {
  playerName: string;
  score: number;
}

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
    const status = this.add.text(width / 2, height / 2, 'Loading leaderboard...', { fontSize: '18px', color: '#ffffff' }).setOrigin(0.5);
    createButton(this, width / 2, height - 50, 'Back', () => this.scene.start('MainMenu'));
    void this.loadLeaderboard(status);
  }

  private async loadLeaderboard(status: Phaser.GameObjects.Text): Promise<void> {
    try {
      const response = await fetch('/api/getLeaderboard');
      if (!response.ok) throw new Error(`Leaderboard request failed: ${response.status}`);
      const entries = (await response.json()) as LeaderboardEntry[];
      status.destroy();

      if (entries.length === 0) {
        this.add.text(this.scale.width / 2, this.scale.height / 2, 'No scores yet - be the first!', {
          fontSize: '18px',
          color: '#ffffff',
        }).setOrigin(0.5);
        return;
      }

      const rows = entries.slice(0, 10).map((entry, index) => `${index + 1}. ${entry.playerName}  ${entry.score}`);
      this.add.text(this.scale.width / 2, 125, rows.join('\n'), {
        fontSize: '22px',
        color: '#ffffff',
        align: 'left',
        lineSpacing: 12,
      }).setOrigin(0.5, 0);
    } catch (error) {
      console.error('Could not load leaderboard:', error);
      status.setText("Couldn't load leaderboard");
    }
  }
}
