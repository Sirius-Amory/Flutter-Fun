import Phaser from 'phaser';
import { startBackgroundMusic } from '../audio/MusicManager';
import { createButton } from '../ui/createButton';
import { CHARACTERS } from '../data/characters';
import { GameState } from '../state/GameState';

const PREVIEW_HEIGHT = 80;

export class MainMenuScene extends Phaser.Scene {
  private characterIndex = 0;
  private previewImage!: Phaser.GameObjects.Image;
  private characterLabel!: Phaser.GameObjects.Text;

  constructor() {
    super('MainMenu');
  }

  create(): void {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor(0x1d1d2b);

    const savedCharacterId = new GameState(this.registry).characterId;
    const savedIndex = CHARACTERS.findIndex((character) => character.id === savedCharacterId);
    this.characterIndex = Math.max(0, savedIndex);

    this.add
      .text(width / 2, height / 2 - 190, 'CCA-Survive', { fontSize: '52px', color: '#ffd23f', fontStyle: 'bold' })
      .setOrigin(0.5);
    this.add
      .text(width / 2, height / 2 - 145, 'Survive the career ladder from Grad Dev to CEO', {
        fontSize: '18px',
        color: '#cccccc',
      })
      .setOrigin(0.5);
    this.add
      .text(
        width / 2,
        height / 2 - 110,
        'Arrow keys / WASD to move \u2022 Up / Space to jump \u2022 Shift / X to parry',
        { fontSize: '16px', color: '#cccccc' }
      )
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2 - 70, 'Choose your character', { fontSize: '16px', color: '#cccccc' })
      .setOrigin(0.5);
    this.previewImage = this.add.image(width / 2, height / 2 - 15, `${CHARACTERS[this.characterIndex].id}-idle`);
    this.characterLabel = this.add
      .text(width / 2, height / 2 + 35, '', { fontSize: '18px', color: '#ffffff', fontStyle: 'bold' })
      .setOrigin(0.5);
    createButton(this, width / 2 - 90, height / 2 - 15, '<', () => this.cycleCharacter(-1));
    createButton(this, width / 2 + 90, height / 2 - 15, '>', () => this.cycleCharacter(1));
    this.renderCharacterPreview();

    createButton(this, width / 2, height / 2 + 80, 'Start Game', () => this.startGame());
    createButton(this, width / 2, height / 2 + 125, 'Leaderboard', () => this.scene.start('Leaderboard'));

    this.input.keyboard!.once('keydown-SPACE', () => this.startGame());
  }

  private cycleCharacter(delta: number): void {
    this.characterIndex = (this.characterIndex + delta + CHARACTERS.length) % CHARACTERS.length;
    new GameState(this.registry).characterId = CHARACTERS[this.characterIndex].id;
    this.renderCharacterPreview();
  }

  private renderCharacterPreview(): void {
    const character = CHARACTERS[this.characterIndex];
    this.previewImage.setTexture(`${character.id}-idle`);
    this.previewImage.setScale(PREVIEW_HEIGHT / this.previewImage.height);
    this.characterLabel.setText(character.label);
  }

  private startGame(): void {
    startBackgroundMusic();
    this.scene.start('Survive');
  }
}

