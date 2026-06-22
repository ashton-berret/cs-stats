import type { PageServerLoad } from "./$types";
import { requireUser } from "$lib/server/auth/guard";
import { listMatches } from "$lib/server/db/repositories/match-repository";
import { computeDashboardStats } from "$lib/server/services/analytics";

export const load: PageServerLoad = async ({ locals }) => {
  const user = requireUser(locals);
  const matches = await listMatches(user.id);
  // listMatches is ordered playedAt desc, so the first row is the most recent.
  const lastPlayedAt = matches[0]?.playedAt.toISOString() ?? null;
  return {
    stats: computeDashboardStats(matches),
    lastPlayedAt,
  };
};
