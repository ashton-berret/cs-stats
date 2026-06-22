import { prisma } from "$lib/server/db/client";

export interface SettingsInput {
  inGameName: string;
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
