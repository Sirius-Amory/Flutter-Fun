export interface KeyValueStore {
  get(key: string): unknown;
  set(key: string, value: unknown): unknown;
}

const KEYS = {
  score: 'score',
  lives: 'lives',
  levelIndex: 'levelIndex',
} as const;

export const STARTING_LIVES = 3;

// Thin wrapper around whatever key/value store is handed in (Phaser's scene registry in
// production, a plain in-memory fake in tests) so gameplay code never touches Phaser directly.
export class GameState {
  constructor(private store: KeyValueStore) {}

  reset(): void {
    this.store.set(KEYS.score, 0);
    this.store.set(KEYS.lives, STARTING_LIVES);
    this.store.set(KEYS.levelIndex, 0);
  }

  get score(): number {
    return (this.store.get(KEYS.score) as number | undefined) ?? 0;
  }

  addScore(amount: number): number {
    const next = this.score + amount;
    this.store.set(KEYS.score, next);
    return next;
  }

  get lives(): number {
    return (this.store.get(KEYS.lives) as number | undefined) ?? STARTING_LIVES;
  }

  loseLife(): number {
    const next = Math.max(0, this.lives - 1);
    this.store.set(KEYS.lives, next);
    return next;
  }

  get levelIndex(): number {
    return (this.store.get(KEYS.levelIndex) as number | undefined) ?? 0;
  }

  set levelIndex(value: number) {
    this.store.set(KEYS.levelIndex, value);
  }
}
