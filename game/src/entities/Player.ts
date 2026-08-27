import Phaser from 'phaser';

const MOVE_SPEED = 200;
const JUMP_VELOCITY = -480;
const MAX_JUMPS = 2;

type WasdKeys = {
  W: Phaser.Input.Keyboard.Key;
  A: Phaser.Input.Keyboard.Key;
  S: Phaser.Input.Keyboard.Key;
  D: Phaser.Input.Keyboard.Key;
};

export class Player extends Phaser.Physics.Arcade.Sprite {
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd: WasdKeys;
  private jumpsRemaining = MAX_JUMPS;
  private isInvincible = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'player');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Pits are a death condition, so the player must be able to fall past the world bounds.
    this.setCollideWorldBounds(false);
    this.setBounce(0.05);
    this.setSize(20, 28);
    this.setOffset(6, 4);
    this.setDepth(10);

    this.cursors = scene.input.keyboard!.createCursorKeys();
    this.wasd = scene.input.keyboard!.addKeys('W,A,S,D') as unknown as WasdKeys;
  }

  update(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const left = this.cursors.left.isDown || this.wasd.A.isDown;
    const right = this.cursors.right.isDown || this.wasd.D.isDown;
    const jumpJustPressed =
      Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
      Phaser.Input.Keyboard.JustDown(this.wasd.W) ||
      Phaser.Input.Keyboard.JustDown(this.cursors.space);

    if (left) {
      body.setVelocityX(-MOVE_SPEED);
      this.setFlipX(true);
    } else if (right) {
      body.setVelocityX(MOVE_SPEED);
      this.setFlipX(false);
    } else {
      body.setVelocityX(0);
    }

    if (body.blocked.down) {
      this.jumpsRemaining = MAX_JUMPS;
    }

    if (jumpJustPressed && this.jumpsRemaining > 0) {
      body.setVelocityY(JUMP_VELOCITY);
      this.jumpsRemaining -= 1;
    }

    // simple squash/stretch for a bit of game feel while airborne
    this.setScale(body.blocked.down ? 1 : 0.9, body.blocked.down ? 1 : 1.1);
  }

  bounceOffEnemy(): void {
    (this.body as Phaser.Physics.Arcade.Body).setVelocityY(-300);
  }

  get invincible(): boolean {
    return this.isInvincible;
  }

  playHitFlash(): void {
    if (this.isInvincible) return;
    this.isInvincible = true;
    this.scene.tweens.add({
      targets: this,
      alpha: 0.3,
      duration: 100,
      yoyo: true,
      repeat: 5,
      onComplete: () => {
        this.alpha = 1;
        this.isInvincible = false;
      },
    });
  }

  resetForRespawn(): void {
    this.isInvincible = false;
    this.alpha = 1;
    this.jumpsRemaining = MAX_JUMPS;
  }
}
