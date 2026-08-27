import Phaser from 'phaser';
import { generateTextures } from '../textures/generateTextures';
import { CHARACTERS } from '../data/characters';

// No external asset files to load for most textures - those are generated procedurally in
// create(). Character art is real Kenney PNGs (imported via Vite in data/characters.ts), so it
// needs an actual preload() load phase before create() runs.
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  preload(): void {
    for (const character of CHARACTERS) {
      this.load.image(`${character.id}-idle`, character.idle);
      this.load.image(`${character.id}-walk1`, character.walk[0]);
      this.load.image(`${character.id}-walk2`, character.walk[1]);
      this.load.image(`${character.id}-jump`, character.jump);
      this.load.image(`${character.id}-fall`, character.fall);
      this.load.image(`${character.id}-kick`, character.kick);
      this.load.image(`${character.id}-hurt`, character.hurt);
    }
  }

  create(): void {
    generateTextures(this);
    this.scene.start('MainMenu');
  }
}
