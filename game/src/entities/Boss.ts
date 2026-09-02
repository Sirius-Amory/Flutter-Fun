import Phaser from 'phaser';

export type BossState = 'standstill' | 'telegraph' | 'attack' | 'staggered';

export const BOSS_TELEGRAPH_DURATION_MS = 1000;

export interface BossConfig {
  maxHealth: number;
  standstillDurationMs: number;
  attackDurationMs: number;
  staggerDurationMs: number;
  projectileSpeed: number;
  attackPattern: 'single' | 'spread';
}

// Default boss configuration - indexed by rank
export const BOSS_CONFIGS: Record<number, BossConfig> = {
  1: {
    maxHealth: 3,
    standstillDurationMs: 4000,
    attackDurationMs: 1000,
    staggerDurationMs: 400,
    projectileSpeed: 400,
    attackPattern: 'single',
  },
  2: {
    maxHealth: 4,
    standstillDurationMs: 4000,
    attackDurationMs: 1000,
    staggerDurationMs: 350,
    projectileSpeed: 440,
    attackPattern: 'single',
  },
  3: {
    maxHealth: 4,
    standstillDurationMs: 4000,
    attackDurationMs: 1000,
    staggerDurationMs: 350,
    projectileSpeed: 480,
    attackPattern: 'spread',
  },
  4: {
    maxHealth: 5,
    standstillDurationMs: 4000,
    attackDurationMs: 1000,
    staggerDurationMs: 300,
    projectileSpeed: 520,
    attackPattern: 'spread',
  },
  5: {
    maxHealth: 5,
    standstillDurationMs: 4000,
    attackDurationMs: 1000,
    staggerDurationMs: 300,
    projectileSpeed: 560,
    attackPattern: 'spread',
  },
};

export const BOSS_SCALE_MULTIPLIER = 0.55;

// Per-texture width scaling to normalize inconsistent source dimensions
const TEXTURE_SCALE_ADJUSTMENTS: Record<string, number> = {
  'boss-idle2': 0.594,
  'boss-walk1': 0.771,
  'boss-walk2': 0.771,
  'boss-attack': 0.52,
  'boss-staggered': 0.546,
};

export class Boss extends Phaser.Physics.Arcade.Sprite {
  private bossState: BossState = 'standstill';
  private health: number;
  private readonly maxHealth: number;
  private readonly config: BossConfig;
  private stateTimer = 0;
  private isStaggered = false;
  private canAttack = true;
  private baseScaleFactor: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    rankIndex: number,
    playerScaleFactor: number,
  ) {
    super(scene, x, y, 'boss-idle');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    const config = BOSS_CONFIGS[Math.min(rankIndex, 5)] || BOSS_CONFIGS[5];
    this.config = config;
    this.maxHealth = config.maxHealth;
    this.health = config.maxHealth;
    this.baseScaleFactor = playerScaleFactor;

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setImmovable(true);

    // Apply boss scale multiplier relative to player's current scale factor
    const bossDisplayScale = playerScaleFactor * BOSS_SCALE_MULTIPLIER;
    this.setScale(bossDisplayScale);

    // Hitbox: use a smaller manual size (silhouette-based, not full bounding box)
    // At 128x128 source, the attacking silhouette is roughly 60% of width/height
    const hitboxWidth = 128 * 0.6;
    const hitboxHeight = 128 * 0.7;
    this.setSize(hitboxWidth, hitboxHeight);
    // Center hitbox on sprite using origin
    this.setOrigin(0.5, 0.5);
    this.setOffset(0, 0);

    this.setDepth(5);
    this.setTexture('boss-idle2');
    this.bossState = 'standstill';
    this.stateTimer = this.config.standstillDurationMs + Phaser.Math.Between(-1000, 1000);
    this.applyTextureScale('boss-idle2');
  }

  update(deltaMs: number): void {
    if (this.isStaggered) return;

    this.stateTimer -= deltaMs;

    switch (this.bossState) {
      case 'standstill':
        if (this.stateTimer <= 0) {
          this.transitionToTelegraph();
        }
        break;

      case 'telegraph':
        if (this.stateTimer <= 0) {
          this.transitionToAttack();
        }
        break;

      case 'attack':
        if (this.stateTimer <= 0) {
          this.transitionToStandstill();
        }
        break;
    }
  }

  private transitionToTelegraph(): void {
    this.bossState = 'telegraph';
    this.setTexture('boss-telegraph');
    this.applyTextureScale('boss-telegraph');
    this.stateTimer = BOSS_TELEGRAPH_DURATION_MS;
    this.canAttack = false;
  }

  private transitionToAttack(): void {
    this.bossState = 'attack';
    this.setTexture('boss-attack');
    this.applyTextureScale('boss-attack');
    this.stateTimer = this.config.attackDurationMs;
    this.canAttack = true;
  }

  private transitionToStandstill(): void {
    this.bossState = 'standstill';
    this.setTexture('boss-idle2');
    this.applyTextureScale('boss-idle2');
    this.stateTimer = this.config.standstillDurationMs + Phaser.Math.Between(-1000, 1000);
  }

  finishWalkIn(): void {
    this.anims.stop();
    this.bossState = 'standstill';
    this.stateTimer = this.config.standstillDurationMs + Phaser.Math.Between(-1000, 1000);
    this.setTexture('boss-idle2');
    this.applyTextureScale('boss-idle2');
  }

  takeDamage(amount = 1): boolean {
    if (this.isStaggered) return false;

    this.health = Math.max(0, this.health - amount);
    this.isStaggered = true;

    // Play stagger animation
    this.setTexture('boss-staggered');
    this.applyTextureScale('boss-staggered');
    this.setTint(0xff6b6b);

    this.scene.time.delayedCall(this.config.staggerDurationMs, () => {
      if (this.active) {
        this.isStaggered = false;
        this.clearTint();
        if (this.bossState === 'standstill') {
          this.setTexture('boss-idle2');
          this.applyTextureScale('boss-idle2');
        } else if (this.bossState === 'attack') {
          this.setTexture('boss-attack');
          this.applyTextureScale('boss-attack');
        } else if (this.bossState === 'telegraph') {
          this.setTexture('boss-telegraph');
          this.applyTextureScale('boss-telegraph');
        }
      }
    });

    if (this.health <= 0) {
      return true;
    }

    return false;
  }

  private applyTextureScale(textureKey: string): void {
    const scaleFactor = TEXTURE_SCALE_ADJUSTMENTS[textureKey] || 1.0;
    const bossDisplayScale = this.baseScaleFactor * BOSS_SCALE_MULTIPLIER * scaleFactor;
    this.setScale(bossDisplayScale);
  }

  getState(): BossState {
    return this.bossState;
  }

  canFireAttack(): boolean {
    return this.bossState === 'attack' && this.canAttack;
  }

  consumeAttack(): void {
    this.canAttack = false;
  }

  getHealth(): number {
    return Math.max(0, this.health);
  }

  getMaxHealth(): number {
    return this.maxHealth;
  }

  getConfig(): BossConfig {
    return this.config;
  }


}
