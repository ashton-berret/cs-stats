import { describe, expect, test } from "bun:test";
import { createRoundTracker, finalizeRoundTracker, trackRoundPayload } from "./round-tracker";
import type { GsiPayload } from "./types";

describe("round-tracker", () => {
  test("tracks own-player round records from a synthetic casual GSI sequence", () => {
    const tracker = createRoundTracker();
    const fixture: GsiPayload[] = [
      payload({ timestamp: 1, phase: "live", ct: 0, t: 0, side: "CT", health: 100, kills: 0, hs: 0, damage: 0 }),
      payload({ timestamp: 2, phase: "live", ct: 0, t: 0, side: "CT", health: 100, kills: 1, hs: 1, damage: 104 }),
      payload({ timestamp: 3, phase: "over", ct: 1, t: 0, side: "CT", health: 100, kills: 1, hs: 1, damage: 104, wins: { "1": "ct_win_elimination" } }),
      payload({ timestamp: 4, phase: "live", ct: 1, t: 0, side: "CT", health: 100, kills: 0, hs: 0, damage: 0 }),
      payload({ timestamp: 5, phase: "live", ct: 1, t: 0, side: "CT", health: 0, kills: 0, hs: 0, damage: 23 }),
      payload({ timestamp: 6, phase: "over", ct: 1, t: 1, side: "CT", health: 0, kills: 0, hs: 0, damage: 23, wins: { "2": "t_win_elimination" } }),
    ];

    for (const item of fixture) trackRoundPayload(tracker, item);
    expect(finalizeRoundTracker(tracker)).toEqual([
      {
        round: 1,
        side: "CT",
        kills: 1,
        headshots: 1,
        damage: 104,
        died: false,
        survived: true,
        entryFragEst: true,
        entryDeathEst: false,
        won: true,
        endReason: "ct_win_elimination",
      },
      {
        round: 2,
        side: "CT",
        kills: 0,
        headshots: 0,
        damage: 23,
        died: true,
        survived: false,
        entryFragEst: false,
        entryDeathEst: true,
        won: false,
        endReason: "t_win_elimination",
      },
    ]);
  });
});

function payload(input: {
  timestamp: number;
  phase: string;
  ct: number;
  t: number;
  side: "CT" | "T";
  health: number;
  kills: number;
  hs: number;
  damage: number;
  wins?: Record<string, string>;
}): GsiPayload {
  return {
    provider: { timestamp: input.timestamp },
    map: {
      name: "de_mirage",
      phase: "live",
      team_ct: { score: input.ct },
      team_t: { score: input.t },
      round_wins: input.wins,
    },
    round: { phase: input.phase },
    player: {
      steamid: "1",
      team: input.side,
      state: {
        health: input.health,
        round_kills: input.kills,
        round_killhs: input.hs,
        round_totaldmg: input.damage,
      },
    },
  };
}
