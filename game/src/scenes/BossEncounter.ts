import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Projectile } from '../entities/Projectile';
import { Boss } from '../entities/Boss';
import { RANKS, FINAL_RANK_INDEX, type RankConfig } from '../data/rankConfig';
import {
  OBSTACLE_TEXTURE_KEYS,
  PROMOTION_OPPORTUNITY_ASSET,
  PROMOTION_TOKEN_ASSET,
} from '../data/gameAssets';
import { playSfx } from '../audio/SfxManager';
import { isMusicMuted } from '../audio/MusicManager';
import { BossHealthBar } from './BossHealthBar';

const BOSS_PROJECTILE_MIN_INTERVAL_MS = 400;
const BOSS_PROJECTILE_MAX_INTERVAL_MS = 1000;
const BOSS_RAPID_SHOT_INTERVAL_MS = 150;
const BOSS_PROJECTILE_SPEED_MULTIPLIER = 2.5;
const BOSS_PARRY_WINDOW_MULTIPLIER = 0.5;

const BOSS_DARKEN_DURATION_MS = 2000;
const BOSS_RESTORE_DURATION_MS = 3000;
const BACKGROUND_NORMAL_ALPHA = 0.72;
const BOSS_BACKGROUND_ALPHA = 0.15;

const FLASH_SCALE_IN_DURATION_MS = 300;
const FLASH_HOLD_MS = 1200;
const FLASH_FADE_OUT_MS = 300;

const BOSS_SPAWN_OFFSET_X = 200; // spawns this far right of the camera's right edge
const BOSS_COMBAT_OFFSET_X = 320; // settles this far left of the camera's right edge
const BOSS_Y_OFFSET_FROM_BOTTOM = 340;
const BOSS_WALK_IN_SPEED_X = -80;
const BOSS_WALK_IN_DURATION_MS = 3500;

const DEFEAT_FALL_STEP_MS = 1000;
const TOKEN_SCALE_IN_DURATION_MS = 400;
const TOKEN_HOLD_MS = 1400;
const TOKEN_FADE_OUT_MS = 500;
const VICTORY_FADE_DURATION_MS = 500;
const RESUME_DELAY_MS = 600;

const BOSS_PROJECTILE_SIZE = 48;
const BOSS_PROJECTILE_Y_OFFSET = 20;

export interface BossEncounterCallbacks {
  playCue(name: string): void;
  burst(x: number, y: number, tint: number): void;
  registerHit(): void;
  triggerGameOver(): void;
  isEnding(): boolean;
  stopGameplayMusic(): void;
  /** Called once, at the moment the boss fades out, so the scene can apply the rank change. */
  applyVictory(targetRankIndex: number): void;
  /** Called after the post-victory pause, so the scene can restore camera/music/spawning. */
  resumeGameplay(): void;
}

/**
 * Owns a single boss encounter end-to-end: the promotion flash, boss walk-in,
 * telegraph/attack cycling, projectile spawning, parry-triggered defeat sequence,
 * and its health bar. The scene supplies groups it already owns (bossProjectiles)
 * plus a handful of callbacks for anything that needs to reach back into scene
 * state (GameState, camera follow, music, game-over/victory).
 */
export class BossEncounter {
  private boss: Boss | null = null;
  private active = false;
  private targetRankIndex = -1;
  private defeatSequenceActive = false;
  private healthBar: BossHealthBar | null = null;
  private bossMusic?: Phaser.Sound.BaseSound;

  private projectileSpawnAccumulator = 0;
  private nextProjectileDelayMs = 0;
  private rapidShotsRemaining = 0;
  private wasAttacking = false;
  private wasTelegraphing = false;
  private lastTelegraphCue = -1;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly officeBackgrounds: Phaser.GameObjects.Image[],
    private readonly bossProjectiles: Phaser.Physics.Arcade.Group,
    private readonly player: Player,
    private readonly callbacks: BossEncounterCallbacks
  ) {}

  /** True from the moment an encounter is triggered until it fully resolves. */
  get isActive(): boolean {
    return this.active;
  }

  /** True once the boss sprite actually exists (i.e. past the opening flash/walk-in). */
  get isEngaged(): boolean {
    return this.active && this.boss !== null;
  }

  start(rank: RankConfig, targetRankIndex: number): void {
    this.active = true;
    this.defeatSequenceActive = false;
    this.targetRankIndex = targetRankIndex;

    this.callbacks.stopGameplayMusic();
    if (!this.bossMusic) {
      this.bossMusic = this.scene.sound.add('boss', { loop: true, volume: isMusicMuted() ? 0 : 0.5 });
    }
    this.bossMusic.play();
    this.player.setParryWindowSeconds(rank.parryWindowSeconds * BOSS_PARRY_WINDOW_MULTIPLIER);

    this.scene.cameras.main.stopFollow();
    this.showPromotionFlash(targetRankIndex);
  }

  private showPromotionFlash(targetRankIndex: number): void {
    const flashImage = this.scene.add.image(
      this.scene.scale.width / 2,
      this.scene.scale.height / 2,
      PROMOTION_OPPORTUNITY_ASSET.key
    );
    flashImage.setOrigin(0.5, 0.5);
    flashImage.setScrollFactor(0);
    flashImage.setDepth(100);
    flashImage.setScale(0.3);
    flashImage.setAlpha(0);

    this.scene.tweens.add({
      targets: flashImage,
      scale: 1,
      alpha: 1,
      duration: FLASH_SCALE_IN_DURATION_MS,
      ease: 'Back.easeOut',
    });

    this.scene.time.delayedCall(FLASH_HOLD_MS, () => {
      this.scene.tweens.add({
        targets: flashImage,
        alpha: 0,
        duration: FLASH_FADE_OUT_MS,
        onComplete: () => flashImage.destroy(),
      });
      this.spawnAndWalkIn(targetRankIndex);
    });
  }

  private spawnAndWalkIn(targetRankIndex: number): void {
    const camera = this.scene.cameras.main;
    const cameraRight = camera.scrollX + this.scene.scale.width;
    const combatX = cameraRight - BOSS_COMBAT_OFFSET_X;
    const spawnX = cameraRight + BOSS_SPAWN_OFFSET_X;
    const bossY = camera.scrollY + this.scene.scale.height - BOSS_Y_OFFSET_FROM_BOTTOM;

    // Difficulty is based on the rank being promoted TO.
    const targetRank = RANKS[Math.min(targetRankIndex, FINAL_RANK_INDEX)];
    this.boss = new Boss(this.scene, spawnX, bossY, targetRankIndex, targetRank.playerScale);
    this.wasTelegraphing = false;
    this.lastTelegraphCue = -1;
    this.dimBackground();

    const body = this.boss.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(BOSS_WALK_IN_SPEED_X, 0);
    this.boss.startWalkIn();
    this.boss.play('boss-walk-in');

    this.scene.time.delayedCall(BOSS_WALK_IN_DURATION_MS, () => {
      if (!this.boss) return;
      body.setVelocity(0, 0);
      this.boss.x = combatX;
      this.boss.finishWalkIn();
      this.healthBar = new BossHealthBar(this.scene);
      this.healthBar.update(this.boss.getHealth(), this.boss.getMaxHealth());
    });
  }

  update(delta: number): void {
    if (!this.boss) return;

    this.boss.update(delta);

    const isTelegraphing = this.boss.getState() === 'telegraph';
    if (isTelegraphing && !this.wasTelegraphing) {
      this.playTelegraphCue();
    }

    const isAttacking = this.boss.getState() === 'attack';
    if (isAttacking) {
      if (!this.wasAttacking) {
        this.projectileSpawnAccumulator = 0;
        this.spawnProjectile();
        this.rapidShotsRemaining = this.boss.getAttackPattern() === 'rapid' ? 2 : 0;
        this.nextProjectileDelayMs = this.rapidShotsRemaining > 0
          ? BOSS_RAPID_SHOT_INTERVAL_MS
          : Phaser.Math.Between(BOSS_PROJECTILE_MIN_INTERVAL_MS, BOSS_PROJECTILE_MAX_INTERVAL_MS);
      }
      this.updateAttacks(delta);
    } else {
      this.projectileSpawnAccumulator = 0;
      this.rapidShotsRemaining = 0;
    }

    this.wasAttacking = isAttacking;
    this.wasTelegraphing = isTelegraphing;
  }

  private updateAttacks(delta: number): void {
    if (!this.boss) return;
    this.projectileSpawnAccumulator += delta;

    if (this.rapidShotsRemaining > 0) {
      if (this.projectileSpawnAccumulator >= BOSS_RAPID_SHOT_INTERVAL_MS) {
        this.projectileSpawnAccumulator -= BOSS_RAPID_SHOT_INTERVAL_MS;
        this.spawnProjectile();
        this.rapidShotsRemaining -= 1;
      }
      return;
    }

    if (this.projectileSpawnAccumulator >= this.nextProjectileDelayMs) {
      this.projectileSpawnAccumulator -= this.nextProjectileDelayMs;
      this.nextProjectileDelayMs = Phaser.Math.Between(
        BOSS_PROJECTILE_MIN_INTERVAL_MS,
        BOSS_PROJECTILE_MAX_INTERVAL_MS
      );
      this.spawnProjectile();
    }
  }

  private spawnProjectile(): void {
    if (!this.boss) return;

    const config = this.boss.getConfig();
    const projectileSpeed = config.projectileSpeed * BOSS_PROJECTILE_SPEED_MULTIPLIER;

    const projectile = new Projectile(
      this.scene,
      this.boss.x,
      this.boss.y - BOSS_PROJECTILE_Y_OFFSET,
      Phaser.Utils.Array.GetRandom(OBSTACLE_TEXTURE_KEYS),
      this.player.x,
      this.player.y,
      projectileSpeed,
      0,
      BOSS_PROJECTILE_SIZE
    );
    this.bossProjectiles.add(projectile);
    this.callbacks.playCue('shoot');
  }

  /** Cleans up boss projectiles the player has already passed without colliding. Called every frame regardless of engagement state, matching the pre-refactor scene loop. */
  cleanupProjectilesPastPlayer(): void {
    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    const playerLeft = playerBody.x;
    for (const child of this.bossProjectiles.getChildren()) {
      const projectile = child as Projectile;
      if (!projectile.isResolved && projectile.x + projectile.displayWidth / 2 < playerLeft) {
        projectile.destroy();
      }
    }
  }

  handleProjectileOverlap(projectile: Projectile): void {
    if (projectile.isResolved || this.callbacks.isEnding() || !this.active) return;

    if (this.player.isParrying) {
      projectile.resolveParried();
      this.callbacks.playCue('parry');
      this.callbacks.burst(projectile.x, projectile.y, 0xffe066);

      if (this.boss?.takeDamage(1)) {
        this.healthBar?.update(this.boss.getHealth(), this.boss.getMaxHealth());
        this.playDefeatSequence();
      } else if (this.boss) {
        this.healthBar?.update(this.boss.getHealth(), this.boss.getMaxHealth());
      }
    } else {
      projectile.resolveHit();
      this.callbacks.registerHit();
    }
  }

  private playDefeatSequence(): void {
    if (!this.boss || this.defeatSequenceActive) return;
    this.defeatSequenceActive = true;

    // Halt the boss state machine and remove every active attack immediately.
    this.boss.setDefeated();
    this.clearProjectiles();
    this.restoreBackground();

    // Sequence: fall_1 -> fall_2 -> defeated, one second per frame.
    this.boss.setDefeatTexture('boss-fall1');
    this.scene.time.delayedCall(DEFEAT_FALL_STEP_MS, () => {
      if (!this.boss) return;
      this.callbacks.playCue('villain-defeated');
      this.boss.setDefeatTexture('boss-fall2');

      this.scene.time.delayedCall(DEFEAT_FALL_STEP_MS, () => {
        if (!this.boss) return;
        this.boss.setDefeatTexture('boss-defeated');

        this.scene.time.delayedCall(DEFEAT_FALL_STEP_MS, () => {
          this.showPromotionToken(() => this.finish(true));
        });
      });
    });
  }

  private showPromotionToken(onComplete: () => void): void {
    this.callbacks.playCue('victory');
    const tokenSprite = this.scene.add.sprite(
      this.scene.scale.width / 2,
      this.scene.scale.height / 2,
      PROMOTION_TOKEN_ASSET.key
    );
    tokenSprite.setScrollFactor(0);
    tokenSprite.setDepth(110);
    tokenSprite.setScale(0);
    tokenSprite.setAlpha(0);

    this.scene.tweens.add({
      targets: tokenSprite,
      scale: 1.2,
      alpha: 1,
      duration: TOKEN_SCALE_IN_DURATION_MS,
      ease: 'Back.easeOut',
    });

    this.scene.tweens.add({
      targets: tokenSprite,
      alpha: 0,
      duration: TOKEN_FADE_OUT_MS,
      delay: TOKEN_HOLD_MS,
      onComplete: () => {
        tokenSprite.destroy();
        onComplete();
      },
    });
  }

  // NOTE: `finish(false)` mirrors the pre-refactor `endBossEncounter(false)` branch,
  // which appears to be dead code in the original too — the only path that could
  // reach it, a non-parried boss-projectile hit, calls registerHit()/triggerGameOver()
  // directly instead. Kept as-is, same "flag, don't fix" treatment as promoteTo's
  // unreachable branch — worth revisiting together.
  private finish(victory: boolean): void {
    if (!this.boss) return;

    this.active = false;
    this.healthBar?.destroy();
    this.healthBar = null;

    if (victory) {
      const boss = this.boss;
      this.scene.tweens.add({
        targets: boss,
        alpha: 0,
        duration: VICTORY_FADE_DURATION_MS,
        onComplete: () => {
          boss.destroy();
          if (this.boss === boss) this.boss = null;
        },
      });

      playSfx('promote');
      this.callbacks.burst(this.player.x, this.player.y, 0x7cfc90);

      const targetRankIndex = this.targetRankIndex;
      this.targetRankIndex = -1;
      this.callbacks.applyVictory(targetRankIndex);

      this.scene.time.delayedCall(RESUME_DELAY_MS, () => {
        this.clearProjectiles();
        this.bossMusic?.stop();
        this.callbacks.resumeGameplay();
      });
    } else {
      this.boss = null;
      this.clearProjectiles();
      this.bossMusic?.stop();
      this.callbacks.triggerGameOver();
    }
  }

  private clearProjectiles(): void {
    for (const child of this.bossProjectiles.getChildren()) child.destroy();
  }

  private playTelegraphCue(): void {
    let cueIndex = Phaser.Math.Between(0, 4);
    if (cueIndex === this.lastTelegraphCue) {
      cueIndex = (cueIndex + Phaser.Math.Between(1, 4)) % 5;
    }
    this.lastTelegraphCue = cueIndex;
    this.callbacks.playCue(`villain-${cueIndex + 1}`);
  }

  private dimBackground(): void {
    this.scene.tweens.add({
      targets: this.officeBackgrounds,
      alpha: BOSS_BACKGROUND_ALPHA,
      duration: BOSS_DARKEN_DURATION_MS,
      ease: 'Linear',
    });
  }

  private restoreBackground(): void {
    this.scene.tweens.add({
      targets: this.officeBackgrounds,
      alpha: BACKGROUND_NORMAL_ALPHA,
      duration: BOSS_RESTORE_DURATION_MS,
      ease: 'Linear',
    });
  }

  /** Scene shutdown only — releases the pooled boss music track and any live health bar. */
  shutdown(): void {
    this.bossMusic?.destroy();
    this.bossMusic = undefined;
    this.healthBar?.destroy();
    this.healthBar = null;
  }
}