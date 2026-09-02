import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Projectile } from '../entities/Projectile';
import { Boss } from '../entities/Boss';
import { COLLECTIBLE_RENDER_SCALE, Collectible, PROMOTION_TOKEN_TEXTURE_KEY } from '../entities/Collectible';
import {
  FINAL_RANK_INDEX,
  FINAL_DISTANCE,
  OBSTACLE_SPEED_MULTIPLIER,
  RANKS,
  type RankConfig,
} from '../data/rankConfig';
import { DOUBLE_JUMP_APEX_HEIGHT, SINGLE_JUMP_APEX_HEIGHT } from '../data/movementTuning';
import { OBSTACLE_TEXTURE_KEYS, REGULAR_TOKEN_TEXTURE_KEYS } from '../data/gameAssets';
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
  private pendingPromotionToken = false;
  private isEnding = false;
  private officeBackgrounds: Phaser.GameObjects.Image[] = [];

  // Boss encounter state
  private boss: Boss | null = null;
  private inBossEncounter = false;
  private nextRankForBoss = -1;
  private bossProjectileSpawnAccumulator = 0;

  constructor() {
    super('Survive');
  }

  init(): void {
    this.isEnding = false;
    this.obstacleSpawnAccumulator = 0;
    this.obstacleSpawnInterval = 0;
    this.tokenSpawnAccumulator = 0;
    this.pendingPromotionToken = false;
    this.inBossEncounter = false;
    this.nextRankForBoss = -1;
    this.boss = null;
    this.bossProjectileSpawnAccumulator = 0;
  }

  create(): void {
    // Every (re)start is a fresh career: age 20 / rank A1 / distance 0, per the game design.
    this.state = new GameState(this.registry);
    this.state.reset();

    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBackgroundColor(0x4488aa);
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
    const isPromotion =
      !this.pendingPromotionToken && this.state.tokens >= rank.tokensToPromote && !this.state.isRetired;
    if (isPromotion) this.pendingPromotionToken = true;

    const textureKey = isPromotion ? PROMOTION_TOKEN_TEXTURE_KEY : Phaser.Utils.Array.GetRandom(REGULAR_TOKEN_TEXTURE_KEYS);
    const { x, y } = this.findSpawnPosition(rank, 'token', isPromotion);
    const pattern: TokenMotionPattern = isPromotion
      ? 'bobbing'
      : Phaser.Utils.Array.GetRandom(['bobbing', 'circular', 'figure8'] as TokenMotionPattern[]);
    const motion = this.getTokenMotionProfile(rank, isPromotion);
    this.tokens.add(new Collectible(this, x, y, textureKey, {
      pattern,
      amplitude: motion.amplitude,
      speed: rank.tokenMotionSpeed,
    }, rank.badgeDisplaySize, isPromotion));
  }

  private getTokenMotionProfile(rank: RankConfig, isPromotion: boolean): { centerHeight: number; amplitude: number } {
    const baseDisplaySize = isPromotion ? rank.badgeDisplaySize * 1.25 : rank.badgeDisplaySize;
    const tokenRadius = (baseDisplaySize * COLLECTIBLE_RENDER_SCALE) / 2;
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
  }

  private findSpawnPosition(rank: RankConfig, type: 'token' | 'obstacle', isPromotion = false): { x: number; y: number } {
    const heightMin = type === 'obstacle' ? rank.obstacleSpawnHeightMin : isPromotion ? 70 : 50;
    const heightMax = type === 'obstacle' ? rank.obstacleSpawnHeightMax : isPromotion ? 70 : 160;
    const activeObjects = [...this.obstacles.getChildren(), ...this.tokens.getChildren()] as Phaser.GameObjects.GameObject[];
    const cameraRight = this.cameras.main.scrollX + this.scale.width;
    const tokenMotion = type === 'token' ? this.getTokenMotionProfile(rank, isPromotion) : null;

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
        if (token.isPromotion) this.pendingPromotionToken = false;
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
    const { x, y, isPromotion } = token;

    token.collect(() => {
      if (isPromotion) {
        this.pendingPromotionToken = false;
        this.promoteTo(this.state.rankIndex + 1);
      } else {
        this.awardToken();
      }
    });
    this.burst(x, y, isPromotion ? 0xffd700 : 0xffd23f);
  }

  private awardToken(): void {
    playSfx('collect');
    const count = this.state.addToken();
    eventBus.emit(GameEvents.TokensChanged, { count, needed: this.state.rank.tokensToPromote });
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
      image.setAlpha(0.72);
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

    // Pause all spawning
    this.obstacleSpawnAccumulator = 0;
    this.obstacleSpawnInterval = 0;
    this.tokenSpawnAccumulator = 0;
    this.tokens.clear(true, true);

    // Freeze parallax scroll by pausing camera movement
    this.cameras.main.stopFollow();

    // Show "PROMOTION OPPORTUNITY" flash screen
    const flashText = this.add.text(
      this.scale.width / 2,
      this.scale.height / 2,
      'PROMOTION\nOPPORTUNITY',
      {
        fontSize: '48px',
        fontFamily: 'Arial, sans-serif',
        fontStyle: 'bold',
        color: '#ffffff',
        align: 'center',
        stroke: '#000000',
        strokeThickness: 3,
      }
    );
    flashText.setOrigin(0.5, 0.5);
    flashText.setScrollFactor(0);
    flashText.setDepth(100);
    flashText.setScale(0.3);
    flashText.setAlpha(0);

    // Animate flash in
    this.tweens.add({
      targets: flashText,
      scale: 1,
      alpha: 1,
      duration: 300,
      ease: 'Back.easeOut',
    });

    // Hold flash, then fade out and spawn boss
    this.time.delayedCall(1200, () => {
      this.tweens.add({
        targets: flashText,
        alpha: 0,
        duration: 300,
        onComplete: () => flashText.destroy(),
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

    // Walk boss in from right (slowly)
    const body = this.boss.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(-80, 0); // Move left slowly
    this.boss.play('boss-walk-in');

    // Stop walking and settle into idle when boss reaches combat position
    this.time.delayedCall(3500, () => {
      if (this.boss) {
        body.setVelocity(0, 0);
        this.boss.x = bossCombatX;
        this.boss.finishWalkIn();
      }
    });
  }

  private updateBossEncounter(delta: number): void {
    if (!this.boss) return;

    this.boss.update(delta);
    if (this.boss.getState() === 'attack') {
      this.updateBossAttacks(delta);
    } else {
      this.clearBossProjectiles();
    }
  }

  private updateBossAttacks(delta: number): void {
    if (!this.boss) return;

    this.bossProjectileSpawnAccumulator += delta;

    // Fire projectile during Attack state
    if (this.boss.canFireAttack()) {
      this.boss.consumeAttack();
      this.spawnBossProjectile();
    }
  }

  private spawnBossProjectile(): void {
    if (!this.boss) return;

    const config = this.boss.getConfig();
    const projectileSpeed = config.projectileSpeed;

    if (config.attackPattern === 'single') {
      // Single shot toward player from boss torso
      const projectile = new Projectile(
        this,
        this.boss.x,
        this.boss.y - 20,
        'corp_bs',
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
          'corp_bs',
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
        this.endBossEncounter(true);
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

  private endBossEncounter(victory: boolean): void {
    if (!this.boss) return;

    this.inBossEncounter = false;

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

    // Resume spawning (restore previous spawn interval if any)
    this.obstacleSpawnInterval = 0;
    this.obstacleSpawnAccumulator = 0;
    this.tokenSpawnAccumulator = 0;
  }
}
