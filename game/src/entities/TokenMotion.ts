import Phaser from 'phaser';

export type TokenMotionPattern = 'bobbing' | 'circular' | 'figure8';

export interface TokenMotionConfig {
  pattern: TokenMotionPattern;
  amplitude: number;
  speed: number;
}

export class TokenMotion {
  private elapsed = 0;

  constructor(
    private readonly sprite: Phaser.GameObjects.Sprite,
    private readonly centerX: number,
    private readonly centerY: number,
    private readonly config: TokenMotionConfig
  ) {}

  update(deltaMs: number): void {
    this.elapsed += deltaMs / 1000;
    const phase = this.elapsed * this.config.speed;
    let x = this.centerX;
    let y = this.centerY;

    if (this.config.pattern === 'bobbing') {
      y += Math.sin(phase) * this.config.amplitude;
    } else if (this.config.pattern === 'circular') {
      x += Math.cos(phase) * this.config.amplitude;
      y += Math.sin(phase) * this.config.amplitude;
    } else {
      x += Math.sin(phase) * this.config.amplitude;
      y += Math.sin(phase * 2) * this.config.amplitude * 0.55;
    }

    this.sprite.setPosition(x, y);
  }
}
