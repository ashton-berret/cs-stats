import type { Actions, PageServerLoad } from "./$types";
import { fail, redirect } from "@sveltejs/kit";
import { requireUser } from "$lib/server/auth/guard";
import { createMatch } from "$lib/server/db/repositories/match-repository";
import { getSettings } from "$lib/server/db/repositories/settings-repository";
import { defaultMatchFormValues, parseMatchForm } from "$lib/server/utils/match-form";

export const load: PageServerLoad = async ({ locals }) => {
  const user = requireUser(locals);
  const settings = await getSettings(user.id);
  return {
    values: defaultMatchFormValues(settings.inGameName || user.username),
  };
};

export const actions: Actions = {
  save: async ({ request, locals }) => {
    const user = requireUser(locals);
    const parsed = parseMatchForm(await request.formData());

    if (!parsed.ok) {
      return fail(400, {
        message: parsed.message,
        values: parsed.values,
        errors: parsed.errors,
      });
    }

    const match = await createMatch(user.id, parsed.input);
    redirect(302, `/matches/${match.id}`);
  },
};
