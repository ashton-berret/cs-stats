import type { Prisma } from "@prisma/client";
import { prisma } from "$lib/server/db/client";
import type { MatchInput } from "$lib/types/match";

const includeUserStat = {
  stats: {
    where: { isUser: true },
    take: 1,
  },
} satisfies Prisma.MatchInclude;

export type MatchWithUserStat = Prisma.MatchGetPayload<{ include: typeof includeUserStat }>;

export async function listMatches(userId: string): Promise<MatchWithUserStat[]> {
  return prisma.match.findMany({
    where: { userId },
    include: includeUserStat,
    orderBy: { playedAt: "desc" },
  });
}

export async function getMatch(userId: string, matchId: string): Promise<MatchWithUserStat | null> {
  return prisma.match.findFirst({
    where: { id: matchId, userId },
    include: includeUserStat,
  });
}

export async function createMatch(userId: string, input: MatchInput): Promise<MatchWithUserStat> {
  return prisma.match.create({
    data: {
      userId,
      map: input.map,
      mode: input.mode,
      playedAt: input.playedAt,
      teamScore: input.teamScore,
      enemyScore: input.enemyScore,
      result: input.result,
      side: input.side,
      roundsPlayed: input.roundsPlayed,
      durationMinutes: input.durationMinutes,
      notes: input.notes,
      parseSource: input.parseSource,
      stats: {
        create: {
          userId,
          playerName: input.stat.playerName,
          team: input.stat.team,
          isUser: true,
          kills: input.stat.kills,
          deaths: input.stat.deaths,
          assists: input.stat.assists,
          adr: input.stat.adr,
          hsPercent: input.stat.hsPercent,
          mvps: input.stat.mvps,
          hltvRating: input.stat.hltvRating,
          enemiesFlashed: input.stat.enemiesFlashed,
          utilityDamage: input.stat.utilityDamage,
          score: input.stat.score,
        },
      },
    },
    include: includeUserStat,
  });
}

export async function updateMatch(userId: string, matchId: string, input: MatchInput): Promise<MatchWithUserStat | null> {
  const existing = await prisma.match.findFirst({
    where: { id: matchId, userId },
    include: includeUserStat,
  });
  if (!existing) return null;

  const stat = existing.stats[0];

  await prisma.$transaction([
    prisma.match.update({
      where: { id: matchId },
      data: {
        map: input.map,
        mode: input.mode,
        playedAt: input.playedAt,
        teamScore: input.teamScore,
        enemyScore: input.enemyScore,
        result: input.result,
        side: input.side,
        roundsPlayed: input.roundsPlayed,
        durationMinutes: input.durationMinutes,
        notes: input.notes,
        parseSource: input.parseSource,
      },
    }),
    stat
      ? prisma.playerMatchStat.update({
          where: { id: stat.id },
          data: {
            userId,
            playerName: input.stat.playerName,
            team: input.stat.team,
            isUser: true,
            kills: input.stat.kills,
            deaths: input.stat.deaths,
            assists: input.stat.assists,
            adr: input.stat.adr,
            hsPercent: input.stat.hsPercent,
            mvps: input.stat.mvps,
            hltvRating: input.stat.hltvRating,
            enemiesFlashed: input.stat.enemiesFlashed,
            utilityDamage: input.stat.utilityDamage,
            score: input.stat.score,
          },
        })
      : prisma.playerMatchStat.create({
          data: {
            matchId,
            userId,
            playerName: input.stat.playerName,
            team: input.stat.team,
            isUser: true,
            kills: input.stat.kills,
            deaths: input.stat.deaths,
            assists: input.stat.assists,
            adr: input.stat.adr,
            hsPercent: input.stat.hsPercent,
            mvps: input.stat.mvps,
            hltvRating: input.stat.hltvRating,
            enemiesFlashed: input.stat.enemiesFlashed,
            utilityDamage: input.stat.utilityDamage,
            score: input.stat.score,
          },
        }),
  ]);

  return getMatch(userId, matchId);
}

export async function deleteMatch(userId: string, matchId: string): Promise<boolean> {
  const existing = await prisma.match.findFirst({
    where: { id: matchId, userId },
    select: { id: true },
  });
  if (!existing) return false;

  await prisma.match.delete({ where: { id: matchId } });
  return true;
}
