import type { MatchResult } from "./match";

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
  recentForm: MatchResult[];
}
