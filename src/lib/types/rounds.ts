import type { MatchSide } from "./match";

export interface RoundRecord {
  round: number;
  side: MatchSide | null;
  kills: number;
  headshots: number;
  damage: number;
  died: boolean;
  survived: boolean;
  entryFragEst: boolean;
  entryDeathEst: boolean;
  won: boolean | null;
  endReason: string | null;
}

export interface RoundSideAnalytics {
  rounds: number;
  entryFrags: number;
  entryDeaths: number;
  entrySuccessRate: number | null;
  survivalRate: number;
  multiKillRounds: number;
  avgRoundDamage: number;
}

export interface RoundAnalyticsSummary {
  rounds: number;
  entryFrags: number;
  entryDeaths: number;
  entrySuccessRate: number | null;
  survivalRate: number;
  multiKillRounds: number;
  avgRoundDamage: number;
  bySide: {
    CT: RoundSideAnalytics | null;
    T: RoundSideAnalytics | null;
  };
}
