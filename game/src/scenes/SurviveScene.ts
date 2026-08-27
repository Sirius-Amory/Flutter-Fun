import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Projectile } from '../entities/Projectile';
import { Collectible, REGULAR_TOKEN_TEXTURE_KEYS, PROMOTION_TOKEN_TEXTURE_KEY } from '../entities/Collectible';
import {
  FINAL_RANK_INDEX,
  FINAL_DISTANCE,
  getRankIndexForDistance,
  obstacleTextureKey,
  type RankConfig,
} from '../data/rankConfig';
import { GameState } from '../state/GameState';
import { eventBus, GameEvents } from '../events';
import { playSfx } from '../audio/SfxManager';
import { startBackgroundMusic } from '../audio/MusicManager';

const WORLD_HEIGHT = 540;
const GROUND_Y = 500;
const GROUND_TOP_Y = GROUND_Y - 16;
const PLAYER_START_X = 80;
const PLAYER_START_Y = 420;
const SPAWN_AHEAD_X = 760;
const CLEANUP_MARGIN_X = 120;
const TOKEN_SPAWN_INTERVAL_MS = 1500;
// Long enough for the full A1->G2 climb (see rankConfig.ts) plus spawn-ahead/cleanup buffer.
const WORLD_WIDTH = PLAYER_START_X + FINAL_DISTANCE + 2000;

export class SurviveScene extends Phaser.Scene {
  private player!: Player;
  private obstacles!: Phaser.Physics.Arcade.Group;
  private tokens!: Phaser.Physics.Arcade.Group;
  private state!: GameState;
  private obstacleSpawnAccumulator = 0;
  private tokenSpawnAccumulator = 0;
  private pendingPromotionToken = false;
  private isEnding = false;

  constructor() {
    super('Survive');
  }

  init(): void {
    this.isEnding = false;
    this.obstacleSpawnAccumulator = 0;
    this.tokenSpawnAccumulator = 0;
    this.pendingPromotionToken = false;
  }

  create(): void {
    // Every (re)start is a fresh career: age 20 / rank A1 / distance 0, per the game design.
    this.state = new GameState(this.registry);
    this.state.reset();

    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBackgroundColor(0x4488aa);

    this.buildParallaxHills();

    const ground = this.physics.add.staticGroup();
    const groundTile = this.add.tileSprite(WORLD_WIDTH / 2, GROUND_Y, WORLD_WIDTH, 32, 'platform');
    this.physics.add.existing(groundTile, true);
    ground.add(groundTile);

    this.player = new Player(
      this,
      PLAYER_START_X,
      PLAYER_START_Y,
      this.state.rank.parryWindowSeconds,
      this.state.characterId
    );
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    this.obstacles = this.physics.add.group({ allowGravity: false });
    this.tokens = this.physics.add.group({ allowGravity: false });

    this.physics.add.collider(this.player, ground);
    this.physics.add.overlap(this.player, this.obstacles, this.handleObstacleOverlap, undefined, this);
    this.physics.add.overlap(this.player, this.tokens, this.handleTokenOverlap, undefined, this);

    this.scene.launch('HUD');

    startBackgroundMusic();
    this.emitFullState();
  }

  update(_time: number, delta: number): void {
    if (this.isEnding) return;

    this.player.update(delta);
    this.updateProgress();
    this.updateSpawning(delta);
    this.cleanupOffscreen();
  }

  // Distance is the core progress resource - it drives age directly and rank as a floor (tokens
  // can promote the player ahead of it, but distance alone always guarantees eventual promotion).
  private updateProgress(): void {
    const traveled = Math.max(0, this.player.x - PLAYER_START_X);
    this.state.advanceDistance(traveled);

    const impliedRankIndex = getRankIndexForDistance(this.state.distance);
    if (impliedRankIndex > this.state.rankIndex) {
      this.promoteTo(impliedRankIndex);
    }
  }

  private updateSpawning(delta: number): void {
    const rank = this.state.rank;

    this.obstacleSpawnAccumulator += delta;
    if (this.obstacleSpawnAccumulator >= rank.spawnIntervalMs) {
      this.obstacleSpawnAccumulator -= rank.spawnIntervalMs;
      this.spawnObstacle(rank);
    }

    this.tokenSpawnAccumulator += delta;
    if (this.tokenSpawnAccumulator >= TOKEN_SPAWN_INTERVAL_MS) {
      this.tokenSpawnAccumulator -= TOKEN_SPAWN_INTERVAL_MS;
      this.spawnToken(rank);
    }
  }

  private spawnObstacle(rank: RankConfig): void {
    const x = this.player.x + SPAWN_AHEAD_X;
    const y = GROUND_TOP_Y - 14;
    this.obstacles.add(new Projectile(this, x, y, obstacleTextureKey(rank.theme), rank.obstacleSpeed));
  }

  private spawnToken(rank: RankConfig): void {
    const isPromotion =
      !this.pendingPromotionToken && this.state.tokens >= rank.tokensToPromote && !this.state.isRetired;
    if (isPromotion) this.pendingPromotionToken = true;

    const textureKey = isPromotion
      ? PROMOTION_TOKEN_TEXTURE_KEY
      : Phaser.Utils.Array.GetRandom(REGULAR_TOKEN_TEXTURE_KEYS as unknown as string[]);
    // Promotion tokens always sit at ground level so a rank-up is never missed to bad luck of height.
    const heightAboveGround = isPromotion ? 12 : 24 + Phaser.Math.Between(0, 70);
    const x = this.player.x + SPAWN_AHEAD_X - Phaser.Math.Between(0, 120);
    const y = GROUND_TOP_Y - heightAboveGround;

    this.tokens.add(new Collectible(this, x, y, textureKey, isPromotion));
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
      this.scene.start('GameOver', { age: this.state.age, rankId: this.state.rank.id });
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

  private buildParallaxHills(): void {
    const hillCount = Math.ceil(WORLD_WIDTH / 400) + 1;
    for (let i = 0; i < hillCount; i += 1) {
      const hill = this.add.circle(i * 400 + 200, WORLD_HEIGHT - 20, 220, 0x2f6b4f, 0.5);
      hill.setScrollFactor(0.3);
      hill.setDepth(-10);
    }
  }
}
