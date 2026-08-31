import Phaser from 'phaser';

export class Projectile extends Phaser.Physics.Arcade.Sprite {
  private resolved = false;
  private readonly rotationSpeed: number;
  private readonly velocity = new Phaser.Math.Vector2();

  constructor(scene: Phaser.Scene, x: number, y: number, textureKey: string, targetX: number, targetY: number, speed: number, rotationSpeed: number, displaySize: number) {
    super(scene, x, y, textureKey);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    const direction = new Phaser.Math.Vector2(targetX - x, targetY - y).normalize();
    this.setDisplaySize(displaySize, displaySize);
    this.setSize(this.width * 0.78, this.height * 0.78);
    this.setOffset((this.width - body.width) / 2, (this.height - body.height) / 2);
    this.velocity.set(direction.x * speed, direction.y * speed);
    body.setVelocity(0, 0);
    this.rotationSpeed = rotationSpeed;
  }

  updateMotion(deltaMs: number): void {
    if (this.resolved) return;
    const deltaSeconds = deltaMs / 1000;
    this.x += this.velocity.x * deltaSeconds;
    this.y += this.velocity.y * deltaSeconds;
    (this.body as Phaser.Physics.Arcade.Body).reset(this.x, this.y);
    this.angle += this.rotationSpeed * deltaSeconds;
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
      angle: 180,
      alpha: 0,
      duration: 200,
      onComplete: () => this.destroy(),
    });
  }
}

