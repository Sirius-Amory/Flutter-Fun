import Phaser from 'phaser';
import { createButton } from '../ui/createButton';

export class PauseScene extends Phaser.Scene {
  private controlsPanel?: Phaser.GameObjects.Container;

  constructor() {
    super('Pause');
  }

  create(): void {
    const { width, height } = this.scale;
    const centerX = width / 2;
    const centerY = height / 2;

    this.add
      .rectangle(centerX, centerY, width, height, 0x07101c, 0.78)
      .setScrollFactor(0)
      .setInteractive();

    this.add
      .rectangle(centerX, centerY - 12, 330, 330, 0x182536, 0.98)
      .setStrokeStyle(3, 0xff4444)
      .setScrollFactor(0);
    this.add
      .text(centerX, centerY - 125, 'PAUSED', {
        fontSize: '38px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    createButton(this, centerX, centerY - 50, 'Resume', () => this.resumeGame());
    createButton(this, centerX, centerY + 10, 'Controls', () => this.toggleControls());
    createButton(this, centerX, centerY + 70, 'Quit', () => this.quitGame());

    this.input.keyboard?.on('keydown-ESC', this.handleEscape, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off('keydown-ESC', this.handleEscape, this);
    });
  }

  private toggleControls(): void {
    if (this.controlsPanel) {
      this.controlsPanel.destroy();
      this.controlsPanel = undefined;
      return;
    }

    const { width, height } = this.scale;
    const panel = this.add.container(width / 2, height / 2).setDepth(10);
    panel.add(
      this.add
        .rectangle(0, 0, 390, 250, 0x182536, 1)
        .setStrokeStyle(3, 0xffd23f)
        .setInteractive()
    );
    panel.add(
      this.add
        .text(0, -88, 'CONTROLS', { fontSize: '28px', color: '#ffd23f', fontStyle: 'bold' })
        .setOrigin(0.5)
    );
    panel.add(
      this.add
        .text(0, -35, 'Move        Arrow Keys / A D\nJump        Up / W / Space\nParry       X\nCrouch      Ctrl', {
          fontSize: '20px',
          color: '#ffffff',
          lineSpacing: 10,
        })
        .setOrigin(0.5)
    );
    const closeButton = createButton(this, 0, 85, 'Back', () => this.toggleControls());
    panel.add(closeButton);
    this.controlsPanel = panel;
  }

  private handleEscape(): void {
    if (this.controlsPanel) {
      this.toggleControls();
    } else {
      this.resumeGame();
    }
  }

  private resumeGame(): void {
    this.scene.stop();
    this.scene.resume('Survive');
  }

  private quitGame(): void {
    const sceneManager = this.scene.manager;
    sceneManager.stop('Pause');
    sceneManager.stop('HUD');
    sceneManager.stop('Survive');
    sceneManager.start('MainMenu');
    sceneManager.bringToTop('MainMenu');
  }
}