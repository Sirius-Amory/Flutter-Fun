import Phaser from 'phaser';
import { eventBus, GameEvents } from '../events';
import { GameState } from '../state/GameState';
import type { RankConfig } from '../data/rankConfig';

interface TokensChangedPayload {
  count: number;
  needed: number;
}

const PANEL_RADIUS = 10;
const PROFILE_PANEL_TOP = 0x24384f;
const PROFILE_PANEL_BOTTOM = 0x141f2e;
const PROFILE_PANEL_BORDER = 0xff4444;
const PROGRESS_PANEL_BORDER = 0xffd23f;
const SHADOW_COLOR = 0x000000;
const SHADOW_ALPHA = 0.35;
const SHADOW_OFFSET = 4;
const GLOSS_ALPHA = 0.06;
const BOB_DISTANCE = 3;
const BOB_DURATION = 1400;
const RANK_LABEL_MAX_WIDTH = 214;
const RANK_LABEL_MAX_FONT_SIZE = 22;
const RANK_LABEL_MIN_FONT_SIZE = 14;

export class HUDScene extends Phaser.Scene {
  private ageText!: Phaser.GameObjects.Text;
  private rankText!: Phaser.GameObjects.Text;
  private profilePanel!: Phaser.GameObjects.Container;
  private highlightsFill!: Phaser.GameObjects.Graphics;
  private highlightsBarWidth = 160;
  private setbackPips: Phaser.GameObjects.Image[] = [];

  constructor() {
    super({ key: 'HUD' });
  }

  create(): void {
    const state = new GameState(this.registry);

    this.buildProfilePanel(state);
    this.buildProgressPanel(state);

    const onAgeChanged = (age: number) => this.ageText.setText(`${age} years old`);
    const onRankChanged = (rank: RankConfig) => {
      this.setRankText(`${rank.id} - ${rank.label}`);
      this.pulse(this.profilePanel);
    };
    const onTokensChanged = ({ count, needed }: TokensChangedPayload) => this.updateHighlightsBar(count, needed);
    const onHitsChanged = (hits: number) => this.updateSetbackPips(hits);
    const onMaxHitsChanged = (maxHits: number) => {
      this.createSetbackPips(maxHits);
      this.updateSetbackPips(state.hits);
    };

    eventBus.on(GameEvents.AgeChanged, onAgeChanged);
    eventBus.on(GameEvents.RankChanged, onRankChanged);
    eventBus.on(GameEvents.TokensChanged, onTokensChanged);
    eventBus.on(GameEvents.HitsChanged, onHitsChanged);
    eventBus.on(GameEvents.MaxHitsChanged, onMaxHitsChanged);

    // eventBus outlives this scene instance, so listeners must be removed explicitly.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      eventBus.off(GameEvents.AgeChanged, onAgeChanged);
      eventBus.off(GameEvents.RankChanged, onRankChanged);
      eventBus.off(GameEvents.TokensChanged, onTokensChanged);
      eventBus.off(GameEvents.HitsChanged, onHitsChanged);
      eventBus.off(GameEvents.MaxHitsChanged, onMaxHitsChanged);
    });
  }

  // ========== PANEL CHROME ==========

  /** Draws a shadow + gradient-filled rounded rect + border + a thin glossy top edge, all as one Graphics object. */
  private drawPanel(
    g: Phaser.GameObjects.Graphics,
    width: number,
    height: number,
    topColor: number,
    bottomColor: number,
    borderColor: number
  ): void {
    g.fillStyle(SHADOW_COLOR, SHADOW_ALPHA);
    g.fillRoundedRect(SHADOW_OFFSET, SHADOW_OFFSET, width, height, PANEL_RADIUS);

    // Gradient fill only renders on the WebGL renderer; Canvas mode falls back
    // to a flat fill using the last-set color, which still looks fine here.
    g.fillGradientStyle(topColor, topColor, bottomColor, bottomColor, 1);
    g.fillRoundedRect(0, 0, width, height, PANEL_RADIUS);

    g.lineStyle(2, borderColor, 0.9);
    g.strokeRoundedRect(1, 1, width - 2, height - 2, PANEL_RADIUS);

    g.fillStyle(0xffffff, GLOSS_ALPHA);
    g.fillRoundedRect(3, 3, width - 6, height * 0.4, { tl: PANEL_RADIUS - 2, tr: PANEL_RADIUS - 2, bl: 0, br: 0 });
  }

  private addIdleBob(target: Phaser.GameObjects.GameObject, baseY: number, delay = 0): void {
    this.tweens.add({
      targets: target,
      y: baseY - BOB_DISTANCE,
      duration: BOB_DURATION,
      delay,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private pulse(target: Phaser.GameObjects.Container | Phaser.GameObjects.Image): void {
    this.tweens.add({
      targets: target,
      scale: 1.06,
      duration: 120,
      yoyo: true,
      ease: 'Quad.easeOut',
    });
  }

  // ========== LEFT: PROFILE PANEL ==========

    private buildProfilePanel(state: GameState): void {
    const width = 270;
    const height = 76;

    this.profilePanel = this.add.container(16, 10).setScrollFactor(0).setDepth(100);

    const chrome = this.add.graphics();
    this.drawPanel(chrome, width, height, PROFILE_PANEL_TOP, PROFILE_PANEL_BOTTOM, PROFILE_PANEL_BORDER);

    const ageIcon = this.add.image(22, 22, 'hud-icon-age').setDisplaySize(26, 26);
    this.ageText = this.add.text(42, 8, `${state.age} years old`, {
      fontSize: '30px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    const rankIcon = this.add.image(22, 54, 'hud-icon-rank').setDisplaySize(26, 26);
    this.rankText = this.add.text(42, 41, '', {
      fontSize: `${RANK_LABEL_MAX_FONT_SIZE}px`,
      color: '#d9f0ff',
      fontStyle: 'bold',
    });
    this.setRankText(`${state.rank.id} - ${state.rank.label}`);

    this.profilePanel.add([chrome, ageIcon, this.ageText, rankIcon, this.rankText]);
    this.profilePanel.setSize(width, height);

    this.addIdleBob(ageIcon, 22);
    this.addIdleBob(rankIcon, 54, 250);
  }

  /** Shrinks the rank label's font until it fits the panel, so long labels ("Business Manager") don't overflow while short ones ("CTO") still render at full size. */
  private setRankText(text: string): void {
    this.rankText.setFontSize(RANK_LABEL_MAX_FONT_SIZE);
    this.rankText.setText(text);

    let fontSize = RANK_LABEL_MAX_FONT_SIZE;
    while (this.rankText.width > RANK_LABEL_MAX_WIDTH && fontSize > RANK_LABEL_MIN_FONT_SIZE) {
      fontSize -= 1;
      this.rankText.setFontSize(fontSize);
    }
  }

  // ========== RIGHT: PROGRESS PANEL (highlights bar + setback pips) ==========

    private buildProgressPanel(state: GameState): void {
    const barX = this.scale.width - 16 - this.highlightsBarWidth;
    const barY = 24;
    const barHeight = 18;
    const barRadius = 5;

    const track = this.add.graphics().setScrollFactor(0).setDepth(100);
    track.fillStyle(0x0d1620, 1);
    track.fillRoundedRect(barX, barY - barHeight / 2, this.highlightsBarWidth, barHeight, barRadius);
    track.lineStyle(2, PROGRESS_PANEL_BORDER, 0.9);
    track.strokeRoundedRect(barX, barY - barHeight / 2, this.highlightsBarWidth, barHeight, barRadius);

    this.highlightsFill = this.add.graphics().setScrollFactor(0).setDepth(101);

    const starIcon = this.add
      .image(barX - 18, barY, 'hud-icon-highlight')
      .setDisplaySize(28, 28)
      .setScrollFactor(0)
      .setDepth(102);

    this.updateHighlightsBar(state.tokens, state.rank.tokensToPromote);
    this.createSetbackPips(state.maxHits);
    this.updateSetbackPips(state.hits);

    this.addIdleBob(starIcon, barY, 500);
  }

  private createSetbackPips(maxHits: number): void {
    this.setbackPips.forEach((pip) => pip.destroy());
    const pipSpacing = 50;
    const firstPipX = this.scale.width - 36 - (maxHits - 1) * pipSpacing;
    this.setbackPips = Array.from({ length: maxHits }, (_, index) =>
      this.add
        .image(firstPipX + index * pipSpacing, 66, 'hud-icon-setback')
        .setDisplaySize(42, 42)
        .setScrollFactor(0)
        .setDepth(100)
    );
  }

  private updateSetbackPips(hits: number): void {
    this.setbackPips.forEach((pip, index) => {
      const reverseIndex = this.setbackPips.length - 1 - index;
      const isSpent = reverseIndex < hits;
      const wasSpent = pip.alpha < 1;
      pip.setAlpha(isSpent ? 0.3 : 1);
      if (isSpent && !wasSpent) this.pulse(pip); // punch on the pip that just got spent
    });
  }

  private updateHighlightsBar(count: number, needed: number): void {
    const progress = needed > 0 ? Phaser.Math.Clamp(count / needed, 0, 1) : 0;
    const barX = this.scale.width - 16 - this.highlightsBarWidth;
    const barY = 24;
    const barHeight = 18;
    const barRadius = 5;
    const fillWidth = this.highlightsBarWidth * progress;

    this.highlightsFill.clear();
    if (fillWidth > 0) {
      this.highlightsFill.fillGradientStyle(0xffe066, 0xffe066, 0xffb703, 0xffb703, 1);
      this.highlightsFill.fillRoundedRect(barX, barY - barHeight / 2, fillWidth, barHeight, barRadius);
    }

    this.tweens.add({
      targets: this.highlightsFill,
      alpha: 0.5,
      duration: 90,
      yoyo: true,
      ease: 'Quad.easeOut',
    });
  }
}