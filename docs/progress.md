# CS2 Casual Stats Tracker - Progress

## Project Status: All 6 phases implemented (`bun run check` 0/0, `bun run build` ok). Remaining: manual verification of Phase 4 (OCR, needs real 1080p shot), Phase 5 (dashboard dark/light), and Phase 6 (full loop).
**Last Updated:** 2026-06-23
**Plan:** See `docs/plan.md` for full implementation details. Implementation brief: `CODEX_HANDOFF.md`.

**Scaffold done (verified `bun run check` 0/0, `bun run build` ok):** project configs, exact pinned deps installed
(+ sharp/tesseract.js), `prisma.config.ts`, full Prisma schema + initial migration applied (`prisma/cs-stats.db`),
`app.html`/`app.css` (CS2 theme)/`app.d.ts`, placeholder `hooks.server.ts`/layout/landing, `config/maps.ts`.
Remaining Phase 1 items below (foundation ports, auth, nav) are Codex's first task.

---

## Phase Tracking

### Phase 1: Project Setup & Auth (port from zwift)
- [x] Scaffold SvelteKit project (manual; minimal + TypeScript)
- [x] Install deps: prisma, tailwindcss, lucia, echarts, winston, **sharp**, **tesseract.js** (dropped pdf-parse, papaparse)
- [x] Config files: vite, svelte, tsconfig, `.env` (`DATABASE_URL="file:./prisma/cs-stats.db"`), `.gitignore`, **`prisma.config.ts`**
- [x] Create `app.html` (theme key `cs-theme`), `app.d.ts`; placeholder `hooks.server.ts` (Codex swaps for Lucia version)
- [x] Create `app.css` with CS2 gold/amber dark + light palette
- [x] Create `config/maps.ts` (CS2 map list + colors)
- [x] Set up Prisma schema (User, Session, UserSettings, Match, PlayerMatchStat, MatchScreenshot) + initial migration applied
- [x] Replace placeholder `hooks.server.ts` with Lucia session validation (port from zwift)
- [x] Port auth: `lucia.ts`, `password.ts` from zwift (unchanged)
- [x] Port `db/client.ts` (db filename → `cs-stats.db`)
- [x] Port `utils/logger.ts` (Winston, unchanged)
- [x] Port `stores/theme.ts` (`STORAGE_KEY` → `cs-theme`), `stores/index.ts`
- [x] Create `config/theme.ts` (CS2 palette objects), port `config/chartTheme.ts` (CS2 chart palette)
- [x] Port UI components: Button, Card, Input, Select, Modal, index.ts (unchanged — CSS-var driven)
- [x] Port `charts/EChart.svelte` (unchanged)
- [x] Create `Navigation.svelte` (Dashboard, Matches, Add Match, Settings)
- [x] Create `requireUser` auth guard helper
- [x] Real root layout + redirect; port login/register/logout (retitled "CS2 Casual Stats")
- [x] Placeholder pages: `/dashboard`, `/matches`, `/matches/new`, `/settings`
- [x] Verify: `bun run check` passes, register/login works, nav renders

### Phase 2: Match Schema, Manual Entry & Match List
- [x] Types: `match.ts`, `analytics.ts`, `parsing.ts`, `index.ts`
- [x] `match-repository.ts` (create/update/delete/list incl. `isUser` stat row)
- [x] `settings-repository.ts` (get-or-create defaults)
- [x] `MatchReviewForm.svelte` — shared editable stat form (map, score, result, K/D/A, ADR, collapsible extended stats, notes)
- [x] `/matches/new` manual path + `?/save` action with validation
- [x] `MatchCard.svelte`, `MatchFilters.svelte`
- [x] `/matches` list (client-side filter/sort)
- [x] `/matches/[id]` view / edit / delete
- [x] Verify: create/edit/delete a match by hand — app fully usable with no parser

### Phase 3: Vision-Model Parsing (default engine)
- [x] `parser-interface.ts`, `parsing/types.ts`
- [x] `vision-model-parser.ts` (Ollama `/api/chat`, `format: json`, page-1 + page-2 prompts, `locateUserRow`)
- [x] `merge.ts` (index merge + name reconciliation)
- [x] `parsing/index.ts` engine factory + `checkVisionHealth`
- [x] `screenshot-store.ts` (save uploads to `data/uploads/<userId>/`) + `MatchScreenshot` persistence with `parsedRaw`
- [x] `ScoreboardUpload.svelte` (two slots, drag-drop + clipboard paste, thumbnails)
- [x] `/matches/new` `?/parse` action → prefill `MatchReviewForm` from `userRowIndex`, surface warnings, allow re-pick
- [x] Verify: two cropped CS2 scoreboard examples parsed with Ollama `qwen3-vl:8b`; `neovimbtw` row prefills map Cache, 0-8 loss, 3/5/0, MVPs 0, score 11, HS 0, ADR 53, UD 0, EF 0

### Phase 4: OCR Fallback Engine
- [x] `ocr-regions.ts` with `1920x1080` calibration profile
- [x] `ocr-parser.ts` (sharp crop + preprocess → Tesseract per cell, numeric whitelist)
- [x] Engine selection honored end-to-end via `UserSettings.parseEngine`
- [ ] Verify: OCR parses a 1080p scoreboard; clear warning when no profile matches

### Phase 5: Dashboard & Charts
- [x] `stats-calculator.ts` (all `DashboardStats` computations; K/D + rates derived) — in `services/analytics/`, plus `index.ts` barrel
- [x] `/dashboard` page: metric cards (Matches, K/D, Avg ADR, Win Rate) with subtitles + relative "last played"
- [x] `KDTrend.svelte` (line + 5-match rolling avg + 1.0 reference line)
- [x] `AdrTrend.svelte` (line)
- [x] `ResultsDonut.svelte` (W/L/T)
- [x] `PerformanceByMap.svelte` (bar, map-colored via `mapColor`)
- [x] `HsTrend.svelte` (line)
- [x] Recent-form pill strip (last 10)
- [x] Per-side performance: overall CT/T win-rate cards, grouped CT/T by-map chart with Win % / K/D toggle,
      and pure calculator tests covering null-side exclusion and one-sided maps
- [ ] Verify: dashboard reflects saved matches; charts render in dark + light (manual — needs a live server + a few saved matches)

> Implementation complete (`bun run check` 0/0). Shared helper `charts/chart-helpers.ts` (`shortDate`, `rollingAverage`).
> ADR/HS trend cards show a "no data yet" note when those nullable stats are absent. Chart series use concrete hex
> colors (canvas can't resolve CSS `var()`); axis/text styling uses vars and is re-applied on theme change by `EChart.svelte`.

### Phase 6: Settings & Polish
- [x] `/settings` page: in-game name, parse engine, Ollama URL/model + Test connection, OCR profile, theme (save + testConnection actions via `use:enhance`)
- [x] `utils/format.ts` (ratio, percent, relative date, duration, date) — dashboard now consumes `relativeDate`
- [x] Empty states (dashboard, matches list, filtered list), parse loading state (spinner + elapsed timer + progress bar in `ScoreboardUpload`), responsive layout (sm/md/lg grids)
- [ ] Verify: full loop end-to-end (manual). `bun run check` clean ✓, `bun run build` ✓.

---

## Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Framework | SvelteKit 2.x + Svelte 5 | Same as zwift project, proven foundation |
| Database | SQLite + Prisma | No server, type-safe, single-user friendly |
| Styling | TailwindCSS 4.x | Same as zwift, utility-first |
| Charts | ECharts 6.x | Same as zwift, flexible |
| Auth | Lucia 3.x, per-user from day one | User chose public-ready over single-user-only |
| Primary color | `#F2A900` (CS gold/amber) | CS2-inspired; distinct from zwift orange |
| **Parsing (default)** | **Local vision model via Ollama** (`qwen3-vl:8b`) | User prefers a locally-installed model; no cloud, no API key, no per-parse cost, screenshots stay local. 8b fits the user's 4080 Super (16 GB) fully on-GPU |
| **Parsing (fallback)** | **Tesseract.js fixed-region OCR** | Scoreboard layout is static → crop known cells & OCR numbers in isolation (reliable, offline) |
| Parse trust model | Always review/edit before save | Auto-parse never trusted blindly; review form = manual-entry form |
| Parser architecture | Pluggable `ScoreboardParser` interface | Vision/OCR today; cloud API or game API droppable later |
| Two screenshots | Two scoreboard **stat pages**, merged by row index | CS2 toggles a basic page + detailed page; merge gives full stat set |
| Stat storage | Separate `PlayerMatchStat` table, v1 stores user row only | Whole-lobby capture later = insert 10 rows, no migration |
| Team model | `OWN` / `ENEMY` (not CT/T) | Players swap sides at halftime; own-vs-enemy is the meaningful axis |
| Stats scope | Core combat + match context + extended combat | User selection; whole-lobby deferred |
| Screenshot storage | On disk (`data/uploads/`), path in DB | Keeps SQLite small, allows re-review/re-parse |
| Image handling | `sharp` (crop/preprocess), clipboard paste | Matches "paste two screenshots" workflow |
| Package Manager | Bun | Same as zwift, fast |

---

## External Runtime Dependency

- **Ollama** (<https://ollama.com>) for the default vision parser. Pull a vision model: `ollama pull qwen3-vl:8b` (default, fits 16 GB GPU on-device). Options: `qwen3-vl:30b` (MoE, quality bump but ~18 GB so spills slightly past 16 GB), `qwen3-vl:4b` (lighter/snappier). Serves on `http://localhost:11434`.
- **Optional** — if Ollama isn't running, switch parse engine to OCR or enter stats manually. The app degrades gracefully.

---

## Notes

- CS2 does not persist casual stats — this app fills that gap via post-match scoreboard screenshots.
- The review-before-save design means the app is fully functional from Phase 2 (manual entry) before any parser exists.
- Parsing on CPU (no GPU) will take a few seconds per image — Phase 6 adds a loading state for it.
- OCR is resolution-dependent and sensitive to lobby size / scoreboard height; keep it secondary to the vision parser and add profiles only when they are worth maintaining.
- Scope is single-user in practice today, but auth + schema are public/multi-user ready.

---

## Open Questions / To Confirm During Build

- **Exact CS2 scoreboard columns per page** — confirmed from `docs/scoreboard-examples/`: page 1 shows Kills / Deaths / Assists / MVPs / Score; page 2 shows HS% / KDR / ADR / UD / EF / Score. ADR is page 2, not page 1. No separate HLTV-style rating is visible.
- **OCR 1920x1080 crop profile calibration** — `ocr-regions.ts` now ships the profile shape, but the coordinates are marked as a draft and the parser emits a warning until they are verified against a real 1920x1080 CS2 scoreboard screenshot.
- **OCR capture target** — LLM parsing should support cropped scoreboard-only screenshots. OCR remains a secondary fallback because player count changes scoreboard height; a fixed-region OCR profile still needs either consistent crops or a full-window 1920x1080 calibration target.
- **Top-right timer meaning** — the examples show `9:13` and `9:20`; likely an in-game clock/timer rather than reliable match duration. Keep `durationMinutes` manual/nullable until confirmed.
- **Default Ollama model** — `qwen3-vl:8b` parsed the initial cropped examples correctly. Revisit only if future screenshots expose accuracy issues; A/B against `qwen3-vl:30b` if needed.
- **Reasoning models need `think:false` + headroom (DO NOT regress)** — `qwen3-vl` is a hybrid reasoning model. Its `<think>` tokens count against `num_predict`; with a tight budget (was `700`) thinking alone (~2200+ chars) exhausts the cap (`done_reason:length`) and the JSON content comes back empty → *"Model did not return JSON"* (intermittent, since thinking length varies). Fix in `vision-model-parser.ts`: send `think: false` **and** keep `num_predict` generous (`1024`). Applies to **any** reasoning-capable model a user might pick in Settings (incl. `qwen3-vl:30b`) — never tighten `num_predict` back down or drop `think:false`. Verified end-to-end: both pages parse, `userRowIndex:0`, `warningCount:0`.
- **Vision image preprocessing is net-negative on already-cropped shots** — `prepareImageForVision` resizes to 1600×900 and re-encodes PNG at `compressionLevel:9`; on ~1700px cropped scoreboards this *inflates* bytes (observed 1.09MB → 1.29MB) for no legibility gain. Skip the resize/re-encode when the image is already at/under the target dimensions.
