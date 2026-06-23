import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { addMatchScreenshot, type MatchScreenshotInput } from "$lib/server/db/repositories/match-repository";

const UPLOAD_ROOT = path.resolve("data", "uploads");

export interface ScreenshotPayload {
  page: number;
  dataUrl: string;
  parsedRaw: string | null;
}

export async function saveScreenshotFromDataUrl(userId: string, matchId: string, payload: ScreenshotPayload) {
  const prepared = await prepareScreenshotFromDataUrl(userId, payload);
  if (!prepared) return null;
  return addMatchScreenshot(matchId, prepared);
}

export async function prepareScreenshotFromDataUrl(userId: string, payload: ScreenshotPayload): Promise<MatchScreenshotInput | null> {
  const decoded = decodeDataUrl(payload.dataUrl);
  if (!decoded) return null;

  const extension = extensionFromMime(decoded.mime);
  const relativePath = path.join("data", "uploads", userId, `${crypto.randomUUID()}.${extension}`);
  const absolutePath = path.resolve(relativePath);

  const userDir = path.join(UPLOAD_ROOT, userId);
  await mkdir(userDir, { recursive: true });
  await writeFile(absolutePath, decoded.buffer);

  const metadata = await sharp(decoded.buffer).metadata();

  return {
    page: payload.page,
    storagePath: relativePath.replaceAll("\\", "/"),
    width: metadata.width ?? null,
    height: metadata.height ?? null,
    parsedRaw: payload.parsedRaw,
  };
}

export function collectScreenshotPayloads(formData: FormData): ScreenshotPayload[] {
  return [1, 2]
    .map((page) => {
      const dataUrl = formData.get(`screenshotPage${page}`);
      const parsedRaw = formData.get(`parsedRawPage${page}`);
      if (typeof dataUrl !== "string" || !dataUrl) return null;
      return {
        page,
        dataUrl,
        parsedRaw: typeof parsedRaw === "string" && parsedRaw ? parsedRaw : null,
      };
    })
    .filter((payload): payload is ScreenshotPayload => payload !== null);
}

function decodeDataUrl(dataUrl: string): { mime: string; buffer: Buffer } | null {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return {
    mime: match[1],
    buffer: Buffer.from(match[2], "base64"),
  };
}

function extensionFromMime(mime: string): string {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/webp") return "webp";
  return "png";
}
