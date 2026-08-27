import Phaser from 'phaser';

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  private readonly minX: number;
  private readonly maxX: number;
  private readonly speed: number;
  private direction: -1 | 1 = -1;

  constructor(scene: Phaser.Scene, x: number, y: number, patrolDistance: number, speed = 60) {
    super(scene, x, y, 'enemy');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.minX = x - patrolDistance / 2;
    this.maxX = x + patrolDistance / 2;
    this.speed = speed;

    this.setSize(24, 20);
    this.setOffset(4, 8);
  }

  update(): void {
    if (this.x <= this.minX) {
      this.direction = 1;
    } else if (this.x >= this.maxX) {
      this.direction = -1;
    }
    (this.body as Phaser.Physics.Arcade.Body).setVelocityX(this.speed * this.direction);
    this.setFlipX(this.direction > 0);
  }

  defeat(): void {
    (this.body as Phaser.Physics.Arcade.Body).enable = false;
    this.scene.tweens.add({
      targets: this,
      scaleY: 0.1,
      scaleX: 1.2,
      alpha: 0,
      duration: 200,
      onComplete: () => this.destroy(),
    });
  }
}
