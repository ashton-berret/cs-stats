import type { ParsedPlayerRow } from "$lib/types/parsing";

export type OcrField = keyof ParsedPlayerRow | "map" | "teamScore" | "enemyScore" | "durationMinutes";

export interface OcrBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface OcrCellSpec {
  page: 1 | 2;
  rowIndex: number | null;
  field: OcrField;
  box: OcrBox;
  numeric: boolean;
}

export interface OcrRegionProfile {
  resolution: string;
  width: number;
  height: number;
  verified: boolean;
  warning?: string;
  cells: Record<1 | 2, OcrCellSpec[]>;
}

const rowYs = [316, 374, 432, 490, 548, 636, 694, 752, 810, 868];

const page1Columns = {
  playerName: { x: 410, w: 300, numeric: false },
  kills: { x: 900, w: 70, numeric: true },
  assists: { x: 980, w: 70, numeric: true },
  deaths: { x: 1060, w: 70, numeric: true },
  adr: { x: 1150, w: 90, numeric: true },
  score: { x: 1310, w: 110, numeric: true },
};

const page2Columns = {
  playerName: { x: 410, w: 300, numeric: false },
  hsPercent: { x: 900, w: 90, numeric: true },
  mvps: { x: 1010, w: 80, numeric: true },
  hltvRating: { x: 1110, w: 90, numeric: true },
  enemiesFlashed: { x: 1230, w: 90, numeric: true },
  utilityDamage: { x: 1340, w: 110, numeric: true },
};

const headerCells: OcrCellSpec[] = [
  { page: 1, rowIndex: null, field: "map", box: { x: 780, y: 112, w: 360, h: 48 }, numeric: false },
  { page: 1, rowIndex: null, field: "teamScore", box: { x: 790, y: 180, w: 90, h: 56 }, numeric: true },
  { page: 1, rowIndex: null, field: "enemyScore", box: { x: 1040, y: 180, w: 90, h: 56 }, numeric: true },
];

export const OCR_REGION_PROFILES: Record<string, OcrRegionProfile> = {
  "1920x1080": {
    resolution: "1920x1080",
    width: 1920,
    height: 1080,
    verified: false,
    warning:
      "The 1920x1080 OCR profile is a draft scaffold and must be verified against a real CS2 scoreboard screenshot before relying on parsed values.",
    cells: {
      1: [...headerCells, ...buildRowCells(1, page1Columns)],
      2: buildRowCells(2, page2Columns),
    },
  },
};

export function getRegions(resolution: string): OcrRegionProfile | null {
  return OCR_REGION_PROFILES[resolution] ?? null;
}

export function getOcrResolutionKeys(): string[] {
  return Object.keys(OCR_REGION_PROFILES);
}

function buildRowCells(
  page: 1 | 2,
  columns: Record<string, { x: number; w: number; numeric: boolean }>,
): OcrCellSpec[] {
  return rowYs.flatMap((y, rowIndex) =>
    Object.entries(columns).map(([field, column]) => ({
      page,
      rowIndex,
      field: field as OcrField,
      box: { x: column.x, y, w: column.w, h: 36 },
      numeric: column.numeric,
    })),
  );
}
