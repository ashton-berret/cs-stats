import type { RoundRecord } from "$lib/types/rounds";
import type { MatchSide } from "$lib/types/match";
import type { GsiPayload } from "./types";

interface ActiveRound {
  round: number;
  side: MatchSide | null;
  startedAt: number | null;
  kills: number;
  headshots: number;
  damage: number;
  died: boolean;
  firstKillAt: number | null;
  firstDeathAt: number | null;
}

export interface RoundTrackerState {
  current: ActiveRound | null;
  records: RoundRecord[];
  lastRoundPhase: string | null;
  lastScoreTotal: number;
}

export function createRoundTracker(initialScoreTotal = 0): RoundTrackerState {
  return {
    current: null,
    records: [],
    lastRoundPhase: null,
    lastScoreTotal: initialScoreTotal,
  };
}

export function trackRoundPayload(state: RoundTrackerState, payload: GsiPayload): RoundRecord[] {
  const phase = payload.round?.phase ?? null;
  const scoreTotal = (payload.map?.team_ct?.score ?? 0) + (payload.map?.team_t?.score ?? 0);
  const timestamp = timestampMs(payload.provider?.timestamp);
  const scoreAdvanced = scoreTotal > state.lastScoreTotal;

  if (!state.current && phase === "live") {
    startRound(state, scoreTotal + 1, payload, timestamp);
  } else if (state.current && scoreAdvanced) {
    closeRound(state, payload);
    if (phase === "live") startRound(state, scoreTotal + 1, payload, timestamp);
  } else if (state.current && phase === "over" && state.lastRoundPhase !== "over") {
    closeRound(state, payload);
  } else if (!state.current && scoreAdvanced && phase !== "over") {
    startRound(state, scoreTotal + 1, payload, timestamp);
  }

  if (state.current) updateCurrentRound(state.current, payload, timestamp);

  state.lastRoundPhase = phase;
  state.lastScoreTotal = Math.max(state.lastScoreTotal, scoreTotal);
  return state.records;
}

export function finalizeRoundTracker(state: RoundTrackerState, payload?: GsiPayload): RoundRecord[] {
  if (state.current) closeRound(state, payload);
  return state.records;
}

function startRound(state: RoundTrackerState, round: number, payload: GsiPayload, timestamp: number | null): void {
  state.current = {
    round,
    side: sideOf(payload.player?.team),
    startedAt: timestamp,
    kills: 0,
    headshots: 0,
    damage: 0,
    died: false,
    firstKillAt: null,
    firstDeathAt: null,
  };
}

function updateCurrentRound(round: ActiveRound, payload: GsiPayload, timestamp: number | null): void {
  const state = payload.player?.state;
  if (payload.player?.team) round.side = sideOf(payload.player.team);
  const kills = state?.round_kills ?? round.kills;
  const headshots = state?.round_killhs ?? round.headshots;
  const damage = state?.round_totaldmg ?? round.damage;

  if (kills > round.kills && round.firstKillAt === null) round.firstKillAt = timestamp;
  round.kills = Math.max(round.kills, kills);
  round.headshots = Math.max(round.headshots, headshots);
  round.damage = Math.max(round.damage, damage);

  if ((state?.health ?? 1) <= 0) {
    round.died = true;
    if (round.firstDeathAt === null) round.firstDeathAt = timestamp;
  }
}

function closeRound(state: RoundTrackerState, payload?: GsiPayload): void {
  const current = state.current;
  if (!current) return;
  const endReason = payload?.map?.round_wins?.[String(current.round)] ?? null;
  const won = wonRound(endReason, current.side);

  // TODO: validate heuristics against a real capture. Own-player casual GSI cannot prove true lobby opening duels.
  state.records.push({
    round: current.round,
    side: current.side,
    kills: current.kills,
    headshots: current.headshots,
    damage: current.damage,
    died: current.died,
    survived: !current.died,
    entryFragEst: current.firstKillAt !== null && (current.firstDeathAt === null || current.firstKillAt <= current.firstDeathAt),
    entryDeathEst: current.firstDeathAt !== null && current.kills === 0,
    won,
    endReason,
  });
  state.current = null;
}

function wonRound(reason: string | null, side: MatchSide | null): boolean | null {
  if (!reason || !side) return null;
  if (reason.startsWith("ct_win")) return side === "CT";
  if (reason.startsWith("t_win")) return side === "T";
  return null;
}

function sideOf(team: string | undefined): MatchSide | null {
  return team === "CT" || team === "T" ? team : null;
}

function timestampMs(timestamp: number | undefined): number | null {
  if (timestamp === undefined) return null;
  return timestamp > 1_000_000_000_000 ? timestamp : timestamp * 1000;
}
