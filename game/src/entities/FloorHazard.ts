import Phaser from 'phaser';

const FLOOR_HAZARD_MAX_DIMENSION = 92 * 6;
export const FLOOR_HAZARD_SCROLL_FACTOR = 1.15;
const PARALLAX_DELTA = FLOOR_HAZARD_SCROLL_FACTOR - 1;
const BODY_WIDTH_RATIO = 0.8;
const BODY_HEIGHT_RATIO = 0.65;

export class FloorHazard extends Phaser.Physics.Arcade.Sprite {
  private anchorX: number;
  private readonly anchorY: number;

  constructor(scene: Phaser.Scene, anchorX: number, anchorBaseY: number, textureKey: string) {
    super(scene, anchorX, anchorBaseY, textureKey);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setImmovable(true);
    // Position is driven manually via updateParallax(), not by Arcade's own
    // integration — this stops postUpdate() from writing a "drift" delta
    // back onto the sprite every frame.
    body.moves = false;

    const bodyWidth = this.width * BODY_WIDTH_RATIO;
    const bodyHeight = this.height * BODY_HEIGHT_RATIO;
    this.setSize(bodyWidth, bodyHeight);
    this.setOffset((this.width - bodyWidth) / 2, this.height - bodyHeight);
    this.setScale(FLOOR_HAZARD_MAX_DIMENSION / Math.max(this.width, this.height));

    // anchorX/Y is the hazard's position in "background space" — the scene
    // picks it so that, once parallaxed, the hazard lines up on screen the
    // way it used to when it had scrollFactor 1.15.
    this.anchorX = anchorX;
    this.anchorY = anchorBaseY - this.displayHeight / 2;

    this.setScrollFactor(1); // physics lives in scrollFactor-1 space; fake the parallax below
    this.setDepth(5);
    this.updateParallax(scene.cameras.main);
  }

  updateParallax(camera: Phaser.Cameras.Scene2D.Camera): void {
    this.setPosition(
      this.anchorX - camera.scrollX * PARALLAX_DELTA,
      this.anchorY - camera.scrollY * PARALLAX_DELTA
    );
    (this.body as Phaser.Physics.Arcade.Body | null)?.updateFromGameObject();
  }

  /** Shift the anchor (used once, at spawn, to push a hazard fully off-screen). */
  nudgeAnchorX(amount: number, camera: Phaser.Cameras.Scene2D.Camera): void {
    this.anchorX += amount;
    this.updateParallax(camera);
  }
}