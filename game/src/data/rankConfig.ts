export interface RankConfig {
  id: string;
  label: string;
  /** Displayed as the player's score. */
  age: number;
  /** Cumulative world distance (px) the player must travel to reach this rank. */
  distance: number;
  parryWindowSeconds: number;
  spawnIntervalMs: number;
  obstacleSpawnMinMs: number;
  obstacleSpawnMaxMs: number;
  obstacleSpeed: number;
  obstacleSpawnHeightMin: number;
  obstacleSpawnHeightMax: number;
  obstacleRotationSpeed: number;
  tokenSpawnIntervalMs: number;
  tokenMotionSpeed: number;
  badgeDisplaySize: number;
  playerScale: number;
  /** Regular tokens needed before the next token spawned is the Promotion token. */
  tokensToPromote: number;
}

export const OBSTACLE_SPEED_MULTIPLIER = 4;
export const SPAWN_INTERVAL_MULTIPLIER = 2;
export const TOKEN_MOTION_SPEED_MULTIPLIER = 2.5;

// Single source of truth for Cubicle Survivor's pacing and difficulty curve.
export const RANKS: RankConfig[] = [
  ...[
    ['A1', 'Grad Dev', 20, 0, 0.3, 1700, 140, 1, 2], ['A2', 'Grad Dev', 23, 1200, 0.27, 1600, 150, 1, 2],
    ['B1', 'Intermediate Dev', 26, 2400, 0.24, 1500, 160, 1.08, 3], ['B2', 'Intermediate Dev', 29, 3600, 0.21, 1400, 170, 1.08, 3],
    ['C1', 'Senior Dev', 32, 4800, 0.18, 1300, 180, 1.16, 3], ['C2', 'Senior Dev', 35, 6000, 0.16, 1200, 190, 1.16, 3],
    ['D1', 'Architect', 38, 7200, 0.14, 1100, 200, 1.24, 4], ['D2', 'Architect', 41, 8400, 0.12, 1000, 210, 1.24, 4],
    ['E1', 'Business Manager', 45, 9600, 0.11, 900, 220, 1.32, 4], ['E2', 'Business Manager', 49, 10800, 0.1, 850, 230, 1.32, 4],
    ['F1', 'CTO', 53, 12000, 0.09, 800, 240, 1.4, 5], ['F2', 'CTO', 57, 13200, 0.085, 750, 250, 1.4, 5],
    ['G1', 'CEO', 61, 14400, 0.08, 700, 260, 1.48, 5], ['G2', 'CEO', 65, 15600, 0.07, 650, 270, 1.48, 5],
  ].map(([id, label, age, distance, parryWindowSeconds, spawnIntervalMs, obstacleSpeed, playerScale, tokensToPromote], index) => ({
    id: id as string, label: label as string, age: age as number, distance: distance as number,
    parryWindowSeconds: parryWindowSeconds as number, spawnIntervalMs: spawnIntervalMs as number,
    obstacleSpawnMinMs: ((spawnIntervalMs as number) - 250) * SPAWN_INTERVAL_MULTIPLIER,
    obstacleSpawnMaxMs: ((spawnIntervalMs as number) + 250) * SPAWN_INTERVAL_MULTIPLIER,
    obstacleSpeed: obstacleSpeed as number, obstacleSpawnHeightMin: 50, obstacleSpawnHeightMax: 170,
    obstacleRotationSpeed: 18, tokenSpawnIntervalMs: (1500 - index * 35) * SPAWN_INTERVAL_MULTIPLIER,
    tokenMotionSpeed: (2.2 + index * 0.04) * TOKEN_MOTION_SPEED_MULTIPLIER, badgeDisplaySize: 58 + Math.min(index, 5),
    playerScale: playerScale as number, tokensToPromote: tokensToPromote as number,
  })),
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

