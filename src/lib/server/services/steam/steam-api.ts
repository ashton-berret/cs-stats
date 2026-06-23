import { env } from "$env/dynamic/private";
import type { NormalizedWeaponStats, OverallWeaponStats, WeaponStat } from "$lib/types/weapons";
import { WEAPON_CATALOG } from "./weapon-catalog";
import { logger, logError } from "$lib/server/utils/logger";

const STEAM_STATS_URL = "https://api.steampowered.com/ISteamUserStats/GetUserStatsForGame/v0002/";

export type SteamErrorKind = "no-key" | "private" | "not-found" | "bad-request" | "unreachable";

export class SteamApiError extends Error {
  constructor(
    message: string,
    readonly kind: SteamErrorKind,
  ) {
    super(message);
    this.name = "SteamApiError";
  }
}

interface RawStat {
  name: string;
  value: number;
}

/** Fetches and normalizes a public CS2 profile's lifetime weapon stats. Throws `SteamApiError`. */
export async function fetchUserGameStats(steamId64: string): Promise<NormalizedWeaponStats> {
  const key = env.STEAM_API_KEY?.trim();
  if (!key) throw new SteamApiError("STEAM_API_KEY is not configured on the server.", "no-key");

  const id = steamId64.trim();
  if (!/^\d{17}$/.test(id)) throw new SteamApiError("SteamID64 must be 17 digits.", "bad-request");

  const url = `${STEAM_STATS_URL}?appid=730&key=${encodeURIComponent(key)}&steamid=${encodeURIComponent(id)}`;

  let res: Response;
  try {
    res = await fetch(url);
  } catch (error) {
    logError("Steam API unreachable", error);
    throw new SteamApiError("Could not reach the Steam Web API.", "unreachable");
  }

  // Steam returns 403 for private game details, 400 for a malformed/invalid id, 500 sometimes for no data.
  if (res.status === 403) throw new SteamApiError("This Steam profile's game details are private. Set CS2 stats to public.", "private");
  if (res.status === 400) throw new SteamApiError("Steam rejected the request (check the SteamID64).", "bad-request");
  if (!res.ok) throw new SteamApiError(`Steam API responded ${res.status}.`, "unreachable");

  const data = (await res.json()) as { playerstats?: { stats?: RawStat[]; gameName?: string } };
  const stats = data.playerstats?.stats;
  if (!stats || stats.length === 0) {
    throw new SteamApiError("No CS2 stats found for this profile (is it public, and has it played CS2?).", "not-found");
  }

  logger.info("Steam stats fetched", { steamId: id, statCount: stats.length });
  return normalizeWeaponStats(stats);
}

/** Maps the flat Steam stat array into typed overall + per-weapon stats. Pure; unit-testable. */
export function normalizeWeaponStats(stats: RawStat[]): NormalizedWeaponStats {
  const map = new Map<string, number>();
  for (const stat of stats) map.set(stat.name, stat.value);
  const get = (name: string): number | null => (map.has(name) ? map.get(name)! : null);

  const weapons: WeaponStat[] = [];
  for (const [key, info] of Object.entries(WEAPON_CATALOG)) {
    const kills = get(`total_kills_${key}`) ?? 0;
    const shots = get(`total_shots_${key}`);
    const hits = get(`total_hits_${key}`);
    // Skip weapons the player has never touched.
    if (kills <= 0 && (shots === null || shots <= 0)) continue;
    weapons.push({
      key,
      display: info.display,
      category: info.category,
      kills,
      shots,
      hits,
      accuracy: shots && shots > 0 && hits !== null ? round((hits / shots) * 100, 1) : null,
    });
  }
  weapons.sort((a, b) => b.kills - a.kills);

  const totalKills = get("total_kills") ?? 0;
  const totalDeaths = get("total_deaths");
  const totalShots = get("total_shots_fired");
  const totalHits = get("total_shots_hit") ?? sumHits(weapons);
  const headshotKills = get("total_kills_headshot");
  const timeSeconds = get("total_time_played");

  const overall: OverallWeaponStats = {
    totalKills,
    totalDeaths,
    kd: round(totalDeaths && totalDeaths > 0 ? totalKills / totalDeaths : totalKills, 2),
    totalShots,
    totalHits,
    accuracy: totalShots && totalShots > 0 && totalHits !== null ? round((totalHits / totalShots) * 100, 1) : null,
    headshotKills,
    hsPercent: headshotKills !== null && totalKills > 0 ? round((headshotKills / totalKills) * 100, 1) : null,
    mvps: get("total_mvps"),
    wins: get("total_wins"),
    matchesWon: get("total_matches_won"),
    matchesPlayed: get("total_matches_played"),
    roundsPlayed: get("total_rounds_played"),
    hoursPlayed: timeSeconds !== null ? round(timeSeconds / 3600, 0) : null,
  };

  return { overall, weapons };
}

function sumHits(weapons: WeaponStat[]): number | null {
  const withHits = weapons.filter((weapon) => weapon.hits !== null);
  if (withHits.length === 0) return null;
  return withHits.reduce((sum, weapon) => sum + (weapon.hits ?? 0), 0);
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
