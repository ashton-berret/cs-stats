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
    expect(stats.streaks).toEqual({ current: null, longestWin: 0, longestLoss: 0 });
    expect(stats.momentum).toBeNull();
    expect(stats.entryImpact).toBeNull();
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

  test("detects current and longest streaks with alternating results", () => {
    const stats = computeDashboardStats([
      match({ id: "m1", day: 1, side: "CT", result: "WIN", kills: 10, deaths: 5, adr: null }),
      match({ id: "m2", day: 2, side: "CT", result: "LOSS", kills: 6, deaths: 8, adr: null }),
      match({ id: "m3", day: 3, side: "CT", result: "WIN", kills: 11, deaths: 6, adr: null }),
      match({ id: "m4", day: 4, side: "CT", result: "LOSS", kills: 5, deaths: 9, adr: null }),
    ]);

    expect(stats.streaks).toEqual({ current: { result: "LOSS", count: 1 }, longestWin: 1, longestLoss: 1 });
  });

  test("counts all-win streaks", () => {
    const stats = computeDashboardStats([
      match({ id: "w1", day: 1, side: "CT", result: "WIN", kills: 10, deaths: 5, adr: null }),
      match({ id: "w2", day: 2, side: "T", result: "WIN", kills: 10, deaths: 5, adr: null }),
      match({ id: "w3", day: 3, side: "CT", result: "WIN", kills: 10, deaths: 5, adr: null }),
    ]);

    expect(stats.streaks).toEqual({ current: { result: "WIN", count: 3 }, longestWin: 3, longestLoss: 0 });
  });

  test("ties break win and loss streaks", () => {
    const stats = computeDashboardStats([
      match({ id: "t1", day: 1, side: "CT", result: "WIN", kills: 10, deaths: 5, adr: null }),
      match({ id: "t2", day: 2, side: "CT", result: "WIN", kills: 10, deaths: 5, adr: null }),
      match({ id: "t3", day: 3, side: "CT", result: "TIE", kills: 10, deaths: 5, adr: null }),
      match({ id: "t4", day: 4, side: "CT", result: "WIN", kills: 10, deaths: 5, adr: null }),
      match({ id: "t5", day: 5, side: "CT", result: "LOSS", kills: 5, deaths: 10, adr: null }),
      match({ id: "t6", day: 6, side: "CT", result: "TIE", kills: 10, deaths: 10, adr: null }),
    ]);

    expect(stats.streaks).toEqual({ current: null, longestWin: 2, longestLoss: 1 });
  });

  test("momentum stays null until two full windows are available", () => {
    const stats = computeDashboardStats(
      Array.from({ length: 9 }, (_, index) =>
        match({ id: `short-${index}`, day: index + 1, side: "CT", result: "WIN", kills: 10, deaths: 5, adr: null }),
      ),
    );

    expect(stats.momentum).toBeNull();
  });

  test("computes positive momentum deltas from last five vs overall", () => {
    const stats = computeDashboardStats([
      ...Array.from({ length: 5 }, (_, index) =>
        match({ id: `old-loss-${index}`, day: index + 1, side: "CT", result: "LOSS", kills: 5, deaths: 10, adr: null }),
      ),
      ...Array.from({ length: 5 }, (_, index) =>
        match({ id: `new-win-${index}`, day: index + 6, side: "T", result: "WIN", kills: 12, deaths: 6, adr: null }),
      ),
    ]);

    expect(stats.momentum).toEqual({
      recentWinRate: 100,
      baselineWinRate: 50,
      delta: 50,
      recentKd: 2,
      baselineKd: 1.06,
      kdDelta: 0.94,
    });
  });

  test("computes negative momentum deltas from last five vs overall", () => {
    const stats = computeDashboardStats([
      ...Array.from({ length: 5 }, (_, index) =>
        match({ id: `old-win-${index}`, day: index + 1, side: "CT", result: "WIN", kills: 12, deaths: 6, adr: null }),
      ),
      ...Array.from({ length: 5 }, (_, index) =>
        match({ id: `new-loss-${index}`, day: index + 6, side: "T", result: "LOSS", kills: 5, deaths: 10, adr: null }),
      ),
    ]);

    expect(stats.momentum).toEqual({
      recentWinRate: 0,
      baselineWinRate: 50,
      delta: -50,
      recentKd: 0.5,
      baselineKd: 1.06,
      kdDelta: -0.56,
    });
  });

  test("computes entry impact from roundsJson and skips matches without rounds", () => {
    const stats = computeDashboardStats([
      match({ id: "no-rounds", day: 1, side: "CT", result: "WIN", kills: 10, deaths: 5, adr: null }),
      match({
        id: "with-rounds",
        day: 2,
        side: "CT",
        result: "WIN",
        kills: 3,
        deaths: 1,
        adr: null,
        roundsJson: JSON.stringify([
          { round: 1, side: "CT", kills: 2, headshots: 1, damage: 140, died: false, survived: true, entryFragEst: true, entryDeathEst: false, won: true, endReason: "ct_win_elimination" },
          { round: 2, side: "CT", kills: 0, headshots: 0, damage: 10, died: true, survived: false, entryFragEst: false, entryDeathEst: true, won: false, endReason: "t_win_elimination" },
        ]),
      }),
    ]);

    expect(stats.entryImpact).toEqual({
      rounds: 2,
      entryFrags: 1,
      entryDeaths: 1,
      entrySuccessRate: 50,
      survivalRate: 50,
      multiKillRounds: 1,
      avgRoundDamage: 75,
      bySide: {
        CT: {
          rounds: 2,
          entryFrags: 1,
          entryDeaths: 1,
          entrySuccessRate: 50,
          survivalRate: 50,
          multiKillRounds: 1,
          avgRoundDamage: 75,
        },
        T: null,
      },
      trend: [{ date: "2026-06-02T12:00:00.000Z", survivalRate: 50, entryDeathRate: 50 }],
    });
  });
});

function match(overrides: {
  id: string;
  day?: number;
  map?: string;
  side: MatchSide | null;
  result: "WIN" | "LOSS" | "TIE";
  kills: number;
  deaths: number;
  adr: number | null;
  roundsJson?: string | null;
}): MatchWithUserStat {
  return {
    id: overrides.id,
    userId: "user-1",
    map: overrides.map ?? "Mirage",
    mode: "Casual",
    playedAt: new Date(`2026-06-${String(overrides.day ?? 10 + Math.abs(hashCode(overrides.id)) % 10).padStart(2, "0")}T12:00:00Z`),
    teamScore: null,
    enemyScore: null,
    result: overrides.result,
    side: overrides.side,
    roundsPlayed: null,
    roundsJson: overrides.roundsJson ?? null,
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
