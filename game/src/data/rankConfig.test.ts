import { describe, expect, it } from 'vitest';
import { RANKS, getRankIndexForDistance } from './rankConfig';

// Regression guard for the hand-authored CCA-Survive design tables, same spirit as the old
// levels.test.ts: keep these numbers honest since gameplay code trusts them blindly.
describe('rankConfig', () => {
  it('matches the CCA-Survive age-rank table', () => {
    expect(RANKS.map((r) => r.id)).toEqual([
      'A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'D1', 'D2', 'E1', 'E2', 'F1', 'F2', 'G1', 'G2',
    ]);
    expect(RANKS.map((r) => r.age)).toEqual([20, 23, 26, 29, 32, 35, 38, 41, 45, 49, 53, 57, 61, 65]);
  });

  it('matches the CCA-Survive parry window table', () => {
    expect(RANKS.map((r) => r.parryWindowSeconds)).toEqual([
      0.3, 0.27, 0.24, 0.21, 0.18, 0.16, 0.14, 0.12, 0.11, 0.1, 0.09, 0.085, 0.08, 0.07,
    ]);
  });

  it('has strictly increasing distance thresholds starting at zero', () => {
    expect(RANKS[0].distance).toBe(0);
    for (let i = 1; i < RANKS.length; i += 1) {
      expect(RANKS[i].distance).toBeGreaterThan(RANKS[i - 1].distance);
    }
  });

  it('gets progressively harder as rank increases', () => {
    for (let i = 1; i < RANKS.length; i += 1) {
      expect(RANKS[i].obstacleSpeed).toBeGreaterThanOrEqual(RANKS[i - 1].obstacleSpeed);
      expect(RANKS[i].spawnIntervalMs).toBeLessThanOrEqual(RANKS[i - 1].spawnIntervalMs);
      expect(RANKS[i].parryWindowSeconds).toBeLessThanOrEqual(RANKS[i - 1].parryWindowSeconds);
      expect(RANKS[i].playerScale).toBeGreaterThanOrEqual(RANKS[i - 1].playerScale);
    }
  });

  it('resolves the rank index for a given distance', () => {
    expect(getRankIndexForDistance(0)).toBe(0);
    expect(getRankIndexForDistance(1199)).toBe(0);
    expect(getRankIndexForDistance(1200)).toBe(1);
    expect(getRankIndexForDistance(999999)).toBe(RANKS.length - 1);
  });
});
