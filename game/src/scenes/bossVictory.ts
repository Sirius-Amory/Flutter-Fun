import { FINAL_RANK_INDEX } from '../data/rankConfig';

export function shouldTriggerVictoryAfterBossVictory(
  currentRankIndex: number,
  targetRankIndex: number
): boolean {
  return targetRankIndex >= FINAL_RANK_INDEX && targetRankIndex > currentRankIndex;
}
