import { describe, expect, test } from "bun:test";
import { computeRating1, matchRounds, ratingForMatch } from "./rating";

describe("HLTV Rating 1.0", () => {
  test("returns null without a positive round count", () => {
    expect(computeRating1({ kills: 10, deaths: 5, rounds: 0 })).toBeNull();
  });

  test("an average line (league-average KPR/survival) rates near 1.0", () => {
    // 0.679 KPR, 0.317 survival-per-round. With no per-round data the multi-kill term is estimated
    // from a Poisson(λ=KPR) model, which reproduces a realistic multi-kill spread → ~1.0.
    const rounds = 100;
    const kills = Math.round(0.679 * rounds); // 68
    const deaths = Math.round((1 - 0.317) * rounds); // 68
    const rating = computeRating1({ kills, deaths, rounds });
    expect(rating).not.toBeNull();
    expect(rating!.value).toBeGreaterThan(0.9);
    expect(rating!.value).toBeLessThan(1.1);
    expect(rating!.estimated).toBe(true);
  });

  test("exact multi-kill term rewards multi-kill rounds over spread-out kills", () => {
    const base = { kills: 10, deaths: 8, rounds: 20 };
    const spread = computeRating1({ ...base, roundKills: pad([1, 1, 1, 1, 1, 1, 1, 1, 1, 1], 20) });
    const clustered = computeRating1({ ...base, roundKills: pad([5, 5], 20) });
    expect(clustered!.value).toBeGreaterThan(spread!.value);
  });

  test("flags estimates when no per-round data is supplied", () => {
    const r = computeRating1({ kills: 22, deaths: 14, rounds: 24 });
    expect(r!.estimated).toBe(true);
    expect(r!.value).toBeGreaterThan(0);
  });

  test("matchRounds prefers join-aware roundsPlayed, falls back to score", () => {
    expect(matchRounds({ roundsPlayed: 10, teamScore: 8, enemyScore: 2 })).toBe(10);
    expect(matchRounds({ roundsPlayed: null, teamScore: 13, enemyScore: 7 })).toBe(20);
    expect(matchRounds({ roundsPlayed: null, teamScore: null, enemyScore: null })).toBeNull();
  });

  test("ratingForMatch uses the timeline when present (not estimated)", () => {
    const withTimeline = ratingForMatch({
      roundsPlayed: 3,
      teamScore: 2,
      enemyScore: 1,
      mode: "Casual",
      roundsJson: JSON.stringify([
        { round: 1, kills: 2 },
        { round: 2, kills: 0 },
        { round: 3, kills: 1 },
      ]),
      stat: { kills: 3, deaths: 1 } as never,
    });
    expect(withTimeline!.estimated).toBe(false);
  });

  test("casual modes deflate the rating; 5v5 modes leave it raw", () => {
    const input = { kills: 22, deaths: 10, rounds: 12 };
    const casual = computeRating1({ ...input, mode: "Casual" })!;
    const comp = computeRating1({ ...input, mode: "Competitive" })!;
    expect(casual.casual).toBeLessThan(casual.value); // calibrated down
    expect(comp.casual).toBe(comp.value); // 5v5 untouched
    // default (no mode) is treated as casual
    expect(computeRating1(input)!.casual).toBeLessThan(computeRating1(input)!.value);
  });
});

function pad(kills: number[], rounds: number): number[] {
  return [...kills, ...Array<number>(Math.max(0, rounds - kills.length)).fill(0)];
}
