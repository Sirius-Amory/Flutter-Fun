import { describe, expect, it } from 'vitest';
import { LEVELS } from './index';

// Conservative bound given the player's move speed (200px/s) and jump arc hang time (~1s):
// keeps level data honest as a regression guard, since these numbers are hand-authored.
const MAX_SAFE_GAP = 180;
const GROUND_Y_THRESHOLD = 480;

describe('level data integrity', () => {
  for (const level of LEVELS) {
    describe(level.name, () => {
      const groundPlatforms = level.platforms
        .filter((p) => p.y >= GROUND_Y_THRESHOLD)
        .slice()
        .sort((a, b) => a.x - b.x);

      it('has at least one ground platform', () => {
        expect(groundPlatforms.length).toBeGreaterThan(0);
      });

      it('has no ground gap wider than the safe jump distance', () => {
        for (let i = 0; i < groundPlatforms.length - 1; i += 1) {
          const currentEnd = groundPlatforms[i].x + groundPlatforms[i].width / 2;
          const nextStart = groundPlatforms[i + 1].x - groundPlatforms[i + 1].width / 2;
          expect(nextStart - currentEnd).toBeLessThanOrEqual(MAX_SAFE_GAP);
        }
      });

      it('keeps every enemy patrol range within a single ground platform', () => {
        for (const enemy of level.enemies) {
          const halfPatrol = enemy.patrolDistance / 2;
          const withinAnyPlatform = groundPlatforms.some((p) => {
            const left = p.x - p.width / 2;
            const right = p.x + p.width / 2;
            return enemy.x - halfPatrol >= left && enemy.x + halfPatrol <= right;
          });
          expect(withinAnyPlatform).toBe(true);
        }
      });

      it('places the goal above solid ground', () => {
        const goalOverGround = groundPlatforms.some((p) => {
          const left = p.x - p.width / 2;
          const right = p.x + p.width / 2;
          return level.goal.x >= left && level.goal.x <= right;
        });
        expect(goalOverGround).toBe(true);
      });

      it('places the player start above solid ground', () => {
        const startOverGround = groundPlatforms.some((p) => {
          const left = p.x - p.width / 2;
          const right = p.x + p.width / 2;
          return level.playerStart.x >= left && level.playerStart.x <= right;
        });
        expect(startOverGround).toBe(true);
      });
    });
  }
});
