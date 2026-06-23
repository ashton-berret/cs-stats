import type { Actions, PageServerLoad } from "./$types";
import { fail } from "@sveltejs/kit";
import { requireUser } from "$lib/server/auth/guard";
import { getSettings } from "$lib/server/db/repositories/settings-repository";
import { getLatestSnapshot, saveSnapshot } from "$lib/server/db/repositories/weapon-stats-repository";
import { fetchUserGameStats, SteamApiError } from "$lib/server/services/steam";
import { logError } from "$lib/server/utils/logger";

export const load: PageServerLoad = async ({ locals }) => {
  const user = requireUser(locals);
  const settings = await getSettings(user.id);
  const steamId = settings.steamId64?.trim() || null;

  if (!steamId) return { steamId: null, snapshot: null, error: null };

  let snapshot = await getLatestSnapshot(user.id);
  let error: string | null = null;

  // First visit with a configured id and no stored snapshot: fetch once.
  if (!snapshot) {
    try {
      const data = await fetchUserGameStats(steamId);
      snapshot = await saveSnapshot(user.id, steamId, data);
    } catch (e) {
      error = e instanceof SteamApiError ? e.message : "Failed to load Steam stats.";
      if (!(e instanceof SteamApiError)) logError("Weapon stats load failed", e);
    }
  }

  return { steamId, snapshot, error };
};

export const actions: Actions = {
  refresh: async ({ locals }) => {
    const user = requireUser(locals);
    const settings = await getSettings(user.id);
    const steamId = settings.steamId64?.trim();
    if (!steamId) return fail(400, { message: "Add your SteamID64 in Settings first." });

    try {
      const data = await fetchUserGameStats(steamId);
      await saveSnapshot(user.id, steamId, data);
      return { refreshed: true };
    } catch (e) {
      if (e instanceof SteamApiError) return fail(502, { message: e.message });
      logError("Weapon stats refresh failed", e);
      return fail(500, { message: "Failed to refresh from Steam." });
    }
  },
};
