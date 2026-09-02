import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Projectile } from '../entities/Projectile';
import { Boss } from '../entities/Boss';
import { COLLECTIBLE_RENDER_SCALE, Collectible } from '../entities/Collectible';
import {
  FINAL_RANK_INDEX,
  FINAL_DISTANCE,
  OBSTACLE_SPEED_MULTIPLIER,
  RANKS,
  type RankConfig,
} from '../data/rankConfig';
import { DOUBLE_JUMP_APEX_HEIGHT, SINGLE_JUMP_APEX_HEIGHT } from '../data/movementTuning';
import {
  OBSTACLE_TEXTURE_KEYS,
  PROMOTION_OPPORTUNITY_ASSET,
  PROMOTION_TOKEN_ASSET,
  REGULAR_TOKEN_TEXTURE_KEYS,
} from '../data/gameAssets';
import type { TokenMotionPattern } from '../entities/TokenMotion';
import { GameState } from '../state/GameState';
import { eventBus, GameEvents } from '../events';
import { playSfx } from '../audio/SfxManager';
import { startBackgroundMusic } from '../audio/MusicManager';
import { createButton } from '../ui/createButton';

const WORLD_HEIGHT = 900;
const GROUND_Y = 820;
const GROUND_TOP_Y = GROUND_Y - 16;
const PLAYER_START_X = 320;
const PLAYER_START_Y = 560;
const PLAYER_CAMERA_SCREEN_RATIO = 1 / 3;
const SPAWN_MARGIN_X = 120;
const CLEANUP_MARGIN_X = 120;
const BACKGROUND_ASPECT_RATIO = 3168 / 1344;
const BACKGROUND_SCROLL_FACTOR = 1.35;
const MIN_SPAWN_DISTANCE = 140;
const TOKEN_APEX_CLEARANCE = 8;
const BOSS_PROJECTILE_MIN_INTERVAL_MS = 400;
const BOSS_PROJECTILE_MAX_INTERVAL_MS = 1000;
const BOSS_PROJECTILE_SPEED_MULTIPLIER = 2.5;
const BOSS_PARRY_WINDOW_MULTIPLIER = 0.5;
const BOSS_DARKEN_DURATION_MS = 2000;
const BACKGROUND_NORMAL_ALPHA = 0.72;
const BOSS_BACKGROUND_ALPHA = 0.15;
const DEBUG_START_BOSS_ENCOUNTER = true;
// Long enough for the full A1->G2 climb (see rankConfig.ts) plus spawn-ahead/cleanup buffer.
const WORLD_WIDTH = PLAYER_START_X + FINAL_DISTANCE + 2000;

export class SurviveScene extends Phaser.Scene {
  private player!: Player;
  private obstacles!: Phaser.Physics.Arcade.Group;
  private tokens!: Phaser.Physics.Arcade.Group;
  private bossProjectiles!: Phaser.Physics.Arcade.Group;
  private state!: GameState;
  private obstacleSpawnAccumulator = 0;
  private obstacleSpawnInterval = 0;
  private tokenSpawnAccumulator = 0;
  private isEnding = false;
  private officeBackgrounds: Phaser.GameObjects.Image[] = [];

  // Boss encounter state
  private boss: Boss | null = null;
  private inBossEncounter = false;
  private nextRankForBoss = -1;
  private bossProjectileSpawnAccumulator = 0;
  private nextBossProjectileDelayMs = 0;
  private bossWasAttacking = false;
  private bossDefeatSequenceActive = false;

  // Boss health bar UI
  private healthBarBackground: Phaser.GameObjects.Rectangle | null = null;
  private healthBarFill: Phaser.GameObjects.Rectangle | null = null;
  private healthBarLabel: Phaser.GameObjects.Text | null = null;
  private healthBarContainer: Phaser.GameObjects.Container | null = null;

  constructor() {
    super('Survive');
  }

  init(): void {
    this.isEnding = false;
    this.obstacleSpawnAccumulator = 0;
    this.obstacleSpawnInterval = 0;
    this.tokenSpawnAccumulator = 0;
    this.inBossEncounter = false;
    this.nextRankForBoss = -1;
    this.boss = null;
    this.bossProjectileSpawnAccumulator = 0;
    this.nextBossProjectileDelayMs = 0;
    this.bossWasAttacking = false;
    this.bossDefeatSequenceActive = false;
    this.healthBarBackground = null;
    this.healthBarFill = null;
    this.healthBarLabel = null;
    this.healthBarContainer = null;
  }

  create(): void {
    // Every (re)start is a fresh career: age 20 / rank A1 / distance 0, per the game design.
    this.state = new GameState(this.registry);
    this.state.reset();

    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBackgroundColor(0x000000);
    this.buildOfficeBackground();

    const ground = this.physics.add.staticGroup();
    const groundCollider = this.add.rectangle(WORLD_WIDTH / 2, GROUND_Y, WORLD_WIDTH, 32, 0xffffff, 0);
    this.physics.add.existing(groundCollider, true);
    ground.add(groundCollider);

    this.player = new Player(
      this,
      PLAYER_START_X,
      PLAYER_START_Y,
      this.state.rank.parryWindowSeconds,
      this.state.characterId
    );
    this.cameras.main.setFollowOffset(-this.scale.width * (0.5 - PLAYER_CAMERA_SCREEN_RATIO), -140);
    this.cameras.main.startFollow(this.player, true, 1, 1);
    const quitButton = createButton(this, this.scale.width - 70, 72, 'Quit', () => {
      this.scene.stop('HUD');
      this.scene.start('MainMenu');
    });
    quitButton.setScrollFactor(0).setDepth(110);

    this.obstacles = this.physics.add.group({ allowGravity: false });
    this.tokens = this.physics.add.group({ allowGravity: false });
    this.bossProjectiles = this.physics.add.group({ allowGravity: false });

    this.physics.add.collider(this.player, ground);
    this.physics.add.overlap(this.player, this.obstacles, this.handleObstacleOverlap, undefined, this);
    this.physics.add.overlap(this.player, this.tokens, this.handleTokenOverlap, undefined, this);
    this.physics.add.overlap(this.player, this.bossProjectiles, this.handleBossProjectileOverlap, undefined, this);

    this.scene.launch('HUD');

    startBackgroundMusic();
    this.emitFullState();

    if (DEBUG_START_BOSS_ENCOUNTER) {
      this.nextRankForBoss = Math.min(this.state.rankIndex + 1, FINAL_RANK_INDEX);
      this.startBossEncounter();
    }
  }

  update(_time: number, delta: number): void {
    if (this.isEnding) return;

    this.player.update(delta);

    if (this.inBossEncounter && this.boss) {
      this.updateBossEncounter(delta);
    } else {
      this.updateProgress();
      if (this.player.startedMoving) this.updateSpawning(delta);
    }

    this.updateMovingEntities(delta);
    this.checkSweptProjectileOverlaps();
    this.cleanupBossProjectilesPastPlayer();
    this.updateOfficeBackground();
    this.cleanupOffscreen();
  }

  // Distance remains the player's score; promotion is earned by collecting the rank's tokens.
  private updateProgress(): void {
    const traveled = Math.max(0, this.player.x - PLAYER_START_X);
    this.state.advanceDistance(traveled);
  }

  private updateSpawning(delta: number): void {
    const rank = this.state.rank;

    this.obstacleSpawnAccumulator += delta;
    if (this.obstacleSpawnInterval === 0) {
      this.obstacleSpawnInterval = Phaser.Math.Between(rank.obstacleSpawnMinMs, rank.obstacleSpawnMaxMs);
    }
    if (this.obstacleSpawnAccumulator >= this.obstacleSpawnInterval) {
      this.obstacleSpawnAccumulator = 0;
      this.obstacleSpawnInterval = 0;
      this.spawnObstacle(rank);
    }

    this.tokenSpawnAccumulator += delta;
    if (this.tokenSpawnAccumulator >= rank.tokenSpawnIntervalMs) {
      this.tokenSpawnAccumulator = 0;
      this.spawnToken(rank);
    }
  }

  private spawnObstacle(rank: RankConfig): void {
    const { x, y } = this.findSpawnPosition(rank, 'obstacle');
    const textureKey = Phaser.Utils.Array.GetRandom(OBSTACLE_TEXTURE_KEYS);
    this.obstacles.add(new Projectile(this, x, y, textureKey, this.player.x, this.player.y, rank.obstacleSpeed * OBSTACLE_SPEED_MULTIPLIER, rank.obstacleRotationSpeed, rank.badgeDisplaySize));
  }

  private spawnToken(rank: RankConfig): void {
    const textureKey = Phaser.Utils.Array.GetRandom(REGULAR_TOKEN_TEXTURE_KEYS);
    const { x, y } = this.findSpawnPosition(rank, 'token');
    const pattern = Phaser.Utils.Array.GetRandom(['bobbing', 'circular', 'figure8'] as TokenMotionPattern[]);
    const motion = this.getTokenMotionProfile(rank);
    this.tokens.add(new Collectible(this, x, y, textureKey, {
      pattern,
      amplitude: motion.amplitude,
      speed: rank.tokenMotionSpeed,
    }, rank.badgeDisplaySize));
  }

  private getTokenMotionProfile(rank: RankConfig): { centerHeight: number; amplitude: number } {
    const tokenRadius = (rank.badgeDisplaySize * COLLECTIBLE_RENDER_SCALE) / 2;
    const topCenterHeight = DOUBLE_JUMP_APEX_HEIGHT - tokenRadius - TOKEN_APEX_CLEARANCE;
    const bottomCenterHeight = Math.max(tokenRadius + TOKEN_APEX_CLEARANCE, SINGLE_JUMP_APEX_HEIGHT * 0.6);

    return {
      centerHeight: (topCenterHeight + bottomCenterHeight) / 2,
      amplitude: (topCenterHeight - bottomCenterHeight) / 2,
    };
  }

  private updateMovingEntities(delta: number): void {
    for (const child of this.obstacles.getChildren()) (child as Projectile).updateMotion(delta);
    for (const child of this.tokens.getChildren()) (child as Collectible).updateMotion(delta);
    for (const child of this.bossProjectiles.getChildren()) (child as Projectile).updateMotion(delta);
  }

  private checkSweptProjectileOverlaps(): void {
    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    const playerBounds = new Phaser.Geom.Rectangle(playerBody.x, playerBody.y, playerBody.width, playerBody.height);

    for (const child of this.obstacles.getChildren()) {
      const projectile = child as Projectile;
      if (projectile.isResolved) continue;
      if (Phaser.Geom.Intersects.RectangleToRectangle(playerBounds, projectile.getSweptBodyBounds())) {
        this.handleObstacleOverlap(this.player, projectile);
      }
    }

    for (const child of this.bossProjectiles.getChildren()) {
      const projectile = child as Projectile;
      if (projectile.isResolved) continue;
      if (Phaser.Geom.Intersects.RectangleToRectangle(playerBounds, projectile.getSweptBodyBounds())) {
        this.handleBossProjectileOverlap(this.player, projectile);
      }
    }
  }

  private cleanupBossProjectilesPastPlayer(): void {
    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    const playerLeft = playerBody.x;
    for (const child of this.bossProjectiles.getChildren()) {
      const projectile = child as Projectile;
      if (!projectile.isResolved && projectile.x + projectile.displayWidth / 2 < playerLeft) {
        projectile.destroy();
      }
    }
  }

  private findSpawnPosition(rank: RankConfig, type: 'token' | 'obstacle'): { x: number; y: number } {
    const heightMin = type === 'obstacle' ? rank.obstacleSpawnHeightMin : 50;
    const heightMax = type === 'obstacle' ? rank.obstacleSpawnHeightMax : 160;
    const activeObjects = [...this.obstacles.getChildren(), ...this.tokens.getChildren()] as Phaser.GameObjects.GameObject[];
    const cameraRight = this.cameras.main.scrollX + this.scale.width;
    const tokenMotion = type === 'token' ? this.getTokenMotionProfile(rank) : null;

    for (let attempt = 0; attempt < 20; attempt += 1) {
      const candidate = {
        x: cameraRight + Phaser.Math.Between(SPAWN_MARGIN_X, SPAWN_MARGIN_X + 320),
        y: tokenMotion ? GROUND_TOP_Y - tokenMotion.centerHeight : GROUND_TOP_Y - Phaser.Math.Between(heightMin, heightMax),
      };
      const hasNearbyObject = activeObjects.some((object) => {
        const existing = object as Phaser.GameObjects.Sprite;
        return Phaser.Math.Distance.Between(candidate.x, candidate.y, existing.x, existing.y) < MIN_SPAWN_DISTANCE;
      });
      if (!hasNearbyObject) return candidate;
    }

    const rightmostObject = activeObjects.reduce((rightmost, object) => Math.max(rightmost, (object as Phaser.GameObjects.Sprite).x), cameraRight);
    return { x: rightmostObject + MIN_SPAWN_DISTANCE + SPAWN_MARGIN_X, y: GROUND_TOP_Y - heightMin };
  }

  private cleanupOffscreen(): void {
    const leftEdge = this.cameras.main.scrollX - CLEANUP_MARGIN_X;
    for (const child of this.obstacles.getChildren()) {
      if ((child as Projectile).x < leftEdge) child.destroy();
    }
    for (const child of this.tokens.getChildren()) {
      const token = child as Collectible;
      if (token.x < leftEdge) {
        token.destroy();
      }
    }
  }

  private handleObstacleOverlap(_playerObj: unknown, obstacleObj: unknown): void {
    const obstacle = obstacleObj as Projectile;
    if (obstacle.isResolved || this.isEnding) return;

    if (this.player.isParrying) {
      obstacle.resolveParried();
      playSfx('parry');
      this.sound.play('sfx-punch');
      this.burst(obstacle.x, obstacle.y, 0xffe066);
      this.awardToken();
    } else {
      obstacle.resolveHit();
      this.registerHit();
    }
  }

  private handleTokenOverlap(_playerObj: unknown, tokenObj: unknown): void {
    const token = tokenObj as Collectible;
    this.tokens.remove(token, false, false);
    const { x, y } = token;

    token.collect(() => {
      const count = this.awardToken();
      if (count >= this.state.rank.tokensToPromote && !this.state.isRetired) {
        this.promoteTo(this.state.rankIndex + 1);
      }
    });
    this.burst(x, y, 0xffd23f);
  }

  private awardToken(): number {
    playSfx('collect');
    const count = this.state.addToken();
    eventBus.emit(GameEvents.TokensChanged, { count, needed: this.state.rank.tokensToPromote });
    return count;
  }

  private promoteTo(nextIndex: number): void {
    const clamped = Math.min(nextIndex, FINAL_RANK_INDEX);
    if (clamped <= this.state.rankIndex) return;

    // Trigger boss encounter instead of immediate promotion
    if (!this.inBossEncounter && this.nextRankForBoss < 0) {
      this.nextRankForBoss = clamped;
      this.startBossEncounter();
      return;
    }

    // This code runs after boss is defeated
    this.state.rankIndex = clamped;
    this.state.resetTokens();
    const rank = this.state.rank;
    this.player.setRankScale(rank.playerScale);
    this.player.setParryWindowSeconds(rank.parryWindowSeconds);

    eventBus.emit(GameEvents.RankChanged, rank);
    eventBus.emit(GameEvents.AgeChanged, rank.age);
    eventBus.emit(GameEvents.TokensChanged, { count: 0, needed: rank.tokensToPromote });

    if (this.state.isRetired) {
      this.triggerVictory();
    } else {
      playSfx('promote');
      this.burst(this.player.x, this.player.y, 0x7cfc90);
    }
  }

  private registerHit(): void {
    if (this.isEnding || this.player.invincible) return;

    playSfx('hit');
    const hits = this.state.registerHit();
    eventBus.emit(GameEvents.HitsChanged, hits);

    if (this.state.isDefeated) {
      this.triggerGameOver();
    } else {
      this.player.playHitFlash();
    }
  }

  private triggerVictory(): void {
    this.isEnding = true;
    playSfx('retire');
    this.time.delayedCall(600, () => {
      this.scene.stop('HUD');
      this.scene.start('Victory', { age: this.state.age });
    });
  }

  private triggerGameOver(): void {
    this.isEnding = true;
    this.time.delayedCall(500, () => {
      playSfx('gameOver');
      this.scene.stop('HUD');
      this.scene.start('GameOver', { age: this.state.age, rankId: this.state.rank.label });
    });
  }

  private emitFullState(): void {
    eventBus.emit(GameEvents.AgeChanged, this.state.age);
    eventBus.emit(GameEvents.RankChanged, this.state.rank);
    eventBus.emit(GameEvents.TokensChanged, { count: this.state.tokens, needed: this.state.rank.tokensToPromote });
    eventBus.emit(GameEvents.HitsChanged, this.state.hits);
  }

  private burst(x: number, y: number, tint: number): void {
    const emitter = this.add.particles(x, y, 'particle', {
      speed: { min: 60, max: 160 },
      lifespan: 300,
      scale: { start: 1, end: 0 },
      quantity: 8,
      tint,
    });
    this.time.delayedCall(320, () => emitter.destroy());
  }

  private buildOfficeBackground(): void {
    const backgroundHeight = Math.max(WORLD_HEIGHT, this.scale.height);
    const backgroundWidth = backgroundHeight * BACKGROUND_ASPECT_RATIO;
    this.officeBackgrounds = [1, 2, 3, 4, 5].map((segment, index) => {
      const image = this.add.image(index * backgroundWidth + backgroundWidth / 2, backgroundHeight / 2, `office-background-${segment}`);
      image.setDisplaySize(backgroundWidth, backgroundHeight);
      image.setScrollFactor(BACKGROUND_SCROLL_FACTOR);
      image.setAlpha(BACKGROUND_NORMAL_ALPHA);
      image.setDepth(-20);
      return image;
    });
  }

  private updateOfficeBackground(): void {
    if (this.officeBackgrounds.length === 0) return;
    const cameraLeft = this.cameras.main.scrollX * BACKGROUND_SCROLL_FACTOR;
    const backgroundWidth = this.officeBackgrounds[0].displayWidth;
    for (const image of this.officeBackgrounds) {
      if (image.x + backgroundWidth / 2 < cameraLeft - backgroundWidth / 2) {
        const rightmostX = Math.max(...this.officeBackgrounds.map((segment) => segment.x));
        image.x = rightmostX + backgroundWidth;
      }
    }
  }

  // ========== BOSS ENCOUNTER LOGIC ==========

  private startBossEncounter(): void {
    this.inBossEncounter = true;
    this.bossDefeatSequenceActive = false;
    this.player.setParryWindowSeconds(this.state.rank.parryWindowSeconds * BOSS_PARRY_WINDOW_MULTIPLIER);

    // Pause all spawning
    this.obstacleSpawnAccumulator = 0;
    this.obstacleSpawnInterval = 0;
    this.tokenSpawnAccumulator = 0;
    this.tokens.clear(true, true);

    // Freeze parallax scroll by pausing camera movement
    this.cameras.main.stopFollow();

    // Show the promotion opportunity flash screen
    const flashImage = this.add.image(
      this.scale.width / 2,
      this.scale.height / 2,
      PROMOTION_OPPORTUNITY_ASSET.key
    );
    flashImage.setOrigin(0.5, 0.5);
    flashImage.setScrollFactor(0);
    flashImage.setDepth(100);
    flashImage.setScale(0.3);
    flashImage.setAlpha(0);

    // Animate flash in
    this.tweens.add({
      targets: flashImage,
      scale: 1,
      alpha: 1,
      duration: 300,
      ease: 'Back.easeOut',
    });

    // Hold flash, then fade out and spawn boss
    this.time.delayedCall(1200, () => {
      this.tweens.add({
        targets: flashImage,
        alpha: 0,
        duration: 300,
        onComplete: () => flashImage.destroy(),
      });

      this.spawnBossAndWalkIn();
    });
  }

  private spawnBossAndWalkIn(): void {
    // Create boss at off-screen right, at same level as player
    const cameraRight = this.cameras.main.scrollX + this.scale.width;
    const bossCombatX = cameraRight - 320; // Position for combat (right side of screen)
    const bossSpawnX = cameraRight + 200; // Spawn off-screen right
    const bossY = this.cameras.main.scrollY + this.scale.height - 340;

    // Boss difficulty is based on the rank we're promoting TO
    const targetRank = RANKS[Math.min(this.nextRankForBoss, FINAL_RANK_INDEX)];
    this.boss = new Boss(this, bossSpawnX, bossY, this.nextRankForBoss, targetRank.playerScale);
    this.dimBossBackground();

    // Walk boss in from right (slowly)
    const body = this.boss.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(-80, 0); // Move left slowly
    this.boss.startWalkIn();
    this.boss.play('boss-walk-in');

    // Stop walking and settle into idle when boss reaches combat position
    this.time.delayedCall(3500, () => {
      if (this.boss) {
        body.setVelocity(0, 0);
        this.boss.x = bossCombatX;
        this.boss.finishWalkIn();
        this.showHealthBar();
      }
    });
  }

  private updateBossEncounter(delta: number): void {
    if (!this.boss) return;

    this.boss.update(delta);
    const isAttacking = this.boss.getState() === 'attack';
    if (isAttacking) {
      if (!this.bossWasAttacking) {
        this.bossProjectileSpawnAccumulator = 0;
        this.spawnBossProjectile();
        this.nextBossProjectileDelayMs = Phaser.Math.Between(
          BOSS_PROJECTILE_MIN_INTERVAL_MS,
          BOSS_PROJECTILE_MAX_INTERVAL_MS
        );
      }
      this.updateBossAttacks(delta);
    } else {
      this.bossProjectileSpawnAccumulator = 0;
    }
    this.bossWasAttacking = isAttacking;
  }

  private updateBossAttacks(delta: number): void {
    if (!this.boss) return;

    this.bossProjectileSpawnAccumulator += delta;

    if (this.bossProjectileSpawnAccumulator >= this.nextBossProjectileDelayMs) {
      this.bossProjectileSpawnAccumulator -= this.nextBossProjectileDelayMs;
      this.nextBossProjectileDelayMs = Phaser.Math.Between(
        BOSS_PROJECTILE_MIN_INTERVAL_MS,
        BOSS_PROJECTILE_MAX_INTERVAL_MS
      );
      this.spawnBossProjectile();
    }
  }

  private spawnBossProjectile(): void {
    if (!this.boss) return;

    const config = this.boss.getConfig();
    const projectileSpeed = config.projectileSpeed * BOSS_PROJECTILE_SPEED_MULTIPLIER;

    if (config.attackPattern === 'single') {
      // Single shot toward player from boss torso
      const projectile = new Projectile(
        this,
        this.boss.x,
        this.boss.y - 20,
        'obstacle-corporate-bs',
        this.player.x,
        this.player.y,
        projectileSpeed,
        0,
        48
      );
      this.bossProjectiles.add(projectile);
    } else if (config.attackPattern === 'spread') {
      // Spread shot (3 projectiles at different angles)
      const angles = [-20, 0, 20];
      for (const angleOffset of angles) {
        const direction = Phaser.Math.Angle.Between(this.boss.x, this.boss.y, this.player.x, this.player.y);
        const adjustedAngle = direction + Phaser.Math.DegToRad(angleOffset);
        const velocity = new Phaser.Math.Vector2(
          Math.cos(adjustedAngle) * projectileSpeed,
          Math.sin(adjustedAngle) * projectileSpeed
        );

        const projectile = new Projectile(
          this,
          this.boss.x,
          this.boss.y - 20,
          'obstacle-corporate-bs',
          this.boss.x + velocity.x * 2,
          this.boss.y + velocity.y * 2,
          projectileSpeed,
          0,
          48
        );
        this.bossProjectiles.add(projectile);
      }
    }
  }

  private handleBossProjectileOverlap(_playerObj: unknown, projectileObj: unknown): void {
    const projectile = projectileObj as Projectile;
    if (projectile.isResolved || this.isEnding || !this.inBossEncounter) return;

    if (this.player.isParrying) {
      projectile.resolveParried();
      playSfx('parry');
      this.sound.play('sfx-punch');
      this.burst(projectile.x, projectile.y, 0xffe066);
      
      // Damage boss on successful parry
      if (this.boss && this.boss.takeDamage(1)) {
        this.updateHealthBar();
        this.playBossDefeatSequence();
      } else {
        this.updateHealthBar();
      }
    } else {
      projectile.resolveHit();
      this.registerHit();
    }
  }

  private clearBossProjectiles(): void {
    for (const child of this.bossProjectiles.getChildren()) {
      child.destroy();
    }
  }

  private playBossDefeatSequence(): void {
    if (!this.boss || this.bossDefeatSequenceActive) return;
    this.bossDefeatSequenceActive = true;

    // Halt the boss state machine and remove every active attack immediately.
    this.boss.setDefeated();
    this.clearBossProjectiles();

    // Restore the office lighting across the complete fall sequence.
    this.restoreBossBackground();

    // Sequence: fall_1 (500ms) -> fall_2 (500ms) -> defeated (1000ms).
    this.boss.setDefeatTexture('boss-fall1');
    this.time.delayedCall(1000, () => {
      if (!this.boss) return;

      this.boss.setDefeatTexture('boss-fall2');
      this.time.delayedCall(1000, () => {
        if (!this.boss) return;

        this.boss.setDefeatTexture('boss-defeated');
        this.time.delayedCall(1000, () => {
          this.displayDefeatPromotionToken(() => this.endBossEncounter(true));
        });
      });
    });
  }

  private displayDefeatPromotionToken(onComplete: () => void): void {
    const tokenSprite = this.add.sprite(
      this.scale.width / 2,
      this.scale.height / 2,
      PROMOTION_TOKEN_ASSET.key
    );
    tokenSprite.setScrollFactor(0);
    tokenSprite.setDepth(110);
    tokenSprite.setScale(0);
    tokenSprite.setAlpha(0);

    this.tweens.add({
      targets: tokenSprite,
      scale: 1.2,
      alpha: 1,
      duration: 400,
      ease: 'Back.easeOut',
    });

    this.tweens.add({
      targets: tokenSprite,
      alpha: 0,
      duration: 500,
      delay: 1400,
      onComplete: () => {
        tokenSprite.destroy();
        onComplete();
      },
    });
  }

  private endBossEncounter(victory: boolean): void {
    if (!this.boss) return;

    this.inBossEncounter = false;
    this.destroyHealthBar();

    if (victory) {
      // Fade out boss immediately on victory
      this.tweens.add({
        targets: this.boss,
        alpha: 0,
        duration: 500,
        onComplete: () => {
          if (this.boss) {
            this.boss.destroy();
          }
          this.boss = null;
        },
      });

      // Reset hit counter to full (0 hits = 5 lives)
      this.state.rankIndex = this.nextRankForBoss;
      this.state.resetHits();
      eventBus.emit(GameEvents.HitsChanged, this.state.hits);

      // Apply promotion
      const rank = this.state.rank;
      this.player.setRankScale(rank.playerScale);
      this.player.setParryWindowSeconds(rank.parryWindowSeconds);

      eventBus.emit(GameEvents.RankChanged, rank);
      eventBus.emit(GameEvents.AgeChanged, rank.age);
      eventBus.emit(GameEvents.TokensChanged, { count: 0, needed: rank.tokensToPromote });

      playSfx('promote');
      this.burst(this.player.x, this.player.y, 0x7cfc90);

      // Resume normal gameplay
      this.nextRankForBoss = -1;
      this.time.delayedCall(600, () => this.resumeNormalGameplay());
    } else {
      // Player was defeated during boss encounter - trigger game over
      this.triggerGameOver();
    }
  }

  private resumeNormalGameplay(): void {
    // Clear all boss projectiles
    this.clearBossProjectiles();

    // Resume camera follow
    this.cameras.main.setFollowOffset(-this.scale.width * (0.5 - PLAYER_CAMERA_SCREEN_RATIO), -140);
    this.cameras.main.startFollow(this.player, true, 1, 1);
    this.player.setParryWindowSeconds(this.state.rank.parryWindowSeconds);

    // Resume spawning (restore previous spawn interval if any)
    this.obstacleSpawnInterval = 0;
    this.obstacleSpawnAccumulator = 0;
    this.tokenSpawnAccumulator = 0;
  }

  private dimBossBackground(): void {
    this.tweens.add({
      targets: this.officeBackgrounds,
      alpha: BOSS_BACKGROUND_ALPHA,
      duration: BOSS_DARKEN_DURATION_MS,
      ease: 'Linear',
    });
  }

  private restoreBossBackground(): void {
    this.tweens.add({
      targets: this.officeBackgrounds,
      alpha: BACKGROUND_NORMAL_ALPHA,
      duration: 3000,
      ease: 'Linear',
    });
  }

  private showHealthBar(): void {
    if (!this.boss) return;

    const HEALTH_BAR_WIDTH = 500;
    const HEALTH_BAR_HEIGHT = 16;
    const HEALTH_BAR_TOP = 30;
    const LABEL_GAP = 25;
    const centerX = this.scale.width / 2;

    // Create container to hold all health bar elements
    this.healthBarContainer = this.add.container(centerX, HEALTH_BAR_TOP);
    this.healthBarContainer.setScrollFactor(0); // Fixed to screen
    this.healthBarContainer.setDepth(105); // Above hud depth

    // Background (dark grey/black)
    this.healthBarBackground = this.add.rectangle(
      0,
      HEALTH_BAR_HEIGHT + LABEL_GAP,
      HEALTH_BAR_WIDTH,
      HEALTH_BAR_HEIGHT,
      0x333333
    );
    this.healthBarContainer.add(this.healthBarBackground);

    // Fill (red, will scale from right to left)
    this.healthBarFill = this.add.rectangle(
      HEALTH_BAR_WIDTH / 2, // Right edge at +50 (center + half-width)
      HEALTH_BAR_HEIGHT + LABEL_GAP,
      HEALTH_BAR_WIDTH,
      HEALTH_BAR_HEIGHT,
      0xff4444
    );
    this.healthBarFill.setOrigin(1, 0.5); // Origin at right edge so width scaling depletes from right
    this.healthBarContainer.add(this.healthBarFill);

    // Label: "Clipboard of Directors" - scale font to fit 100px width
    let fontSize = 72;
    this.healthBarLabel = this.add.text(0, 0, 'Clipboard of Directors', {
      fontSize: `${fontSize}px`,
      color: '#ffffff',
      fontStyle: 'bold',
    });
    this.healthBarLabel.setOrigin(0.5, 0.5); // Center on container position

    // Dynamically reduce font size until text fits within 100px
    while (this.healthBarLabel.width > HEALTH_BAR_WIDTH && fontSize > 8) {
      fontSize -= 1;
      this.healthBarLabel.setFontSize(fontSize);
    }

    this.healthBarContainer.add(this.healthBarLabel);

    // Initial update to show correct health
    this.updateHealthBar();
  }

  private updateHealthBar(): void {
    if (!this.boss || !this.healthBarFill) return;

    const maxHealth = this.boss.getMaxHealth();
    const currentHealth = this.boss.getHealth();
    const healthRatio = Math.max(0, currentHealth / maxHealth);

    const HEALTH_BAR_WIDTH = 500;
    const newWidth = HEALTH_BAR_WIDTH * healthRatio;

    // Update fill width (depletes from right to left by scaling from left origin)
    this.healthBarFill.setDisplaySize(newWidth, 16);

    // Optional: Add pulse/flash effect on damage
    if (this.healthBarFill.alpha < 1) {
      // Already in a pulse, don't start another
      return;
    }

    this.tweens.add({
      targets: this.healthBarFill,
      alpha: 0.5,
      duration: 100,
      yoyo: true,
      ease: 'Quad.easeInOut',
    });
  }

  private destroyHealthBar(): void {
    if (this.healthBarContainer) {
      this.healthBarContainer.destroy();
      this.healthBarContainer = null;
      this.healthBarBackground = null;
      this.healthBarFill = null;
      this.healthBarLabel = null;
    }
  }
}

