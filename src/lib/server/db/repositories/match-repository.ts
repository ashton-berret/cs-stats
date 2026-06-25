import type { Prisma } from "@prisma/client";
import { prisma } from "$lib/server/db/client";
import { mergeMatchInputs } from "$lib/server/services/matching/match-dedup";
import { normalizeMode } from "$lib/config/modes";
import type { MatchInput, MatchSummary, PendingReview } from "$lib/types/match";
import type { ParseEngine, Team } from "$lib/types/parsing";

const includeUserStat = {
  stats: {
    where: { isUser: true },
    take: 1,
  },
} satisfies Prisma.MatchInclude;

export type MatchWithUserStat = Prisma.MatchGetPayload<{ include: typeof includeUserStat }>;

export interface MatchScreenshotInput {
  page: number;
  storagePath: string;
  width: number | null;
  height: number | null;
  parsedRaw: string | null;
}

export async function listMatches(userId: string): Promise<MatchWithUserStat[]> {
  return prisma.match.findMany({
    where: { userId },
    include: includeUserStat,
    orderBy: { playedAt: "desc" },
  });
}

/**
 * GSI-captured matches whose user stat row is still missing ADR — the canonical signal that the
 * manual post-match stats (ADR/HS%/UD/flashes, none of which GSI can read) haven't been entered yet.
 * Powers the "new match needs your stats" prompt on the dashboard.
 */
export async function listPendingGsiReviews(userId: string): Promise<PendingReview[]> {
  const matches = await prisma.match.findMany({
    where: { userId, parseSource: "gsi", stats: { some: { isUser: true, adr: null } } },
    orderBy: { playedAt: "desc" },
  });
  return matches.map((m) => ({
    id: m.id,
    map: m.map,
    mode: m.mode,
    playedAt: m.playedAt.toISOString(),
    result: m.result === "LOSS" || m.result === "TIE" ? m.result : "WIN",
    teamScore: m.teamScore,
    enemyScore: m.enemyScore,
  }));
}

export async function getMatch(userId: string, matchId: string): Promise<MatchWithUserStat | null> {
  return prisma.match.findFirst({
    where: { id: matchId, userId },
    include: includeUserStat,
  });
}

export async function findRecentMatchesForDedup(userId: string, around: Date, windowMin = 120): Promise<MatchWithUserStat[]> {
  const windowMs = windowMin * 60_000;
  return prisma.match.findMany({
    where: {
      userId,
      playedAt: {
        gte: new Date(around.getTime() - windowMs),
        lte: new Date(around.getTime() + windowMs),
      },
    },
    include: includeUserStat,
    orderBy: { playedAt: "desc" },
  });
}

export async function createMatch(userId: string, input: MatchInput): Promise<MatchWithUserStat> {
  return prisma.match.create({
    data: {
      userId,
      map: input.map,
      mode: normalizeMode(input.mode),
      playedAt: input.playedAt,
      teamScore: input.teamScore,
      enemyScore: input.enemyScore,
      result: input.result,
      side: input.side,
      roundsPlayed: input.roundsPlayed,
      roundsJson: input.roundsJson,
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

/** The four post-match scoreboard stats GSI can't read; entered via the dashboard review modal. */
export interface ManualStatsInput {
  adr: number | null;
  hsPercent: number | null;
  utilityDamage: number | null;
  enemiesFlashed: number | null;
}

/**
 * Patches just the manually-entered stats onto a match's user stat row, leaving everything GSI
 * captured (kills/deaths/rounds/timeline) untouched. Returns false if the match isn't the user's.
 */
export async function updateManualStats(userId: string, matchId: string, input: ManualStatsInput): Promise<boolean> {
  const match = await prisma.match.findFirst({ where: { id: matchId, userId }, include: includeUserStat });
  const stat = match?.stats[0];
  if (!stat) return false;
  await prisma.playerMatchStat.update({
    where: { id: stat.id },
    data: {
      adr: input.adr,
      hsPercent: input.hsPercent,
      utilityDamage: input.utilityDamage,
      enemiesFlashed: input.enemiesFlashed,
    },
  });
  return true;
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
        mode: normalizeMode(input.mode),
        playedAt: input.playedAt,
        teamScore: input.teamScore,
        enemyScore: input.enemyScore,
        result: input.result,
        side: input.side,
        roundsPlayed: input.roundsPlayed,
        roundsJson: input.roundsJson,
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

export async function mergeIntoMatch(
  userId: string,
  targetId: string,
  incoming: MatchInput,
  screenshots: MatchScreenshotInput[] = [],
): Promise<MatchWithUserStat | null> {
  const existing = await prisma.match.findFirst({
    where: { id: targetId, userId },
    include: includeUserStat,
  });
  if (!existing) return null;

  const merged = mergeMatchInputs(toMatchSummary(existing), incoming);
  const stat = existing.stats[0];

  await prisma.$transaction([
    prisma.match.update({
      where: { id: targetId },
      data: matchData(merged),
    }),
    stat
      ? prisma.playerMatchStat.update({
          where: { id: stat.id },
          data: statData(userId, merged),
        })
      : prisma.playerMatchStat.create({
          data: {
            matchId: targetId,
            ...statData(userId, merged),
          },
        }),
    ...screenshots.map((screenshot) =>
      prisma.matchScreenshot.create({
        data: {
          matchId: targetId,
          page: screenshot.page,
          storagePath: screenshot.storagePath,
          width: screenshot.width,
          height: screenshot.height,
          parsedRaw: screenshot.parsedRaw,
        },
      }),
    ),
  ]);

  return getMatch(userId, targetId);
}

export async function addMatchScreenshot(matchId: string, screenshot: MatchScreenshotInput) {
  return prisma.matchScreenshot.create({
    data: {
      matchId,
      page: screenshot.page,
      storagePath: screenshot.storagePath,
      width: screenshot.width,
      height: screenshot.height,
      parsedRaw: screenshot.parsedRaw,
    },
  });
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

function matchData(input: MatchInput): Prisma.MatchUpdateInput {
  return {
    map: input.map,
    mode: input.mode,
    playedAt: input.playedAt,
    teamScore: input.teamScore,
    enemyScore: input.enemyScore,
    result: input.result,
    side: input.side,
    roundsPlayed: input.roundsPlayed,
    roundsJson: input.roundsJson,
    durationMinutes: input.durationMinutes,
    notes: input.notes,
    parseSource: input.parseSource,
  };
}

function statData(userId: string, input: MatchInput): Omit<Prisma.PlayerMatchStatUncheckedCreateInput, "matchId"> {
  return {
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
  };
}

function toMatchSummary(match: MatchWithUserStat): MatchSummary & { durationMinutes: number | null; notes: string | null } {
  const stat = match.stats[0];
  return {
    id: match.id,
    map: match.map,
    mode: match.mode,
    playedAt: match.playedAt.toISOString(),
    teamScore: match.teamScore,
    enemyScore: match.enemyScore,
    result: match.result === "LOSS" || match.result === "TIE" ? match.result : "WIN",
    side: match.side === "CT" || match.side === "T" ? match.side : null,
    roundsPlayed: match.roundsPlayed,
    roundsJson: match.roundsJson,
    durationMinutes: match.durationMinutes,
    notes: match.notes,
    parseSource: normalizeParseSource(match.parseSource),
    stat: {
      playerName: stat?.playerName ?? "",
      team: normalizeTeam(stat?.team ?? "OWN"),
      kills: stat?.kills ?? 0,
      deaths: stat?.deaths ?? 0,
      assists: stat?.assists ?? 0,
      adr: stat?.adr ?? null,
      hsPercent: stat?.hsPercent ?? null,
      mvps: stat?.mvps ?? null,
      hltvRating: stat?.hltvRating ?? null,
      enemiesFlashed: stat?.enemiesFlashed ?? null,
      utilityDamage: stat?.utilityDamage ?? null,
      score: stat?.score ?? null,
    },
  };
}

function normalizeParseSource(value: string): ParseEngine {
  return value === "vision" || value === "ocr" || value === "gsi" ? value : "manual";
}

function normalizeTeam(value: string): Team {
  return value === "ENEMY" ? "ENEMY" : "OWN";
}
