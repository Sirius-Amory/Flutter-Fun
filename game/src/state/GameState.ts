import { RANKS, FINAL_RANK_INDEX, type RankConfig } from '../data/rankConfig';
import { DEFAULT_CHARACTER_ID } from '../data/characters';

export interface KeyValueStore {
  get(key: string): unknown;
  set(key: string, value: unknown): unknown;
}

const KEYS = {
  distance: 'distance',
  rankIndex: 'rankIndex',
  tokens: 'tokens',
  hits: 'hits',
  characterId: 'characterId',
} as const;

export const MAX_HITS = 5;

// Thin wrapper around whatever key/value store is handed in (Phaser's scene registry in
// production, a plain in-memory fake in tests) so gameplay code never touches Phaser directly.
// Single source of truth for run progress - also the shape that will eventually be posted to the
// leaderboard API (future phase).
export class GameState {
  constructor(private store: KeyValueStore) {}

  reset(): void {
    this.store.set(KEYS.distance, 0);
    this.store.set(KEYS.rankIndex, 0);
    this.store.set(KEYS.tokens, 0);
    this.store.set(KEYS.hits, 0);
  }

  get distance(): number {
    return (this.store.get(KEYS.distance) as number | undefined) ?? 0;
  }

  // Distance is a high-water mark of progress - moving backward never reduces it.
  advanceDistance(traveled: number): number {
    const next = Math.max(this.distance, traveled);
    this.store.set(KEYS.distance, next);
    return next;
  }

  get rankIndex(): number {
    return (this.store.get(KEYS.rankIndex) as number | undefined) ?? 0;
  }

  set rankIndex(value: number) {
    this.store.set(KEYS.rankIndex, value);
  }

  get rank(): RankConfig {
    return RANKS[Math.min(this.rankIndex, FINAL_RANK_INDEX)];
  }

  get age(): number {
    return this.rank.age;
  }

  get isRetired(): boolean {
    return this.rankIndex >= FINAL_RANK_INDEX;
  }

  get tokens(): number {
    return (this.store.get(KEYS.tokens) as number | undefined) ?? 0;
  }

  addToken(): number {
    const next = this.tokens + 1;
    this.store.set(KEYS.tokens, next);
    return next;
  }

  resetTokens(): void {
    this.store.set(KEYS.tokens, 0);
  }

  get hits(): number {
    return (this.store.get(KEYS.hits) as number | undefined) ?? 0;
  }

  registerHit(): number {
    const next = Math.min(MAX_HITS, this.hits + 1);
    this.store.set(KEYS.hits, next);
    return next;
  }

  resetHits(): void {
    this.store.set(KEYS.hits, 0);
  }

  get isDefeated(): boolean {
    return this.hits >= MAX_HITS;
  }

  // Not touched by reset() - a chosen character is a preference, not run progress.
  get characterId(): string {
    return (this.store.get(KEYS.characterId) as string | undefined) ?? DEFAULT_CHARACTER_ID;
  }

  set characterId(value: string) {
    this.store.set(KEYS.characterId, value);
  }
}
