import type { MatchResult } from "./match";
import type { RoundAnalyticsSummary } from "./rounds";

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
  avgHltvRating: number | null;
  avgUtilityDamage: number | null;
  bestMatch: { id: string; map: string; kills: number; deaths: number; playedAt: string } | null;
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
