import type { PageServerLoad, Actions } from "./$types";
import { redirect } from "@sveltejs/kit";
import { lucia } from "$lib/server/auth/lucia";
import { logAuth } from "$lib/server/utils/logger";

export const load: PageServerLoad = async () => {
  redirect(302, "/dashboard");
};

export const actions: Actions = {
  default: async ({ locals, cookies }) => {
    if (!locals.session) redirect(302, "/login");

    const username = locals.user?.username ?? "unknown";
    const userId = locals.user?.id;

    await lucia.invalidateSession(locals.session.id);
    const sessionCookie = lucia.createBlankSessionCookie();
    cookies.set(sessionCookie.name, sessionCookie.value, {
      path: ".",
      ...sessionCookie.attributes,
    });

    logAuth("logout", username, { userId });
    redirect(302, "/login");
  },
};
