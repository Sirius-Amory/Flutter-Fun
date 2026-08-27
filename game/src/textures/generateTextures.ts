import Phaser from 'phaser';

// All game art is procedurally generated at boot time - no binary asset files to download,
// license, or go stale. Swap in this.load.image()/this.load.spritesheet() calls in
// PreloadScene if real art is added later; these texture keys can stay the same.
export function generateTextures(scene: Phaser.Scene): void {
  const g = scene.add.graphics();

  drawPlayerTexture(g);
  drawEnemyTexture(g);
  drawCollectibleTexture(g);
  drawPlatformTexture(g);
  drawParticleTexture(g);

  g.destroy();
}

function drawPlayerTexture(g: Phaser.GameObjects.Graphics): void {
  g.clear();
  g.fillStyle(0xff6b6b, 1);
  g.fillRoundedRect(0, 0, 32, 32, 10);
  g.fillStyle(0x2b2b2b, 1);
  g.fillCircle(11, 13, 3);
  g.fillCircle(21, 13, 3);
  g.generateTexture('player', 32, 32);
}

function drawEnemyTexture(g: Phaser.GameObjects.Graphics): void {
  g.clear();
  g.fillStyle(0x6c5ce7, 1);
  g.fillRoundedRect(0, 4, 32, 24, 12);
  g.fillStyle(0xffffff, 1);
  g.fillCircle(11, 15, 3.5);
  g.fillCircle(21, 15, 3.5);
  g.fillStyle(0x2b2b2b, 1);
  g.fillCircle(11, 15, 1.5);
  g.fillCircle(21, 15, 1.5);
  g.generateTexture('enemy', 32, 32);
}

function drawCollectibleTexture(g: Phaser.GameObjects.Graphics): void {
  g.clear();
  const points = [
    { x: 12, y: 0 },
    { x: 24, y: 12 },
    { x: 12, y: 24 },
    { x: 0, y: 12 },
  ];
  g.fillStyle(0xffd23f, 1);
  g.fillPoints(points, true);
  g.lineStyle(2, 0xffffff, 0.8);
  g.strokePoints(points, true);
  g.generateTexture('collectible', 24, 24);
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
