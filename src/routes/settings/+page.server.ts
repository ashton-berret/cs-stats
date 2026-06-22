import type { Actions, PageServerLoad } from "./$types";
import { fail } from "@sveltejs/kit";
import { requireUser } from "$lib/server/auth/guard";
import { getSettings, updateSettings } from "$lib/server/db/repositories/settings-repository";
import { checkVisionHealth } from "$lib/server/services/parsing";
import { getOcrResolutionKeys } from "$lib/server/services/parsing/ocr-regions";
import { logError } from "$lib/server/utils/logger";

const PARSE_ENGINES = ["vision", "ocr", "manual"];

export const load: PageServerLoad = async ({ locals }) => {
  const user = requireUser(locals);
  const settings = await getSettings(user.id);
  return {
    settings: {
      inGameName: settings.inGameName,
      parseEngine: settings.parseEngine,
      ollamaUrl: settings.ollamaUrl,
      ollamaModel: settings.ollamaModel,
      ocrResolution: settings.ocrResolution,
    },
    ocrResolutions: getOcrResolutionKeys(),
  };
};

export const actions: Actions = {
  save: async ({ request, locals }) => {
    const user = requireUser(locals);
    const form = await request.formData();

    const input = {
      inGameName: str(form.get("inGameName")),
      parseEngine: PARSE_ENGINES.includes(str(form.get("parseEngine"))) ? str(form.get("parseEngine")) : "vision",
      ollamaUrl: str(form.get("ollamaUrl")) || "http://localhost:11434",
      ollamaModel: str(form.get("ollamaModel")) || "qwen3-vl:8b",
      ocrResolution: str(form.get("ocrResolution")) || "1920x1080",
    };

    try {
      await updateSettings(user.id, input);
    } catch (error) {
      logError("Failed to save settings", error);
      return fail(500, { saved: false, message: "Could not save settings." });
    }

    return { saved: true, message: "Settings saved." };
  },

  testConnection: async ({ request, locals }) => {
    requireUser(locals);
    const form = await request.formData();
    const url = str(form.get("ollamaUrl")) || "http://localhost:11434";
    const health = await checkVisionHealth(url);
    return { tested: true, ...health };
  },
};

function str(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}
