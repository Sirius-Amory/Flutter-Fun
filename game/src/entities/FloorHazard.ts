import Phaser from 'phaser';

const FLOOR_HAZARD_MAX_DIMENSION = 92 * 6;
export const FLOOR_HAZARD_SCROLL_FACTOR = 1.15;

export class FloorHazard extends Phaser.Physics.Arcade.Sprite {
  constructor(scene: Phaser.Scene, x: number, y: number, textureKey: string) {
    super(scene, x, y, textureKey);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setImmovable(true);
    const bodyWidth = this.width * 0.8;
    const bodyHeight = this.height * 0.65;
    this.setSize(bodyWidth, bodyHeight);
    this.setOffset((this.width - bodyWidth) / 2, this.height - bodyHeight);
    this.setScale(FLOOR_HAZARD_MAX_DIMENSION / Math.max(this.width, this.height));
    this.setPosition(x, y - this.displayHeight / 2);
    body.updateFromGameObject();
    this.setScrollFactor(FLOOR_HAZARD_SCROLL_FACTOR);
    this.setDepth(5);
  }
}