import type { RequestHandler } from "./$types";
import { findUserIdByGsiToken } from "$lib/server/db/repositories/settings-repository";
import { handleGsiPayload } from "$lib/server/services/gsi";
import type { GsiPayload } from "$lib/server/services/gsi";
import { logError } from "$lib/server/utils/logger";

// CS2 POSTs game state here. Auth is the token embedded in the payload (CS2 sends no headers).
// Respond fast with 2xx — GSI ignores the body and will back off on errors.
export const POST: RequestHandler = async ({ request }) => {
  let payload: GsiPayload;
  try {
    payload = (await request.json()) as GsiPayload;
  } catch {
    return new Response("bad request", { status: 400 });
  }

  const token = payload?.auth?.token ?? "";
  const userId = await findUserIdByGsiToken(token);
  if (!userId) return new Response("unauthorized", { status: 401 });

  try {
    await handleGsiPayload(userId, payload);
  } catch (error) {
    logError("GSI payload handling failed", error);
  }
  return new Response("ok");
};
