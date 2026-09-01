import Phaser from 'phaser';
import { startBackgroundMusic } from '../audio/MusicManager';
import { createButton } from '../ui/createButton';
import { CHARACTERS } from '../data/characters';
import { GameState } from '../state/GameState';
import { CharacterCarousel } from '../ui/CharacterCarousel';

export class MainMenuScene extends Phaser.Scene {
  private carousel!: CharacterCarousel;
  private characterLabel!: Phaser.GameObjects.Text;
  private controlsTooltip?: Phaser.GameObjects.Container;
  private isTooltipOpen: boolean = false;

  constructor() {
    super('MainMenu');
  }

  create(): void {
    const { width, height } = this.scale;

    // 1. Background image (fill canvas, maintain aspect ratio with crop)
    const background = this.add.image(width / 2, height / 2, 'mainmenu-background');
    background.setDisplaySize(width, height);
    background.setDepth(0);

    // 2. Logo (centered, prominent)
    const logo = this.add.image(width / 2, height * 0.30, 'mainmenu-logo');
    logo.setScale(0.6); // Adjust scale if needed — report this value
    logo.setDepth(10);

    // 3. Carousel (positioned below logo)
    const carouselY = height * 0.60;
    this.carousel = new CharacterCarousel(this, width / 2, carouselY, CHARACTERS);
    const savedCharacterId = new GameState(this.registry).characterId;
    const savedIndex = CHARACTERS.findIndex((character) => character.id === savedCharacterId);
    this.carousel.initialize(savedIndex);
    this.carousel.container.setDepth(20);

    // Character name label below carousel
    this.characterLabel = this.add
      .text(width / 2, height * 0.8, '', { fontSize: '30px', color: '#ffffff', fontStyle: 'bold' })
      .setOrigin(0.5);
    this.characterLabel.setDepth(20);
    this.updateCharacterLabel();

    // Navigation buttons (carousel rotation)
    createButton(this, width / 2 - 120, height * 0.65, '<', () => this.rotateCarousel(-1)).setDepth(20);
    createButton(this, width / 2 + 120, height * 0.65, '>', () => this.rotateCarousel(1)).setDepth(20);

    // 4. Start button (image, small scale, below carousel)
    const startButton = this.add.image(width / 2, height * 0.90, 'mainmenu-start');
    startButton.setScale(0.4); // Adjust scale if needed — report this value
    startButton.setInteractive({ useHandCursor: true });
    startButton.on('pointerdown', () => this.startGame());
    startButton.setDepth(20);

    // 5. Leaderboard icon (top-right)
    const leaderboardIcon = this.add.image(width - 40, 40, 'mainmenu-leaderboard');
    leaderboardIcon.setScale(0.5);
    leaderboardIcon.setInteractive({ useHandCursor: true });
    leaderboardIcon.on('pointerdown', () => this.scene.start('Leaderboard'));
    leaderboardIcon.setDepth(30);

    // 6. Controls icon (top-left) with tooltip
    const controlsIcon = this.add.image(40, 40, 'mainmenu-controls');
    controlsIcon.setScale(0.5);
    controlsIcon.setInteractive({ useHandCursor: true });
    controlsIcon.setDepth(30);

    // Create tooltip (initially hidden)
    this.controlsTooltip = this.createControlsTooltip();
    this.controlsTooltip.setVisible(false);

    // Tooltip interactions
    controlsIcon.on('pointerover', () => this.showTooltip());
    controlsIcon.on('pointerout', () => this.hideTooltip());
    controlsIcon.on('pointerdown', () => this.toggleTooltip());

    // Close tooltip on click elsewhere
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.isTooltipOpen && !this.isPointerOverIcon(pointer, controlsIcon)) {
        this.hideTooltip();
      }
    });

    // Setup keyboard input
    this.setupKeyboardInput();
  }

  /**
   * Create the controls tooltip container.
   */
  private createControlsTooltip(): Phaser.GameObjects.Container {
    const controlsText =
      'Arrow keys / WASD to move • Up / Space to jump • Control to crouch • Shift / X to parry';

    // Create background panel
    const textObj = this.add.text(0, 0, controlsText, {
      fontSize: '12px',
      color: '#ffffff',
      align: 'left',
      wordWrap: { width: 280 },
    });
    const padding = 15;
    const bg = this.add.rectangle(
      textObj.width / 2,
      textObj.height / 2,
      textObj.width + padding * 2,
      textObj.height + padding * 2,
      0x000000,
      0.8
    );
    bg.setStrokeStyle(2, 0xffd23f);

    // Position tooltip: expand right/down from icon (top-left is at 40, 40)
    const tooltipX = 80; // Right of icon
    const tooltipY = 80; // Below icon
    const container = this.add.container(tooltipX, tooltipY, [bg, textObj]);
    container.setDepth(40);
    return container;
  }

  /**
   * Check if pointer is over the controls icon.
   */
  private isPointerOverIcon(pointer: Phaser.Input.Pointer, icon: Phaser.GameObjects.Image): boolean {
    const bounds = icon.getBounds();
    return bounds.contains(pointer.x, pointer.y);
  }

  private showTooltip(): void {
    if (!this.isTooltipOpen) {
      this.controlsTooltip?.setVisible(true);
      this.isTooltipOpen = true;
    }
  }

  private hideTooltip(): void {
    if (this.isTooltipOpen) {
      this.controlsTooltip?.setVisible(false);
      this.isTooltipOpen = false;
    }
  }

  private toggleTooltip(): void {
    if (this.isTooltipOpen) {
      this.hideTooltip();
    } else {
      this.showTooltip();
    }
  }

  private setupKeyboardInput(): void {
    this.input.keyboard!.on('keydown', (event: KeyboardEvent) => {
      switch (event.code) {
        case 'ArrowLeft':
        case 'KeyA':
          event.preventDefault();
          this.rotateCarousel(-1);
          break;
        case 'ArrowRight':
        case 'KeyD':
          event.preventDefault();
          this.rotateCarousel(1);
          break;
        case 'Space':
        case 'Enter':
          event.preventDefault();
          this.startGame();
          break;
      }
    });
  }

  private rotateCarousel(direction: 1 | -1): void {
    this.carousel.rotateCarousel(direction);
    this.updateCharacterLabel();
    const character = this.carousel.getCurrentCharacter();
    new GameState(this.registry).characterId = character.id;
  }

  private updateCharacterLabel(): void {
    const character = this.carousel.getCurrentCharacter();
    this.characterLabel.setText(character.label);
  }

  private startGame(): void {
    startBackgroundMusic();
    this.scene.start('Survive');
  }

  shutdown(): void {
    this.carousel.destroy();
  }
}

