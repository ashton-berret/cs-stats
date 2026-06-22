import type { ParsedPlayerRow } from "$lib/types/parsing";

export function reconcileRows(rows: ParsedPlayerRow[]): ParsedPlayerRow[] {
  return rows.filter((row) => hasAnyValue(row));
}

export function locateUserRow(rows: ParsedPlayerRow[], inGameName: string): number | null {
  const target = inGameName.trim().toLowerCase();
  if (!target) return null;

  let bestIndex = -1;
  let bestScore = 0;

  rows.forEach((row, index) => {
    const name = row.playerName.trim().toLowerCase();
    if (!name) return;

    const score = name === target ? 1 : name.includes(target) || target.includes(name) ? 0.6 : 0;
    if (score > bestScore) {
      bestIndex = index;
      bestScore = score;
    }
  });

  return bestScore >= 0.6 ? bestIndex : null;
}

function hasAnyValue(row: ParsedPlayerRow): boolean {
  return Boolean(
    row.playerName ||
      row.kills !== null ||
      row.deaths !== null ||
      row.assists !== null ||
      row.adr !== null ||
      row.hsPercent !== null ||
      row.mvps !== null ||
      row.hltvRating !== null ||
      row.enemiesFlashed !== null ||
      row.utilityDamage !== null ||
      row.score !== null,
  );
}
