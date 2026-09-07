import Phaser from 'phaser';
import { TokenMotion, type TokenMotionConfig } from './TokenMotion';

export const PROMOTION_TOKEN_TEXTURE_KEY = 'token-promotion';
export const COLLECTIBLE_RENDER_SCALE = 2;

export class Collectible extends Phaser.Physics.Arcade.Sprite {
  readonly isPromotion: boolean;
  private readonly motion: TokenMotion;

  constructor(scene: Phaser.Scene, x: number, y: number, textureKey: string, motionConfig: TokenMotionConfig, displaySize: number, isPromotion = false) {
    super(scene, x, y, textureKey);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    (this.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    this.isPromotion = isPromotion;
    const size = (isPromotion ? displaySize * 1.25 : displaySize) * COLLECTIBLE_RENDER_SCALE;
    this.setScale(size / Math.max(this.width, this.height));
    this.setSize(this.width, this.height);
    this.setOffset(0, 0);
    this.motion = new TokenMotion(this, x, y, motionConfig);
    this.setDepth(4);
  }

  updateMotion(deltaMs: number): void {
    this.motion.update(deltaMs);
  }

  collect(onComplete: () => void): void {
    (this.body as Phaser.Physics.Arcade.Body).enable = false;
    this.scene.tweens.add({
      targets: this,
      scale: 1.6,
      alpha: 0,
      duration: 150,
      onComplete: () => {
        this.destroy();
        onComplete();
      },
    });
  }
}
