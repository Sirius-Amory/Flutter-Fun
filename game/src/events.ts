import Phaser from 'phaser';

export const eventBus = new Phaser.Events.EventEmitter();

export const GameEvents = {
  ScoreChanged: 'score-changed',
  LivesChanged: 'lives-changed',
  LevelStarted: 'level-started',
} as const;
