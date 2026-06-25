/**
 * HLTV Rating 1.0 — the only pro rating with a published formula. Centered so 1.0 = league-average
 * performance. We compute it exactly when per-round kill counts are available (GSI round timeline)
 * and estimate the multi-kill term otherwise (manual/screenshot matches have only season totals).
 *
 * Rating = (KillRating + 0.7·SurvivalRating + MultiKillRating) / 2.7
 *   KillRating      = (Kills / Rounds) / 0.679
 *   SurvivalRating  = ((Rounds − Deaths) / Rounds) / 0.317
 *   MultiKillRating = Σ k²·(rounds with exactly k kills) / Rounds / 1.277   (k capped at 5)
 *
 * 0.679 / 0.317 / 1.277 are HLTV's league-average constants for KPR, survival-per-round, and the
 * multi-kill points sum.
 */

import type { MatchSummary } from "$lib/types/match";
import { parseRoundRecords } from "./round-analytics";

const AVG_KPR = 0.679;
const AVG_SPR = 0.317;
const AVG_RMK = 1.277;

// HLTV's constants are calibrated to 5v5 competitive. 10v10 casual offers ~2× the targets per
// round, inflating KPR (and therefore the rating). This divisor maps a casual line back toward the
// 1.0 = solid-game scale. It's a population estimate, not fit to any one player — tune in one place.
const CASUAL_RATING_FACTOR = 1.35;
const FIVE_V_FIVE_MODES = new Set(["competitive", "premier", "wingman"]);

export interface RatingInput {
  kills: number;
  deaths: number;
  rounds: number;
  /** Per-round kill counts (from the GSI round timeline). When present, the multi-kill term is exact. */
  roundKills?: number[] | null;
  /** Game mode; non-5v5 modes get the casual calibration. Defaults to casual treatment. */
  mode?: string;
}

export interface RatingBreakdown {
  kills: number;
  deaths: number;
  rounds: number;
  /** The three component sub-scores (each 1.0 = league average for that component). */
  killRating: number;
  survivalRating: number;
  multiKillRating: number;
  /** Casual divisor applied to get `casual` (1 for 5v5 modes). */
  casualFactor: number;
}

export interface MatchRating {
  /** Raw HLTV Rating 1.0 — the true, unmodified formula. */
  value: number;
  /** Casual-calibrated rating (raw ÷ casual factor for 10v10 modes; equals `value` for 5v5). */
  casual: number;
  /** True when the multi-kill term was estimated (no per-round data available). */
  estimated: boolean;
  /** Per-component inputs and sub-scores, for "how was this calculated" UI. */
  breakdown: RatingBreakdown;
}

export function computeRating1(input: RatingInput): MatchRating | null {
  const { kills, deaths, rounds } = input;
  if (!Number.isFinite(rounds) || rounds <= 0) return null;

  const killRating = kills / rounds / AVG_KPR;
  const survivalRating = (rounds - deaths) / rounds / AVG_SPR;

  const hasTimeline = !!input.roundKills && input.roundKills.length > 0;
  const mkNumerator = hasTimeline
    ? exactMultiKillNumerator(input.roundKills as number[])
    : estimateMultiKillNumerator(kills, rounds);
  const multiKillRating = mkNumerator / rounds / AVG_RMK;

  const value = round(Math.max(0, (killRating + 0.7 * survivalRating + multiKillRating) / 2.7), 2);
  const isFiveV5 = FIVE_V_FIVE_MODES.has((input.mode ?? "casual").toLowerCase());
  const casualFactor = isFiveV5 ? 1 : CASUAL_RATING_FACTOR;
  const casual = round(value / casualFactor, 2);
  return {
    value,
    casual,
    estimated: !hasTimeline,
    breakdown: {
      kills,
      deaths,
      rounds,
      killRating: round(killRating, 2),
      survivalRating: round(survivalRating, 2),
      multiKillRating: round(multiKillRating, 2),
      casualFactor,
    },
  };
}

/** Σ k² over rounds, k capped at 5 (5K is the max HLTV weights). */
function exactMultiKillNumerator(roundKills: number[]): number {
  let sum = 0;
  for (const k of roundKills) {
    const capped = Math.min(Math.max(0, Math.round(k)), 5);
    sum += capped * capped;
  }
  return sum;
}

/**
 * Estimate Σ k²·rounds-with-k from season totals by modelling kills/round as Poisson(λ = K/R):
 * E[rounds with k kills] = R·e^−λ·λ^k/k!. This preserves total kills (Σ k·R·P(k) = K) and yields a
 * smooth, defensible multi-kill term. Tail beyond 5K is negligible at realistic kill rates.
 */
function estimateMultiKillNumerator(kills: number, rounds: number): number {
  const lambda = kills / rounds;
  let pk = Math.exp(-lambda); // P(0)
  let numerator = 0;
  for (let k = 1; k <= 5; k += 1) {
    pk = (pk * lambda) / k; // P(k)
    numerator += k * k * rounds * pk;
  }
  return numerator;
}

/** Rounds the player actually played: GSI join-aware roundsPlayed, else total rounds from the score. */
export function matchRounds(match: Pick<MatchSummary, "roundsPlayed" | "teamScore" | "enemyScore">): number | null {
  if (match.roundsPlayed && match.roundsPlayed > 0) return match.roundsPlayed;
  if (match.teamScore !== null && match.enemyScore !== null) {
    const total = match.teamScore + match.enemyScore;
    return total > 0 ? total : null;
  }
  return null;
}

/** Convenience: Rating 1.0 for a serialized match, using the round timeline when present. */
export function ratingForMatch(
  match: Pick<MatchSummary, "roundsPlayed" | "teamScore" | "enemyScore" | "roundsJson" | "mode" | "stat">,
): MatchRating | null {
  const rounds = matchRounds(match);
  if (rounds === null) return null;
  const records = parseRoundRecords(match.roundsJson);
  const roundKills = records.length ? records.map((r) => r.kills) : null;
  return computeRating1({ kills: match.stat.kills, deaths: match.stat.deaths, rounds, roundKills, mode: match.mode });
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
