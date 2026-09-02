import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Projectile } from '../entities/Projectile';
import { COLLECTIBLE_RENDER_SCALE, Collectible, PROMOTION_TOKEN_TEXTURE_KEY } from '../entities/Collectible';
import {
  FINAL_RANK_INDEX,
  FINAL_DISTANCE,
  getRankIndexForDistance,
  OBSTACLE_SPEED_MULTIPLIER,
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
  private state!: GameState;
  private obstacleSpawnAccumulator = 0;
  private obstacleSpawnInterval = 0;
  private tokenSpawnAccumulator = 0;
  private pendingPromotionToken = false;
  private isEnding = false;
  private officeBackgrounds: Phaser.GameObjects.Image[] = [];

  constructor() {
    super('Survive');
  }

  init(): void {
    this.isEnding = false;
    this.obstacleSpawnAccumulator = 0;
    this.obstacleSpawnInterval = 0;
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
    if (this.player.startedMoving) this.updateSpawning(delta);
    this.updateMovingEntities(delta);
    this.checkSweptProjectileOverlaps();
    this.updateOfficeBackground();
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
}
