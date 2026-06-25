import { describe, expect, test } from "bun:test";
import { parseRoundRecords, summarizeRoundRecords } from "./round-analytics";
import type { RoundRecord } from "$lib/types/rounds";

describe("round analytics", () => {
  test("parses missing or invalid roundsJson as an empty list", () => {
    expect(parseRoundRecords(null)).toEqual([]);
    expect(parseRoundRecords("not json")).toEqual([]);
    expect(parseRoundRecords("{}")).toEqual([]);
  });

  test("summarizes entry, survival, multi-kill, and side splits", () => {
    const records: RoundRecord[] = [
      round({ round: 1, side: "CT", kills: 2, survived: true, entryFragEst: true, won: true }),
      round({ round: 2, side: "CT", kills: 0, died: true, entryDeathEst: true, won: false }),
      round({ round: 3, side: "T", kills: 1, survived: true, won: true }),
    ];

    expect(summarizeRoundRecords(records)).toEqual({
      rounds: 3,
      entryFrags: 1,
      entryDeaths: 1,
      entrySuccessRate: 50,
      survivalRate: 66.7,
      multiKillRounds: 1,
      bySide: {
        CT: {
          rounds: 2,
          entryFrags: 1,
          entryDeaths: 1,
          entrySuccessRate: 50,
          survivalRate: 50,
          multiKillRounds: 1,
        },
        T: {
          rounds: 1,
          entryFrags: 0,
          entryDeaths: 0,
          entrySuccessRate: null,
          survivalRate: 100,
          multiKillRounds: 0,
        },
      },
    });
  });
});

function round(overrides: Partial<RoundRecord> & { round: number }): RoundRecord {
  return {
    round: overrides.round,
    side: overrides.side ?? null,
    kills: overrides.kills ?? 0,
    headshots: overrides.headshots ?? 0,
    damage: overrides.damage ?? 0,
    died: overrides.died ?? false,
    survived: overrides.survived ?? !overrides.died,
    entryFragEst: overrides.entryFragEst ?? false,
    entryDeathEst: overrides.entryDeathEst ?? false,
    won: overrides.won ?? null,
    endReason: overrides.endReason ?? null,
  };
}
