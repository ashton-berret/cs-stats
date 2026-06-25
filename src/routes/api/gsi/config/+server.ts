import type { RequestHandler } from "./$types";
import { requireUser } from "$lib/server/auth/guard";
import { ensureGsiToken } from "$lib/server/db/repositories/settings-repository";
import { buildGsiConfig, GSI_CONFIG_FILENAME } from "$lib/server/services/gsi";

// Serves the user's personalized GSI config as a downloadable .cfg (session-authed).
export const GET: RequestHandler = async ({ locals, url }) => {
  const user = requireUser(locals);
  const token = await ensureGsiToken(user.id);
  // Force IPv4 loopback: CS2's GSI client connects over 127.0.0.1, and "localhost" can resolve
  // to IPv6 ::1, which the dev server may not be bound to (silent connection refusal).
  const endpoint = `${url.origin.replace("localhost", "127.0.0.1")}/api/gsi`;
  return new Response(buildGsiConfig(token, endpoint), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${GSI_CONFIG_FILENAME}"`,
    },
  });
};
