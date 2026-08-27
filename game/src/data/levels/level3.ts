import type { LevelData } from './types';

export const level3: LevelData = {
  key: 'level-3',
  name: 'Sky Fortress',
  worldWidth: 2500,
  worldHeight: 540,
  playerStart: { x: 80, y: 420 },
  goal: { x: 2420, y: 420 },
  background: { skyColor: 0x2f4f7c },
  platforms: [
    { x: 200, y: 500, width: 400 },
    { x: 695, y: 500, width: 310 },
    { x: 1155, y: 500, width: 330 },
    { x: 1645, y: 500, width: 370 },
    { x: 2235, y: 500, width: 530 },
    { x: 695, y: 340, width: 100 },
    { x: 1155, y: 320, width: 100 },
    { x: 1645, y: 360, width: 100 },
  ],
  enemies: [
    { x: 695, y: 460, patrolDistance: 220, speed: 70 },
    { x: 1155, y: 460, patrolDistance: 250, speed: 75 },
    { x: 1645, y: 460, patrolDistance: 280, speed: 80 },
  ],
  collectibles: [
    { x: 220, y: 440 },
    { x: 695, y: 300 },
    { x: 780, y: 440 },
    { x: 1155, y: 280 },
    { x: 1230, y: 440 },
    { x: 1645, y: 320 },
    { x: 1720, y: 440 },
    { x: 2235, y: 440 },
  ],
};
