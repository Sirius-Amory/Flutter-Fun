import Phaser from 'phaser';
import { isMusicMuted, toggleMusic } from '../audio/MusicManager';
import { createButton } from '../ui/createButton';
import { CHARACTERS, getCharacterById } from '../data/characters';
import { GameState } from '../state/GameState';
import { CharacterCarousel } from '../ui/CharacterCarousel';

const ICON_WIDTH_PCT = 0.09;
const ICON_EDGE_PCT = 0.09;
const MENU_MUSIC_VOLUME = 0.05;

export class MainMenuScene extends Phaser.Scene {
  private carousel!: CharacterCarousel;
  private characterLabel!: Phaser.GameObjects.Text;
  private proj2Image?: Phaser.GameObjects.Image;
  private proj2TargetX: number = 0;
  private proj2Speed: number = 0;
  private proj2AnimationDuration: number = 3000;
  private proj2OffscreenX: number = 0;
  private proj2IsVisible: boolean = false;
  private proj2IsAnimating: boolean = false;
  private mainMenuSound?: Phaser.Sound.BaseSound;
  private leaderboardIcon!: Phaser.GameObjects.Image;
  private controlsIcon!: Phaser.GameObjects.Image;
  private musicToggleIcon!: Phaser.GameObjects.Image;

  constructor() {
    super('MainMenu');
  }

  create(): void {
    const { width, height } = this.scale;

    // Resume audio context if available (required for browser autoplay policies)
    const soundManager = this.sound as any;
    if (soundManager.context && soundManager.context.state === 'suspended') {
      soundManager.context.resume();
    }

    this.mainMenuSound = this.sound.add('menu', {
      loop: true,
      volume: isMusicMuted() ? 0 : MENU_MUSIC_VOLUME,
    });
    this.mainMenuSound.play();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.stopMainMenuSound, this);

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
    const savedCharacter = getCharacterById(savedCharacterId);
    const savedIndex = CHARACTERS.findIndex((character) => character.id === savedCharacter.id);
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
    this.leaderboardIcon = this.add.image(0, 0, 'mainmenu-leaderboard');
    this.leaderboardIcon.setInteractive({ useHandCursor: true });
    this.leaderboardIcon.on('pointerdown', () => this.scene.start('Leaderboard'));
    this.leaderboardIcon.setDepth(30);

    // 6. Controls icon (top-left) with tooltip
    this.controlsIcon = this.add.image(0, 0, 'mainmenu-controls');
    this.controlsIcon.setInteractive({ useHandCursor: true });
    this.controlsIcon.setDepth(30);

    this.musicToggleIcon = this.add.image(0, 0, isMusicMuted() ? 'icon-mute' : 'icon-unmute');
    this.musicToggleIcon.setInteractive({ useHandCursor: true });
    this.musicToggleIcon.on('pointerdown', () => this.toggleMenuMusic());
    this.musicToggleIcon.setDepth(30);
    this.layout();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);

    // Create proj2 image (whiteboard) with fixed scale to preserve aspect ratio
    this.proj2Image = this.add.image(0, height / 2, 'mainmenu-proj2');
    this.proj2Image.setScale(0.47); // 2/3 of original 0.7 scale

    // Position "just out of frame" — based on the image's own (scaled) width,
    // not the full canvas width, so it's just past the left edge rather than
    // fully off-screen.
    const proj2HalfWidth = this.proj2Image.displayWidth / 2;
    this.proj2OffscreenX = -proj2HalfWidth;
    this.proj2Image.x = this.proj2OffscreenX;
    this.proj2Image.setDepth(35);

    this.proj2TargetX = this.proj2OffscreenX;
    this.proj2Speed = 0;

    // Toggle the whiteboard on click; ignore clicks while it is moving.
    this.controlsIcon.on('pointerdown', () => {
      if (this.proj2IsAnimating) {
        return;
      }

      // Ensure audio context is not suspended
      const soundManager = this.sound as any;
      if (soundManager.context && soundManager.context.state === 'suspended') {
        soundManager.context.resume();
      }

      this.proj2IsVisible = !this.proj2IsVisible;
      this.proj2TargetX = this.proj2IsVisible ? width / 6 : this.proj2OffscreenX;
      this.proj2Speed = (this.proj2TargetX - (this.proj2Image?.x ?? this.proj2OffscreenX)) / this.proj2AnimationDuration;
      this.proj2IsAnimating = true;

      // Play whiteboard sound
      try {
        this.sound.play('whiteboard-sound', {
          volume: 1,
          duration: this.proj2AnimationDuration / 1000,
        });
      } catch (e) {
        console.error('Error playing whiteboard sound:', e);
      }
    });

    // Setup keyboard input
    this.setupKeyboardInput();
  }

  update(): void {
    // Animate proj2 image smoothly
    if (this.proj2Image && this.proj2Speed !== 0) {
      const newX = this.proj2Image.x + this.proj2Speed * (this.game.loop.delta || 16);

      // Check if we've reached the target
      if ((this.proj2Speed > 0 && newX >= this.proj2TargetX) || (this.proj2Speed < 0 && newX <= this.proj2TargetX)) {
        this.proj2Image.x = this.proj2TargetX;
        this.proj2Speed = 0;
        this.proj2IsAnimating = false;
      } else {
        this.proj2Image.x = newX;
      }
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
    this.sound.play('sfx-swish');
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
    this.stopMainMenuSound();
    this.scene.start('Survive');
  }

  private stopMainMenuSound(): void {
    this.mainMenuSound?.destroy();
    this.mainMenuSound = undefined;
  }

  private toggleMenuMusic(): void {
    const musicMuted = toggleMusic();
    (this.mainMenuSound as Phaser.Sound.WebAudioSound | Phaser.Sound.HTML5AudioSound | undefined)?.setVolume(
      musicMuted ? 0 : MENU_MUSIC_VOLUME
    );
    this.musicToggleIcon.setTexture(musicMuted ? 'icon-mute' : 'icon-unmute');
  }

  private layout(): void {
    const { width, height } = this.scale;
    const iconWidth = width * ICON_WIDTH_PCT;
    const iconEdge = width * ICON_EDGE_PCT;

    for (const icon of [this.leaderboardIcon, this.controlsIcon, this.musicToggleIcon]) {
      icon.setDisplaySize(iconWidth, (icon.height / icon.width) * iconWidth);
    }
    this.musicToggleIcon.setDisplaySize(iconWidth / 2, (this.musicToggleIcon.height / this.musicToggleIcon.width) * (iconWidth / 2));

    this.controlsIcon.setPosition(iconEdge/2, iconEdge/2);
    this.leaderboardIcon.setPosition(width - iconEdge/2, iconEdge/2);
    this.musicToggleIcon.setPosition(width - iconEdge/2, height - iconEdge/2);
  }

  shutdown(): void {
    this.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this);
    this.carousel.destroy();
  }
}