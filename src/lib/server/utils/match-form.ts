import { MAP_NAMES } from "$lib/config/maps";
import type { MatchFormValues, MatchInput, MatchResult, MatchSide } from "$lib/types/match";
import type { ParseEngine, Team } from "$lib/types/parsing";

const RESULTS = new Set(["WIN", "LOSS", "TIE"]);
const TEAMS = new Set(["OWN", "ENEMY"]);
const SIDES = new Set(["CT", "T"]);
const PARSE_SOURCES = new Set(["vision", "ocr", "manual", "gsi"]);

export type ParsedMatchForm =
  | { ok: true; input: MatchInput; values: MatchFormValues }
  | { ok: false; message: string; values: MatchFormValues; errors: Record<string, string> };

export function defaultMatchFormValues(playerName = ""): MatchFormValues {
  return {
    map: MAP_NAMES[0] ?? "",
    mode: "Casual",
    playedAt: toDateTimeLocal(new Date()),
    teamScore: "",
    enemyScore: "",
    result: "WIN",
    side: "",
    roundsPlayed: "",
    durationMinutes: "",
    notes: "",
    parseSource: "manual",
    playerName,
    team: "OWN",
    kills: "0",
    deaths: "0",
    assists: "0",
    adr: "",
    hsPercent: "",
    mvps: "",
    hltvRating: "",
    enemiesFlashed: "",
    utilityDamage: "",
    score: "",
  };
}

export function toDateTimeLocal(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function parseMatchForm(formData: FormData): ParsedMatchForm {
  const values: MatchFormValues = {
    map: stringValue(formData, "map"),
    mode: stringValue(formData, "mode") || "Casual",
    playedAt: stringValue(formData, "playedAt"),
    teamScore: stringValue(formData, "teamScore"),
    enemyScore: stringValue(formData, "enemyScore"),
    result: normalizeResult(stringValue(formData, "result")),
    side: normalizeSide(stringValue(formData, "side")),
    roundsPlayed: stringValue(formData, "roundsPlayed"),
    durationMinutes: stringValue(formData, "durationMinutes"),
    notes: stringValue(formData, "notes"),
    parseSource: normalizeParseSource(stringValue(formData, "parseSource")),
    playerName: stringValue(formData, "playerName"),
    team: normalizeTeam(stringValue(formData, "team")),
    kills: stringValue(formData, "kills"),
    deaths: stringValue(formData, "deaths"),
    assists: stringValue(formData, "assists"),
    adr: stringValue(formData, "adr"),
    hsPercent: stringValue(formData, "hsPercent"),
    mvps: stringValue(formData, "mvps"),
    hltvRating: stringValue(formData, "hltvRating"),
    enemiesFlashed: stringValue(formData, "enemiesFlashed"),
    utilityDamage: stringValue(formData, "utilityDamage"),
    score: stringValue(formData, "score"),
  };

  const errors: Record<string, string> = {};

  if (!MAP_NAMES.includes(values.map)) errors.map = "Choose a valid CS2 map.";
  if (!values.playedAt || Number.isNaN(new Date(values.playedAt).getTime())) errors.playedAt = "Enter a valid played date.";
  if (!RESULTS.has(values.result)) errors.result = "Choose a valid result.";
  if (!values.playerName.trim()) errors.playerName = "Player name is required.";
  if (!TEAMS.has(values.team)) errors.team = "Choose a valid team.";

  const kills = requiredInt(values.kills, "kills", errors);
  const deaths = requiredInt(values.deaths, "deaths", errors);
  const assists = requiredInt(values.assists, "assists", errors);
  const teamScore = optionalInt(values.teamScore, "teamScore", errors);
  const enemyScore = optionalInt(values.enemyScore, "enemyScore", errors);
  const roundsPlayed = optionalInt(values.roundsPlayed, "roundsPlayed", errors);
  const durationMinutes = optionalInt(values.durationMinutes, "durationMinutes", errors);
  const mvps = optionalInt(values.mvps, "mvps", errors);
  const enemiesFlashed = optionalInt(values.enemiesFlashed, "enemiesFlashed", errors);
  const utilityDamage = optionalInt(values.utilityDamage, "utilityDamage", errors);
  const score = optionalInt(values.score, "score", errors);
  const adr = optionalFloat(values.adr, "adr", errors);
  const hsPercent = optionalFloat(values.hsPercent, "hsPercent", errors, 0, 100);
  const hltvRating = optionalFloat(values.hltvRating, "hltvRating", errors);

  if (Object.keys(errors).length > 0) {
    return { ok: false, message: "Fix the highlighted fields and try again.", values, errors };
  }

  return {
    ok: true,
    values,
    input: {
      map: values.map,
      mode: values.mode.trim() || "Casual",
      playedAt: new Date(values.playedAt),
      teamScore,
      enemyScore,
      result: values.result,
      side: values.side ? (values.side as MatchSide) : null,
      roundsPlayed,
      durationMinutes,
      notes: values.notes.trim() || null,
      parseSource: values.parseSource,
      stat: {
        playerName: values.playerName.trim(),
        team: values.team,
        kills,
        deaths,
        assists,
        adr,
        hsPercent,
        mvps,
        hltvRating,
        enemiesFlashed,
        utilityDamage,
        score,
      },
    },
  };
}

function stringValue(formData: FormData, key: keyof MatchFormValues): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function normalizeResult(value: string): MatchResult {
  return RESULTS.has(value) ? (value as MatchResult) : "WIN";
}

function normalizeTeam(value: string): Team {
  return TEAMS.has(value) ? (value as Team) : "OWN";
}

function normalizeSide(value: string): string {
  return SIDES.has(value) ? value : "";
}

function normalizeParseSource(value: string): ParseEngine {
  return PARSE_SOURCES.has(value) ? (value as ParseEngine) : "manual";
}

function requiredInt(value: string, key: string, errors: Record<string, string>): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    errors[key] = "Enter a non-negative whole number.";
    return 0;
  }
  return parsed;
}

function optionalInt(value: string, key: string, errors: Record<string, string>): number | null {
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    errors[key] = "Enter a non-negative whole number.";
    return null;
  }
  return parsed;
}

function optionalFloat(value: string, key: string, errors: Record<string, string>, min = 0, max = Number.POSITIVE_INFINITY): number | null {
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    errors[key] = `Enter a number between ${min} and ${max === Number.POSITIVE_INFINITY ? "higher" : max}.`;
    return null;
  }
  return parsed;
}
