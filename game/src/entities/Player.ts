import Phaser from 'phaser';

const MOVE_SPEED = 200;
const JUMP_VELOCITY = -480;
const MAX_JUMPS = 2;
const PARRY_KEY_CODES = ['SHIFT', 'X'];
const PARRY_TINT = 0x9be8ff;

type WasdKeys = {
  W: Phaser.Input.Keyboard.Key;
  A: Phaser.Input.Keyboard.Key;
  S: Phaser.Input.Keyboard.Key;
  D: Phaser.Input.Keyboard.Key;
};

export class Player extends Phaser.Physics.Arcade.Sprite {
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd: WasdKeys;
  private parryKeys: Phaser.Input.Keyboard.Key[];
  private jumpsRemaining = MAX_JUMPS;
  private isInvincible = false;
  private rankScale = 1;
  private parryWindowSeconds: number;
  private parryTimeRemaining = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, initialParryWindowSeconds: number) {
    super(scene, x, y, 'player');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setBounce(0.05);
    this.setSize(20, 28);
    this.setOffset(6, 4);
    this.setDepth(10);
    this.parryWindowSeconds = initialParryWindowSeconds;

    this.cursors = scene.input.keyboard!.createCursorKeys();
    this.wasd = scene.input.keyboard!.addKeys('W,A,S,D') as unknown as WasdKeys;
    this.parryKeys = PARRY_KEY_CODES.map((code) => scene.input.keyboard!.addKey(code));
  }

  update(deltaMs: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const left = this.cursors.left.isDown || this.wasd.A.isDown;
    const right = this.cursors.right.isDown || this.wasd.D.isDown;
    const jumpJustPressed =
      Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
      Phaser.Input.Keyboard.JustDown(this.wasd.W) ||
      Phaser.Input.Keyboard.JustDown(this.cursors.space);
    const parryJustPressed = this.parryKeys.some((key) => Phaser.Input.Keyboard.JustDown(key));

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

    if (parryJustPressed) {
      this.parryTimeRemaining = this.parryWindowSeconds;
    } else if (this.parryTimeRemaining > 0) {
      this.parryTimeRemaining = Math.max(0, this.parryTimeRemaining - deltaMs / 1000);
    }
    this.setTint(this.parryTimeRemaining > 0 ? PARRY_TINT : 0xffffff);

    // simple squash/stretch for a bit of game feel while airborne, layered on the current rank scale
    const squashX = body.blocked.down ? 1 : 0.9;
    const squashY = body.blocked.down ? 1 : 1.1;
    this.setScale(this.rankScale * squashX, this.rankScale * squashY);
  }

  get isParrying(): boolean {
    return this.parryTimeRemaining > 0;
  }

  setParryWindowSeconds(seconds: number): void {
    this.parryWindowSeconds = seconds;
  }

  // Arcade Body auto-scales its size/offset from the parent sprite's scale, so growing the
  // hitbox with rank is just a matter of growing the sprite.
  setRankScale(scale: number): void {
    this.rankScale = scale;
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
}

