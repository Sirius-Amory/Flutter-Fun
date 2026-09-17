import { describe, expect, it, vi } from 'vitest';
import { filterLeaderboardEntries, truncateWithEllipsis } from './leaderboardData';

describe('leaderboardData', () => {
  it('maps the API fields without changing their order', () => {
    const rows = filterLeaderboardEntries([
      { playerName: 'FIRST', rank: 'A1', age: 20, causeOfDeath: 'meeting' },
      { name: 'SECOND', grade: 'B2', age: 29, causeOfDeath: 'deadline' },
    ]);

    expect(rows).toEqual([
      { name: 'FIRST', grade: 'A1', age: '20', causeOfDeath: 'meeting' },
      { name: 'SECOND', grade: 'B2', age: '29', causeOfDeath: 'deadline' },
    ]);
  });

  it('filters incomplete records and warns in development', () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const malformed = { playerName: 'BROKEN', rank: '', age: 20, causeOfDeath: 'meeting' };

    expect(filterLeaderboardEntries([malformed])).toEqual([]);
    expect(warning).toHaveBeenCalledWith('Filtered malformed leaderboard record:', malformed);
    warning.mockRestore();
  });

  it('truncates long causes with an ellipsis', () => {
    expect(truncateWithEllipsis('A very long cause', 10)).toBe('A very ...');
    expect(truncateWithEllipsis('short', 10)).toBe('short');
  });
});