import type { Actions, PageServerLoad } from "./$types";
import { fail, redirect } from "@sveltejs/kit";
import { requireUser } from "$lib/server/auth/guard";
import { createMatch } from "$lib/server/db/repositories/match-repository";
import { getSettings } from "$lib/server/db/repositories/settings-repository";
import { defaultMatchFormValues, parseMatchForm } from "$lib/server/utils/match-form";
import { getParserForSettings } from "$lib/server/services/parsing";
import type { ScoreboardImage } from "$lib/server/services/parsing";
import type { MatchFormValues } from "$lib/types/match";
import type { ScoreboardParseResult } from "$lib/types/parsing";
import { collectScreenshotPayloads, saveScreenshotFromDataUrl } from "$lib/server/services/storage/screenshot-store";
import { logger, logError } from "$lib/server/utils/logger";

export const load: PageServerLoad = async ({ locals }) => {
  const user = requireUser(locals);
  const settings = await getSettings(user.id);
  const playerName = settings.inGameName || user.username;
  return {
    playerName,
    values: defaultMatchFormValues(playerName),
  };
};

export const actions: Actions = {
  parse: async ({ request, locals }) => {
    const user = requireUser(locals);
    const settings = await getSettings(user.id);
    const formData = await request.formData();
    const images = await collectImages(formData);
    const playerName = parsePlayerName(formData) || settings.inGameName || user.username;

    if (!images.length) {
      return fail(400, {
        message: "Upload at least the first scoreboard page.",
        playerName,
        values: defaultMatchFormValues(playerName),
        errors: {},
        hiddenFields: [],
        warnings: [],
      });
    }

    const parser = getParserForSettings(settings);
    const startedAt = Date.now();
    logger.info("Scoreboard parse requested", {
      engine: parser.engine,
      imagePages: images.map((image) => image.page),
      imageBytes: images.reduce((total, image) => total + image.buffer.byteLength, 0),
      userId: user.id,
    });

    let parsed: ScoreboardParseResult;
    try {
      parsed = await parser.parse(images, {
        inGameName: playerName,
        ocrResolution: settings.ocrResolution,
        ollamaUrl: settings.ollamaUrl,
        ollamaModel: settings.ollamaModel,
      });
    } catch (error) {
      logError("Scoreboard parse failed", error, { engine: parser.engine, userId: user.id, elapsedMs: Date.now() - startedAt });
      return fail(500, {
        message: "Parsing failed. Check Ollama and try again, or enter the match manually.",
        playerName,
        values: defaultMatchFormValues(playerName),
        errors: {},
        hiddenFields: [],
        warnings: ["Parsing did not complete."],
      });
    }

    logger.info("Scoreboard parse action complete", {
      engine: parsed.engine,
      rows: parsed.rows.length,
      userRowIndex: parsed.userRowIndex,
      warningCount: parsed.warnings.length,
      elapsedMs: Date.now() - startedAt,
      userId: user.id,
    });

    return {
      message: parsed.warnings.length ? "Review the parsed values before saving." : "",
      playerName,
      values: valuesFromParse(parsed, playerName),
      errors: {},
      hiddenFields: await hiddenFieldsForImages(images, parsed),
      warnings: parsed.warnings,
    };
  },
  save: async ({ request, locals }) => {
    const user = requireUser(locals);
    const formData = await request.formData();
    const screenshotPayloads = collectScreenshotPayloads(formData);
    const parsed = parseMatchForm(formData);

    if (!parsed.ok) {
      return fail(400, {
        message: parsed.message,
        values: parsed.values,
        errors: parsed.errors,
        hiddenFields: hiddenFieldsFromFormData(formData),
        warnings: [],
      });
    }

    const match = await createMatch(user.id, parsed.input);
    for (const payload of screenshotPayloads) {
      await saveScreenshotFromDataUrl(user.id, match.id, payload);
    }
    redirect(302, `/matches/${match.id}`);
  },
};

async function collectImages(formData: FormData): Promise<ScoreboardImage[]> {
  const images: ScoreboardImage[] = [];

  for (const page of [1, 2]) {
    const file = formData.get(`page${page}`);
    if (file instanceof File && file.size > 0) {
      images.push({
        page,
        buffer: Buffer.from(await file.arrayBuffer()),
        mime: file.type || "image/png",
      });
    }
  }

  return images;
}

function parsePlayerName(formData: FormData): string {
  const value = formData.get("parsePlayerName");
  return typeof value === "string" ? value.trim() : "";
}

function valuesFromParse(parsed: ScoreboardParseResult, fallbackPlayerName: string): MatchFormValues {
  const row = parsed.userRowIndex === null ? parsed.rows[0] : parsed.rows[parsed.userRowIndex];
  const teamScore = parsed.context.teamScore;
  const enemyScore = parsed.context.enemyScore;

  return {
    ...defaultMatchFormValues(row?.playerName || fallbackPlayerName),
    map: parsed.context.map ?? "",
    teamScore: stringOrEmpty(teamScore),
    enemyScore: stringOrEmpty(enemyScore),
    result: inferResult(teamScore, enemyScore),
    durationMinutes: stringOrEmpty(parsed.context.durationMinutes),
    parseSource: parsed.engine,
    playerName: row?.playerName || fallbackPlayerName,
    team: row?.team ?? "OWN",
    kills: stringOrZero(row?.kills),
    deaths: stringOrZero(row?.deaths),
    assists: stringOrZero(row?.assists),
    adr: stringOrEmpty(row?.adr),
    hsPercent: stringOrEmpty(row?.hsPercent),
    mvps: stringOrEmpty(row?.mvps),
    hltvRating: "",
    enemiesFlashed: stringOrEmpty(row?.enemiesFlashed),
    utilityDamage: stringOrEmpty(row?.utilityDamage),
    score: stringOrEmpty(row?.score),
  };
}

async function hiddenFieldsForImages(images: ScoreboardImage[], parsed: ScoreboardParseResult): Promise<{ name: string; value: string }[]> {
  const fields: { name: string; value: string }[] = [];
  for (const image of images) {
    fields.push({
      name: `screenshotPage${image.page}`,
      value: `data:${image.mime};base64,${image.buffer.toString("base64")}`,
    });
    fields.push({
      name: `parsedRawPage${image.page}`,
      value: parsed.rawByPage[image.page] ?? "",
    });
  }
  return fields;
}

function hiddenFieldsFromFormData(formData: FormData): { name: string; value: string }[] {
  return [1, 2].flatMap((page) => {
    const screenshot = formData.get(`screenshotPage${page}`);
    const parsedRaw = formData.get(`parsedRawPage${page}`);
    const fields: { name: string; value: string }[] = [];
    if (typeof screenshot === "string" && screenshot) fields.push({ name: `screenshotPage${page}`, value: screenshot });
    if (typeof parsedRaw === "string" && parsedRaw) fields.push({ name: `parsedRawPage${page}`, value: parsedRaw });
    return fields;
  });
}

function inferResult(teamScore: number | null, enemyScore: number | null): "WIN" | "LOSS" | "TIE" {
  if (teamScore === null || enemyScore === null) return "WIN";
  if (teamScore > enemyScore) return "WIN";
  if (teamScore < enemyScore) return "LOSS";
  return "TIE";
}

function stringOrZero(value: number | null | undefined): string {
  return value === null || value === undefined ? "0" : String(value);
}

function stringOrEmpty(value: number | null | undefined): string {
  return value === null || value === undefined ? "" : String(value);
}
