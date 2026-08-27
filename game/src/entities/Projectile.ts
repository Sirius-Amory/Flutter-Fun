import Phaser from 'phaser';

// A rank-themed workplace-annoyance hazard: spawned ahead of the player and drifts left at a
// rank-tuned speed. Resolved exactly once, either by a hit (no reward) or a timed parry (bonus token).
export class Projectile extends Phaser.Physics.Arcade.Sprite {
  private resolved = false;

  constructor(scene: Phaser.Scene, x: number, y: number, textureKey: string, speed: number) {
    super(scene, x, y, textureKey);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setVelocityX(-speed);
    this.setSize(22, 22);
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

