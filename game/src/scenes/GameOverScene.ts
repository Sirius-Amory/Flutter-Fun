import Phaser from 'phaser';
import { stopBackgroundMusic } from '../audio/MusicManager';
import { createButton } from '../ui/createButton';

interface GameOverSceneData {
  age: number;
  rankId: string;
  score: number;
}

export class GameOverScene extends Phaser.Scene {
  private age = 20;
  private rankId = 'A1';
  private score = 0;

  constructor() {
    super('GameOver');
  }

  init(data: GameOverSceneData): void {
    this.age = data.age ?? 20;
    this.rankId = data.rankId ?? 'A1';
    this.score = data.score ?? 0;
  }

  create(): void {
    stopBackgroundMusic();
    const { width, height } = this.scale;
    const compact = width < 600;
    this.cameras.main.setBackgroundColor(0x2b1d1d);

    this.add.text(width / 2, height / 2 - 155, 'Cubicle Survivor', { fontSize: '20px', color: '#cccccc' }).setOrigin(0.5);
    this.add
      .text(width / 2, height / 2 - 100, 'Burned Out', { fontSize: compact ? '36px' : '48px', color: '#ff6b6b', fontStyle: 'bold' })
      .setOrigin(0.5);
    this.add
      .text(width / 2, height / 2 - 40, `IT crushed your soul as a ${this.rankId} at age ${this.age}`, {
        fontSize: compact ? '14px' : '22px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    this.add.text(width / 2, height / 2 + 2, `Score: ${Math.floor(this.score)}`, { fontSize: '18px', color: '#ffd23f' }).setOrigin(0.5);

    const nameInput = this.add.dom(width / 2, height / 2 + 55, 'input', {
      type: 'text',
      maxlength: '5',
      value: '',
      placeholder: 'Your name (max 5)',
      style: 'width: 220px; padding: 8px; font-size: 18px; text-align: center;',
    }) as Phaser.GameObjects.DOMElement;
    nameInput.node.addEventListener('input', () => {
      const input = nameInput.node as HTMLInputElement;
      input.value = input.value.slice(0, 5);
    });

    const submit = (): void => {
      const input = nameInput.node as HTMLInputElement;
      const playerName = input.value.slice(0, 5) || 'PLYR';
      nameInput.setVisible(false);
      void this.submitScore(playerName);
    };

    createButton(this, width / 2, height / 2 + 105, 'Submit Score', submit);

    createButton(this, width / 2, height / 2 + 155, 'Retry', () => this.scene.start('Survive'));
    createButton(this, width / 2, height / 2 + 205, 'Main Menu', () => {
      const sceneManager = this.scene.manager;
      sceneManager.stop('GameOver');
      sceneManager.stop('HUD');
      sceneManager.stop('Survive');
      sceneManager.stop('Pause');
      sceneManager.start('MainMenu');
      sceneManager.bringToTop('MainMenu');
    });
  }

  private async submitScore(playerName: string): Promise<void> {
    try {
      const response = await fetch('/api/submitScore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName, score: Math.floor(this.score) }),
      });
      if (!response.ok) throw new Error(`Score submission failed: ${response.status}`);
    } catch (error) {
      console.error('Could not submit score:', error);
    }
  }
}
