import Phaser from 'phaser';
export function generateTextures(scene: Phaser.Scene): void {
  const g = scene.add.graphics();

  drawPlatformTexture(g);
  drawParticleTexture(g);

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


