import { describe, expect, test } from "bun:test";
import { mergeMatchInputs, rankDuplicateCandidates } from "./match-dedup";
import type { MatchWithUserStat } from "$lib/server/db/repositories/match-repository";
import type { MatchInput, MatchSummary } from "$lib/types/match";

describe("rankDuplicateCandidates", () => {
  test("keeps candidates inside the 120 minute window boundaries", () => {
    const incoming = { map: "Mirage", playedAt: date(12), teamScore: null, enemyScore: null, parseSource: "vision" as const };
    const matches = [
      match({ id: "inside-before", playedAt: date(10), map: "Mirage", parseSource: "gsi" }),
      match({ id: "inside-after", playedAt: date(14), map: "Mirage", parseSource: "gsi" }),
      match({ id: "outside", playedAt: date(14, 1), map: "Mirage", parseSource: "gsi" }),
      match({ id: "wrong-map", playedAt: date(12), map: "Nuke", parseSource: "gsi" }),
    ];

    expect(rankDuplicateCandidates(incoming, matches).map((candidate) => candidate.match.id)).toEqual(["inside-before", "inside-after"]);
  });

  test("marks exact score matches high and sorts high confidence before time proximity", () => {
    const incoming = { map: "Mirage", playedAt: date(12), teamScore: 8, enemyScore: 5, parseSource: "vision" as const };
    const matches = [
      match({ id: "near-low", playedAt: date(12, 5), map: "Mirage", teamScore: 7, enemyScore: 6, parseSource: "gsi" }),
      match({ id: "far-high", playedAt: date(10, 30), map: "Mirage", teamScore: 8, enemyScore: 5, parseSource: "gsi" }),
    ];

    expect(rankDuplicateCandidates(incoming, matches)).toEqual([
      { match: matches[1], confidence: "high" },
      { match: matches[0], confidence: "low" },
    ]);
  });

  test("excludes matches from the same parse source", () => {
    const incoming = { map: "Mirage", playedAt: date(12), teamScore: 8, enemyScore: 5, parseSource: "vision" as const };
    const matches = [
      match({ id: "same-source", playedAt: date(12), map: "Mirage", teamScore: 8, enemyScore: 5, parseSource: "vision" }),
      match({ id: "gsi-source", playedAt: date(12), map: "Mirage", teamScore: 8, enemyScore: 5, parseSource: "gsi" }),
    ];

    expect(rankDuplicateCandidates(incoming, matches).map((candidate) => candidate.match.id)).toEqual(["gsi-source"]);
  });
});

describe("mergeMatchInputs", () => {
  test("uses GSI core stats, fills screenshot extended stats, and preserves existing context", () => {
    const existing: MatchSummary & { durationMinutes: number | null; notes: string | null } = {
      id: "match-1",
      map: "Mirage",
      mode: "Casual",
      playedAt: "2026-06-23T10:00:00.000Z",
      teamScore: 8,
      enemyScore: 5,
      result: "WIN",
      side: "CT",
      roundsPlayed: 13,
      durationMinutes: 32,
      notes: "GSI note",
      parseSource: "gsi",
      stat: {
        playerName: "neovimbtw",
        team: "OWN",
        kills: 18,
        deaths: 7,
        assists: 4,
        adr: null,
        hsPercent: null,
        mvps: 3,
        hltvRating: null,
        enemiesFlashed: null,
        utilityDamage: null,
        score: 41,
      },
    };
    const incoming: MatchInput = {
      map: "Mirage",
      mode: "Casual",
      playedAt: new Date("2026-06-23T10:35:00.000Z"),
      teamScore: 8,
      enemyScore: 5,
      result: "WIN",
      side: "T",
      roundsPlayed: 13,
      durationMinutes: 30,
      notes: "Screenshot note",
      parseSource: "vision",
      stat: {
        playerName: "neovimbtw",
        team: "OWN",
        kills: 20,
        deaths: 8,
        assists: 5,
        adr: 92.4,
        hsPercent: 44,
        mvps: 2,
        hltvRating: 1.12,
        enemiesFlashed: 3,
        utilityDamage: 71,
        score: 50,
      },
    };

    expect(mergeMatchInputs(existing, incoming)).toEqual({
      ...incoming,
      playedAt: new Date(existing.playedAt),
      teamScore: 8,
      enemyScore: 5,
      side: "CT",
      durationMinutes: 32,
      notes: "GSI note\n\nScreenshot note",
      parseSource: "gsi",
      stat: {
        ...incoming.stat,
        kills: 18,
        deaths: 7,
        assists: 4,
        mvps: 3,
        score: 41,
      },
    });
  });
});

function date(hour: number, minute = 0): Date {
  return new Date(Date.UTC(2026, 5, 23, hour, minute));
}

function match(overrides: {
  id: string;
  playedAt: Date;
  map: string;
  teamScore?: number | null;
  enemyScore?: number | null;
  parseSource: string;
}): MatchWithUserStat {
  return {
    id: overrides.id,
    userId: "user-1",
    map: overrides.map,
    mode: "Casual",
    playedAt: overrides.playedAt,
    teamScore: overrides.teamScore ?? null,
    enemyScore: overrides.enemyScore ?? null,
    result: "WIN",
    side: "CT",
    roundsPlayed: null,
    durationMinutes: null,
    notes: null,
    parseSource: overrides.parseSource,
    createdAt: date(9),
    updatedAt: date(9),
    stats: [],
  };
}
