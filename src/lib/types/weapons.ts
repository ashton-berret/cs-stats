export type WeaponCategory = "rifle" | "pistol" | "smg" | "sniper" | "heavy" | "equipment";

export interface WeaponStat {
  key: string; // raw Steam key, e.g. "ak47"
  display: string; // "AK-47"
  category: WeaponCategory;
  kills: number;
  shots: number | null; // null for kills-only weapons (knife, grenades)
  hits: number | null;
  accuracy: number | null; // percent (hits/shots*100), null when not applicable
}

export interface OverallWeaponStats {
  totalKills: number;
  totalDeaths: number | null;
  kd: number;
  totalShots: number | null;
  totalHits: number | null; // from Steam if present, else summed from weapons
  accuracy: number | null;
  headshotKills: number | null;
  hsPercent: number | null;
  mvps: number | null;
  wins: number | null;
  matchesWon: number | null;
  matchesPlayed: number | null;
  roundsPlayed: number | null;
  hoursPlayed: number | null;
}

export interface NormalizedWeaponStats {
  overall: OverallWeaponStats;
  weapons: WeaponStat[]; // sorted by kills desc
}

export interface WeaponStatsSnapshot extends NormalizedWeaponStats {
  capturedAt: string; // ISO
  steamId64: string;
}
