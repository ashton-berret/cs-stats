import type { ScoreboardParseResult } from "$lib/types/parsing";

export interface ScoreboardImage {
  page: number;
  buffer: Buffer;
  mime: string;
}

export interface ParserContext {
  inGameName: string;
  ocrResolution: string;
  ollamaUrl: string;
  ollamaModel: string;
}

export interface ScoreboardParser {
  readonly engine: "vision" | "ocr";
  parse(images: ScoreboardImage[], ctx: ParserContext): Promise<ScoreboardParseResult>;
}
