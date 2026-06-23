import type { Actions, PageServerLoad } from "./$types";
import { error, fail, redirect } from "@sveltejs/kit";
import { requireUser } from "$lib/server/auth/guard";
import { deleteMatch, getMatch, updateMatch } from "$lib/server/db/repositories/match-repository";
import { parseMatchForm, toDateTimeLocal } from "$lib/server/utils/match-form";
import { serializeMatchDetail } from "$lib/server/utils/match-serialization";
import { parseRoundRecords, summarizeRoundRecords } from "$lib/utils/round-analytics";
import type { MatchFormValues } from "$lib/types/match";

export const load: PageServerLoad = async ({ locals, params }) => {
  const user = requireUser(locals);
  const match = await getMatch(user.id, params.id);
  if (!match) error(404, "Match not found");

  const detail = serializeMatchDetail(match);
  const rounds = parseRoundRecords(detail.roundsJson);
  return {
    match: detail,
    rounds,
    roundSummary: summarizeRoundRecords(rounds),
    values: valuesFromMatch(detail),
  };
};

export const actions: Actions = {
  save: async ({ request, locals, params }) => {
    const user = requireUser(locals);
    const parsed = parseMatchForm(await request.formData());

    if (!parsed.ok) {
      return fail(400, {
        message: parsed.message,
        values: parsed.values,
        errors: parsed.errors,
      });
    }

    const match = await updateMatch(user.id, params.id, parsed.input);
    if (!match) error(404, "Match not found");
    redirect(302, `/matches/${params.id}`);
  },
  delete: async ({ locals, params }) => {
    const user = requireUser(locals);
    await deleteMatch(user.id, params.id);
    redirect(302, "/matches");
  },
};

function valuesFromMatch(match: ReturnType<typeof serializeMatchDetail>): MatchFormValues {
  return {
    map: match.map,
    mode: match.mode,
    playedAt: toDateTimeLocal(match.playedAt),
    teamScore: stringOrEmpty(match.teamScore),
    enemyScore: stringOrEmpty(match.enemyScore),
    result: match.result,
    side: match.side ?? "",
    roundsPlayed: stringOrEmpty(match.roundsPlayed),
    durationMinutes: stringOrEmpty(match.durationMinutes),
    notes: match.notes ?? "",
    parseSource: match.parseSource,
    playerName: match.stat.playerName,
    team: match.stat.team,
    kills: String(match.stat.kills),
    deaths: String(match.stat.deaths),
    assists: String(match.stat.assists),
    adr: stringOrEmpty(match.stat.adr),
    hsPercent: stringOrEmpty(match.stat.hsPercent),
    mvps: stringOrEmpty(match.stat.mvps),
    hltvRating: stringOrEmpty(match.stat.hltvRating),
    enemiesFlashed: stringOrEmpty(match.stat.enemiesFlashed),
    utilityDamage: stringOrEmpty(match.stat.utilityDamage),
    score: stringOrEmpty(match.stat.score),
  };
}

function stringOrEmpty(value: number | null): string {
  return value === null ? "" : String(value);
}
