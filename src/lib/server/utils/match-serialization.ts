import type { MatchWithUserStat } from "$lib/server/db/repositories/match-repository";
import type { MatchDetail, MatchResult, MatchSummary, PlayerStatInput } from "$lib/types/match";
import type { ParseEngine, Team } from "$lib/types/parsing";

export function serializeMatchSummary(match: MatchWithUserStat): MatchSummary {
  return {
    id: match.id,
    map: match.map,
    mode: match.mode,
    playedAt: match.playedAt.toISOString(),
    teamScore: match.teamScore,
    enemyScore: match.enemyScore,
    result: normalizeResult(match.result),
    parseSource: normalizeParseSource(match.parseSource),
    stat: serializeStat(match),
  };
}

export function serializeMatchDetail(match: MatchWithUserStat): MatchDetail {
  return {
    ...serializeMatchSummary(match),
    durationMinutes: match.durationMinutes,
    notes: match.notes,
  };
}

function serializeStat(match: MatchWithUserStat): PlayerStatInput {
  const stat = match.stats[0];
  return {
    playerName: stat?.playerName ?? "Unknown",
    team: normalizeTeam(stat?.team ?? "OWN"),
    kills: stat?.kills ?? 0,
    deaths: stat?.deaths ?? 0,
    assists: stat?.assists ?? 0,
    adr: stat?.adr ?? null,
    hsPercent: stat?.hsPercent ?? null,
    mvps: stat?.mvps ?? null,
    hltvRating: stat?.hltvRating ?? null,
    enemiesFlashed: stat?.enemiesFlashed ?? null,
    utilityDamage: stat?.utilityDamage ?? null,
    score: stat?.score ?? null,
  };
}

function normalizeResult(value: string): MatchResult {
  return value === "LOSS" || value === "TIE" ? value : "WIN";
}

function normalizeTeam(value: string): Team {
  return value === "ENEMY" ? "ENEMY" : "OWN";
}

function normalizeParseSource(value: string): ParseEngine {
  return value === "vision" || value === "ocr" ? value : "manual";
}
