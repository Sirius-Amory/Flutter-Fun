import Phaser from 'phaser';
import { eventBus, GameEvents } from '../events';

interface HUDSceneData {
  levelName: string;
  levelIndex: number;
  totalLevels: number;
}

export class HUDScene extends Phaser.Scene {
  private scoreText!: Phaser.GameObjects.Text;
  private livesText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'HUD' });
  }

  create(data: HUDSceneData): void {
    this.scoreText = this.add
      .text(16, 12, 'Score: 0', { fontSize: '20px', color: '#ffffff' })
      .setScrollFactor(0)
      .setDepth(100);
    this.livesText = this.add
      .text(16, 38, 'Lives: 3', { fontSize: '20px', color: '#ffffff' })
      .setScrollFactor(0)
      .setDepth(100);
    this.add
      .text(this.scale.width - 16, 12, `${data.levelName} (${data.levelIndex + 1}/${data.totalLevels})`, {
        fontSize: '18px',
        color: '#ffffff',
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(100);

    const onScoreChanged = (score: number) => this.scoreText.setText(`Score: ${score}`);
    const onLivesChanged = (lives: number) => this.livesText.setText(`Lives: ${lives}`);

    eventBus.on(GameEvents.ScoreChanged, onScoreChanged);
    eventBus.on(GameEvents.LivesChanged, onLivesChanged);

    // eventBus outlives this scene instance, so listeners must be removed explicitly.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      eventBus.off(GameEvents.ScoreChanged, onScoreChanged);
      eventBus.off(GameEvents.LivesChanged, onLivesChanged);
    });
  }
}
