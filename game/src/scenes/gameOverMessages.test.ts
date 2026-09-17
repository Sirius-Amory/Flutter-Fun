import { describe, expect, it } from 'vitest';
import { GAME_OVER_MESSAGES, getNextGameOverCause, getRandomGameOverMessage } from './gameOverMessages';

describe('gameOverMessages', () => {
  it('formats one of the random cause strings with the age appended', () => {
    const message = getRandomGameOverMessage(42, () => 0.2);

    expect(message).toMatch(/^You .* at age 42$/);
    expect(message).not.toContain('undefined');
  });

  it('cycles through all causes before repeating any of them', () => {
    const seen: string[] = [];

    for (let index = 0; index < GAME_OVER_MESSAGES.length + 1; index += 1) {
      const cause = getNextGameOverCause();
      if (index < GAME_OVER_MESSAGES.length) {
        expect(cause).toBe(GAME_OVER_MESSAGES[index]);
      }
      seen.push(cause);
    }

    expect(new Set(seen).size).toBe(GAME_OVER_MESSAGES.length);
    expect(seen[GAME_OVER_MESSAGES.length]).toBe(GAME_OVER_MESSAGES[0]);
  });
});
