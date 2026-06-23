import { describe, expect, test } from "bun:test";
import { computeDashboardStats } from "./stats-calculator";
import type { MatchWithUserStat } from "$lib/server/db/repositories/match-repository";
import type { MatchSide } from "$lib/types/match";

describe("computeDashboardStats", () => {
  test("returns empty dashboard stats for no matches", () => {
    const stats = computeDashboardStats([]);

    expect(stats.totalMatches).toBe(0);
    expect(stats.winRate).toBe(0);
    expect(stats.kdRatio).toBe(0);
    expect(stats.bestMatch).toBeNull();
    expect(stats.performanceByMap).toEqual([]);
    expect(stats.sidePerformance).toEqual([]);
    expect(stats.sidePerformanceByMap).toEqual([]);
  });

  test("aggregates overall side performance and excludes null-side matches", () => {
    const stats = computeDashboardStats([
      match({ id: "ct-1", side: "CT", result: "WIN", kills: 20, deaths: 10, adr: 90 }),
      match({ id: "ct-2", side: "CT", result: "LOSS", kills: 10, deaths: 10, adr: null }),
      match({ id: "t-1", side: "T", result: "WIN", kills: 12, deaths: 6, adr: 80 }),
      match({ id: "legacy", side: null, result: "WIN", kills: 50, deaths: 1, adr: 120 }),
    ]);

    expect(stats.totalMatches).toBe(4);
    expect(stats.sidePerformance).toEqual([
      { side: "CT", matches: 2, kd: 1.5, avgAdr: 90, winRate: 50 },
      { side: "T", matches: 1, kd: 2, avgAdr: 80, winRate: 100 },
    ]);
  });

  test("builds per-map CT/T buckets and leaves unobserved sides null", () => {
    const stats = computeDashboardStats([
      match({ id: "mirage-ct", map: "Mirage", side: "CT", result: "WIN", kills: 14, deaths: 7, adr: 88 }),
      match({ id: "mirage-t", map: "Mirage", side: "T", result: "LOSS", kills: 8, deaths: 8, adr: 70 }),
      match({ id: "nuke-ct", map: "Nuke", side: "CT", result: "WIN", kills: 18, deaths: 9, adr: null }),
      match({ id: "dust-legacy", map: "Dust II", side: null, result: "WIN", kills: 30, deaths: 10, adr: 100 }),
    ]);

    expect(stats.sidePerformanceByMap).toEqual([
      {
        map: "Mirage",
        color: "#E8A33D",
        ct: { matches: 1, kd: 2, avgAdr: 88, winRate: 100 },
        t: { matches: 1, kd: 1, avgAdr: 70, winRate: 0 },
      },
      {
        map: "Nuke",
        color: "#5BC0BE",
        ct: { matches: 1, kd: 2, avgAdr: null, winRate: 100 },
        t: null,
      },
    ]);
  });
});

function match(overrides: {
  id: string;
  map?: string;
  side: MatchSide | null;
  result: "WIN" | "LOSS" | "TIE";
  kills: number;
  deaths: number;
  adr: number | null;
}): MatchWithUserStat {
  return {
    id: overrides.id,
    userId: "user-1",
    map: overrides.map ?? "Mirage",
    mode: "Casual",
    playedAt: new Date(`2026-06-${String(10 + Math.abs(hashCode(overrides.id)) % 10).padStart(2, "0")}T12:00:00Z`),
    teamScore: null,
    enemyScore: null,
    result: overrides.result,
    side: overrides.side,
    roundsPlayed: null,
    durationMinutes: null,
    notes: null,
    parseSource: "manual",
    createdAt: new Date("2026-06-01T00:00:00Z"),
    updatedAt: new Date("2026-06-01T00:00:00Z"),
    stats: [
      {
        id: `${overrides.id}-stat`,
        matchId: overrides.id,
        userId: "user-1",
        playerName: "neovimbtw",
        team: "OWN",
        isUser: true,
        kills: overrides.kills,
        deaths: overrides.deaths,
        assists: 0,
        adr: overrides.adr,
        hsPercent: null,
        mvps: null,
        hltvRating: null,
        enemiesFlashed: null,
        utilityDamage: null,
        score: null,
        createdAt: new Date("2026-06-01T00:00:00Z"),
        updatedAt: new Date("2026-06-01T00:00:00Z"),
      },
    ],
  };
}

function hashCode(value: string): number {
  return [...value].reduce((hash, char) => hash + char.charCodeAt(0), 0);
}
