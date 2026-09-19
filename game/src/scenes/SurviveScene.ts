import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Projectile } from '../entities/Projectile';
import { FloorHazard, FLOOR_HAZARD_SCROLL_FACTOR } from '../entities/FloorHazard';
import { COLLECTIBLE_RENDER_SCALE, Collectible } from '../entities/Collectible';
import {
  FINAL_RANK_INDEX,
  FINAL_DISTANCE,
  OBSTACLE_SPEED_MULTIPLIER,
  REGULAR_PROJECTILE_SPEED_MULTIPLIER,
  type RankConfig,
} from '../data/rankConfig';
import { PLAYER_HEIGHT } from '../data/movementTuning';
import {
  OBSTACLE_TEXTURE_KEYS,
  FLOOR_HAZARD_TEXTURE_KEYS,
  REGULAR_TOKEN_TEXTURE_KEYS,
} from '../data/gameAssets';
import { GameState } from '../state/GameState';
import { eventBus, GameEvents } from '../events';
import { playSfx } from '../audio/SfxManager';
import { isMusicMuted } from '../audio/MusicManager';
import { createLeaderboardService } from './GameOverScene';
import { BossEncounter } from './BossEncounter';
import { shouldTriggerVictoryAfterBossVictory } from './bossVictory';

const WORLD_HEIGHT = 900;
const WORLD_TOP_Y = 0;
const GROUND_Y = 820;
const GROUND_TOP_Y = GROUND_Y - 16;
const PLAYER_START_X = 320;
const PLAYER_START_Y = 560;
const PLAYER_CAMERA_SCREEN_RATIO = 1 / 5;
const SPAWN_MARGIN_X = 120;
const CLEANUP_MARGIN_X = 120;
const BACKGROUND_ASPECT_RATIO = 3168 / 1344;
const BACKGROUND_SCROLL_FACTOR = 1.15;
const BACKGROUND_NORMAL_ALPHA = 0.72;
const MIN_SPAWN_DISTANCE = 140;
const TOKEN_APEX_CLEARANCE = 8;
const TOKEN_SPEED_DIVISOR = 3;
const INITIAL_WORLD_BUFFER = 2000;
const WORLD_EXTENSION_THRESHOLD = 3000;
const WORLD_EXTENSION_LENGTH = 10000;
const GAMEPLAY_CUE_NAMES = [
  'collect',
  'ouch_female',
  'ouch_male',
  'parry',
  'shoot',
  'victory',
  'villain-1',
  'villain-2',
  'villain-3',
  'villain-4',
  'villain-5',
  'villain-defeated',
] as const;
type GameplayCueName = (typeof GAMEPLAY_CUE_NAMES)[number];
const CUE_POOL_SIZE = 5;
// Multiplies the current rank's obstacle-spawn interval to get the floor-hazard
// interval, e.g. 2.7 means hazards spawn roughly 2.7x less often than obstacles.
const FLOOR_HAZARD_INTERVAL_MULTIPLIER = 2.7;
const FLOOR_HAZARD_CLEANUP_MARGIN = 160;

export class SurviveScene extends Phaser.Scene {
  private player!: Player;
  private obstacles!: Phaser.Physics.Arcade.Group;
  private tokens!: Phaser.Physics.Arcade.Group;
  private bossProjectiles!: Phaser.Physics.Arcade.Group;
  private floorHazards!: Phaser.Physics.Arcade.Group;
  private state!: GameState;
  private obstacleSpawnAccumulator = 0;
  private obstacleSpawnInterval = 0;
  private tokenSpawnAccumulator = 0;
  private tokenTextureQueue: string[] = [];
  private floorHazardSpawnAccumulator = 0;
  private floorHazardSpawnInterval = 0;
  private isEnding = false;
  private officeBackgrounds: Phaser.GameObjects.Image[] = [];
  private gameplayMusic?: Phaser.Sound.BaseSound;
  private gameplaySfx?: Phaser.Sound.BaseSound;
  private cuePools = new Map<GameplayCueName, Phaser.Sound.BaseSound[]>();
  private cuePoolPositions = new Map<GameplayCueName, number>();
  private worldWidth = 0;
  private groundCollider!: Phaser.GameObjects.Rectangle;
  private bossEncounter!: BossEncounter;

  constructor() {
    super('Survive');
  }

  init(): void {
    // Every field below is rebuilt from scratch in create() (including a fresh
    // BossEncounter instance), so init() only needs to reset flags create()
    // doesn't itself reinitialise.
    this.isEnding = false;
    this.obstacleSpawnAccumulator = 0;
    this.obstacleSpawnInterval = 0;
    this.tokenSpawnAccumulator = 0;
    this.tokenTextureQueue = [];
    this.floorHazardSpawnAccumulator = 0;
    this.floorHazardSpawnInterval = 0;
  }

  create(): void {
    // Every (re)start is a fresh career: age 20 / rank A1 / distance 0, per the game design.
    this.state = new GameState(this.registry);
    this.state.reset();

    this.worldWidth = PLAYER_START_X + FINAL_DISTANCE + INITIAL_WORLD_BUFFER;
    this.physics.world.setBounds(0, 0, this.worldWidth, WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, this.worldWidth, WORLD_HEIGHT);
    this.cameras.main.setBackgroundColor(0x000000);
    this.buildOfficeBackground();

    const ground = this.physics.add.staticGroup();
    this.groundCollider = this.add.rectangle(this.worldWidth / 2, GROUND_Y, this.worldWidth, 32, 0xffffff, 0);
    this.physics.add.existing(this.groundCollider, true);
    ground.add(this.groundCollider);

    this.player = new Player(
      this,
      PLAYER_START_X,
      PLAYER_START_Y,
      this.state.rank.parryWindowSeconds,
      this.state.characterId
    );
    this.cameras.main.startFollow(
      this.player,
      true,
      1,
      1,
      -this.scale.width * (0.5 - PLAYER_CAMERA_SCREEN_RATIO),
      -140
    );

    this.obstacles = this.physics.add.group({ allowGravity: false });
    this.tokens = this.physics.add.group({ allowGravity: false });
    this.bossProjectiles = this.physics.add.group({ allowGravity: false });
    this.floorHazards = this.physics.add.group({ allowGravity: false, immovable: true });

    this.physics.add.collider(this.player, ground);
    this.physics.add.overlap(this.player, this.obstacles, this.handleObstacleOverlap, undefined, this);
    this.physics.add.overlap(this.player, this.tokens, this.handleTokenOverlap, undefined, this);
    this.physics.add.overlap(
      this.player,
      this.bossProjectiles,
      (_player, projectile) => this.bossEncounter.handleProjectileOverlap(projectile as Projectile),
      undefined,
      this
    );
    this.physics.add.overlap(this.player, this.floorHazards, this.handleFloorHazardOverlap, undefined, this);

    this.bossEncounter = new BossEncounter(this, this.officeBackgrounds, this.bossProjectiles, this.player, {
      playCue: (name) => this.playCue(name as GameplayCueName),
      burst: (x, y, tint) => this.burst(x, y, tint),
      registerHit: () => this.registerHit(),
      triggerGameOver: () => this.triggerGameOver(),
      isEnding: () => this.isEnding,
      stopGameplayMusic: () => this.gameplayMusic?.stop(),
      applyVictory: (targetRankIndex) => this.applyVictory(targetRankIndex),
      resumeGameplay: () => this.resumeNormalGameplay(),
    });

    this.scene.launch('HUD');

    this.input.keyboard?.on('keydown-ESC', this.openPauseMenu, this);

    this.createCuePools();
    this.startGameplayMusic();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.stopAllMusic, this);
    this.emitFullState();
  }

  update(_time: number, delta: number): void {
    if (this.isEnding) return;

    this.player.update(delta);
    this.extendWorldIfNeeded();

    if (this.bossEncounter.isEngaged) {
      this.bossEncounter.update(delta);
    } else {
      this.updateProgress();
      if (this.player.startedMoving) this.updateSpawning(delta);
    }

    this.updateMovingEntities(delta);
    this.updateFloorHazardParallax();
    this.checkSweptProjectileOverlaps();
    this.bossEncounter.cleanupProjectilesPastPlayer();
    this.updateOfficeBackground();
    this.cleanupOffscreen();
  }

  // Distance remains the player's score; promotion is earned by collecting the rank's tokens.
  private extendWorldIfNeeded(): void {
    if (this.player.x < this.worldWidth - WORLD_EXTENSION_THRESHOLD) return;

    this.worldWidth += WORLD_EXTENSION_LENGTH;
    this.physics.world.setBounds(0, 0, this.worldWidth, WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, this.worldWidth, WORLD_HEIGHT);
    this.groundCollider.setPosition(this.worldWidth / 2, GROUND_Y);
    this.groundCollider.setSize(this.worldWidth, 32);
    (this.groundCollider.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
  }

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

    if (this.tokens.getChildren().length === 0) {
      this.tokenSpawnAccumulator += delta;
      if (this.tokenSpawnAccumulator >= rank.tokenSpawnIntervalMs) {
        this.tokenSpawnAccumulator = 0;
        this.spawnToken(rank);
      }
    } else {
      this.tokenSpawnAccumulator = 0;
    }

    this.floorHazardSpawnAccumulator += delta;
    if (this.floorHazardSpawnInterval === 0) {
      this.floorHazardSpawnInterval = Phaser.Math.Between(
        Math.round(rank.obstacleSpawnMinMs * FLOOR_HAZARD_INTERVAL_MULTIPLIER),
        Math.round(rank.obstacleSpawnMaxMs * FLOOR_HAZARD_INTERVAL_MULTIPLIER)
      );
    }
    if (this.floorHazardSpawnAccumulator >= this.floorHazardSpawnInterval) {
      this.floorHazardSpawnAccumulator = 0;
      this.floorHazardSpawnInterval = 0;
      this.spawnFloorHazard();
    }
  }

  private spawnObstacle(rank: RankConfig): void {
    const { x, y } = this.findSpawnPosition(rank, 'obstacle');
    const textureKey = Phaser.Utils.Array.GetRandom(OBSTACLE_TEXTURE_KEYS);
    this.obstacles.add(new Projectile(this, x, y, textureKey, this.player.x, this.player.y, rank.obstacleSpeed * REGULAR_PROJECTILE_SPEED_MULTIPLIER, rank.obstacleRotationSpeed, rank.badgeDisplaySize));
  }

  private spawnFloorHazard(): void {
    const camera = this.cameras.main;
    const anchorX =
      camera.scrollX * FLOOR_HAZARD_SCROLL_FACTOR +
      this.scale.width +
      Phaser.Math.Between(SPAWN_MARGIN_X, SPAWN_MARGIN_X + 320);
    const textureKey = Phaser.Utils.Array.GetRandom(FLOOR_HAZARD_TEXTURE_KEYS);
    const hazard = new FloorHazard(this, anchorX, GROUND_Y + 30, textureKey);

    const screenRightWorldX = camera.scrollX + this.scale.width;
    const overlap = screenRightWorldX - hazard.getBounds().left;
    if (overlap > 0) {
      hazard.nudgeAnchorX(overlap, camera);
    }

    this.floorHazards.add(hazard);
  }

  private spawnToken(rank: RankConfig): void {
    if (this.tokenTextureQueue.length === 0) {
      this.tokenTextureQueue = Phaser.Utils.Array.Shuffle([...REGULAR_TOKEN_TEXTURE_KEYS]);
    }
    const textureKey = this.tokenTextureQueue.pop()!;
    const { x, y } = this.findSpawnPosition(rank, 'token');
    this.tokens.add(new Collectible(this, x, y, textureKey, {
      pattern: 'drifting',
      amplitude: 0,
      speed: (rank.obstacleSpeed * OBSTACLE_SPEED_MULTIPLIER) / TOKEN_SPEED_DIVISOR,
    }, rank.badgeDisplaySize));
  }

  private getTokenHeightRange(rank: RankConfig): { min: number; max: number } {
    const tokenRadius = (rank.badgeDisplaySize * COLLECTIBLE_RENDER_SCALE) / 2;
    const max = GROUND_TOP_Y - WORLD_TOP_Y - tokenRadius - TOKEN_APEX_CLEARANCE;

    return {
      min: PLAYER_HEIGHT,
      max,
    };
  }

  private updateMovingEntities(delta: number): void {
    for (const child of this.obstacles.getChildren()) (child as Projectile).updateMotion(delta);
    for (const child of this.tokens.getChildren()) (child as Collectible).updateMotion(delta);
    for (const child of this.bossProjectiles.getChildren()) (child as Projectile).updateMotion(delta);
  }

  private updateFloorHazardParallax(): void {
    const camera = this.cameras.main;
    for (const child of this.floorHazards.getChildren()) {
      (child as FloorHazard).updateParallax(camera);
    }
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
        this.bossEncounter.handleProjectileOverlap(projectile);
      }
    }
  }

  private findSpawnPosition(rank: RankConfig, type: 'token' | 'obstacle'): { x: number; y: number } {
    const heightMin = type === 'obstacle' ? rank.obstacleSpawnHeightMin : 50;
    const heightMax = type === 'obstacle' ? rank.obstacleSpawnHeightMax : 160;
    const activeObjects = [...this.obstacles.getChildren(), ...this.tokens.getChildren()] as Phaser.GameObjects.GameObject[];
    const cameraRight = this.cameras.main.scrollX + this.scale.width;
    const tokenHeightRange = type === 'token' ? this.getTokenHeightRange(rank) : null;

    for (let attempt = 0; attempt < 20; attempt += 1) {
      const candidate = {
        x: cameraRight + Phaser.Math.Between(SPAWN_MARGIN_X, SPAWN_MARGIN_X + 320),
        y: tokenHeightRange
          ? GROUND_TOP_Y - Phaser.Math.Between(tokenHeightRange.min, tokenHeightRange.max)
          : GROUND_TOP_Y - Phaser.Math.Between(heightMin, heightMax),
      };
      const hasNearbyObject = activeObjects.some((object) => {
        const existing = object as Phaser.GameObjects.Sprite;
        return Phaser.Math.Distance.Between(candidate.x, candidate.y, existing.x, existing.y) < MIN_SPAWN_DISTANCE;
      });
      if (!hasNearbyObject) return candidate;
    }

    const rightmostObject = activeObjects.reduce((rightmost, object) => Math.max(rightmost, (object as Phaser.GameObjects.Sprite).x), cameraRight);
    const fallbackHeight = tokenHeightRange ? tokenHeightRange.min : heightMin;
    return { x: rightmostObject + MIN_SPAWN_DISTANCE + SPAWN_MARGIN_X, y: GROUND_TOP_Y - fallbackHeight };
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
    const floorLeftEdge = this.cameras.main.scrollX - FLOOR_HAZARD_CLEANUP_MARGIN;
    for (const child of this.floorHazards.getChildren()) {
      const hazard = child as FloorHazard;
      if (hazard.x < floorLeftEdge) hazard.destroy();
    }
  }

  private handleObstacleOverlap(_playerObj: unknown, obstacleObj: unknown): void {
    const obstacle = obstacleObj as Projectile;
    if (obstacle.isResolved || this.isEnding) return;

    if (this.player.isParrying) {
      this.player.confirmParrySuccess();
      obstacle.resolveParried();
      this.playCue('parry');
      this.burst(obstacle.x, obstacle.y, 0xffe066);
    } else {
      obstacle.resolveHit();
      this.registerHit();
    }
  }

  private handleFloorHazardOverlap(_playerObj: unknown, hazardObj: unknown): void {
    const hazard = hazardObj as FloorHazard;
    if (!hazard.active || this.isEnding) return;

    hazard.destroy();
    this.registerHit();
  }

  private handleTokenOverlap(_playerObj: unknown, tokenObj: unknown): void {
    const token = tokenObj as Collectible;
    this.tokens.remove(token, false, false);
    const { x, y } = token;

    token.collect(() => {
      if (token.texture.key === 'token-health') {
        this.healPlayer(x, y);
        return;
      }
      this.awardToken();
    });
    this.burst(x, y, token.texture.key === 'token-health' ? 0x6ef3a6 : 0xffd23f);
  }

  private healPlayer(x: number, y: number): number {
    if (this.isEnding || this.state.isRetired) return this.state.hits;

    this.playCue('collect');
    const previousMaxHits = this.state.maxHits;
    const hits = this.state.heal();
    if (this.state.maxHits > previousMaxHits) {
      eventBus.emit(GameEvents.MaxHitsChanged, this.state.maxHits);
    }
    eventBus.emit(GameEvents.HitsChanged, hits);
    this.showHealthGain(x, y);
    return hits;
  }

  private showHealthGain(x: number, y: number): void {
    const gainText = this.add
      .text(x, y, '+1', {
        fontSize: '140px',
        color: '#6ef3a6',
        fontStyle: 'bold',
        stroke: '#07101c',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(20);

    this.tweens.add({
      targets: gainText,
      y: y - 70,
      alpha: 0,
      duration: 900,
      ease: 'Cubic.easeOut',
      onComplete: () => gainText.destroy(),
    });
  }

  private awardToken(): number {
    if (this.isEnding || this.bossEncounter.isActive || this.state.isRetired) return this.state.tokens;

    this.playCue('collect');
    const count = this.state.addToken();
    const needed = this.state.rank.tokensToPromote;
    eventBus.emit(GameEvents.TokensChanged, { count, needed });

    if (count >= needed) {
      this.promoteTo(this.state.rankIndex + 1);
    }

    return count;
  }

  private promoteTo(nextIndex: number): void {
    const clamped = Math.min(nextIndex, FINAL_RANK_INDEX);
    if (clamped <= this.state.rankIndex) return;

    // Trigger a boss encounter instead of promoting immediately.
    if (!this.bossEncounter.isActive) {
      this.startBossEncounter(clamped);
      return;
    }

    // NOTE: unreachable as things stand — applyVictory() (called from
    // BossEncounter on defeat) applies the rank change directly and this
    // method is never invoked a second time for the same promotion. Left
    // as-is per your call to look at this separately.
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
      this.burst(this.player.x, this.player.y, 0x7cfc90);
    }
  }

  private startBossEncounter(targetRankIndex: number): void {
    // Pause all normal spawning; the boss encounter has its own pacing.
    this.obstacleSpawnAccumulator = 0;
    this.obstacleSpawnInterval = 0;
    this.tokenSpawnAccumulator = 0;
    this.tokens.clear(true, true);
    this.floorHazardSpawnAccumulator = 0;
    this.floorHazardSpawnInterval = 0;
    this.floorHazards.clear(true, true);

    this.bossEncounter.start(this.state.rank, targetRankIndex);
  }

  /** Applies the rank/state change on boss victory. Called by BossEncounter via callback. */
  private applyVictory(targetRankIndex: number): void {
    const shouldFinalVictory = shouldTriggerVictoryAfterBossVictory(this.state.rankIndex, targetRankIndex);

    this.state.rankIndex = targetRankIndex;
    this.state.resetHits(); // full health on promotion
    this.state.resetTokens();
    eventBus.emit(GameEvents.HitsChanged, this.state.hits);

    const rank = this.state.rank;
    this.player.setRankScale(rank.playerScale);
    this.player.setParryWindowSeconds(rank.parryWindowSeconds);

    eventBus.emit(GameEvents.RankChanged, rank);
    eventBus.emit(GameEvents.AgeChanged, rank.age);
    eventBus.emit(GameEvents.TokensChanged, { count: 0, needed: rank.tokensToPromote });

    if (shouldFinalVictory) {
      this.triggerVictory();
    }
  }

  private resumeNormalGameplay(): void {
    if (this.isEnding) return;

    this.startGameplayMusic();

    const camera = this.cameras.main;
    const offsetX = this.player.x - camera.scrollX - camera.width / 2;
    const offsetY = this.player.y - camera.scrollY - camera.height / 2;
    camera.startFollow(this.player, true, 1, 1, offsetX, offsetY);
    this.player.setParryWindowSeconds(this.state.rank.parryWindowSeconds);

    this.obstacleSpawnInterval = 0;
    this.obstacleSpawnAccumulator = 0;
    this.tokenSpawnAccumulator = 0;
  }

  private registerHit(): void {
    if (this.isEnding || this.player.invincible) return;

    this.playCue(this.state.characterId.startsWith('female-') ? 'ouch_female' : 'ouch_male');
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
      this.scene.start('GameOverScene', {
        age: this.state.age,
        rankId: this.state.rank.label,
        score: this.state.distance,
        leaderboardService: createLeaderboardService(),
      });
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
    const rightmostX = Math.max(...this.officeBackgrounds.map((segment) => segment.x));
    for (const image of this.officeBackgrounds) {
      if (image.x + backgroundWidth / 2 < cameraLeft - backgroundWidth / 2) {
        image.x = rightmostX + backgroundWidth;
      }
    }
  }

  private openPauseMenu(): void {
    if (this.isEnding || this.scene.isActive('Pause')) return;

    this.scene.pause();
    this.scene.launch('Pause');
  }

  private startGameplayMusic(): void {
    if (!this.gameplayMusic) {
      this.gameplayMusic = this.sound.add('game-music', {
        loop: true,
        volume: isMusicMuted() ? 0 : 0.05,
      });
    }
    if (!this.gameplayMusic.isPlaying) {
      this.gameplayMusic.play();
    }
    if (!this.gameplaySfx) {
      this.gameplaySfx = this.sound.add('game-sfx', {
        loop: true,
        volume: isMusicMuted() ? 0 : 1,
      });
    }
    if (!this.gameplaySfx.isPlaying) {
      this.gameplaySfx.play();
    }
  }

  private stopAllMusic(): void {
    this.gameplayMusic?.destroy();
    this.gameplayMusic = undefined;
    this.gameplaySfx?.destroy();
    this.gameplaySfx = undefined;
    this.bossEncounter?.shutdown();
    for (const sounds of this.cuePools.values()) {
      sounds.forEach((sound) => sound.destroy());
    }
    this.cuePools.clear();
    this.cuePoolPositions.clear();
  }

  private createCuePools(): void {
    for (const name of GAMEPLAY_CUE_NAMES) {
      this.cuePools.set(name, Array.from({ length: CUE_POOL_SIZE }, () => this.sound.add(name)));
      this.cuePoolPositions.set(name, 0);
    }
  }

  private playCue(name: GameplayCueName): void {
    const pool = this.cuePools.get(name);
    if (!pool) return;

    const position = this.cuePoolPositions.get(name) ?? 0;
    pool[position].play();
    this.cuePoolPositions.set(name, (position + 1) % pool.length);
  }
}