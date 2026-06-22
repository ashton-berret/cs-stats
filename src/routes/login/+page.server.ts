import type { PageServerLoad, Actions } from "./$types";
import { fail, redirect } from "@sveltejs/kit";
import { lucia } from "$lib/server/auth/lucia";
import { verifyPassword } from "$lib/server/auth/password";
import { prisma } from "$lib/server/db/client";
import { logAuth } from "$lib/server/utils/logger";

export const load: PageServerLoad = async ({ locals }) => {
  if (locals.user) redirect(302, "/dashboard");
  return {};
};

export const actions: Actions = {
  default: async ({ request, cookies }) => {
    const formData = await request.formData();
    const username = formData.get("username");
    const password = formData.get("password");

    if (typeof username !== "string" || typeof password !== "string" || !username || !password) {
      return fail(400, { message: "Invalid username or password" });
    }

    const user = await prisma.user.findUnique({ where: { username: username.toLowerCase() } });
    if (!user) {
      logAuth("login_failed", username, { reason: "user_not_found" });
      return fail(400, { message: "Invalid username or password" });
    }

    const validPassword = await verifyPassword(user.passwordHash, password);
    if (!validPassword) {
      logAuth("login_failed", username, { reason: "invalid_password" });
      return fail(400, { message: "Invalid username or password" });
    }

    const session = await lucia.createSession(user.id, {});
    const sessionCookie = lucia.createSessionCookie(session.id);
    cookies.set(sessionCookie.name, sessionCookie.value, {
      path: ".",
      ...sessionCookie.attributes,
    });

    logAuth("login", username, { userId: user.id });
    redirect(302, "/dashboard");
  },
};
