import Phaser from 'phaser';
import { getCharacterById, type CharacterDef } from '../data/characters';
import { PLAYER_HEIGHT, PLAYER_JUMP_VELOCITY, PLAYER_MAX_JUMPS, PLAYER_MOVE_SPEED } from '../data/movementTuning';

const PARRY_KEY_CODES = ['X'];
const PARRY_RECOVERY_SECONDS = 0.18;
// Display height in px that every character (regardless of its source art's native resolution)
// is scaled to, so swapping character packs never requires re-tuning gameplay feel.
const PLAYER_TARGET_HEIGHT = PLAYER_HEIGHT;

type WasdKeys = {
  W: Phaser.Input.Keyboard.Key;
  A: Phaser.Input.Keyboard.Key;
  S: Phaser.Input.Keyboard.Key;
  D: Phaser.Input.Keyboard.Key;
};

// Registers each character's pose-based anims once (they're global to the Game instance and
// would otherwise throw "animation already exists" when Player is reconstructed on scene restart).
function ensureCharacterAnimations(scene: Phaser.Scene, character: CharacterDef): void {
  if (scene.anims.exists(`${character.id}-idle`)) return;

  const frame = (key: string) => ({ key });
  scene.anims.create({ key: `${character.id}-idle`, frames: [frame(`${character.id}-idle`)], frameRate: 1, repeat: -1 });
  scene.anims.create({
    key: `${character.id}-walk`,
    frames: [frame(`${character.id}-walk1`), frame(`${character.id}-walk2`)],
    frameRate: 7,
    repeat: -1,
  });
  scene.anims.create({ key: `${character.id}-jump`, frames: [frame(`${character.id}-jump`)], frameRate: 1, repeat: -1 });
  scene.anims.create({ key: `${character.id}-fall`, frames: [frame(`${character.id}-fall`)], frameRate: 1, repeat: -1 });
  scene.anims.create({ key: `${character.id}-kick`, frames: [frame(`${character.id}-kick`)], frameRate: 1, repeat: -1 });
  scene.anims.create({ key: `${character.id}-hurt`, frames: [frame(`${character.id}-hurt`)], frameRate: 1, repeat: -1 });
  scene.anims.create({ key: `${character.id}-duck`, frames: [frame(`${character.id}-duck`)], frameRate: 1, repeat: -1 });
}

export class Player extends Phaser.Physics.Arcade.Sprite {
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd: WasdKeys;
  private parryKeys: Phaser.Input.Keyboard.Key[];
  private crouchKey: Phaser.Input.Keyboard.Key;
  private characterId: string;
  private jumpsRemaining = PLAYER_MAX_JUMPS;
  private isInvincible = false;
  private baseScale = 1;
  private rankScale = 1;
  private parryWindowSeconds: number;
  private parryTimeRemaining = 0;
  private parryRecoveryTimeRemaining = 0;
  private parrySucceeded = false;
  private hasMoved = false;
  private movementDirection = 0;
  private readonly standingBodyWidth: number;
  private readonly standingBodyHeight: number;
  private isCrouching = false;

  constructor(scene: Phaser.Scene, x: number, y: number, initialParryWindowSeconds: number, characterId: string) {
    const character = getCharacterById(characterId);
    super(scene, x, y, `${character.id}-idle`);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.characterId = character.id;
    ensureCharacterAnimations(scene, character);

    // this.width/height reflect the native loaded texture at this point (scale is still 1),
    // so they're the right basis for both the display scale and the unscaled hitbox.
    this.baseScale = PLAYER_TARGET_HEIGHT / this.height;
    const bodyWidth = this.width * 0.5;
    const bodyHeight = this.height * 0.85;
    const body = this.body as Phaser.Physics.Arcade.Body;
    this.standingBodyWidth = bodyWidth;
    this.standingBodyHeight = bodyHeight;
    this.setSize(bodyWidth, bodyHeight);
    this.setOffset((this.width - bodyWidth) / 2, this.height - bodyHeight);
    this.setScale(this.baseScale);

    this.setBounce(0.05);
    body.setCollideWorldBounds(true);
    this.setDepth(10);
    this.parryWindowSeconds = initialParryWindowSeconds;

    this.cursors = scene.input.keyboard!.createCursorKeys();
    this.wasd = scene.input.keyboard!.addKeys('W,A,S,D') as unknown as WasdKeys;
    this.parryKeys = PARRY_KEY_CODES.map((code) => scene.input.keyboard!.addKey(code));
    this.crouchKey = scene.input.keyboard!.addKey('CTRL');
  }

  update(deltaMs: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const leftPressed = Phaser.Input.Keyboard.JustDown(this.cursors.left) || Phaser.Input.Keyboard.JustDown(this.wasd.A);
    const rightPressed = Phaser.Input.Keyboard.JustDown(this.cursors.right) || Phaser.Input.Keyboard.JustDown(this.wasd.D);
    const jumpJustPressed =
      Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
      Phaser.Input.Keyboard.JustDown(this.wasd.W) ||
      Phaser.Input.Keyboard.JustDown(this.cursors.space);
    const parryJustPressed = this.parryKeys.some((key) => Phaser.Input.Keyboard.JustDown(key));
    const crouching = this.crouchKey.isDown && body.blocked.down;

    if (leftPressed) {
      this.hasMoved = true;
      this.movementDirection = this.movementDirection === -1 ? 0 : -1;
      this.setFlipX(true);
    } else if (rightPressed) {
      this.hasMoved = true;
      this.movementDirection = this.movementDirection === 1 ? 0 : 1;
      this.setFlipX(false);
    }
    body.setVelocityX(this.movementDirection * PLAYER_MOVE_SPEED);

    if (body.blocked.down) {
      this.jumpsRemaining = PLAYER_MAX_JUMPS;
    }

    if (jumpJustPressed && this.jumpsRemaining > 0) {
      this.hasMoved = true;
      body.setVelocityY(PLAYER_JUMP_VELOCITY);
      this.jumpsRemaining -= 1;
    }

    if (this.parryRecoveryTimeRemaining > 0) {
      this.parryRecoveryTimeRemaining = Math.max(0, this.parryRecoveryTimeRemaining - deltaMs / 1000);
    }

    if (parryJustPressed && this.parryTimeRemaining <= 0 && this.parryRecoveryTimeRemaining <= 0) {
      this.parryTimeRemaining = this.parryWindowSeconds;
      this.parrySucceeded = false;
    } else if (this.parryTimeRemaining > 0) {
      this.parryTimeRemaining = Math.max(0, this.parryTimeRemaining - deltaMs / 1000);
      if (this.parryTimeRemaining === 0 && !this.parrySucceeded) {
        this.parryRecoveryTimeRemaining = PARRY_RECOVERY_SECONDS;
      }
    }

    if (this.isCrouching !== crouching) {
      this.isCrouching = crouching;
      this.updateCrouchBody();
    }
    this.setScale(this.baseScale * this.rankScale);
    if (this.isInvincible) this.setTint(0xff5c5c);
    else if (this.isParrying) this.setTint(0x55e8ff);
    else this.clearTint();
    this.play(`${this.characterId}-${this.pickAnimationKey(body, this.movementDirection !== 0)}`, true);
  }

  private updateCrouchBody(): void {
    const height = this.isCrouching ? this.standingBodyHeight * 0.58 : this.standingBodyHeight;
    this.setSize(this.standingBodyWidth, height);
    this.setOffset((this.width - this.standingBodyWidth) / 2, this.height - height);
  }

  // Highest-priority state wins: getting hit/parrying is more important to read than locomotion.
  private pickAnimationKey(body: Phaser.Physics.Arcade.Body, movingHorizontally: boolean): string {
    if (this.isInvincible) return 'hurt';
    if (this.parryTimeRemaining > 0) return 'kick';
    if (this.isCrouching) return 'duck';
    if (!body.blocked.down) return body.velocity.y < 0 ? 'jump' : 'fall';
    return movingHorizontally ? 'walk' : 'idle';
  }

  get isParrying(): boolean {
    return this.parryTimeRemaining > 0;
  }

  confirmParrySuccess(): void {
    if (!this.isParrying) return;
    this.parrySucceeded = true;
    this.parryRecoveryTimeRemaining = 0;
  }

  get startedMoving(): boolean {
    return this.hasMoved;
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
      duration: 50,
      yoyo: true,
      repeat: 2,
      onComplete: () => {
        this.alpha = 1;
        this.isInvincible = false;
      },
    });
  }
}


