import { OcrParser } from "./ocr-parser";
import type { ParserContext, ScoreboardImage, ScoreboardParser } from "./parser-interface";
import { VisionModelParser } from "./vision-model-parser";

interface ParserSettings {
  parseEngine: string;
}

export function getParser(engine: string): ScoreboardParser {
  if (engine === "ocr") return new OcrParser();
  return new VisionModelParser();
}

export function getParserForSettings(settings: ParserSettings): ScoreboardParser {
  return getParser(settings.parseEngine);
}

export async function checkVisionHealth(url: string): Promise<{ ok: boolean; models: string[]; error?: string }> {
  try {
    const res = await fetch(`${url.replace(/\/$/, "")}/api/tags`);
    if (!res.ok) return { ok: false, models: [], error: `Ollama responded ${res.status}` };
    const data = (await res.json()) as { models?: { name?: string }[] };
    return { ok: true, models: (data.models ?? []).map((model) => model.name).filter((name): name is string => Boolean(name)) };
  } catch (error) {
    return { ok: false, models: [], error: error instanceof Error ? error.message : "Ollama is not reachable" };
  }
}

export { OcrParser, VisionModelParser };
export type { ParserContext, ScoreboardImage, ScoreboardParser };
