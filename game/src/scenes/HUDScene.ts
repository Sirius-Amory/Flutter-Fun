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
  private tokensText!: Phaser.GameObjects.Text;
  private hitsText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'HUD' });
  }

  create(): void {
    const state = new GameState(this.registry);

    this.ageText = this.add
      .text(16, 12, `Age: ${state.age}`, { fontSize: '22px', color: '#ffffff', fontStyle: 'bold' })
      .setScrollFactor(0)
      .setDepth(100);
    this.rankText = this.add
      .text(16, 42, `${state.rank.id} - ${state.rank.label}`, { fontSize: '16px', color: '#cccccc' })
      .setScrollFactor(0)
      .setDepth(100);
    this.tokensText = this.add
      .text(this.scale.width - 16, 12, `Tokens: ${state.tokens}/${state.rank.tokensToPromote}`, {
        fontSize: '16px',
        color: '#ffd23f',
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(100);
    this.hitsText = this.add
      .text(this.scale.width - 16, 36, `Hits: ${state.hits}/${MAX_HITS}`, { fontSize: '16px', color: '#ff6b6b' })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(100);

    const onAgeChanged = (age: number) => this.ageText.setText(`Age: ${age}`);
    const onRankChanged = (rank: RankConfig) => this.rankText.setText(`${rank.id} - ${rank.label}`);
    const onTokensChanged = ({ count, needed }: TokensChangedPayload) =>
      this.tokensText.setText(`Tokens: ${count}/${needed}`);
    const onHitsChanged = (hits: number) => this.hitsText.setText(`Hits: ${hits}/${MAX_HITS}`);

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
}

