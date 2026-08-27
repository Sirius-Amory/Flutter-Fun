import Phaser from 'phaser';
import { getCharacterById, type CharacterDef } from '../data/characters';

const MOVE_SPEED = 200;
const JUMP_VELOCITY = -480;
const MAX_JUMPS = 2;
const PARRY_KEY_CODES = ['SHIFT', 'X'];
// Display height in px that every character (regardless of its source art's native resolution)
// is scaled to, so swapping character packs never requires re-tuning gameplay feel.
const PLAYER_TARGET_HEIGHT = 42;

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
}

export class Player extends Phaser.Physics.Arcade.Sprite {
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd: WasdKeys;
  private parryKeys: Phaser.Input.Keyboard.Key[];
  private characterId: string;
  private jumpsRemaining = MAX_JUMPS;
  private isInvincible = false;
  private baseScale = 1;
  private rankScale = 1;
  private parryWindowSeconds: number;
  private parryTimeRemaining = 0;

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
    this.setSize(bodyWidth, bodyHeight);
    this.setOffset((this.width - bodyWidth) / 2, this.height - bodyHeight);
    this.setScale(this.baseScale);

    this.setBounce(0.05);
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

    this.setScale(this.baseScale * this.rankScale);
    this.play(`${this.characterId}-${this.pickAnimationKey(body, left || right)}`, true);
  }

  // Highest-priority state wins: getting hit/parrying is more important to read than locomotion.
  private pickAnimationKey(body: Phaser.Physics.Arcade.Body, movingHorizontally: boolean): string {
    if (this.isInvincible) return 'hurt';
    if (this.parryTimeRemaining > 0) return 'kick';
    if (!body.blocked.down) return body.velocity.y < 0 ? 'jump' : 'fall';
    return movingHorizontally ? 'walk' : 'idle';
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


