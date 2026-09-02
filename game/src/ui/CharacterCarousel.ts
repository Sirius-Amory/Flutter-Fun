import Phaser from 'phaser';
import { CHARACTERS, CharacterDef } from '../data/characters';

/**
 * Transform properties for a carousel item at a given offset.
 * Offset 0 = center/selected, ±1 = neighbors, ±2+ = background.
 */
interface CarouselTransform {
  x: number;
  y: number;
  scale: number;
  alpha: number;
  depth: number;
}

/**
 * Fake-3D coverflow carousel for character selection.
 * Displays characters in a virtual ring with the selected one centered and prominent.
 */
export class CharacterCarousel {
  private scene: Phaser.Scene;
  private characters: CharacterDef[];
  private currentIndex: number = 0;
  private portraits: Map<string, Phaser.GameObjects.Image> = new Map();
  private isAnimating: boolean = false;
  public container: Phaser.GameObjects.Container;

  // Carousel positioning tuning parameters
  private readonly CAROUSEL_CENTER_X: number;
  private readonly CAROUSEL_CENTER_Y: number;
  private readonly CAROUSEL_RADIUS: number = 200; // horizontal spacing radius
  private readonly ANGLE_STEP: number = Math.PI / 3; // ~60° between items for sin/cos curve
  private readonly MAX_VISIBLE_OFFSET: number = 2; // only render offset -2 to +2
  private readonly TWEEN_DURATION: number = 300; // ms
  private readonly TWEEN_EASE: string = 'Cubic.easeOut';

  // Scale and opacity curves
  private readonly SCALE_CENTER: number = 2.0;
  private readonly SCALE_NEAR: number = 0.65;
  private readonly SCALE_FAR: number = 0.4;
  private readonly ALPHA_CENTER: number = 1.0;
  private readonly ALPHA_NEAR: number = 0.65;
  private readonly ALPHA_FAR: number = 0.4;

  // Vertical arc parameters
  private readonly ARC_HEIGHT: number = 60; // max vertical offset for items at edge/back

  constructor(
    scene: Phaser.Scene,
    centerX: number,
    centerY: number,
    characters: CharacterDef[] = CHARACTERS
  ) {
    this.scene = scene;
    this.characters = characters;
    this.CAROUSEL_CENTER_X = centerX;
    this.CAROUSEL_CENTER_Y = centerY;

    // Create a container to hold all portrait images
    this.container = scene.add.container(0, 0);
  }

  /**
   * Initialize the carousel with the given starting character index.
   */
  public initialize(startIndex: number = 0): void {
    this.currentIndex = Math.max(0, Math.min(startIndex, this.characters.length - 1));
    this.renderCarousel();
  }

  /**
   * Calculate transform properties (position, scale, opacity, depth) for a character at a given offset.
   * Offset 0 = center, negative = left side, positive = right side.
   * Includes y-offset to create a vertical arc illusion.
   */
  private getTransformForOffset(offset: number): CarouselTransform {
    // Clamp to visible range for optimization
    const clampedOffset = Math.max(-this.MAX_VISIBLE_OFFSET, Math.min(offset, this.MAX_VISIBLE_OFFSET));

    // Use sin/cos curves to create a circular arrangement, bunching items toward the edges
    const angle = clampedOffset * this.ANGLE_STEP;
    const sinAngle = Math.sin(angle);
    const cosAngle = Math.cos(angle);

    // Position: x-offset proportional to sin(angle) * radius
    const xOffset = sinAngle * this.CAROUSEL_RADIUS;
    const x = this.CAROUSEL_CENTER_X + xOffset;

    // Vertical arc: items at offset 0 are at baseline (y = 0 offset),
    // items farther away (higher |offset|) are raised upward (negative y offset)
    // Use (1 - cos(angle)) to scale from 0 at center to higher values at edges
    const yOffset = -Math.max(0, (1 - cosAngle) * this.ARC_HEIGHT);
    const y = this.CAROUSEL_CENTER_Y + yOffset;

    // Scale and opacity proportional to cos(angle), so items recede into the background
    // cos(0) = 1.0, cos(±π/3) ≈ 0.5, cos(±2π/3) ≈ -0.5
    // We map [cos] values to our scale/opacity curves:
    // - offset 0: cos(0) = 1.0 → SCALE_CENTER (2.0) / ALPHA_CENTER (1.0)
    // - offset ±1: cos(±π/3) ≈ 0.5 → SCALE_NEAR (0.65) / ALPHA_NEAR (0.65)
    // - offset ±2: cos(±2π/3) ≈ -0.5 → SCALE_FAR (0.4) / ALPHA_FAR (0.4)
    const absOffset = Math.abs(clampedOffset);
    let scale: number;
    let alpha: number;

    if (absOffset === 0) {
      scale = this.SCALE_CENTER;
      alpha = this.ALPHA_CENTER;
    } else if (absOffset === 1) {
      scale = this.SCALE_NEAR;
      alpha = this.ALPHA_NEAR;
    } else {
      // absOffset >= 2
      scale = this.SCALE_FAR;
      alpha = this.ALPHA_FAR;
    }

    // Depth: center has highest, farther items have lower depth
    const depth = Math.max(0, 1000 - Math.abs(offset) * 100);

    return { x, y, scale, alpha, depth };
  }

  /**
   * Render or update all character portraits based on current carousel state.
   */
  private renderCarousel(): void {
    for (let i = 0; i < this.characters.length; i++) {
      const character = this.characters[i];
      const offset = this.getOffsetForIndex(i);

      // Skip rendering if outside visible range (optimization)
      if (Math.abs(offset) > this.MAX_VISIBLE_OFFSET) {
        if (this.portraits.has(character.id)) {
          this.portraits.get(character.id)!.setVisible(false);
        }
        continue;
      }

      const portrait = this.getOrCreatePortrait(character);

      const transform = this.getTransformForOffset(offset);
      portrait.setPosition(transform.x, transform.y);
      portrait.setScale(transform.scale);
      portrait.setAlpha(transform.alpha);
      portrait.setDepth(transform.depth);
      portrait.setVisible(true);
    }
  }

  private getOrCreatePortrait(character: CharacterDef): Phaser.GameObjects.Image {
    let portrait = this.portraits.get(character.id);
    if (!portrait) {
      portrait = this.scene.add.image(0, 0, `${character.id}-idle`);
      this.container.add(portrait);
      this.portraits.set(character.id, portrait);
    }
    return portrait;
  }

  /**
   * Get the offset of a character at a given index relative to the currently selected character.
   * Wraps around the array.
   */
  private getOffsetForIndex(index: number): number {
    const n = this.characters.length;
    let offset = index - this.currentIndex;
    // Normalize offset to [-n/2, n/2]
    if (offset > n / 2) {
      offset -= n;
    } else if (offset < -n / 2) {
      offset += n;
    }
    return offset;
  }

  /**
   * Rotate the carousel by the given direction (1 = next, -1 = previous).
   * Animates all portraits from current to new positions.
   */
  public rotateCarousel(direction: 1 | -1): void {
    // Debounce: don't rotate if already animating
    if (this.isAnimating) {
      return;
    }

    this.isAnimating = true;
    this.currentIndex = (this.currentIndex + direction + this.characters.length) % this.characters.length;

    // Animate each portrait to its new position
    const tweenCount = { total: 0, completed: 0 };

    for (let i = 0; i < this.characters.length; i++) {
      const character = this.characters[i];
      const newOffset = this.getOffsetForIndex(i);

      // Skip rendering if now outside visible range
      if (Math.abs(newOffset) > this.MAX_VISIBLE_OFFSET) {
        const portrait = this.portraits.get(character.id);
        portrait?.setVisible(false);
        continue;
      }

      const isNewPortrait = !this.portraits.has(character.id);
      const portrait = this.getOrCreatePortrait(character);
      portrait.setVisible(true);
      const newTransform = this.getTransformForOffset(newOffset);

      if (isNewPortrait) {
        portrait.setPosition(newTransform.x, newTransform.y);
        portrait.setScale(newTransform.scale);
        portrait.setAlpha(newTransform.alpha);
        portrait.setDepth(newTransform.depth);
        continue;
      }

      tweenCount.total++;
      this.scene.tweens.add({
        targets: portrait,
        x: newTransform.x,
        y: newTransform.y,
        scale: newTransform.scale,
        alpha: newTransform.alpha,
        depth: newTransform.depth,
        duration: this.TWEEN_DURATION,
        ease: this.TWEEN_EASE,
        onComplete: () => {
          tweenCount.completed++;
          if (tweenCount.completed >= tweenCount.total) {
            this.isAnimating = false;
          }
        },
      });
    }

    // If no tweens were created, unlock immediately
    if (tweenCount.total === 0) {
      this.isAnimating = false;
    }
  }

  /**
   * Get the currently selected character.
   */
  public getCurrentCharacter(): CharacterDef {
    return this.characters[this.currentIndex];
  }

  /**
   * Get the currently selected character index.
   */
  public getCurrentIndex(): number {
    return this.currentIndex;
  }

  /**
   * Update the texture/pose of a specific character portrait.
   * Useful for animating the center portrait or updating poses.
   */
  public setPortraitTexture(characterId: string, textureKey: string): void {
    const portrait = this.portraits.get(characterId);
    if (portrait) {
      portrait.setTexture(textureKey);
    }
  }

  /**
   * Set the scale factor for all portraits (e.g., to fit on screen).
   */
  public setGlobalScale(scale: number): void {
    this.portraits.forEach((portrait) => {
      const currentScale = portrait.scale;
      portrait.setScale(currentScale * scale);
    });
  }

  /**
   * Check if the carousel is currently animating.
   */
  public isCurrentlyAnimating(): boolean {
    return this.isAnimating;
  }

  /**
   * Clean up: destroy all portraits and the container.
   */
  public destroy(): void {
    this.container.destroy(true);
    this.portraits.clear();
  }
}
