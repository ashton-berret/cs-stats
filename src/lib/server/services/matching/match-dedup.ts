import type { MatchWithUserStat } from "$lib/server/db/repositories/match-repository";
import type { MatchInput, MatchSummary } from "$lib/types/match";
import type { ParseEngine } from "$lib/types/parsing";

const WINDOW_MINUTES = 120;
const MINUTE_MS = 60_000;

export interface DedupCandidateInput {
  map: string;
  playedAt: Date;
  teamScore: number | null;
  enemyScore: number | null;
  parseSource?: ParseEngine;
}

export interface RankedDuplicateCandidate {
  match: MatchWithUserStat;
  confidence: "high" | "low";
}

type MergeExistingMatch = MatchSummary & {
  durationMinutes?: number | null;
  notes?: string | null;
};

// Returns existing matches that plausibly are the same game, best first.
export function rankDuplicateCandidates(incoming: DedupCandidateInput, existing: MatchWithUserStat[]): RankedDuplicateCandidate[] {
  return existing
    .map((match) => {
      if (match.map !== incoming.map) return null;
      if (incoming.parseSource && match.parseSource === incoming.parseSource) return null;
      const deltaMs = Math.abs(match.playedAt.getTime() - incoming.playedAt.getTime());
      if (deltaMs > WINDOW_MINUTES * MINUTE_MS) return null;
      const scoreMatches = match.teamScore === incoming.teamScore && match.enemyScore === incoming.enemyScore && incoming.teamScore !== null && incoming.enemyScore !== null;
      return {
        match,
        confidence: scoreMatches ? ("high" as const) : ("low" as const),
        deltaMs,
      };
    })
    .filter((candidate): candidate is RankedDuplicateCandidate & { deltaMs: number } => candidate !== null)
    .sort((a, b) => {
      if (a.confidence !== b.confidence) return a.confidence === "high" ? -1 : 1;
      return a.deltaMs - b.deltaMs;
    })
    .map(({ match, confidence }) => ({ match, confidence }));
}

export function mergeMatchInputs(existing: MergeExistingMatch, incoming: MatchInput): MatchInput {
  const existingIsGsi = existing.parseSource === "gsi";
  const incomingIsGsi = incoming.parseSource === "gsi";
  const gsiStat = existingIsGsi ? existing.stat : incomingIsGsi ? incoming.stat : null;
  const otherStat = existingIsGsi ? incoming.stat : existing.stat;

  return {
    map: existing.map || incoming.map,
    mode: existing.mode || incoming.mode,
    playedAt: new Date(existing.playedAt || incoming.playedAt),
    teamScore: preferExisting(existing.teamScore, incoming.teamScore),
    enemyScore: preferExisting(existing.enemyScore, incoming.enemyScore),
    result: existing.result ?? incoming.result,
    side: preferExisting(existing.side, incoming.side),
    roundsPlayed: preferExisting(existing.roundsPlayed, incoming.roundsPlayed),
    roundsJson: preferExisting(existing.roundsJson, incoming.roundsJson),
    durationMinutes: preferExisting(existing.durationMinutes ?? null, incoming.durationMinutes),
    notes: mergeNotes(existing.notes ?? null, incoming.notes),
    parseSource: existing.parseSource === "gsi" || incoming.parseSource === "gsi" ? "gsi" : richerSource(existing.parseSource, incoming.parseSource),
    stat: {
      playerName: existing.stat.playerName || incoming.stat.playerName,
      team: existing.stat.team || incoming.stat.team,
      kills: gsiStat?.kills ?? otherStat.kills,
      deaths: gsiStat?.deaths ?? otherStat.deaths,
      assists: gsiStat?.assists ?? otherStat.assists,
      adr: preferNonNull(incoming.stat.adr, existing.stat.adr),
      hsPercent: preferNonNull(incoming.stat.hsPercent, existing.stat.hsPercent),
      mvps: gsiStat?.mvps ?? otherStat.mvps,
      hltvRating: preferNonNull(incoming.stat.hltvRating, existing.stat.hltvRating),
      enemiesFlashed: preferNonNull(incoming.stat.enemiesFlashed, existing.stat.enemiesFlashed),
      utilityDamage: preferNonNull(incoming.stat.utilityDamage, existing.stat.utilityDamage),
      score: gsiStat?.score ?? otherStat.score,
    },
  };
}

function preferExisting<T>(existing: T | null, incoming: T | null): T | null {
  return existing ?? incoming;
}

function preferNonNull<T>(incoming: T | null, existing: T | null): T | null {
  return incoming ?? existing;
}

function mergeNotes(existing: string | null, incoming: string | null): string | null {
  if (existing && incoming && existing !== incoming) return `${existing}\n\n${incoming}`;
  return existing ?? incoming;
}

function richerSource(existing: ParseEngine, incoming: ParseEngine): ParseEngine {
  if (incoming !== "manual") return incoming;
  return existing;
}
