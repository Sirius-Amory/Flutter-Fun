import Phaser from 'phaser';
import { eventBus, GameEvents } from '../events';
import { GameState, MAX_HITS } from '../state/GameState';
import type { RankConfig } from '../data/rankConfig';

interface TokensChangedPayload {
  count: number;
  needed: number;
}

export class HUDScene extends Phaser.Scene {
  private ageText!: Phaser.GameObjects.Text;
  private rankText!: Phaser.GameObjects.Text;
  private profilePanel!: Phaser.GameObjects.Container;
  private highlightsFill!: Phaser.GameObjects.Rectangle;
  private setbackPips: Phaser.GameObjects.Image[] = [];

  constructor() {
    super({ key: 'HUD' });
  }

  create(): void {
    const state = new GameState(this.registry);

    this.profilePanel = this.add.container(16, 10).setScrollFactor(0).setDepth(100);
    const panelBackground = this.add.rectangle(0, 0, 270, 76, 0x182536).setOrigin(0).setStrokeStyle(2, 0xff4444);
    const ageIcon = this.add.image(22, 22, 'hud-icon-age').setDisplaySize(26, 26);
    this.ageText = this.add.text(42, 8, `${state.age} years old`, {
      fontSize: '30px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    const rankIcon = this.add.image(22, 54, 'hud-icon-rank').setDisplaySize(26, 26);
    this.rankText = this.add
      .text(42, 41, `${state.rank.id} - ${state.rank.label}`, { fontSize: '22px', color: '#d9f0ff', fontStyle: 'bold' });
    this.profilePanel.add([panelBackground, ageIcon, this.ageText, rankIcon, this.rankText]);
    const highlightsBarWidth = 160;
    const highlightsBarX = this.scale.width - 16 - highlightsBarWidth;
    this.add
      .rectangle(highlightsBarX, 24, highlightsBarWidth, 18, 0x182536)
      .setOrigin(0, 0.5)
      .setStrokeStyle(2, 0xff4444)
      .setScrollFactor(0)
      .setDepth(100);
    this.highlightsFill = this.add
      .rectangle(highlightsBarX, 24, highlightsBarWidth, 18, 0xffd23f)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(100);
    this.add
      .rectangle(highlightsBarX, 24, highlightsBarWidth, 18)
      .setOrigin(0, 0.5)
      .setFillStyle(0x182536, 0)
      .setStrokeStyle(2, 0xff4444)
      .setScrollFactor(0)
      .setDepth(101);
    this.add
      .image(highlightsBarX - 18, 24, 'hud-icon-highlight')
      .setDisplaySize(28, 28)
      .setScrollFactor(0)
      .setDepth(100);
    this.updateHighlightsBar(state.tokens, state.rank.tokensToPromote);
    const pipSpacing = 30;
    const firstPipX = this.scale.width - 36 - (MAX_HITS - 1) * pipSpacing;
    this.setbackPips = Array.from({ length: MAX_HITS }, (_, index) =>
      this.add
        .image(firstPipX + index * pipSpacing, 66, 'hud-icon-setback')
        .setDisplaySize(28, 28)
        .setScrollFactor(0)
        .setDepth(100)
    );
    this.add
      .rectangle(firstPipX - 16, 66, (MAX_HITS - 1) * pipSpacing + 32, 40, 0x182536)
      .setOrigin(0, 0.5)
      .setStrokeStyle(2, 0xff4444)
      .setScrollFactor(0)
      .setDepth(99);
    this.updateSetbackPips(state.hits);

    const onAgeChanged = (age: number) => this.ageText.setText(`${age} years old`);
    const onRankChanged = (rank: RankConfig) => this.rankText.setText(`${rank.id} - ${rank.label}`);
    const onTokensChanged = ({ count, needed }: TokensChangedPayload) => this.updateHighlightsBar(count, needed);
    const onHitsChanged = (hits: number) => this.updateSetbackPips(hits);

    eventBus.on(GameEvents.AgeChanged, onAgeChanged);
    eventBus.on(GameEvents.RankChanged, onRankChanged);
    eventBus.on(GameEvents.TokensChanged, onTokensChanged);
    eventBus.on(GameEvents.HitsChanged, onHitsChanged);

    // eventBus outlives this scene instance, so listeners must be removed explicitly.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      eventBus.off(GameEvents.AgeChanged, onAgeChanged);
      eventBus.off(GameEvents.RankChanged, onRankChanged);
      eventBus.off(GameEvents.TokensChanged, onTokensChanged);
      eventBus.off(GameEvents.HitsChanged, onHitsChanged);
    });
  }

  private updateSetbackPips(hits: number): void {
    this.setbackPips.forEach((pip, index) => pip.setAlpha(index < hits ? 0.3 : 1));
  }

  private updateHighlightsBar(count: number, needed: number): void {
    const progress = needed > 0 ? Phaser.Math.Clamp(count / needed, 0, 1) : 0;
    this.highlightsFill.setDisplaySize(160 * progress, 18);
  }
}

