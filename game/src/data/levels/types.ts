export interface PlatformDef {
  x: number;
  y: number;
  width: number;
  height?: number;
}

export interface EnemyDef {
  x: number;
  y: number;
  patrolDistance: number;
  speed?: number;
}

export interface CollectibleDef {
  x: number;
  y: number;
}

export interface LevelData {
  key: string;
  name: string;
  worldWidth: number;
  worldHeight: number;
  playerStart: { x: number; y: number };
  goal: { x: number; y: number };
  platforms: PlatformDef[];
  enemies: EnemyDef[];
  collectibles: CollectibleDef[];
  background?: { skyColor: number };
}
