import { describe, expect, it } from 'vitest';
import { FINAL_RANK_INDEX } from '../data/rankConfig';
import { shouldTriggerVictoryAfterBossVictory } from './bossVictory';

describe('bossVictory', () => {
  it('treats reaching the final rank as a completed run after the boss is defeated', () => {
    expect(shouldTriggerVictoryAfterBossVictory(FINAL_RANK_INDEX - 1, FINAL_RANK_INDEX)).toBe(true);
    expect(shouldTriggerVictoryAfterBossVictory(FINAL_RANK_INDEX, FINAL_RANK_INDEX)).toBe(false);
  });
});
