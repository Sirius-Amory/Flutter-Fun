import { describe, expect, it } from 'vitest';
import { GAME_OVER_MESSAGES, getNextGameOverCause, getRandomGameOverMessage } from './gameOverMessages';

describe('gameOverMessages', () => {
  it('formats one of the random cause strings with the age appended', () => {
    const message = getRandomGameOverMessage(42, () => 0.2);

    expect(message).toMatch(/^You .* at age 42$/);
    expect(message).not.toContain('undefined');
  });

  it('does not repeat the same cause on consecutive game overs', () => {
    const seen = Array.from({ length: 20 }, () => getNextGameOverCause());

    for (let index = 1; index < seen.length; index += 1) {
      expect(seen[index]).not.toBe(seen[index - 1]);
    }
    expect(seen.every((cause) => GAME_OVER_MESSAGES.includes(cause))).toBe(true);
  });
});
