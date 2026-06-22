import type { PageServerLoad, Actions } from "./$types";
import { fail, redirect } from "@sveltejs/kit";
import { lucia } from "$lib/server/auth/lucia";
import { hashPassword, validatePassword, validateUsername } from "$lib/server/auth/password";
import { prisma } from "$lib/server/db/client";
import { logAuth, logError } from "$lib/server/utils/logger";

export const load: PageServerLoad = async ({ locals }) => {
  if (locals.user) redirect(302, "/dashboard");
  return {};
};

export const actions: Actions = {
  default: async ({ request, cookies }) => {
    const formData = await request.formData();
    const username = formData.get("username");
    const password = formData.get("password");
    const confirmPassword = formData.get("confirmPassword");

    if (
      typeof username !== "string" ||
      typeof password !== "string" ||
      typeof confirmPassword !== "string"
    ) {
      return fail(400, { message: "Invalid form data" });
    }

    const usernameValidation = validateUsername(username);
    if (!usernameValidation.valid) return fail(400, { message: usernameValidation.errors[0] });

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) return fail(400, { message: passwordValidation.errors[0] });

    if (password !== confirmPassword) return fail(400, { message: "Passwords do not match" });

    const existingUser = await prisma.user.findUnique({ where: { username: username.toLowerCase() } });
    if (existingUser) return fail(400, { message: "Username already taken" });

    const passwordHash = await hashPassword(password);

    let user;
    try {
      user = await prisma.user.create({
        data: {
          username: username.toLowerCase(),
          passwordHash,
        },
      });
    } catch (error) {
      logError("Registration failed", error, { username: username.toLowerCase() });
      return fail(500, { message: "An error occurred during registration" });
    }

    const session = await lucia.createSession(user.id, {});
    const sessionCookie = lucia.createSessionCookie(session.id);
    cookies.set(sessionCookie.name, sessionCookie.value, {
      path: ".",
      ...sessionCookie.attributes,
    });

    logAuth("register", username.toLowerCase(), { userId: user.id });
    redirect(302, "/dashboard");
  },
};
