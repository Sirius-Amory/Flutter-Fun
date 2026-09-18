import Phaser from 'phaser';

export const eventBus = new Phaser.Events.EventEmitter();

export const GameEvents = {
  AgeChanged: 'age-changed',
  RankChanged: 'rank-changed',
  TokensChanged: 'tokens-changed',
  HitsChanged: 'hits-changed',
  MaxHitsChanged: 'max-hits-changed',
} as const;
