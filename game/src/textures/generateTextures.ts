import Phaser from 'phaser';
import { obstacleTextureKey, type ObstacleTheme } from '../data/rankConfig';
import { REGULAR_TOKEN_TEXTURE_KEYS, PROMOTION_TOKEN_TEXTURE_KEY } from '../entities/Collectible';

// All game art is procedurally generated at boot time - no binary asset files to download,
// license, or go stale. Swap in this.load.image()/this.load.spritesheet() calls in
// PreloadScene if real art is added later; these texture keys can stay the same.
export function generateTextures(scene: Phaser.Scene): void {
  const g = scene.add.graphics();

  drawPlatformTexture(g);
  drawParticleTexture(g);
  drawObstacleTextures(g);
  drawTokenTextures(g);

  g.destroy();
}

function drawPlatformTexture(g: Phaser.GameObjects.Graphics): void {
  g.clear();
  g.fillStyle(0x8b5a2b, 1);
  g.fillRect(0, 0, 32, 32);
  g.fillStyle(0x4caf50, 1);
  g.fillRect(0, 0, 32, 8);
  g.lineStyle(1, 0x000000, 0.15);
  g.strokeRect(0, 0, 32, 32);
  g.generateTexture('platform', 32, 32);
}

function drawParticleTexture(g: Phaser.GameObjects.Graphics): void {
  g.clear();
  g.fillStyle(0xffffff, 1);
  g.fillCircle(4, 4, 4);
  g.generateTexture('particle', 8, 8);
}

const OBSTACLE_SIZE = 28;

// One placeholder shape per rank tier to prove the retheme-per-rank loop (see rankConfig.ts theme
// field). Full per-obstacle variety (4 icons per tier) is deferred to a later pass.
function drawObstacleTextures(g: Phaser.GameObjects.Graphics): void {
  drawFlagObstacle(g, 'gradDev', 0xe0521c);
  drawChevronObstacle(g, 'intermediate', 0xf39c12);
  drawBubbleObstacle(g, 'senior', 0x3498db);
  drawGridObstacle(g, 'architect', 0x9b59b6);
  drawFlameGridObstacle(g, 'manager', 0xe74c3c);
  drawCardObstacle(g, 'cto', 0x2c3e50);
  drawBurstObstacle(g, 'ceo', 0xffd23f);
}

function drawFlagObstacle(g: Phaser.GameObjects.Graphics, theme: ObstacleTheme, color: number): void {
  g.clear();
  g.fillStyle(0x5b5b5b, 1);
  g.fillRect(12, 2, 3, 24);
  g.fillStyle(color, 1);
  g.fillTriangle(15, 4, 15, 16, 27, 8);
  g.generateTexture(obstacleTextureKey(theme), OBSTACLE_SIZE, OBSTACLE_SIZE);
}

function drawChevronObstacle(g: Phaser.GameObjects.Graphics, theme: ObstacleTheme, color: number): void {
  g.clear();
  g.fillStyle(color, 1);
  g.fillTriangle(4, 8, 24, 8, 14, 20);
  g.fillTriangle(4, 20, 24, 20, 14, 8);
  g.generateTexture(obstacleTextureKey(theme), OBSTACLE_SIZE, OBSTACLE_SIZE);
}

function drawBubbleObstacle(g: Phaser.GameObjects.Graphics, theme: ObstacleTheme, color: number): void {
  g.clear();
  g.fillStyle(color, 1);
  g.fillRoundedRect(2, 2, 24, 18, 6);
  g.fillTriangle(8, 20, 8, 26, 14, 20);
  g.generateTexture(obstacleTextureKey(theme), OBSTACLE_SIZE, OBSTACLE_SIZE);
}

function drawGridObstacle(g: Phaser.GameObjects.Graphics, theme: ObstacleTheme, color: number): void {
  g.clear();
  g.fillStyle(0xecf0f1, 1);
  g.fillRect(2, 2, 24, 24);
  g.lineStyle(2, color, 1);
  g.strokeRect(2, 2, 24, 24);
  g.lineBetween(2, 10, 26, 10);
  g.lineBetween(2, 18, 26, 18);
  g.lineBetween(10, 2, 10, 26);
  g.lineBetween(18, 2, 18, 26);
  g.generateTexture(obstacleTextureKey(theme), OBSTACLE_SIZE, OBSTACLE_SIZE);
}

function drawFlameGridObstacle(g: Phaser.GameObjects.Graphics, theme: ObstacleTheme, color: number): void {
  g.clear();
  g.fillStyle(0x7f8c8d, 1);
  g.fillRect(2, 10, 24, 16);
  g.lineStyle(1, 0x000000, 0.2);
  g.strokeRect(2, 10, 24, 16);
  g.fillStyle(color, 1);
  g.fillTriangle(14, 0, 6, 14, 22, 14);
  g.generateTexture(obstacleTextureKey(theme), OBSTACLE_SIZE, OBSTACLE_SIZE);
}

function drawCardObstacle(g: Phaser.GameObjects.Graphics, theme: ObstacleTheme, color: number): void {
  g.clear();
  g.fillStyle(color, 1);
  g.fillRoundedRect(2, 4, 24, 20, 3);
  g.fillStyle(0xffffff, 1);
  g.fillRect(6, 9, 16, 3);
  g.fillRect(6, 15, 10, 3);
  g.generateTexture(obstacleTextureKey(theme), OBSTACLE_SIZE, OBSTACLE_SIZE);
}

function drawBurstObstacle(g: Phaser.GameObjects.Graphics, theme: ObstacleTheme, color: number): void {
  g.clear();
  g.fillStyle(color, 1);
  g.fillPoints(starPoints(14, 14, 13, 6, 6), true);
  g.generateTexture(obstacleTextureKey(theme), OBSTACLE_SIZE, OBSTACLE_SIZE);
}

const TOKEN_SIZE = 24;

function drawTokenTextures(g: Phaser.GameObjects.Graphics): void {
  drawDiamondToken(g, REGULAR_TOKEN_TEXTURE_KEYS[0], 0x8b5a2b); // coffee
  drawDiamondToken(g, REGULAR_TOKEN_TEXTURE_KEYS[1], 0x4caf50); // feedback
  drawDiamondToken(g, REGULAR_TOKEN_TEXTURE_KEYS[2], 0xffd23f); // pay-rise cash
  drawDiamondToken(g, REGULAR_TOKEN_TEXTURE_KEYS[3], 0x5ec8f2); // project checkmark
  drawPromotionToken(g);
}

function drawDiamondToken(g: Phaser.GameObjects.Graphics, key: string, color: number): void {
  g.clear();
  const points = [
    { x: 12, y: 0 },
    { x: 24, y: 12 },
    { x: 12, y: 24 },
    { x: 0, y: 12 },
  ];
  g.fillStyle(color, 1);
  g.fillPoints(points, true);
  g.lineStyle(2, 0xffffff, 0.8);
  g.strokePoints(points, true);
  g.generateTexture(key, TOKEN_SIZE, TOKEN_SIZE);
}

function drawPromotionToken(g: Phaser.GameObjects.Graphics): void {
  g.clear();
  g.fillStyle(0xffd700, 1);
  g.fillPoints(starPoints(15, 15, 14, 6, 5), true);
  g.lineStyle(2, 0xffffff, 0.9);
  g.strokePoints(starPoints(15, 15, 14, 6, 5), true);
  g.generateTexture(PROMOTION_TOKEN_TEXTURE_KEY, 30, 30);
}

function starPoints(
  cx: number,
  cy: number,
  outerRadius: number,
  innerRadius: number,
  spikes: number
): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  const step = Math.PI / spikes;
  let rotation = -Math.PI / 2;
  for (let i = 0; i < spikes; i += 1) {
    points.push({ x: cx + Math.cos(rotation) * outerRadius, y: cy + Math.sin(rotation) * outerRadius });
    rotation += step;
    points.push({ x: cx + Math.cos(rotation) * innerRadius, y: cy + Math.sin(rotation) * innerRadius });
    rotation += step;
  }
  return points;
}

