import Phaser from 'phaser';

const HEALTH_BAR_WIDTH = 500;
const HEALTH_BAR_HEIGHT = 16;
const HEALTH_BAR_TOP = 30;
const LABEL_GAP = 25;
const LABEL_TEXT = 'Clipboard of Directors';
const LABEL_MAX_FONT_SIZE = 72;
const LABEL_MIN_FONT_SIZE = 8;
const PULSE_DURATION_MS = 100;

/** The boss health bar HUD: background track, depleting fill, and a fitted label. */
export class BossHealthBar {
  private readonly scene: Phaser.Scene;
  private readonly fill: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const centerX = scene.scale.width / 2;

    const container = scene.add.container(centerX, HEALTH_BAR_TOP);
    container.setScrollFactor(0);
    container.setDepth(105); // above HUD

    const background = scene.add.rectangle(
      0,
      HEALTH_BAR_HEIGHT + LABEL_GAP,
      HEALTH_BAR_WIDTH,
      HEALTH_BAR_HEIGHT,
      0x333333
    );
    container.add(background);

    this.fill = scene.add.rectangle(
      -HEALTH_BAR_WIDTH / 2, // left edge fixed; depletes from the right
      HEALTH_BAR_HEIGHT + LABEL_GAP,
      HEALTH_BAR_WIDTH,
      HEALTH_BAR_HEIGHT,
      0xff4444
    );
    this.fill.setOrigin(0, 0.5);
    container.add(this.fill);

    const label = scene.add.text(0, 0, LABEL_TEXT, {
      fontSize: `${LABEL_MAX_FONT_SIZE}px`,
      color: '#ffffff',
      fontStyle: 'bold',
    });
    label.setOrigin(0.5, 0.5);

    let fontSize = LABEL_MAX_FONT_SIZE;
    while (label.width > HEALTH_BAR_WIDTH && fontSize > LABEL_MIN_FONT_SIZE) {
      fontSize -= 1;
      label.setFontSize(fontSize);
    }
    container.add(label);

    this.container = container;
  }

  private readonly container: Phaser.GameObjects.Container;

  update(currentHealth: number, maxHealth: number): void {
    const healthRatio = Math.max(0, currentHealth / maxHealth);
    this.fill.setDisplaySize(HEALTH_BAR_WIDTH * healthRatio, HEALTH_BAR_HEIGHT);

    if (this.fill.alpha < 1) return; // already mid-pulse, don't stack tweens

    this.scene.tweens.add({
      targets: this.fill,
      alpha: 0.5,
      duration: PULSE_DURATION_MS,
      yoyo: true,
      ease: 'Quad.easeInOut',
    });
  }

  destroy(): void {
    this.container.destroy();
  }
}