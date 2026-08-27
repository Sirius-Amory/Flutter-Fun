import Phaser from 'phaser';
import { generateTextures } from '../textures/generateTextures';

// No external asset files to load - textures are generated procedurally in create().
// If real art/audio is added later, load it here with this.load.image()/this.load.audio().
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  create(): void {
    generateTextures(this);
    this.scene.start('MainMenu');
  }
}
