import type { PageServerLoad } from "./$types";
import { requireUser } from "$lib/server/auth/guard";
import { listMatches, listPendingGsiReviews } from "$lib/server/db/repositories/match-repository";
import { getLatestSnapshot } from "$lib/server/db/repositories/weapon-stats-repository";
import { computeDashboardStats, buildPerformanceCalendar } from "$lib/server/services/analytics";
import { serializeMatchSummary } from "$lib/server/utils/match-serialization";

const ACTIVITY_DAYS = 182;

export const load: PageServerLoad = async ({ locals, url }) => {
  const user = requireUser(locals);
  const [matches, weaponSnapshot, pendingReviews] = await Promise.all([
    listMatches(user.id),
    getLatestSnapshot(user.id),
    listPendingGsiReviews(user.id),
  ]);

  // Mode filter: pills are derived from the modes actually present in the data, plus "All".
  const modes = ["All", ...[...new Set(matches.map((m) => m.mode))].sort()];
  // Default to Casual (the user's main mode) so retakes/other modes don't skew the baseline view;
  // fall back to All if no Casual matches exist yet. An explicit ?mode= always wins.
  const fallbackMode = modes.includes("Casual") ? "Casual" : "All";
  const requested = url.searchParams.get("mode") ?? fallbackMode;
  const activeMode = modes.includes(requested) ? requested : "All";
  const visible = activeMode === "All" ? matches : matches.filter((m) => m.mode === activeMode);

  // listMatches is ordered playedAt desc, so the first row is the most recent.
  const lastPlayedAt = visible[0]?.playedAt.toISOString() ?? null;
  return {
    stats: computeDashboardStats(visible),
    lastPlayedAt,
    // Weapon stats from Steam are lifetime/all-mode totals — not filtered by match mode.
    topWeapons: weaponSnapshot?.weapons ?? [],
    recentMatch: visible[0] ? serializeMatchSummary(visible[0]) : null,
    modes,
    activeMode,
    pendingReviews,
    // Heatmap uses all matches (independent of the mode filter); carries count + daily Form score.
    activity: buildPerformanceCalendar(matches, ACTIVITY_DAYS),
  };
};
