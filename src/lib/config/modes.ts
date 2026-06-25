/**
 * Game modes arrive from several sources with inconsistent casing: GSI sends CS2's internal
 * mode codes (e.g. "casual", "scrimcomp2v2"), while manual/screenshot entry uses display names
 * ("Casual"). Normalizing to a single canonical display name keeps the mode filter from showing
 * duplicates like "Casual" and "casual" as separate buckets.
 */

// CS2 internal map.mode codes → canonical display names.
const MODE_DISPLAY: Record<string, string> = {
  casual: "Casual",
  competitive: "Competitive",
  premier: "Premier",
  scrimcomp2v2: "Wingman",
  deathmatch: "Deathmatch",
  gungametrbomb: "Demolition",
  gungameprogressive: "Arms Race",
  survival: "Danger Zone",
  cooperative: "Co-op Strike",
  coopmission: "Guardian",
  custom: "Custom",
};

/** Canonical display name for a mode from any source. Unknown values are title-cased. */
export function normalizeMode(raw: string | null | undefined): string {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return "Casual";
  const key = trimmed.toLowerCase().replace(/\s+/g, "");
  return MODE_DISPLAY[key] ?? trimmed.replace(/\b\w/g, (c) => c.toUpperCase());
}
