import type { PageServerLoad } from "./$types";
import { requireUser } from "$lib/server/auth/guard";
import { listMatches } from "$lib/server/db/repositories/match-repository";
import { serializeMatchSummary } from "$lib/server/utils/match-serialization";

export const load: PageServerLoad = async ({ locals }) => {
  const user = requireUser(locals);
  const matches = await listMatches(user.id);
  return {
    matches: matches.slice(0, 5).map(serializeMatchSummary),
    totalMatches: matches.length,
  };
};
