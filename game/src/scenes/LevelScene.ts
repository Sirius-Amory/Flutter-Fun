import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { Collectible, COLLECTIBLE_VALUE } from '../entities/Collectible';
import { LEVELS } from '../data/levels';
import { GameState } from '../state/GameState';
import { eventBus, GameEvents } from '../events';
import { playSfx } from '../audio/SfxManager';
import { startBackgroundMusic } from '../audio/MusicManager';

interface LevelSceneData {
  levelIndex: number;
}

const STOMP_SCORE = 20;
const PIT_FALL_MARGIN = 100;

export class LevelScene extends Phaser.Scene {
  private player!: Player;
  private enemies!: Phaser.Physics.Arcade.Group;
  private collectiblesGroup!: Phaser.Physics.Arcade.Group;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private state!: GameState;
  private levelIndex = 0;
  private playerStart = { x: 0, y: 0 };
  private isEnding = false;

  constructor() {
    super('Level');
  }

  init(data: LevelSceneData): void {
    this.levelIndex = data.levelIndex ?? 0;
    this.isEnding = false;
  }

  create(): void {
    const levelData = LEVELS[this.levelIndex];
    this.state = new GameState(this.registry);
    this.playerStart = levelData.playerStart;

    this.physics.world.setBounds(0, 0, levelData.worldWidth, levelData.worldHeight);
    this.cameras.main.setBounds(0, 0, levelData.worldWidth, levelData.worldHeight);
    this.cameras.main.setBackgroundColor(levelData.background?.skyColor ?? 0x4488aa);

    this.buildParallaxHills(levelData.worldWidth, levelData.worldHeight);

    this.platforms = this.physics.add.staticGroup();
    for (const platform of levelData.platforms) {
      const height = platform.height ?? 32;
      const tile = this.add.tileSprite(platform.x, platform.y, platform.width, height, 'platform');
      this.physics.add.existing(tile, true);
      this.platforms.add(tile);
    }

    this.drawGoalFlag(levelData.goal.x, levelData.goal.y);
    const goalZone = this.add.zone(levelData.goal.x, levelData.goal.y, 32, 96);
    this.physics.add.existing(goalZone, true);

    this.player = new Player(this, this.playerStart.x, this.playerStart.y);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    this.enemies = this.physics.add.group();
    for (const enemyDef of levelData.enemies) {
      this.enemies.add(new Enemy(this, enemyDef.x, enemyDef.y, enemyDef.patrolDistance, enemyDef.speed));
    }

    this.collectiblesGroup = this.physics.add.group({ allowGravity: false });
    for (const collectibleDef of levelData.collectibles) {
      this.collectiblesGroup.add(new Collectible(this, collectibleDef.x, collectibleDef.y));
    }

    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.enemies, this.platforms);
    this.physics.add.overlap(this.player, this.enemies, this.handlePlayerEnemyOverlap, undefined, this);
    this.physics.add.overlap(this.player, this.collectiblesGroup, this.handleCollect, undefined, this);
    this.physics.add.overlap(this.player, goalZone, this.handleGoalReached, undefined, this);

    this.scene.launch('HUD', {
      levelName: levelData.name,
      levelIndex: this.levelIndex,
      totalLevels: LEVELS.length,
    });

    startBackgroundMusic();
    eventBus.emit(GameEvents.LevelStarted, { levelIndex: this.levelIndex, name: levelData.name });
    eventBus.emit(GameEvents.ScoreChanged, this.state.score);
    eventBus.emit(GameEvents.LivesChanged, this.state.lives);
  }

  update(): void {
    if (this.isEnding) return;

    this.player.update();
    for (const child of this.enemies.getChildren()) {
      (child as Enemy).update();
    }

    if (this.player.y > LEVELS[this.levelIndex].worldHeight + PIT_FALL_MARGIN) {
      this.onPlayerHurt();
    }
  }

  private handlePlayerEnemyOverlap(playerObj: unknown, enemyObj: unknown): void {
    const player = playerObj as Player;
    const enemy = enemyObj as Enemy;
    const playerBody = player.body as Phaser.Physics.Arcade.Body;
    const isStomp = playerBody.velocity.y > 0 && player.y < enemy.y - 6;

    if (isStomp) {
      enemy.defeat();
      player.bounceOffEnemy();
      this.state.addScore(STOMP_SCORE);
      eventBus.emit(GameEvents.ScoreChanged, this.state.score);
      playSfx('stomp');
      this.burst(enemy.x, enemy.y, 0x6c5ce7);
    } else {
      this.onPlayerHurt();
    }
  }

  private handleCollect(_playerObj: unknown, collectibleObj: unknown): void {
    const collectible = collectibleObj as Collectible;
    this.collectiblesGroup.remove(collectible, false, false);
    const { x, y } = collectible;
    collectible.collect(() => {
      this.state.addScore(COLLECTIBLE_VALUE);
      eventBus.emit(GameEvents.ScoreChanged, this.state.score);
      playSfx('collect');
    });
    this.burst(x, y, 0xffd23f);
  }

  private onPlayerHurt(): void {
    if (this.isEnding || this.player.invincible) return;

    playSfx('hit');
    const lives = this.state.loseLife();
    eventBus.emit(GameEvents.LivesChanged, lives);

    if (lives <= 0) {
      this.isEnding = true;
      this.time.delayedCall(500, () => this.goToGameOver());
    } else {
      this.respawnPlayer();
    }
  }

  private respawnPlayer(): void {
    this.player.setPosition(this.playerStart.x, this.playerStart.y);
    (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    this.player.resetForRespawn();
    this.player.playHitFlash();
  }

  private handleGoalReached(): void {
    if (this.isEnding) return;
    this.isEnding = true;
    playSfx('levelComplete');

    const isLastLevel = this.levelIndex >= LEVELS.length - 1;
    this.time.delayedCall(300, () => {
      this.scene.stop('HUD');
      if (isLastLevel) {
        this.scene.start('Victory', { score: this.state.score });
      } else {
        this.state.levelIndex = this.levelIndex + 1;
        this.scene.start('Level', { levelIndex: this.levelIndex + 1 });
      }
    });
  }

  private goToGameOver(): void {
    playSfx('gameOver');
    this.scene.stop('HUD');
    this.scene.start('GameOver', { score: this.state.score });
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

  private buildParallaxHills(worldWidth: number, worldHeight: number): void {
    const hillCount = Math.ceil(worldWidth / 400) + 1;
    for (let i = 0; i < hillCount; i += 1) {
      const hill = this.add.circle(i * 400 + 200, worldHeight - 20, 220, 0x2f6b4f, 0.5);
      hill.setScrollFactor(0.3);
      hill.setDepth(-10);
    }
  }

  private drawGoalFlag(x: number, y: number): void {
    this.add.rectangle(x, y - 16, 6, 96, 0xdddddd).setDepth(5);
    this.add.triangle(x + 3, y - 56, 0, 0, 0, 20, 26, 10, 0xffd23f).setDepth(5);
  }
}
