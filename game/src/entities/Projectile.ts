import Phaser from 'phaser';
import { COLLECTIBLE_RENDER_SCALE } from './Collectible';

export class Projectile extends Phaser.Physics.Arcade.Sprite {
  private resolved = false;
  private readonly velocity = new Phaser.Math.Vector2();
  private previousX: number;
  private previousY: number;

  constructor(scene: Phaser.Scene, x: number, y: number, textureKey: string, targetX: number, targetY: number, speed: number, _rotationSpeed: number, displaySize: number) {
    super(scene, x, y, textureKey);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    const direction = new Phaser.Math.Vector2(targetX - x, targetY - y).normalize();
    this.setDisplaySize(displaySize * COLLECTIBLE_RENDER_SCALE * 1.5, displaySize * COLLECTIBLE_RENDER_SCALE * 1.5);
    this.setSize(this.width * 0.78, this.height * 0.78);
    this.setOffset((this.width - body.width) / 2, (this.height - body.height) / 2);
    this.velocity.set(direction.x * speed, direction.y * speed);
    body.setVelocity(0, 0);
    this.previousX = x;
    this.previousY = y;
  }

  updateMotion(deltaMs: number): void {
    if (this.resolved) return;
    const deltaSeconds = deltaMs / 1000;
    this.previousX = this.x;
    this.previousY = this.y;
    this.x += this.velocity.x * deltaSeconds;
    this.y += this.velocity.y * deltaSeconds;
    (this.body as Phaser.Physics.Arcade.Body).reset(this.x, this.y);
  }

  getSweptBodyBounds(): Phaser.Geom.Rectangle {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const deltaX = this.x - this.previousX;
    const deltaY = this.y - this.previousY;
    return new Phaser.Geom.Rectangle(
      Math.min(body.x, body.x - deltaX),
      Math.min(body.y, body.y - deltaY),
      body.width + Math.abs(deltaX),
      body.height + Math.abs(deltaY)
    );
  }

  get isResolved(): boolean {
    return this.resolved;
  }

  // Missed the parry window (or didn't attempt one) - destroyed, no reward, costs a hit.
  resolveHit(): void {
    if (this.resolved) return;
    this.resolved = true;
    (this.body as Phaser.Physics.Arcade.Body).enable = false;
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scale: 0.6,
      duration: 150,
      onComplete: () => this.destroy(),
    });
  }

  resolveParried(): void {
    if (this.resolved) return;
    this.resolved = true;
    (this.body as Phaser.Physics.Arcade.Body).enable = false;
    this.scene.tweens.add({
      targets: this,
      scale: 1.6,
      alpha: 0,
      duration: 200,
      onComplete: () => this.destroy(),
    });
  }
}

