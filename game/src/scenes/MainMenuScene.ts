import Phaser from 'phaser';

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super('MainMenu');
  }

  create(): void {
    const { width, height } = this.scale;
    this.add.text(width / 2, height / 2, 'Platform Hopper', { fontSize: '48px', color: '#ffffff' }).setOrigin(0.5);
    this.add
      .text(width / 2, height / 2 + 60, 'Scaffold OK \u2014 scenes coming next', { fontSize: '20px', color: '#ffffff' })
      .setOrigin(0.5);
  }
}
