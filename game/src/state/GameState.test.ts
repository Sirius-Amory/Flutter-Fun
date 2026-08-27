import { describe, expect, it, beforeEach } from 'vitest';
import { GameState, STARTING_LIVES, type KeyValueStore } from './GameState';

function createFakeStore(): KeyValueStore {
  const map = new Map<string, unknown>();
  return {
    get: (key) => map.get(key),
    set: (key, value) => {
      map.set(key, value);
      return value;
    },
  };
}

describe('GameState', () => {
  let state: GameState;

  beforeEach(() => {
    state = new GameState(createFakeStore());
  });

  it('resets to starting values', () => {
    state.reset();
    expect(state.score).toBe(0);
    expect(state.lives).toBe(STARTING_LIVES);
    expect(state.levelIndex).toBe(0);
  });

  it('accumulates score across calls', () => {
    state.reset();
    state.addScore(10);
    state.addScore(5);
    expect(state.score).toBe(15);
  });

  it('never drops lives below zero', () => {
    state.reset();
    for (let i = 0; i < STARTING_LIVES + 2; i += 1) {
      state.loseLife();
    }
    expect(state.lives).toBe(0);
  });

  it('tracks the current level index', () => {
    state.reset();
    state.levelIndex = 2;
    expect(state.levelIndex).toBe(2);
  });
});
