import type { ParseEngine, Team } from "./parsing";

export type MatchResult = "WIN" | "LOSS" | "TIE";
export type MatchSide = "CT" | "T";

export interface PlayerStatInput {
  playerName: string;
  team: Team;
  kills: number;
  deaths: number;
  assists: number;
  adr: number | null;
  hsPercent: number | null;
  mvps: number | null;
  hltvRating: number | null;
  enemiesFlashed: number | null;
  utilityDamage: number | null;
  score: number | null;
}

export interface MatchInput {
  map: string;
  mode: string;
  playedAt: Date;
  teamScore: number | null;
  enemyScore: number | null;
  result: MatchResult;
  side: MatchSide | null;
  roundsPlayed: number | null;
  durationMinutes: number | null;
  notes: string | null;
  parseSource: ParseEngine;
  stat: PlayerStatInput;
}

export interface MatchSummary {
  id: string;
  map: string;
  mode: string;
  playedAt: string;
  teamScore: number | null;
  enemyScore: number | null;
  result: MatchResult;
  side: MatchSide | null;
  roundsPlayed: number | null;
  parseSource: ParseEngine;
  stat: PlayerStatInput;
}

export interface MatchDetail extends MatchSummary {
  durationMinutes: number | null;
  notes: string | null;
}

export interface MatchFormValues {
  map: string;
  mode: string;
  playedAt: string;
  teamScore: string;
  enemyScore: string;
  result: MatchResult;
  side: string;
  roundsPlayed: string;
  durationMinutes: string;
  notes: string;
  parseSource: ParseEngine;
  playerName: string;
  team: Team;
  kills: string;
  deaths: string;
  assists: string;
  adr: string;
  hsPercent: string;
  mvps: string;
  hltvRating: string;
  enemiesFlashed: string;
  utilityDamage: string;
  score: string;
}
