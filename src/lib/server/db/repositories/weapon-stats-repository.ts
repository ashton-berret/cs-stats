import { prisma } from "$lib/server/db/client";
import type { NormalizedWeaponStats, WeaponStatsSnapshot } from "$lib/types/weapons";

export async function getLatestSnapshot(userId: string): Promise<WeaponStatsSnapshot | null> {
  const row = await prisma.weaponStatSnapshot.findFirst({
    where: { userId },
    orderBy: { capturedAt: "desc" },
  });
  if (!row) return null;
  return hydrate(row.payload, row.capturedAt, row.steamId64);
}

export async function saveSnapshot(
  userId: string,
  steamId64: string,
  data: NormalizedWeaponStats,
): Promise<WeaponStatsSnapshot> {
  const row = await prisma.weaponStatSnapshot.create({
    data: { userId, steamId64, payload: JSON.stringify(data) },
  });
  return hydrate(row.payload, row.capturedAt, row.steamId64);
}

function hydrate(payload: string, capturedAt: Date, steamId64: string): WeaponStatsSnapshot {
  const data = JSON.parse(payload) as NormalizedWeaponStats;
  return { ...data, capturedAt: capturedAt.toISOString(), steamId64 };
}
