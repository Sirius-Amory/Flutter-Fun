import type { LevelData } from './types';

export const level2: LevelData = {
  key: 'level-2',
  name: 'Rocky Canyon',
  worldWidth: 2100,
  worldHeight: 540,
  playerStart: { x: 80, y: 420 },
  goal: { x: 2050, y: 420 },
  background: { skyColor: 0x4a90c2 },
  platforms: [
    { x: 225, y: 500, width: 450 },
    { x: 740, y: 500, width: 320 },
    { x: 1270, y: 500, width: 460 },
    { x: 1875, y: 500, width: 450 },
    { x: 730, y: 360, width: 110 },
    { x: 1570, y: 380, width: 110 },
  ],
  enemies: [
    { x: 740, y: 460, patrolDistance: 200, speed: 65 },
    { x: 1270, y: 460, patrolDistance: 300, speed: 70 },
  ],
  collectibles: [
    { x: 225, y: 440 },
    { x: 730, y: 320 },
    { x: 850, y: 440 },
    { x: 1270, y: 440 },
    { x: 1570, y: 340 },
    { x: 1875, y: 440 },
  ],
};
