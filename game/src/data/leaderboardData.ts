export interface LeaderboardEntry {
  name: string;
  grade: string;
  age: number | string;
  causeOfDeath: string;
}

export interface LeaderboardRow {
  name: string;
  grade: string;
  age: string;
  causeOfDeath: string;
}

function isMissing(value: unknown): boolean {
  return value === undefined || value === null || value === '';
}

export function filterLeaderboardEntries(payload: unknown): LeaderboardRow[] {
  if (!Array.isArray(payload)) return [];

  const rows: LeaderboardRow[] = [];
  for (const rawEntry of payload) {
    const entry = rawEntry as Record<string, unknown>;
    const name = entry.name ?? entry.playerName;
    const grade = entry.grade ?? entry.rank;
    const age = entry.age;
    const causeOfDeath = entry.causeOfDeath;

    if (isMissing(name) || isMissing(grade) || isMissing(age) || isMissing(causeOfDeath)) {
      if (import.meta.env.DEV) console.warn('Filtered malformed leaderboard record:', rawEntry);
      continue;
    }

    rows.push({
      name: String(name),
      grade: String(grade),
      age: String(age),
      causeOfDeath: String(causeOfDeath),
    });
  }

  return rows;
}

export function truncateWithEllipsis(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(0, maxLength - 3))}...`;
}