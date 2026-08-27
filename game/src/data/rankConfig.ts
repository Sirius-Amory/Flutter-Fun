export type ObstacleTheme = 'gradDev' | 'intermediate' | 'senior' | 'architect' | 'manager' | 'cto' | 'ceo';

export interface RankConfig {
  id: string;
  label: string;
  /** Displayed as the player's score. */
  age: number;
  /** Cumulative world distance (px) the player must travel to reach this rank. */
  distance: number;
  parryWindowSeconds: number;
  spawnIntervalMs: number;
  obstacleSpeed: number;
  playerScale: number;
  /** Regular tokens needed before the next token spawned is the Promotion token. */
  tokensToPromote: number;
  theme: ObstacleTheme;
}

// Single source of truth for CCA-Survive's age/rank pacing and difficulty curve. Ages and parry
// windows mirror the CCA-Survive design doc exactly (see rankConfig.test.ts); distance thresholds,
// spawn rate/speed, player scale, and token quotas are tunable placeholders for playtesting.
export const RANKS: RankConfig[] = [
  { id: 'A1', label: 'Grad Dev', age: 20, distance: 0, parryWindowSeconds: 0.3, spawnIntervalMs: 1700, obstacleSpeed: 140, playerScale: 1.0, tokensToPromote: 5, theme: 'gradDev' },
  { id: 'A2', label: 'Grad Dev', age: 23, distance: 1200, parryWindowSeconds: 0.27, spawnIntervalMs: 1600, obstacleSpeed: 150, playerScale: 1.0, tokensToPromote: 5, theme: 'gradDev' },
  { id: 'B1', label: 'Intermediate Dev', age: 26, distance: 2400, parryWindowSeconds: 0.24, spawnIntervalMs: 1500, obstacleSpeed: 160, playerScale: 1.08, tokensToPromote: 6, theme: 'intermediate' },
  { id: 'B2', label: 'Intermediate Dev', age: 29, distance: 3600, parryWindowSeconds: 0.21, spawnIntervalMs: 1400, obstacleSpeed: 170, playerScale: 1.08, tokensToPromote: 6, theme: 'intermediate' },
  { id: 'C1', label: 'Senior Dev', age: 32, distance: 4800, parryWindowSeconds: 0.18, spawnIntervalMs: 1300, obstacleSpeed: 180, playerScale: 1.16, tokensToPromote: 6, theme: 'senior' },
  { id: 'C2', label: 'Senior Dev', age: 35, distance: 6000, parryWindowSeconds: 0.16, spawnIntervalMs: 1200, obstacleSpeed: 190, playerScale: 1.16, tokensToPromote: 6, theme: 'senior' },
  { id: 'D1', label: 'Architect', age: 38, distance: 7200, parryWindowSeconds: 0.14, spawnIntervalMs: 1100, obstacleSpeed: 200, playerScale: 1.24, tokensToPromote: 7, theme: 'architect' },
  { id: 'D2', label: 'Architect', age: 41, distance: 8400, parryWindowSeconds: 0.12, spawnIntervalMs: 1000, obstacleSpeed: 210, playerScale: 1.24, tokensToPromote: 7, theme: 'architect' },
  { id: 'E1', label: 'Business Manager', age: 45, distance: 9600, parryWindowSeconds: 0.11, spawnIntervalMs: 900, obstacleSpeed: 220, playerScale: 1.32, tokensToPromote: 7, theme: 'manager' },
  { id: 'E2', label: 'Business Manager', age: 49, distance: 10800, parryWindowSeconds: 0.1, spawnIntervalMs: 850, obstacleSpeed: 230, playerScale: 1.32, tokensToPromote: 7, theme: 'manager' },
  { id: 'F1', label: 'CTO', age: 53, distance: 12000, parryWindowSeconds: 0.09, spawnIntervalMs: 800, obstacleSpeed: 240, playerScale: 1.4, tokensToPromote: 8, theme: 'cto' },
  { id: 'F2', label: 'CTO', age: 57, distance: 13200, parryWindowSeconds: 0.085, spawnIntervalMs: 750, obstacleSpeed: 250, playerScale: 1.4, tokensToPromote: 8, theme: 'cto' },
  { id: 'G1', label: 'CEO', age: 61, distance: 14400, parryWindowSeconds: 0.08, spawnIntervalMs: 700, obstacleSpeed: 260, playerScale: 1.48, tokensToPromote: 8, theme: 'ceo' },
  { id: 'G2', label: 'CEO', age: 65, distance: 15600, parryWindowSeconds: 0.07, spawnIntervalMs: 650, obstacleSpeed: 270, playerScale: 1.48, tokensToPromote: 8, theme: 'ceo' },
];

export const FINAL_RANK_INDEX = RANKS.length - 1;
export const FINAL_DISTANCE = RANKS[FINAL_RANK_INDEX].distance;

export function getRankIndexForDistance(distance: number): number {
  let index = 0;
  for (let i = 0; i < RANKS.length; i += 1) {
    if (distance >= RANKS[i].distance) index = i;
  }
  return index;
}

export function obstacleTextureKey(theme: ObstacleTheme): string {
  return `obstacle-${theme}`;
}
