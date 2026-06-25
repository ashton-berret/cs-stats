import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { requireUser } from "$lib/server/auth/guard";
import { listPendingGsiReviews } from "$lib/server/db/repositories/match-repository";

// Lightweight poll target for the dashboard: GSI matches still missing manual stats (ADR/HS%/UD/EF).
// The dashboard refetches this on an interval so a freshly-played match surfaces without a reload.
export const GET: RequestHandler = async ({ locals }) => {
  const user = requireUser(locals);
  return json({ matches: await listPendingGsiReviews(user.id) });
};
