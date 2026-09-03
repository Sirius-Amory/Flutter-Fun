import { describe, expect, it, beforeEach } from 'vitest';
import { GameState, MAX_HITS, type KeyValueStore } from './GameState';
import { RANKS, FINAL_RANK_INDEX } from '../data/rankConfig';
import { DEFAULT_CHARACTER_ID } from '../data/characters';

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
    state.reset();
  });

  it('resets to starting values', () => {
    expect(state.distance).toBe(0);
    expect(state.rankIndex).toBe(0);
    expect(state.tokens).toBe(0);
    expect(state.hits).toBe(0);
    expect(state.age).toBe(RANKS[0].age);
  });

  it('tracks distance as a high-water mark', () => {
    state.advanceDistance(500);
    state.advanceDistance(300);
    expect(state.distance).toBe(500);
    state.advanceDistance(900);
    expect(state.distance).toBe(900);
  });

  it('accumulates tokens and can reset them on promotion', () => {
    state.addToken();
    state.addToken();
    expect(state.tokens).toBe(2);
    state.resetTokens();
    expect(state.tokens).toBe(0);
  });

  it('caps tokens at the current rank promotion requirement', () => {
    for (let index = 0; index < RANKS[0].tokensToPromote + 1; index += 1) {
      state.addToken();
    }

    expect(state.tokens).toBe(RANKS[0].tokensToPromote);
  });

  it('derives age and rank from rankIndex', () => {
    state.rankIndex = 2;
    expect(state.rank).toBe(RANKS[2]);
    expect(state.age).toBe(RANKS[2].age);
  });

  it('is retired once the final rank is reached', () => {
    expect(state.isRetired).toBe(false);
    state.rankIndex = FINAL_RANK_INDEX;
    expect(state.isRetired).toBe(true);
  });

  it('never raises hits above MAX_HITS and reports defeat', () => {
    for (let i = 0; i < MAX_HITS + 2; i += 1) {
      state.registerHit();
    }
    expect(state.hits).toBe(MAX_HITS);
    expect(state.isDefeated).toBe(true);
  });

  it('defaults characterId and keeps it across reset()', () => {
    expect(state.characterId).toBe(DEFAULT_CHARACTER_ID);
    state.characterId = 'zombie';
    state.reset();
    expect(state.characterId).toBe('zombie');
  });
});
