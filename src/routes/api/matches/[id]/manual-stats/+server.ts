import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { requireUser } from "$lib/server/auth/guard";
import { updateManualStats } from "$lib/server/db/repositories/match-repository";

// Optional non-negative number from arbitrary JSON input; blank/absent → null, invalid → undefined.
function optionalNumber(value: unknown, max = Infinity): number | null | undefined {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 0 || n > max) return undefined;
  return n;
}

// Patches the four manual scoreboard stats (ADR/HS%/UD/EF) onto a GSI match from the dashboard modal.
export const POST: RequestHandler = async ({ request, locals, params }) => {
  const user = requireUser(locals);
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") error(400, "Invalid body");

  const fields = {
    adr: optionalNumber((body as Record<string, unknown>).adr),
    hsPercent: optionalNumber((body as Record<string, unknown>).hsPercent, 100),
    utilityDamage: optionalNumber((body as Record<string, unknown>).utilityDamage),
    enemiesFlashed: optionalNumber((body as Record<string, unknown>).enemiesFlashed),
  };
  if (Object.values(fields).some((v) => v === undefined)) error(400, "Stats must be non-negative numbers (HS% ≤ 100)");

  const ok = await updateManualStats(user.id, params.id, fields as Parameters<typeof updateManualStats>[2]);
  if (!ok) error(404, "Match not found");
  return json({ ok: true });
};
