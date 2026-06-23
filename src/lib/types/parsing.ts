export type ParseEngine = "vision" | "ocr" | "manual" | "gsi";
export type Team = "OWN" | "ENEMY";

export interface ParsedPlayerRow {
  playerName: string;
  team: Team | null;
  kills: number | null;
  deaths: number | null;
  assists: number | null;
  adr: number | null;
  hsPercent: number | null;
  mvps: number | null;
  hltvRating: number | null;
  enemiesFlashed: number | null;
  utilityDamage: number | null;
  score: number | null;
}

export interface ParsedMatchContext {
  map: string | null;
  teamScore: number | null;
  enemyScore: number | null;
  durationMinutes: number | null;
}

export interface ScoreboardParseResult {
  engine: ParseEngine;
  context: ParsedMatchContext;
  rows: ParsedPlayerRow[];
  userRowIndex: number | null;
  rawByPage: Record<number, string>;
  warnings: string[];
}
