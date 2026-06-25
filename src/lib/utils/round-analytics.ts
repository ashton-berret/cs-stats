import type { RoundAnalyticsSummary, RoundRecord, RoundSideAnalytics } from "$lib/types/rounds";
import type { MatchSide } from "$lib/types/match";

export function parseRoundRecords(raw: string | null | undefined): RoundRecord[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeRoundRecord).filter((record): record is RoundRecord => record !== null);
  } catch {
    return [];
  }
}

export function summarizeRoundRecords(records: RoundRecord[]): RoundAnalyticsSummary | null {
  if (records.length === 0) return null;
  return {
    ...summarize(records),
    bySide: {
      CT: summarizeSide(records, "CT"),
      T: summarizeSide(records, "T"),
    },
  };
}

function summarize(records: RoundRecord[]): Omit<RoundSideAnalytics, "rounds"> & { rounds: number } {
  const entryFrags = records.filter((record) => record.entryFragEst).length;
  const entryDeaths = records.filter((record) => record.entryDeathEst).length;
  const attempts = entryFrags + entryDeaths;
  return {
    rounds: records.length,
    entryFrags,
    entryDeaths,
    entrySuccessRate: attempts === 0 ? null : round((entryFrags / attempts) * 100, 1),
    survivalRate: round((records.filter((record) => record.survived).length / records.length) * 100, 1),
    multiKillRounds: records.filter((record) => record.kills >= 2).length,
  };
}

function summarizeSide(records: RoundRecord[], side: MatchSide): RoundSideAnalytics | null {
  const sideRecords = records.filter((record) => record.side === side);
  if (sideRecords.length === 0) return null;
  return summarize(sideRecords);
}

function normalizeRoundRecord(value: unknown): RoundRecord | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Partial<RoundRecord>;
  const round = Number(row.round);
  if (!Number.isInteger(round) || round < 1) return null;
  return {
    round,
    side: row.side === "CT" || row.side === "T" ? row.side : null,
    kills: nonNegativeInt(row.kills),
    headshots: nonNegativeInt(row.headshots),
    damage: nonNegativeInt(row.damage),
    died: row.died === true,
    survived: row.survived === true,
    entryFragEst: row.entryFragEst === true,
    entryDeathEst: row.entryDeathEst === true,
    won: typeof row.won === "boolean" ? row.won : null,
    endReason: typeof row.endReason === "string" ? row.endReason : null,
  };
}

function nonNegativeInt(value: unknown): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
