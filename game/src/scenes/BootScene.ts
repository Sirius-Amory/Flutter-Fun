import Phaser from 'phaser';

// Earliest scene: place for engine-level setup before assets start loading.
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    this.scene.start('Preload');
  }
}
