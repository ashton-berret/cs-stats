import { randomBytes } from "node:crypto";
import { prisma } from "$lib/server/db/client";

export interface SettingsInput {
  inGameName: string;
  steamId64: string | null;
  parseEngine: string;
  ollamaUrl: string;
  ollamaModel: string;
  ocrResolution: string;
}

export async function getSettings(userId: string) {
  return prisma.userSettings.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
}

export async function updateSettings(userId: string, input: SettingsInput) {
  return prisma.userSettings.upsert({
    where: { userId },
    update: input,
    create: { userId, ...input },
  });
}

/** Returns the user's GSI auth token, generating + persisting one on first use. */
export async function ensureGsiToken(userId: string): Promise<string> {
  const settings = await getSettings(userId);
  if (settings.gsiToken) return settings.gsiToken;
  const token = randomBytes(24).toString("hex");
  await prisma.userSettings.update({ where: { userId }, data: { gsiToken: token } });
  return token;
}

/** Finds the user a GSI payload belongs to by its auth token. */
export async function findUserIdByGsiToken(token: string): Promise<string | null> {
  if (!token) return null;
  const settings = await prisma.userSettings.findFirst({ where: { gsiToken: token }, select: { userId: true } });
  return settings?.userId ?? null;
}
