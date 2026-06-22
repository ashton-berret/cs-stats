import sharp from "sharp";
import { createWorker, PSM, type Worker } from "tesseract.js";
import type { ScoreboardImage, ParserContext, ScoreboardParser } from "./parser-interface";
import type { ParsedMatchContext, ParsedPlayerRow, ScoreboardParseResult } from "$lib/types/parsing";
import { getRegions, type OcrCellSpec, type OcrField } from "./ocr-regions";
import { logError } from "$lib/server/utils/logger";

const NUMERIC_WHITELIST = "0123456789.%";

export class OcrParser implements ScoreboardParser {
  readonly engine = "ocr" as const;

  async parse(images: ScoreboardImage[], ctx: ParserContext): Promise<ScoreboardParseResult> {
    const warnings: string[] = [];
    const rawByPage: Record<number, string> = {};
    const regions = getRegions(ctx.ocrResolution);

    if (!regions) {
      return {
        engine: "ocr",
        context: emptyContext(),
        rows: [],
        userRowIndex: null,
        rawByPage,
        warnings: [`No OCR calibration profile for ${ctx.ocrResolution}. Switch engine or enter manually.`],
      };
    }

    if (!regions.verified && regions.warning) warnings.push(regions.warning);

    const rows = createEmptyRows(10);
    const context = emptyContext();
    const worker = await createWorker("eng");

    try {
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.SINGLE_LINE,
        preserve_interword_spaces: "1",
      });

      for (const image of images) {
        const metadata = await sharp(image.buffer).metadata();
        if (metadata.width !== regions.width || metadata.height !== regions.height) {
          warnings.push(
            `Image page ${image.page} is ${metadata.width ?? "unknown"}x${metadata.height ?? "unknown"}; OCR profile expects ${regions.width}x${regions.height}.`,
          );
          continue;
        }

        const cells = regions.cells[normalizePage(image.page)] ?? [];
        const rawCells: Record<string, string> = {};

        for (const cell of cells) {
          const text = await ocrCell(image.buffer, cell, worker).catch((error: unknown) => {
            logError("OCR cell failed", error, { page: image.page, field: cell.field, rowIndex: cell.rowIndex });
            warnings.push(`OCR failed for page ${image.page} ${cell.field}.`);
            return "";
          });

          rawCells[cellKey(cell)] = text;
          applyCell(rows, context, cell, text);
        }

        rawByPage[image.page] = JSON.stringify(rawCells);
      }
    } finally {
      await worker.terminate();
    }

    const parsedRows = rows.filter((row) => hasAnyRowValue(row));
    const userRowIndex = locateUserRow(parsedRows, ctx.inGameName);

    if (!parsedRows.length) warnings.push("OCR read no player rows. Check the resolution profile and image quality.");

    return {
      engine: "ocr",
      context,
      rows: parsedRows,
      userRowIndex,
      rawByPage,
      warnings,
    };
  }
}

async function ocrCell(image: Buffer, cell: OcrCellSpec, worker: Worker): Promise<string> {
  const crop = await sharp(image)
    .extract({ left: cell.box.x, top: cell.box.y, width: cell.box.w, height: cell.box.h })
    .grayscale()
    .normalize()
    .resize({ width: cell.box.w * 3, withoutEnlargement: false })
    .threshold(155)
    .toBuffer();

  await worker.setParameters({
    tessedit_char_whitelist: cell.numeric ? NUMERIC_WHITELIST : "",
  });

  const { data } = await worker.recognize(crop);
  return data.text.trim();
}

function applyCell(rows: ParsedPlayerRow[], context: ParsedMatchContext, cell: OcrCellSpec, text: string): void {
  if (cell.rowIndex === null) {
    applyContextCell(context, cell.field, text);
    return;
  }

  const row = rows[cell.rowIndex];
  if (!row) return;

  switch (cell.field) {
    case "playerName":
      row.playerName = text.trim();
      break;
    case "kills":
    case "deaths":
    case "assists":
    case "mvps":
    case "enemiesFlashed":
    case "utilityDamage":
    case "score":
      row[cell.field] = intOrNull(text);
      break;
    case "adr":
    case "hsPercent":
    case "hltvRating":
      row[cell.field] = floatOrNull(text);
      break;
    default:
      break;
  }
}

function applyContextCell(context: ParsedMatchContext, field: OcrField, text: string): void {
  switch (field) {
    case "map":
      context.map = text.trim() || null;
      break;
    case "teamScore":
      context.teamScore = intOrNull(text);
      break;
    case "enemyScore":
      context.enemyScore = intOrNull(text);
      break;
    case "durationMinutes":
      context.durationMinutes = intOrNull(text);
      break;
    default:
      break;
  }
}

function createEmptyRows(count: number): ParsedPlayerRow[] {
  return Array.from({ length: count }, () => ({
    playerName: "",
    team: null,
    kills: null,
    deaths: null,
    assists: null,
    adr: null,
    hsPercent: null,
    mvps: null,
    hltvRating: null,
    enemiesFlashed: null,
    utilityDamage: null,
    score: null,
  }));
}

function emptyContext(): ParsedMatchContext {
  return {
    map: null,
    teamScore: null,
    enemyScore: null,
    durationMinutes: null,
  };
}

function hasAnyRowValue(row: ParsedPlayerRow): boolean {
  return Boolean(
    row.playerName ||
      row.kills !== null ||
      row.deaths !== null ||
      row.assists !== null ||
      row.adr !== null ||
      row.hsPercent !== null ||
      row.mvps !== null ||
      row.hltvRating !== null ||
      row.enemiesFlashed !== null ||
      row.utilityDamage !== null ||
      row.score !== null,
  );
}

function locateUserRow(rows: ParsedPlayerRow[], inGameName: string): number | null {
  const target = inGameName.trim().toLowerCase();
  if (!target) return null;

  let bestIndex = -1;
  let bestScore = 0;

  rows.forEach((row, index) => {
    const name = row.playerName.trim().toLowerCase();
    if (!name) return;
    const score = name === target ? 1 : name.includes(target) || target.includes(name) ? 0.6 : 0;
    if (score > bestScore) {
      bestIndex = index;
      bestScore = score;
    }
  });

  return bestScore >= 0.6 ? bestIndex : null;
}

function intOrNull(text: string): number | null {
  const normalized = text.replace(/[^0-9]/g, "");
  if (!normalized) return null;
  const value = Number(normalized);
  return Number.isInteger(value) ? value : null;
}

function floatOrNull(text: string): number | null {
  const normalized = text.replace(/[^0-9.]/g, "");
  if (!normalized) return null;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

function normalizePage(page: number): 1 | 2 {
  return page === 2 ? 2 : 1;
}

function cellKey(cell: OcrCellSpec): string {
  return cell.rowIndex === null ? `context.${cell.field}` : `row${cell.rowIndex}.${cell.field}`;
}
