import type { LevelData } from './types';

export const level1: LevelData = {
  key: 'level-1',
  name: 'Sunny Meadow',
  worldWidth: 1700,
  worldHeight: 540,
  playerStart: { x: 80, y: 420 },
  goal: { x: 1650, y: 420 },
  background: { skyColor: 0x5ec8f2 },
  platforms: [
    { x: 300, y: 500, width: 600 },
    { x: 1000, y: 500, width: 540 },
    { x: 1550, y: 500, width: 300 },
    { x: 900, y: 360, width: 120 },
  ],
  enemies: [{ x: 1000, y: 460, patrolDistance: 220, speed: 55 }],
  collectibles: [
    { x: 300, y: 440 },
    { x: 900, y: 300 },
    { x: 1000, y: 440 },
    { x: 1550, y: 440 },
  ],
};
