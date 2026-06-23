import { describe, expect, test } from "bun:test";
import { computeDashboardStats } from "./stats-calculator";

describe("computeDashboardStats", () => {
  test("returns empty dashboard stats for no matches", () => {
    const stats = computeDashboardStats([]);

    expect(stats.totalMatches).toBe(0);
    expect(stats.winRate).toBe(0);
    expect(stats.kdRatio).toBe(0);
    expect(stats.bestMatch).toBeNull();
    expect(stats.performanceByMap).toEqual([]);
  });
});
