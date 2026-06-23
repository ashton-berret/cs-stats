import type { GsiPayload } from "./types";
import type { MatchInput, MatchSide } from "$lib/types/match";
import { createMatch } from "$lib/server/db/repositories/match-repository";
import { logger } from "$lib/server/utils/logger";

/**
 * In-memory live-match tracker. GSI has no match id and streams many partial payloads, so we
 * infer a match: it begins the first time we see a live/warmup map, accumulates the user's
 * cumulative match_stats, and finalizes (persists one Match) when the map reaches "gameover".
 *
 * State is per-user and in-memory only — a server restart mid-match drops the in-flight match,
 * which is acceptable for a local single-user tool. Match-boundary heuristics (phase names,
 * casual specifics) are expected to be tuned against real payloads.
 */

const LIVE_PHASES = new Set(["live", "warmup", "intermission"]);
const GAMEOVER_PHASE = "gameover";

// GSI reports internal map codes; map them to the display names the app uses.
const MAP_DISPLAY: Record<string, string> = {
  de_mirage: "Mirage",
  de_inferno: "Inferno",
  de_dust2: "Dust II",
  de_nuke: "Nuke",
  de_overpass: "Overpass",
  de_ancient: "Ancient",
  de_anubis: "Anubis",
  de_vertigo: "Vertigo",
  de_train: "Train",
  de_cache: "Cache",
  cs_office: "Office",
  cs_italy: "Italy",
};

function displayMap(code: string): string {
  return MAP_DISPLAY[code] ?? code.replace(/^(de_|cs_)/, "").replace(/\b\w/g, (c) => c.toUpperCase());
}

interface LiveMatch {
  mapCode: string; // raw GSI code, used to detect map changes
  map: string; // display name, used when saving
  mode: string;
  side: MatchSide | null;
  playerName: string;
  joinTotalRounds: number; // rounds already played when we first saw this match
  ctScore: number;
  tScore: number;
  kills: number;
  deaths: number;
  assists: number;
  mvps: number;
  score: number;
  finalized: boolean;
  startedAt: Date;
}

const liveByUser = new Map<string, LiveMatch>();

export async function handleGsiPayload(userId: string, payload: GsiPayload): Promise<void> {
  const map = payload.map;
  const ownSteamId = payload.provider?.steamid;
  const player = payload.player;
  // Only trust the player block when it is the local user's own row (not a spectated teammate).
  const isOwnPlayer = !!player && (!ownSteamId || player.steamid === ownSteamId);

  if (!map?.name) return;

  const phase = map.phase ?? "";
  const ctScore = map.team_ct?.score ?? 0;
  const tScore = map.team_t?.score ?? 0;
  const totalRounds = ctScore + tScore;

  let live = liveByUser.get(userId);

  // Start a new match when we first see a non-finished one (or the map changed).
  if (!live || live.finalized || live.mapCode !== map.name) {
    if (LIVE_PHASES.has(phase)) {
      live = {
        mapCode: map.name,
        map: displayMap(map.name),
        mode: map.mode ?? "Casual",
        side: sideOf(player?.team),
        playerName: (isOwnPlayer && player?.name) || "",
        joinTotalRounds: totalRounds,
        ctScore,
        tScore,
        kills: 0,
        deaths: 0,
        assists: 0,
        mvps: 0,
        score: 0,
        finalized: false,
        startedAt: new Date(),
      };
      liveByUser.set(userId, live);
      logger.info("GSI match started", { userId, map: map.name, mode: live.mode, joinTotalRounds: totalRounds });
    } else {
      return; // nothing active and not a live phase
    }
  }

  // Update running state.
  live.ctScore = ctScore;
  live.tScore = tScore;
  if (isOwnPlayer) {
    if (player?.team) live.side = sideOf(player.team);
    if (player?.name) live.playerName = player.name;
    const s = player?.match_stats;
    if (s) {
      live.kills = s.kills ?? live.kills;
      live.deaths = s.deaths ?? live.deaths;
      live.assists = s.assists ?? live.assists;
      live.mvps = s.mvps ?? live.mvps;
      live.score = s.score ?? live.score;
    }
  }

  if (phase === GAMEOVER_PHASE && !live.finalized) {
    live.finalized = true;
    await finalize(userId, live);
    liveByUser.delete(userId);
  }
}

async function finalize(userId: string, live: LiveMatch): Promise<void> {
  const userScore = live.side === "T" ? live.tScore : live.ctScore;
  const enemyScore = live.side === "T" ? live.ctScore : live.tScore;
  const result = userScore > enemyScore ? "WIN" : userScore < enemyScore ? "LOSS" : "TIE";
  const roundsPlayed = Math.max(0, live.ctScore + live.tScore - live.joinTotalRounds) || null;

  const input: MatchInput = {
    map: live.map,
    mode: live.mode,
    playedAt: live.startedAt,
    teamScore: userScore,
    enemyScore,
    result,
    side: live.side,
    roundsPlayed,
    durationMinutes: Math.max(1, Math.round((Date.now() - live.startedAt.getTime()) / 60000)),
    notes: null,
    parseSource: "gsi",
    stat: {
      playerName: live.playerName,
      team: "OWN",
      kills: live.kills,
      deaths: live.deaths,
      assists: live.assists,
      adr: null, // not available via GSI — enrich later with an optional screenshot
      hsPercent: null,
      mvps: live.mvps,
      hltvRating: null,
      enemiesFlashed: null,
      utilityDamage: null,
      score: live.score,
    },
  };

  await createMatch(userId, input);
  logger.info("GSI match saved", { userId, map: live.map, result, score: `${userScore}-${enemyScore}`, roundsPlayed });
}

function sideOf(team: string | undefined): MatchSide | null {
  return team === "CT" || team === "T" ? team : null;
}

/** Exposed for a future live-status UI. */
export function getLiveMatch(userId: string): Readonly<LiveMatch> | null {
  return liveByUser.get(userId) ?? null;
}
