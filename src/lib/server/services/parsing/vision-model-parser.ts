import type { ParsedPlayerRow, ScoreboardParseResult, Team } from "$lib/types/parsing";
import { logger, logError } from "$lib/server/utils/logger";
import type { ParserContext, ScoreboardImage, ScoreboardParser } from "./parser-interface";
import { locateUserRow, reconcileRows } from "./merge";
import sharp from "sharp";

// Generous: a cold model load + a contended GPU (e.g. CS2 still running) can push a single
// page well past two minutes. Better to wait than to hard-fail the whole parse.
const OLLAMA_TIMEOUT_MS = 240_000;
const MAX_VISION_WIDTH = 1400;
const MAX_VISION_HEIGHT = 800;

const PAGE1_PROMPT = `You are reading a cropped Counter-Strike 2 Casual scoreboard screenshot.
This is scoreboard page 1. It shows:
- top-left mode and map, like "Casual | Cache"
- left side team scores
- player rows grouped by team
- columns: Kills, Deaths, Assists, MVPs, Score

Return ONLY valid JSON with this exact shape:
{
  "map": string|null,
  "userTeamScore": number|null,
  "enemyTeamScore": number|null,
  "row": {
    "playerName": string,
    "team": "OWN"|"ENEMY"|null,
    "kills": number|null,
    "deaths": number|null,
    "assists": number|null,
    "mvps": number|null,
    "score": number|null
  }
}

Return only the row for the target player name supplied below. Team is relative to the target player name; use "OWN" for the target player's row.
The small numbers at far left beside player rows are ping values. Do not use ping as a stat.
Do not invent unreadable values; use null.`;

const PAGE2_PROMPT = `You are reading a cropped Counter-Strike 2 Casual scoreboard screenshot.
This is scoreboard page 2. It shows the same player rows in the same order as page 1.
Columns are: HS%, KDR, ADR, UD, EF, Score.

Return ONLY valid JSON with this exact shape:
{
  "row": {
    "playerName": string,
    "hsPercent": number|null,
    "adr": number|null,
    "utilityDamage": number|null,
    "enemiesFlashed": number|null,
    "score": number|null
  }
}

Return only the row for the target player name supplied below.
Ignore KDR because it is derived from kills/deaths. There is no HLTV rating on this scoreboard.
The small numbers at far left beside player rows are ping values. Do not use ping as a stat.
Do not invent unreadable values; use null.`;

export class VisionModelParser implements ScoreboardParser {
  readonly engine = "vision" as const;

  async parse(images: ScoreboardImage[], ctx: ParserContext): Promise<ScoreboardParseResult> {
    const warnings: string[] = [];
    const rawByPage: Record<number, string> = {};
    const page1 = images.find((image) => image.page === 1);
    const page2 = images.find((image) => image.page === 2);
    const rows: Partial<ParsedPlayerRow>[] = [];
    let page1Failed = false;

    let context: ScoreboardParseResult["context"] = {
      map: null,
      teamScore: null,
      enemyScore: null,
      durationMinutes: null,
    };

    if (!page1) warnings.push("Upload page 1 to parse kills, deaths, assists, MVPs, score, and match result.");

    if (page1) {
      try {
        logger.info("Vision parse page started", { page: 1 });
        const pageStartedAt = Date.now();
        const raw = await callOllama(ctx, `${PAGE1_PROMPT}\n\nTarget player name: ${ctx.inGameName || "(unknown)"}`, page1);
        logger.info("Vision parse page complete", { page: 1, elapsedMs: Date.now() - pageStartedAt });
        rawByPage[1] = raw;
        const parsed = parseJsonObject(raw);
        context = {
          map: stringOrNull(readProperty(parsed, "map")),
          teamScore: numberOrNull(readProperty(parsed, "userTeamScore")),
          enemyScore: numberOrNull(readProperty(parsed, "enemyTeamScore")),
          durationMinutes: null,
        };

        const row = firstRow(parsed);
        if (row) rows.push(parsePage1Row(row));
      } catch (error) {
        page1Failed = true;
        logError("Vision parse page 1 failed", error);
        warnings.push(`Could not parse the basic scoreboard page: ${parseErrorMessage(error)}.`);
      }
    }

    if (page2 && !page1Failed) {
      try {
        logger.info("Vision parse page started", { page: 2 });
        const pageStartedAt = Date.now();
        let raw = await callOllama(ctx, buildPage2Prompt(ctx), page2);
        rawByPage[2] = raw;
        let parsed = parseJsonObject(raw);

        if (!firstRow(parsed) && ctx.inGameName) {
          logger.info("Vision parse page retrying empty result", { page: 2, elapsedMs: Date.now() - pageStartedAt });
          raw = await callOllama(ctx, buildPage2RetryPrompt(ctx), page2);
          rawByPage[2] = raw;
          parsed = parseJsonObject(raw);
        }
        logger.info("Vision parse page complete", { page: 2, elapsedMs: Date.now() - pageStartedAt });

        const row = firstRow(parsed);
        if (row) {
          const target = rows[0] ?? (rows[0] = {});
          if (!target.playerName) target.playerName = stringOrEmpty(readProperty(row, "playerName"));
          target.hsPercent = numberFromAliases(row, ["hsPercent", "HS%", "HS", "hs", "headshotPercent"]);
          target.adr = numberFromAliases(row, ["adr", "ADR"]);
          target.utilityDamage = numberFromAliases(row, ["utilityDamage", "UD", "ud"]);
          target.enemiesFlashed = numberFromAliases(row, ["enemiesFlashed", "EF", "ef"]);
          target.score = target.score ?? numberFromAliases(row, ["score", "Score"]);
          target.hltvRating = null;
        }
      } catch (error) {
        logError("Vision parse page 2 failed", error);
        warnings.push(`Could not parse the detailed scoreboard page: ${parseErrorMessage(error)}.`);
      }
    } else if (page2 && page1Failed) {
      warnings.push("Skipped the detailed scoreboard page because the basic page did not parse.");
    }

    const normalizedRows = reconcileRows(rows.map(normalizeRow));
    const userRowIndex = locateUserRow(normalizedRows, ctx.inGameName);
    if (userRowIndex === null && ctx.inGameName) warnings.push(`Could not confidently locate "${ctx.inGameName}" in the parsed rows.`);

    logger.info("Vision parse complete", { rows: normalizedRows.length, userRowIndex });

    return {
      engine: "vision",
      context,
      rows: normalizedRows,
      userRowIndex,
      rawByPage,
      warnings,
    };
  }
}

function parsePage1Row(row: Record<string, unknown>): Partial<ParsedPlayerRow> {
  return {
    playerName: stringOrEmpty(readProperty(row, "playerName")),
    team: teamOrNull(readProperty(row, "team")),
    kills: numberFromAliases(row, ["kills", "Kills", "K"]),
    deaths: numberFromAliases(row, ["deaths", "Deaths", "D"]),
    assists: numberFromAliases(row, ["assists", "Assists", "A"]),
    mvps: numberFromAliases(row, ["mvps", "MVPs", "MVP"]),
    score: numberFromAliases(row, ["score", "Score"]),
  };
}

function buildPage2Prompt(ctx: ParserContext): string {
  return `${PAGE2_PROMPT}

Target player name: ${ctx.inGameName || "(unknown)"}
Find that exact player row on page 2.`;
}

function buildPage2RetryPrompt(ctx: ParserContext): string {
  return `${PAGE2_PROMPT}

The previous response omitted the row. Read the screenshot again and return only the target player's page 2 stats.
Target player name: ${ctx.inGameName}

For the target row, read HS%, ADR, UD, EF, and Score from the visible columns. Return null only for values that are truly unreadable.`;
}

async function callOllama(ctx: ParserContext, prompt: string, image: ScoreboardImage): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT_MS);
  const preparedImage = await prepareImageForVision(image);

  let res: Response;
  try {
    res = await fetch(`${ctx.ollamaUrl.replace(/\/$/, "")}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model: ctx.ollamaModel,
        stream: false,
        format: "json",
        // qwen3-vl is a hybrid reasoning model: by default it emits a long <think> block whose
        // tokens count against num_predict, starving the JSON content (done_reason=length, empty
        // content → "Model did not return JSON"). Disable thinking and keep a generous budget so
        // any residual reasoning can never crowd out the structured output.
        think: false,
        options: { temperature: 0, num_predict: 1024 },
        messages: [
          {
            role: "user",
            content: prompt,
            images: [preparedImage.toString("base64")],
          },
        ],
      }),
    });
  } catch (error) {
    if (controller.signal.aborted) throw new Error(`Ollama request timed out after ${OLLAMA_TIMEOUT_MS / 1000}s`);
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) throw new Error(`Ollama responded ${res.status}: ${await res.text()}`);
  const data: unknown = await res.json();
  const message = readProperty(readObject(data), "message");
  return stringOrEmpty(readProperty(readObject(message), "content"));
}

async function prepareImageForVision(image: ScoreboardImage): Promise<Buffer> {
  const prepared = await sharp(image.buffer)
    .resize({
      width: MAX_VISION_WIDTH,
      height: MAX_VISION_HEIGHT,
      fit: "inside",
      withoutEnlargement: true,
    })
    // JPEG keeps the payload small (PNG re-encoding actually inflated screenshots); quality 88
    // preserves scoreboard text fine for the vision model.
    .jpeg({ quality: 88 })
    .toBuffer();

  logger.info("Vision image prepared", {
    page: image.page,
    originalBytes: image.buffer.byteLength,
    preparedBytes: prepared.byteLength,
  });

  return prepared;
}

function parseErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) return "unknown parser error";
  if (error.message.includes("timed out")) {
    return `${error.message} — the model may be loading, the image may be too large, or the GPU is busy. Close CS2, use a tightly cropped scoreboard, or switch to OCR in Settings`;
  }
  if (error.message.includes("fetch failed")) return "Ollama request failed";
  return error.message || "unknown parser error";
}

function normalizeRow(row: Partial<ParsedPlayerRow>): ParsedPlayerRow {
  return {
    playerName: row.playerName ?? "",
    team: row.team ?? null,
    kills: row.kills ?? null,
    deaths: row.deaths ?? null,
    assists: row.assists ?? null,
    adr: row.adr ?? null,
    hsPercent: row.hsPercent ?? null,
    mvps: row.mvps ?? null,
    hltvRating: null,
    enemiesFlashed: row.enemiesFlashed ?? null,
    utilityDamage: row.utilityDamage ?? null,
    score: row.score ?? null,
  };
}

function parseJsonObject(raw: string): Record<string, unknown> {
  const candidate = extractJsonObject(raw);
  const repaired = repairJson(candidate);

  try {
    return readObject(JSON.parse(candidate));
  } catch (error) {
    if (repaired !== candidate) {
      try {
        return readObject(JSON.parse(repaired));
      } catch {
        // Report the original parse failure below; it usually points closest to the model's mistake.
      }
    }

    throw error;
  }
}

function extractJsonObject(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return trimmed;

  const match = trimmed.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Model did not return JSON");
  return match[0];
}

function repairJson(json: string): string {
  return json
    .replace(/}\s*{/g, "},{")
    .replace(/]\s*"([A-Za-z0-9_]+)"\s*:/g, '],"$1":')
    .replace(/,\s*([}\]])/g, "$1");
}

function readObject(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function readProperty(value: unknown, key: string): unknown {
  return readObject(value)[key];
}

function arrayProperty(value: unknown, key: string): Record<string, unknown>[] {
  const rows = readProperty(value, key);
  if (!Array.isArray(rows)) return [];
  return rows.map(readObject);
}

function firstRow(value: Record<string, unknown>): Record<string, unknown> | null {
  const row = readObject(readProperty(value, "row"));
  if (Object.keys(row).length > 0) return row;
  return arrayProperty(value, "rows")[0] ?? null;
}

function stringOrEmpty(value: unknown): string {
  return typeof value === "string" ? value.trim() : value === null || value === undefined ? "" : String(value).trim();
}

function stringOrNull(value: unknown): string | null {
  const text = stringOrEmpty(value);
  return text || null;
}

function numberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const number = typeof value === "string" ? Number(value.replace("%", "")) : Number(value);
  return Number.isFinite(number) ? number : null;
}

function numberFromAliases(row: Record<string, unknown>, aliases: string[]): number | null {
  for (const alias of aliases) {
    const value = numberOrNull(row[alias]);
    if (value !== null) return value;
  }
  return null;
}

function teamOrNull(value: unknown): Team | null {
  return value === "OWN" || value === "ENEMY" ? value : null;
}
