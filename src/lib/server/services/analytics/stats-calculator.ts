import type { MatchWithUserStat } from "$lib/server/db/repositories/match-repository";
import type { DashboardStats } from "$lib/types/analytics";
import type { MatchResult, MatchSide } from "$lib/types/match";
import type { RoundRecord } from "$lib/types/rounds";
import { mapColor } from "$lib/config/maps";
import { buildActivity, buildPerformanceMetrics, computeFormScore } from "$lib/utils/performance";
import { parseRoundRecords, summarizeRoundRecords } from "$lib/utils/round-analytics";

export interface CalendarDay {
  date: string;
  count: number;
  /** 0–100 daily Form score; null when no matches that day. */
  score: number | null;
}

/**
 * GitHub-style calendar over the last `days` days. Each day carries both the match count
 * (activity view) and the aggregated daily Form score (performance view).
 */
export function buildPerformanceCalendar(matches: MatchWithUserStat[], days: number): CalendarDay[] {
  const byDate = new Map<string, MatchWithUserStat[]>();
  for (const match of matches) {
    const key = match.playedAt.toISOString().slice(0, 10);
    const list = byDate.get(key) ?? [];
    list.push(match);
    byDate.set(key, list);
  }

  return buildActivity(matches.map((m) => m.playedAt.toISOString()), days).map(({ date, count }) => {
    if (count === 0) return { date, count, score: null };
    const dayMatches = byDate.get(date) ?? [];
    let kills = 0;
    let deaths = 0;
    let wins = 0;
    for (const match of dayMatches) {
      kills += match.stats[0]?.kills ?? 0;
      deaths += match.stats[0]?.deaths ?? 0;
      if (normalizeResult(match.result) === "WIN") wins += 1;
    }
    const metrics = buildPerformanceMetrics(
      {
        kd: ratio(kills, deaths),
        winRate: dayMatches.length ? (wins / dayMatches.length) * 100 : 0,
        adr: average(dayMatches.map((m) => m.stats[0]?.adr ?? null)),
        hsPercent: average(dayMatches.map((m) => m.stats[0]?.hsPercent ?? null)),
        utilityDamage: average(dayMatches.map((m) => m.stats[0]?.utilityDamage ?? null)),
      },
      dayMatches[0]?.mode ?? "Casual",
    );
    return { date, count, score: computeFormScore(metrics).score };
  });
}

const RECENT_FORM_COUNT = 10;
const MOMENTUM_WINDOW = 5;

interface MatchPoint {
  id: string;
  map: string;
  side: MatchSide | null;
  playedAt: string;
  result: MatchResult;
  kills: number;
  deaths: number;
  assists: number;
  adr: number | null;
  hsPercent: number | null;
  hltvRating: number | null;
  utilityDamage: number | null;
  rounds: RoundRecord[];
}

/**
 * Computes every `DashboardStats` field from a user's matches + their `isUser` stat rows.
 * K/D and all rates are derived here (never stored). Input may be in any order; this sorts
 * chronologically so trend arrays read oldest -> newest.
 */
export function computeDashboardStats(matches: MatchWithUserStat[]): DashboardStats {
  const points = matches
    .map(toPoint)
    .sort((a, b) => a.playedAt.localeCompare(b.playedAt));

  const totalMatches = points.length;

  let wins = 0;
  let losses = 0;
  let ties = 0;
  let totalKills = 0;
  let totalDeaths = 0;
  let totalAssists = 0;

  for (const point of points) {
    if (point.result === "WIN") wins += 1;
    else if (point.result === "LOSS") losses += 1;
    else ties += 1;
    totalKills += point.kills;
    totalDeaths += point.deaths;
    totalAssists += point.assists;
  }

  return {
    totalMatches,
    wins,
    losses,
    ties,
    winRate: totalMatches === 0 ? 0 : round((wins / totalMatches) * 100, 1),
    totalKills,
    totalDeaths,
    totalAssists,
    kdRatio: ratio(totalKills, totalDeaths),
    avgAdr: average(points.map((p) => p.adr)),
    avgHsPercent: average(points.map((p) => p.hsPercent)),
    avgHltvRating: average(points.map((p) => p.hltvRating)),
    avgUtilityDamage: average(points.map((p) => p.utilityDamage)),
    bestMatch: pickBestMatch(points),
    kdTrend: points.map((p) => ({
      date: p.playedAt,
      kd: ratio(p.kills, p.deaths),
      kills: p.kills,
      deaths: p.deaths,
    })),
    adrTrend: points
      .filter((p): p is MatchPoint & { adr: number } => p.adr !== null)
      .map((p) => ({ date: p.playedAt, adr: p.adr })),
    hsTrend: points
      .filter((p): p is MatchPoint & { hsPercent: number } => p.hsPercent !== null)
      .map((p) => ({ date: p.playedAt, hsPercent: p.hsPercent })),
    resultBreakdown: [
      { result: "WIN", count: wins },
      { result: "LOSS", count: losses },
      { result: "TIE", count: ties },
    ],
    performanceByMap: computePerformanceByMap(points),
    sidePerformance: computeSidePerformance(points),
    sidePerformanceByMap: computeSidePerformanceByMap(points),
    streaks: computeStreaks(points),
    momentum: computeMomentum(points),
    entryImpact: computeEntryImpact(points),
    recentForm: points.slice(-RECENT_FORM_COUNT).map((p) => p.result),
  };
}

function toPoint(match: MatchWithUserStat): MatchPoint {
  const stat = match.stats[0];
  return {
    id: match.id,
    map: match.map,
    side: match.side === "CT" || match.side === "T" ? match.side : null,
    playedAt: match.playedAt.toISOString(),
    result: normalizeResult(match.result),
    kills: stat?.kills ?? 0,
    deaths: stat?.deaths ?? 0,
    assists: stat?.assists ?? 0,
    adr: stat?.adr ?? null,
    hsPercent: stat?.hsPercent ?? null,
    hltvRating: stat?.hltvRating ?? null,
    utilityDamage: stat?.utilityDamage ?? null,
    rounds: parseRoundRecords(match.roundsJson),
  };
}

type SideBucket = {
  matches: number;
  kills: number;
  deaths: number;
  adrSum: number;
  adrCount: number;
  wins: number;
};

function emptySideBucket(): SideBucket {
  return { matches: 0, kills: 0, deaths: 0, adrSum: 0, adrCount: 0, wins: 0 };
}

function addToSideBucket(bucket: SideBucket, point: MatchPoint): SideBucket {
  bucket.matches += 1;
  bucket.kills += point.kills;
  bucket.deaths += point.deaths;
  if (point.adr !== null) {
    bucket.adrSum += point.adr;
    bucket.adrCount += 1;
  }
  if (point.result === "WIN") bucket.wins += 1;
  return bucket;
}

function sideBucketStats(bucket: SideBucket): { matches: number; kd: number; avgAdr: number | null; winRate: number } {
  return {
    matches: bucket.matches,
    kd: ratio(bucket.kills, bucket.deaths),
    avgAdr: bucket.adrCount === 0 ? null : round(bucket.adrSum / bucket.adrCount, 1),
    winRate: bucket.matches === 0 ? 0 : round((bucket.wins / bucket.matches) * 100, 1),
  };
}

function computeSidePerformance(points: MatchPoint[]): DashboardStats["sidePerformance"] {
  const buckets: Record<MatchSide, SideBucket> = {
    CT: emptySideBucket(),
    T: emptySideBucket(),
  };

  for (const point of points) {
    if (point.side === null) continue;
    addToSideBucket(buckets[point.side], point);
  }

  return (["CT", "T"] as const)
    .filter((side) => buckets[side].matches > 0)
    .map((side) => ({ side, ...sideBucketStats(buckets[side]) }));
}

function computeSidePerformanceByMap(points: MatchPoint[]): DashboardStats["sidePerformanceByMap"] {
  const groups = new Map<string, Record<MatchSide, SideBucket>>();

  for (const point of points) {
    if (point.side === null) continue;
    const group = groups.get(point.map) ?? { CT: emptySideBucket(), T: emptySideBucket() };
    addToSideBucket(group[point.side], point);
    groups.set(point.map, group);
  }

  return [...groups.entries()]
    .map(([map, sides]) => ({
      map,
      color: mapColor(map),
      ct: sides.CT.matches === 0 ? null : sideBucketStats(sides.CT),
      t: sides.T.matches === 0 ? null : sideBucketStats(sides.T),
    }))
    .sort((a, b) => (b.ct?.matches ?? 0) + (b.t?.matches ?? 0) - ((a.ct?.matches ?? 0) + (a.t?.matches ?? 0)) || a.map.localeCompare(b.map));
}

function computeStreaks(points: MatchPoint[]): DashboardStats["streaks"] {
  let current: DashboardStats["streaks"]["current"] = null;
  const newest = points.at(-1);
  if (newest && newest.result !== "TIE") {
    let count = 0;
    for (let index = points.length - 1; index >= 0; index -= 1) {
      if (points[index].result !== newest.result) break;
      count += 1;
    }
    current = { result: newest.result, count };
  }

  let longestWin = 0;
  let longestLoss = 0;
  let runResult: MatchResult | null = null;
  let runCount = 0;

  for (const point of points) {
    if (point.result === "TIE") {
      runResult = null;
      runCount = 0;
      continue;
    }

    if (point.result === runResult) {
      runCount += 1;
    } else {
      runResult = point.result;
      runCount = 1;
    }

    if (point.result === "WIN") longestWin = Math.max(longestWin, runCount);
    if (point.result === "LOSS") longestLoss = Math.max(longestLoss, runCount);
  }

  return { current, longestWin, longestLoss };
}

function computeMomentum(points: MatchPoint[]): DashboardStats["momentum"] {
  if (points.length < MOMENTUM_WINDOW * 2) return null;

  const recent = points.slice(-MOMENTUM_WINDOW);
  const recentWinRate = winRateFor(recent);
  const baselineWinRate = winRateFor(points);
  const recentKd = ratio(
    recent.reduce((sum, point) => sum + point.kills, 0),
    recent.reduce((sum, point) => sum + point.deaths, 0),
  );
  const baselineKd = ratio(
    points.reduce((sum, point) => sum + point.kills, 0),
    points.reduce((sum, point) => sum + point.deaths, 0),
  );

  return {
    recentWinRate,
    baselineWinRate,
    delta: round(recentWinRate - baselineWinRate, 1),
    recentKd,
    baselineKd,
    kdDelta: round(recentKd - baselineKd, 2),
  };
}

function computeEntryImpact(points: MatchPoint[]): DashboardStats["entryImpact"] {
  const pointsWithRounds = points.filter((point) => point.rounds.length > 0);
  if (pointsWithRounds.length === 0) return null;
  const summary = summarizeRoundRecords(pointsWithRounds.flatMap((point) => point.rounds));
  if (!summary) return null;
  return {
    ...summary,
    trend: pointsWithRounds.map((point) => {
      const entryDeaths = point.rounds.filter((round) => round.entryDeathEst).length;
      return {
        date: point.playedAt,
        survivalRate: round((point.rounds.filter((round) => round.survived).length / point.rounds.length) * 100, 1),
        entryDeathRate: round((entryDeaths / point.rounds.length) * 100, 1),
      };
    }),
  };
}

function winRateFor(points: MatchPoint[]): number {
  if (points.length === 0) return 0;
  return round((points.filter((point) => point.result === "WIN").length / points.length) * 100, 1);
}

function computePerformanceByMap(points: MatchPoint[]): DashboardStats["performanceByMap"] {
  const groups = new Map<
    string,
    { matches: number; kills: number; deaths: number; adrSum: number; adrCount: number; wins: number }
  >();

  for (const point of points) {
    const group = groups.get(point.map) ?? {
      matches: 0,
      kills: 0,
      deaths: 0,
      adrSum: 0,
      adrCount: 0,
      wins: 0,
    };
    group.matches += 1;
    group.kills += point.kills;
    group.deaths += point.deaths;
    if (point.adr !== null) {
      group.adrSum += point.adr;
      group.adrCount += 1;
    }
    if (point.result === "WIN") group.wins += 1;
    groups.set(point.map, group);
  }

  return [...groups.entries()]
    .map(([map, g]) => ({
      map,
      matches: g.matches,
      kd: ratio(g.kills, g.deaths),
      avgAdr: g.adrCount === 0 ? null : round(g.adrSum / g.adrCount, 1),
      winRate: round((g.wins / g.matches) * 100, 1),
      color: mapColor(map),
    }))
    .sort((a, b) => b.matches - a.matches || b.kd - a.kd);
}

function pickBestMatch(points: MatchPoint[]): DashboardStats["bestMatch"] {
  let best: MatchPoint | null = null;
  for (const point of points) {
    if (!best || point.kills - point.deaths > best.kills - best.deaths || (point.kills - point.deaths === best.kills - best.deaths && point.kills > best.kills)) {
      best = point;
    }
  }
  if (!best) return null;
  return { id: best.id, map: best.map, kills: best.kills, deaths: best.deaths, playedAt: best.playedAt };
}

function ratio(kills: number, deaths: number): number {
  return round(deaths === 0 ? kills : kills / deaths, 2);
}

function average(values: (number | null)[]): number | null {
  const present = values.filter((value): value is number => value !== null);
  if (present.length === 0) return null;
  return round(present.reduce((sum, value) => sum + value, 0) / present.length, 1);
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function normalizeResult(value: string): MatchResult {
  return value === "LOSS" || value === "TIE" ? value : "WIN";
}
