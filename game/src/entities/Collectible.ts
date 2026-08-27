import Phaser from 'phaser';

export const REGULAR_TOKEN_TEXTURE_KEYS = ['token-coffee', 'token-feedback', 'token-raise', 'token-checkmark'] as const;
export const PROMOTION_TOKEN_TEXTURE_KEY = 'token-promotion';

export class Collectible extends Phaser.Physics.Arcade.Sprite {
  readonly isPromotion: boolean;

  constructor(scene: Phaser.Scene, x: number, y: number, textureKey: string, isPromotion = false) {
    super(scene, x, y, textureKey);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    (this.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    this.isPromotion = isPromotion;

    scene.tweens.add({
      targets: this,
      y: y - 8,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    scene.tweens.add({
      targets: this,
      angle: 360,
      duration: 2000,
      repeat: -1,
    });
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
