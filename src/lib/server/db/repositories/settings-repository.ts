import { prisma } from "$lib/server/db/client";

export async function getSettings(userId: string) {
  return prisma.userSettings.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
}
