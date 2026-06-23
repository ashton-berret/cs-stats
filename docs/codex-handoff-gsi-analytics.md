# Codex Handoff — Dedup/Merge, Richer GSI, Per-Side Analytics, Streaks

Implementation brief for four features. Written for Codex to implement; Claude scaffolded the
contracts and decisions. **No code is written here — these are specs.** Follow the existing
conventions in the files referenced (defensive GSI reads, `process.env` for secrets, pure/testable
analytics functions, repo layer for all DB access).

**Current relevant state (verified 2026-06-23):**
- `Match` already has `side` (`"CT"|"T"|null`), `roundsPlayed`, `parseSource` (`"manual"|"vision"|"ocr"|"gsi"`).
- GSI: `src/routes/api/gsi/+server.ts` (token-authed POST) → `gsi/tracker.ts` (in-memory per-user
  live match, finalizes on `gameover` → `createMatch`). cfg built in `gsi/config.ts`, served by
  `routes/api/gsi/config/+server.ts`. Payload subset typed in `gsi/types.ts`.
- Analytics: `services/analytics/stats-calculator.ts#computeDashboardStats` →
  `DashboardStats` (`types/analytics.ts`). Form scoring + activity in `utils/performance.ts`.
- Repos: `db/repositories/match-repository.ts`, `settings-repository.ts`.

**Testing mandate (per global CLAUDE.md):** every new pure function gets `bun test` coverage. This
project has no test runner wired yet — **add one as a precursor** (Feature 0 below). All four
features have pure cores designed to be unit-tested without a live server or live CS2.

---

## Feature 0 (precursor) — wire `bun test`

1. Add `"test": "bun test"` to `package.json` scripts. Bun's built-in test runner needs no deps.
2. Co-locate specs as `*.test.ts` next to the pure modules (`stats-calculator`, `performance`, the
   new `gsi/round-tracker`, `match-dedup`).
3. Acceptance: `bun test` runs and passes; `bun run check` stays 0/0.

---

## Feature 1 — Dedup & Merge

### Problem
GSI auto-creates a match at `gameover` with core combat only (`adr/hsPercent/utilityDamage/
enemiesFlashed/hltvRating = null`). The user may *also* paste the scoreboard for the same game,
creating a duplicate that has the extended stats GSI lacks. We want: detect the overlap, and let the
user **merge the screenshot's extended stats into the existing GSI match** instead of duplicating.

### Dedup detection (pure, testable)
New `src/lib/server/services/matching/match-dedup.ts`:

```ts
export interface DedupCandidateInput {
  map: string;
  playedAt: Date;
  teamScore: number | null;
  enemyScore: number | null;
}
// Returns existing matches that plausibly are the same game, best first.
export function rankDuplicateCandidates(
  incoming: DedupCandidateInput,
  existing: MatchWithUserStat[],
): { match: MatchWithUserStat; confidence: "high" | "low" }[];
```

Heuristic:
- Same `map` (required).
- `playedAt` within **±120 min** (GSI `startedAt` ≈ match start; screenshot `playedAt` defaults to
  "now" = match end, so allow a wide window; weight closeness).
- Exact `teamScore`/`enemyScore` match ⇒ `high`; map+time only ⇒ `low`.
- Exclude matches whose `parseSource` equals the incoming source (don't merge two screenshots).
- Sort by confidence then time proximity.

Repo helper in `match-repository.ts`:
`findRecentMatchesForDedup(userId, around: Date, windowMin = 120): Promise<MatchWithUserStat[]>`
(query by `userId` + `playedAt` between `around±window`; reuse `includeUserStat`).

### Merge (pure precedence + repo write)
Field precedence when merging `incoming` into `existing`:
- **Core combat (kills/deaths/assists)** and **score/mvps**: prefer the **GSI** source as
  authoritative (it's live ground truth); fall back to the other if GSI value is null/absent.
- **Extended (adr, hsPercent, utilityDamage, enemiesFlashed, hltvRating)**: prefer whichever is
  **non-null** (screenshot supplies these).
- **Context (teamScore/enemyScore/side/roundsPlayed/durationMinutes)**: prefer existing non-null,
  fill from incoming.
- `notes`: concatenate if both present.
- `parseSource`: set to `"gsi"` if either side is GSI (it's the richer provenance), else keep richer.
- Keep the existing match's screenshots; attach the incoming screenshots to it.

Pure: `mergeMatchInputs(existing: MatchSummary, incoming: MatchInput): MatchInput`.
Repo: `mergeIntoMatch(userId, targetId, incoming, screenshots?)` — updates the existing match +
its `isUser` stat row (reuse the `updateMatch` body), appends `MatchScreenshot` rows, returns the
merged match. Do it in a `$transaction`.

### UX wiring — `routes/matches/new/+page.server.ts`
- In the `?/save` action, after building `MatchInput`, call dedup detection. If a `high` candidate
  exists, **do not blind-create**: return `{ duplicate: { candidateId, candidateSummary } }` to the
  page so it can show a choice: **"Merge into existing GSI match"** vs **"Save as separate match"**.
- Add a `?/merge` action: takes `candidateId` + the reviewed `MatchInput` (+ uploaded screenshots),
  calls `mergeIntoMatch`, redirects to `/matches/[candidateId]`.
- Page (`+page.svelte`): a banner/modal when `form.duplicate` is set, with the two buttons. Show the
  candidate's map/score/date so the user can confirm it's the same game.

### Edge cases
- No `inGameName`/null scores from GSI → only `low` candidates; never auto-merge a `low`, always ask.
- Re-finalize protection on the GSI side is already handled by `live.finalized`; server restart
  mid-match can still orphan an in-flight match — out of scope here.

### Acceptance
- Pasting a scoreboard for a game already saved via GSI offers a merge; merging fills ADR/HS/UD onto
  the GSI match and does **not** create a second row.
- `match-dedup.test.ts`: window boundaries, score-exact ⇒ high, same-source exclusion, ranking.
- `mergeMatchInputs` test: precedence rules per field.

---

## Feature 2 — Richer GSI: per-round timeline + opening-duel proxy

### Goal
Capture round-by-round data so the user (an entry player) can see whether **playing back** improves
survival and reduces dying first. Trendable over time.

### Hard limitation to bake in (document in code + UI)
CS2 GSI only streams the **local player's** state in casual; `allplayers_*` is sent **only when
spectating/GOTV**. So we **cannot see opponents or teammates** and therefore **cannot know for
certain if your kill was THE round's opening kill**. We capture honest **proxies** instead:
- **Entry frag (proxy):** your first kill of the round landed while you were still alive and early
  in the round (round still in early `live` phase / within first kill of *your* sequence).
- **Entry/opening death (proxy):** you died this round with **0 kills**, while still early in the round.
- **Survived round:** you were alive at round end.
- Per-round: kills, headshots, damage, side, round result (win/loss), how it ended (`round_wins`
  condition when available).

Label these "Entry (est.)" in the UI so it's clear they're approximations, not log-parsed truth.

### cfg additions — `gsi/config.ts`
Add to the `"data"` block: `"map_round_wins" "1"`. Keep existing `round`, `player_state`,
`player_match_stats`. (Do **not** add `allplayers_*` — useless for own-POV casual and bloats payloads.)
Bump cfg version comment so users know to re-download from `/api/gsi/config`.

### Payload type extensions — `gsi/types.ts`
Extend defensively (all optional):
```ts
round?: { phase?: string; win_team?: string; bomb?: string }; // phase: freezetime|live|over
player?: {
  ...existing,
  state?: { health?: number; round_kills?: number; round_killhs?: number; round_totaldmg?: number };
};
map?: { ...existing, round_wins?: Record<string, string> }; // "1": "ct_win_elimination", ...
```

### Round tracking — new `gsi/round-tracker.ts` (pure-ish state machine)
Keep the existing match `tracker.ts` as the orchestrator; factor per-round accumulation into a
testable module that takes a stream of payloads and produces `RoundRecord[]`.

```ts
export interface RoundRecord {
  round: number;           // 1-based
  side: "CT" | "T" | null; // user's side that round
  kills: number;
  headshots: number;
  damage: number;
  died: boolean;
  survived: boolean;
  entryFragEst: boolean;   // proxy, see limitation
  entryDeathEst: boolean;  // proxy
  won: boolean | null;     // from map.round_wins vs user side, null if unknown
  endReason: string | null;// e.g. "ct_win_elimination"
}
```

State-machine notes:
- Detect round boundaries via `round.phase` transitions (`freezetime`→`live`→`over`) and/or the
  `map.team_ct.score + team_t.score` total incrementing. Prefer phase, fall back to score total.
- Track within-round: peak `player.state.round_kills`/`round_killhs`/`round_totaldmg` (they reset
  each round), and whether `health` hit 0 (died) before round end.
- Entry proxy timing: capture the payload timestamp (`provider.timestamp`) of the **first** time
  `round_kills` went ≥1 vs the first time `health` hit 0; classify entry frag/death from order +
  earliness within the round.
- `won`: look up `map.round_wins[String(round)]`; CT-win reasons vs user side → win/loss.
- Only trust the player block when it's the local user (existing `isOwnPlayer` check in `tracker.ts`).

### Storage
Add nullable JSON column on `Match`: `roundsJson String?` (normalized `RoundRecord[]`).
Migration name: `gsi_round_timeline`. Mirror the `WeaponStatSnapshot` JSON-payload pattern (no
per-round table — personal scale, avoids migration churn). Extend `MatchInput`/`createMatch`/
`updateMatch`/`mergeIntoMatch` to carry `roundsJson` through. `tracker.finalize` serializes the
accumulated `RoundRecord[]` into it.

### Derived per-match aggregates (pure) — extend `stats-calculator.ts`
From `roundsJson`, compute and expose on the match detail + dashboard:
- entry frags, entry deaths, **entry success rate** = entryFrags / (entryFrags + entryDeaths),
- survival rate, multi-kill rounds (2k+), avg round damage,
- per-side splits of the above.
Add a trend so the user can watch entry-death rate / survival rate **over time** (the core "am I
improving by sitting back" question).

### UI
- `/matches/[id]`: a round timeline strip (W/L per round, tinted by side, marker for entry
  frag/death) + a small "Entry (est.)" summary card.
- Dashboard: an "Entry impact" mini-section — entry success rate + survival rate trend lines (reuse
  `EChart`). Only render when any match has `roundsJson`.

### Edge cases
- Most existing matches have no `roundsJson` → all round analytics must no-op gracefully (the
  null-safe pattern already used for ADR/HS trends).
- Warmup rounds / restarts: ignore rounds before first `live`. Surrender/early end: trust
  `map.round_wins` keys present, don't fabricate missing rounds.

### Acceptance
- `round-tracker.test.ts`: feed a recorded payload sequence (fixture JSON), assert `RoundRecord[]`
  (boundaries, kills/hs/damage, died/survived, entry proxies, won/endReason). **Get one real
  payload capture** from a live match to build the fixture — the heuristics are explicitly
  "tune against real payloads" (see `tracker.ts` header).
- New GSI match persists `roundsJson`; match detail shows the timeline; dashboard shows entry trend.

---

## Feature 3 — Per-side performance (overall + by map)

### Goal
Win rate / K/D / ADR split by **CT vs T**, both overall and per map. `Match.side` already exists.

### Analytics — extend `DashboardStats` (`types/analytics.ts`) + `stats-calculator.ts`
```ts
sidePerformance: {
  side: "CT" | "T";
  matches: number; kd: number; avgAdr: number | null; winRate: number;
}[];
sidePerformanceByMap: {
  map: string; color: string;
  ct: { matches: number; kd: number; avgAdr: number | null; winRate: number } | null;
  t:  { matches: number; kd: number; avgAdr: number | null; winRate: number } | null;
}[];
```
- Reuse the existing `computePerformanceByMap` aggregation shape; add a side dimension.
- Matches with `side === null` (manual/legacy): exclude from side splits (don't bucket as a fake
  side). Keep them in the existing overall stats.
- `toPoint` already drops `side`; add `side` to `MatchPoint`.

### UI
- New chart `src/lib/components/charts/SidePerformance.svelte`: grouped bars per map (CT vs T) of
  win rate (toggle to K/D), CT tinted `--color-team-ct`, T tinted `--color-team-t` (vars exist in
  `app.css`; pass concrete hex like other charts since canvas can't read CSS vars).
- Two small overall cards (CT win% / T win%) on the dashboard.
- Empty state when no match has a side.

### Acceptance
- `stats-calculator.test.ts`: side aggregation correct, null-side excluded, per-map CT/T buckets,
  map with only one side observed → other side `null`.
- Dashboard renders the side chart in dark + light.

---

## Feature 4 — Streaks & momentum

### Goal
Current/longest win & loss streaks, and a momentum signal (recent form vs baseline).

### Analytics — extend `DashboardStats` + `stats-calculator.ts`
```ts
streaks: {
  current: { result: MatchResult; count: number } | null; // most recent consecutive run
  longestWin: number;
  longestLoss: number;
};
momentum: {
  // last N (e.g. 5) vs overall, so the user sees "heating up / cooling off"
  recentWinRate: number; baselineWinRate: number; delta: number;
  recentKd: number; baselineKd: number; kdDelta: number;
} | null; // null when too few matches (< 2N)
```
- Compute from the already-chronologically-sorted `points` in `computeDashboardStats`.
- Streak walks from newest backwards for `current`; full scan for longest runs (ties break a run).
- Momentum: compare last `N=5` to the whole history (or to the prior window — pick last-N-vs-overall
  for simplicity); `null` until enough matches.

### UI
- A streak card on the dashboard ("🔥 3 wins" / "❄️ 2 losses") using existing success/danger colors.
- Momentum as a small up/down delta next to Win Rate and K/D metric cards (green ▲ / red ▼).

### Acceptance
- `stats-calculator.test.ts`: streak detection (alternating, all-win, ties breaking), longest
  win/loss, momentum delta sign and the `< 2N` null guard.

---

## Suggested order
0 (test runner) → 3 (per-side, pure, no GSI needed) → 4 (streaks, pure) → 1 (dedup/merge) →
2 (richer GSI — do last, needs a real payload capture to validate the round heuristics).

Update `docs/progress.md` and `docs/stretch-goals.md` as each lands.
