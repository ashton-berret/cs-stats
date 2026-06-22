# CS2 Casual Stats Tracker - Progress

## Project Status: Phase 1 Complete - Awaiting Manual Commit Before Phase 2
**Last Updated:** 2026-06-22
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
- [ ] Types: `match.ts`, `analytics.ts`, `parsing.ts`, `index.ts`
- [ ] `match-repository.ts` (create/update/delete/list incl. `isUser` stat row)
- [ ] `settings-repository.ts` (get-or-create defaults)
- [ ] `MatchReviewForm.svelte` — shared editable stat form (map, score, result, K/D/A, ADR, collapsible extended stats, notes)
- [ ] `/matches/new` manual path + `?/save` action with validation
- [ ] `MatchCard.svelte`, `MatchFilters.svelte`
- [ ] `/matches` list (client-side filter/sort)
- [ ] `/matches/[id]` view / edit / delete
- [ ] Verify: create/edit/delete a match by hand — app fully usable with no parser

### Phase 3: Vision-Model Parsing (default engine)
- [ ] `parser-interface.ts`, `parsing/types.ts`
- [ ] `vision-model-parser.ts` (Ollama `/api/chat`, `format: json`, page-1 + page-2 prompts, `locateUserRow`)
- [ ] `merge.ts` (index merge + name reconciliation)
- [ ] `parsing/index.ts` engine factory + `checkVisionHealth`
- [ ] `screenshot-store.ts` (save uploads to `data/uploads/<userId>/`) + `MatchScreenshot` persistence with `parsedRaw`
- [ ] `ScoreboardUpload.svelte` (two slots, drag-drop + clipboard paste, thumbnails)
- [ ] `/matches/new` `?/parse` action → prefill `MatchReviewForm` from `userRowIndex`, surface warnings, allow re-pick
- [ ] Verify: paste two real CS2 scoreboards with Ollama running → fields prefill → correct & save

### Phase 4: OCR Fallback Engine
- [ ] `ocr-regions.ts` with `1920x1080` calibration profile
- [ ] `ocr-parser.ts` (sharp crop + preprocess → Tesseract per cell, numeric whitelist)
- [ ] Engine selection honored end-to-end via `UserSettings.parseEngine`
- [ ] Verify: OCR parses a 1080p scoreboard; clear warning when no profile matches

### Phase 5: Dashboard & Charts
- [ ] `stats-calculator.ts` (all `DashboardStats` computations; K/D + rates derived)
- [ ] `/dashboard` page: metric cards (Matches, K/D, Avg ADR, Win Rate)
- [ ] `KDTrend.svelte` (line + rolling avg)
- [ ] `AdrTrend.svelte` (line)
- [ ] `ResultsDonut.svelte` (W/L/T)
- [ ] `PerformanceByMap.svelte` (bar, map-colored)
- [ ] `HsTrend.svelte` (line)
- [ ] Recent-form pill strip (last 10)
- [ ] Verify: dashboard reflects saved matches; charts render in dark + light

### Phase 6: Settings & Polish
- [ ] `/settings` page: in-game name, parse engine, Ollama URL/model + Test connection, OCR profile, theme
- [ ] `utils/format.ts` (ratio, percent, relative date, duration)
- [ ] Empty states (no matches, no screenshots), parse loading state, responsive layout
- [ ] Verify: full loop end-to-end; `bun run check` clean

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
- OCR is resolution-dependent; ship `1920x1080` first, add profiles as needed without code changes.
- Scope is single-user in practice today, but auth + schema are public/multi-user ready.

---

## Open Questions / To Confirm During Build

- **Exact CS2 scoreboard columns per page** — confirm against real screenshots which stats live on page 1 vs page 2 (the prompts in `vision-model-parser.ts` assume basic K/A/D/ADR/score on page 1, HS%/MVP/rating/flashes/utility on page 2; adjust once we see live captures).
- **HLTV rating availability** — CS2's native scoreboard may not show an HLTV-style rating; if absent, drop it from page-2 parsing (field stays nullable).
- **Default Ollama model** — validate `qwen3-vl:8b` accuracy on real scoreboards; if it struggles, A/B against `qwen3-vl:30b` (accepting the slight VRAM spill). Lock the default after Phase 3 testing.
