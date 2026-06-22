import type { PageServerLoad } from "./$types";
import { redirect } from "@sveltejs/kit";

export const load: PageServerLoad = async ({ locals }) => {
  if (locals.user) {
    redirect(302, "/dashboard");
  }
  redirect(302, "/login");
};
