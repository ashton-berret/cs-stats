import type { MatchResult } from "./match";
import type { RoundAnalyticsSummary } from "./rounds";

/** A single-match record value (best so far) plus the match it was set in. */
export interface PersonalBest {
  value: number;
  matchId: string;
  map: string;
  playedAt: string;
}

/** Best single-match value per headline metric (null until at least one match has that stat). */
export interface PersonalBests {
  rating: PersonalBest | null;
  kd: PersonalBest | null;
  adr: PersonalBest | null;
  hsPercent: PersonalBest | null;
  kills: PersonalBest | null;
}

/** Kills/deaths/assists normalized to a fixed round window (CS2 casual half = 8 rounds). */
export interface RoundRateLine {
  kills: number; // per `windowRounds`
  deaths: number;
  assists: number;
  rounds: number; // total rounds in this sample (context for the rate)
  matches: number;
}

/**
 * Per-window K/D/A so matches of different lengths compare fairly. Only matches with a known round
 * count contribute; by-side rows need a recorded side. `byMapSide` is sorted by sample size.
 */
export interface RoundRates {
  windowRounds: number;
  overall: RoundRateLine | null;
  bySide: { side: "CT" | "T"; rates: RoundRateLine }[];
  byMapSide: { map: string; color: string; ct: RoundRateLine | null; t: RoundRateLine | null }[];
}

export interface DashboardStats {
  totalMatches: number;
  wins: number;
  losses: number;
  ties: number;
  winRate: number;
  totalKills: number;
  totalDeaths: number;
  totalAssists: number;
  kdRatio: number;
  avgAdr: number | null;
  avgHsPercent: number | null;
  avgHltvRating: number | null; // raw HLTV Rating 1.0, averaged
  avgRatingCasual: number | null; // casual-calibrated rating, averaged
  avgUtilityDamage: number | null;
  bestMatch: { id: string; map: string; kills: number; deaths: number; playedAt: string } | null;
  personalBests: PersonalBests;
  roundRates: RoundRates;
  kdTrend: { date: string; kd: number; kills: number; deaths: number }[];
  adrTrend: { date: string; adr: number }[];
  hsTrend: { date: string; hsPercent: number }[];
  resultBreakdown: { result: MatchResult; count: number }[];
  performanceByMap: { map: string; matches: number; kd: number; avgAdr: number | null; winRate: number; color: string }[];
  sidePerformance: {
    side: "CT" | "T";
    matches: number;
    kd: number;
    avgAdr: number | null;
    winRate: number;
  }[];
  sidePerformanceByMap: {
    map: string;
    color: string;
    ct: { matches: number; kd: number; avgAdr: number | null; winRate: number } | null;
    t: { matches: number; kd: number; avgAdr: number | null; winRate: number } | null;
  }[];
  streaks: {
    current: { result: MatchResult; count: number } | null;
    longestWin: number;
    longestLoss: number;
  };
  momentum: {
    recentWinRate: number;
    baselineWinRate: number;
    delta: number;
    recentKd: number;
    baselineKd: number;
    kdDelta: number;
  } | null;
  entryImpact: (RoundAnalyticsSummary & {
    trend: { date: string; survivalRate: number; entryDeathRate: number }[];
  }) | null;
  recentForm: MatchResult[];
}
